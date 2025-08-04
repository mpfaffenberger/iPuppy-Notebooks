import asyncio
import shlex
import os
import logging
from pathlib import Path
from typing import Set, Dict, Any, Optional
from ipuppy_notebooks.kernels.manager import kernel_manager

logger = logging.getLogger(__name__)


# Socket.IO connection manager for global kernel
class SocketIOManager:
    def __init__(self):
        # Set of Socket.IO session IDs for the global kernel
        self.connections: Set[str] = set()
        # Dictionary to store response futures for read requests
        self.response_futures: Dict[str, Dict[str, asyncio.Future]] = {}

    def connect(self, sid: str):
        self.connections.add(sid)
        # Initialize response futures dict for this connection
        self.response_futures[sid] = {}
        logger.info(
            f"Socket.IO connected: {sid} (total connections: {len(self.connections)})"
        )

    def disconnect(self, sid: str):
        self.connections.discard(sid)
        # Clean up response futures for this connection
        if sid in self.response_futures:
            del self.response_futures[sid]
        logger.info(
            f"Socket.IO disconnected: {sid} (total connections: {len(self.connections)})"
        )

    async def broadcast(self, event: str, data: dict):
        if self.connections:
            for sid in self.connections.copy():
                try:
                    from ipuppy_notebooks.main import sio

                    await sio.emit(event, data, room=sid)
                except Exception as e:
                    logger.error(
                        f"Error sending message to Socket.IO client {sid}: {e}"
                    )
                    self.connections.discard(sid)

    async def send_request_to_client(
        self, event: str, data: dict, sid: str
    ) -> Optional[Any]:
        """Send a request to a specific client and wait for a response."""
        if sid not in self.connections:
            logger.warning(f"Client {sid} not connected, cannot send request")
            return None

        try:
            # Generate a unique request ID
            request_id = (
                f"{event}_{id(data)}_{int(asyncio.get_event_loop().time() * 1000)}"
            )
            data_with_id = {**data, "request_id": request_id}

            # Create a future to wait for the response
            loop = asyncio.get_event_loop()
            future = loop.create_future()

            # Store the future
            if sid not in self.response_futures:
                self.response_futures[sid] = {}
            self.response_futures[sid][request_id] = future

            # Send the request
            from ipuppy_notebooks.main import sio

            await sio.emit(event, data_with_id, room=sid)
            logger.info(f"Sent request {request_id} to client {sid}")

            # Wait for the response (with a timeout)
            try:
                result = await asyncio.wait_for(future, timeout=5.0)
                logger.info(f"Received response for request {request_id}")
                return result
            except asyncio.TimeoutError:
                logger.warning(f"Timeout waiting for response to request {request_id}")
                return None
        except Exception as e:
            logger.error(f"Error sending request to client {sid}: {e}")
            return None

    def handle_client_response(self, sid: str, request_id: str, response_data: Any):
        """Handle a response from a client for a previous request."""
        if sid in self.response_futures and request_id in self.response_futures[sid]:
            future = self.response_futures[sid][request_id]
            if not future.done():
                future.set_result(response_data)
            # Clean up the future
            del self.response_futures[sid][request_id]
        else:
            logger.warning(
                f"No pending request found for response {request_id} from client {sid}"
            )


socketio_manager = SocketIOManager()


def detect_environment_type():
    """Detect if we're in a uv-managed environment"""
    # Check for uv.lock file in current directory or parent directories
    current_dir = Path.cwd()
    for parent in [current_dir] + list(current_dir.parents):
        if (parent / "uv.lock").exists():
            return "uv"
        if (parent / "pyproject.toml").exists():
            # Check if pyproject.toml has uv-specific sections
            try:
                import tomllib

                with open(parent / "pyproject.toml", "rb") as f:
                    data = tomllib.load(f)
                    if "tool" in data and "uv" in data["tool"]:
                        return "uv"
            except:
                pass

    # Check if we're in a virtual environment that was created by uv
    if "VIRTUAL_ENV" in os.environ:
        venv_path = Path(os.environ["VIRTUAL_ENV"])
        # uv typically creates a pyvenv.cfg with uv-specific content
        pyvenv_cfg = venv_path / "pyvenv.cfg"
        if pyvenv_cfg.exists():
            try:
                content = pyvenv_cfg.read_text()
                if "uv" in content.lower():
                    return "uv"
            except:
                pass

    return "pip"


async def execute_shell_command(command: str) -> dict:
    """Execute a shell command and return the output"""
    try:
        # Parse the command safely
        args = shlex.split(command)

        # Check for pip install commands in uv environments
        if len(args) >= 2 and args[0] == "pip" and args[1] == "install":
            env_type = detect_environment_type()
            if env_type == "uv":
                warning_msg = (
                    "🐶 Woof! It looks like you're in a uv-managed environment.\n"
                )
                warning_msg += "Consider using 'uv add <package>' instead of 'pip install <package>' for better dependency management.\n"
                warning_msg += "Continuing with pip install anyway...\n\n"

                # Execute the command anyway
                process = await asyncio.create_subprocess_exec(
                    *args,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    cwd=os.getcwd(),
                )

                stdout, _ = await process.communicate()
                output_text = stdout.decode("utf-8", errors="replace")

                # Combine warning and output
                combined_text = warning_msg + output_text

                return {
                    "output_type": "stream",
                    "name": "stdout",
                    "text": combined_text,
                }

        # Execute the command normally
        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=os.getcwd(),
        )

        stdout, _ = await process.communicate()
        output_text = stdout.decode("utf-8", errors="replace")

        return {"output_type": "stream", "name": "stdout", "text": output_text}

    except Exception as e:
        return {
            "output_type": "error",
            "ename": "ShellCommandError",
            "evalue": str(e),
            "traceback": [],
            "text": f"Shell command error: {str(e)}",
        }


async def execute_code_streaming(cell_index: int, code: str):
    """Main entry point for code execution with streaming"""
    logger.info(f"Starting streaming execution for cell {cell_index}")

    try:
        # Notify execution started
        await socketio_manager.broadcast(
            "execution_result",
            {"cell_index": cell_index, "status": "running", "scroll_to_cell": True},
        )
        logger.info(f"Sent 'running' status for cell {cell_index}")

        # Get kernel info
        kernel_info = kernel_manager.get_kernel_info()
        if not kernel_info:
            await socketio_manager.broadcast(
                "execution_result",
                {
                    "cell_index": cell_index,
                    "status": "error",
                    "output": {"text": "Global kernel not available"},
                },
            )
            return

        # Execute code with streaming
        await execute_code_with_streaming(cell_index, code)

        # Send final completion status
        await socketio_manager.broadcast(
            "execution_result", {"cell_index": cell_index, "status": "completed"}
        )

    except Exception as e:
        logger.error(f"Error in streaming execution: {e}")
        try:
            await socketio_manager.broadcast(
                "execution_result",
                {
                    "cell_index": cell_index,
                    "status": "error",
                    "output": {"text": str(e)},
                },
            )
        except Exception as broadcast_error:
            logger.error(f"Failed to broadcast error message: {broadcast_error}")


async def execute_code_with_streaming(cell_index: int, code: str):
    """Execute code and stream outputs in real-time"""
    try:
        # Check if this is a shell command (starts with !)
        lines = code.strip().split("\n")
        if len(lines) == 1 and lines[0].strip().startswith("!"):
            # This is a shell command
            shell_command = (
                lines[0].strip()[1:].strip()
            )  # Remove the ! and any whitespace
            logger.info(f"Executing shell command: {shell_command}")

            # Execute shell command
            output = await execute_shell_command(shell_command)

            # Send the output
            await socketio_manager.broadcast(
                "execution_result",
                {
                    "cell_index": cell_index,
                    "status": "running",
                    "output": output,
                    "append": True,
                },
            )

            return

        # Check if we have mixed shell commands and Python code
        has_shell_commands = any(line.strip().startswith("!") for line in lines)
        if has_shell_commands:
            # Process line by line for mixed content
            for line in lines:
                line = line.strip()
                if not line:
                    continue

                if line.startswith("!"):
                    # Shell command
                    shell_command = line[1:].strip()
                    logger.info(f"Executing shell command: {shell_command}")
                    output = await execute_shell_command(shell_command)

                    await socketio_manager.broadcast(
                        "execution_result",
                        {
                            "cell_index": cell_index,
                            "status": "running",
                            "output": output,
                            "append": True,
                        },
                    )
                else:
                    # Python code - execute through kernel
                    await execute_python_code_streaming(cell_index, line)
            return

        # Regular Python code execution
        await execute_python_code_streaming(cell_index, code)

    except Exception as e:
        logger.error(f"Critical error in execute_code_with_streaming: {e}")
        try:
            await socketio_manager.broadcast(
                "execution_result",
                {
                    "cell_index": cell_index,
                    "status": "error",
                    "output": {"text": f"Execution error: {str(e)}"},
                },
            )
        except Exception as broadcast_error:
            logger.error(f"Failed to broadcast execution error: {broadcast_error}")


async def execute_python_code_streaming(cell_index: int, code: str):
    """Execute Python code through the kernel and stream outputs"""
    kc = None
    try:
        from jupyter_client import AsyncKernelManager

        kernel_info = kernel_manager.get_kernel_info()
        if not kernel_info:
            logger.error("No kernel info available for streaming execution")
            await socketio_manager.broadcast(
                "execution_result",
                {
                    "cell_index": cell_index,
                    "status": "error",
                    "output": {"text": "No kernel info available"},
                },
            )
            return

        km = AsyncKernelManager()
        km.load_connection_info(kernel_info["connection_info"])

        kc = km.client()
        kc.start_channels()
        await kc.wait_for_ready(timeout=30)

        # Execute the code
        msg_id = kc.execute(code)
        logger.info(f"Started Python code execution with msg_id: {msg_id}")

        # Stream outputs as they come
        while True:
            try:
                msg = await asyncio.wait_for(kc.get_iopub_msg(timeout=1), timeout=30)

                if msg["parent_header"].get("msg_id") == msg_id:
                    msg_type = msg["header"]["msg_type"]
                    content = msg["content"]

                    output = None
                    if msg_type == "execute_result":
                        output = {
                            "output_type": "execute_result",
                            "data": content["data"],
                            "execution_count": content["execution_count"],
                            "text": content["data"].get(
                                "text/plain", str(content["data"])
                            ),
                        }
                    elif msg_type == "stream":
                        output = {
                            "output_type": "stream",
                            "name": content["name"],
                            "text": content["text"],
                        }
                    elif msg_type == "error":
                        error_text = f"{content['ename']}: {content['evalue']}\n"
                        if "traceback" in content:
                            error_text += "\n".join(content["traceback"])
                        output = {
                            "output_type": "error",
                            "ename": content["ename"],
                            "evalue": content["evalue"],
                            "traceback": content.get("traceback", []),
                            "text": error_text,
                        }
                    elif msg_type == "display_data":
                        output = {
                            "output_type": "display_data",
                            "data": content["data"],
                            "metadata": content.get("metadata", {}),
                            "text": content["data"].get(
                                "text/plain", str(content["data"])
                            ),
                        }

                    # Stream output if we have one
                    if output:
                        try:
                            await socketio_manager.broadcast(
                                "execution_result",
                                {
                                    "cell_index": cell_index,
                                    "status": "running",
                                    "output": output,
                                    "append": True,  # Append to existing outputs
                                },
                            )
                        except Exception as broadcast_error:
                            logger.error(
                                f"Error broadcasting output: {broadcast_error}"
                            )

                    # Check if execution is done
                    if msg_type == "status" and content["execution_state"] == "idle":
                        logger.info(
                            f"Python code execution completed for cell {cell_index}"
                        )
                        break

            except asyncio.TimeoutError:
                logger.info(
                    "Timeout waiting for kernel message, breaking execution loop"
                )
                break
            except Exception as msg_error:
                logger.error(f"Error processing kernel message: {msg_error}")
                break

    except Exception as e:
        logger.error(f"Critical error in execute_python_code_streaming: {e}")
        try:
            await socketio_manager.broadcast(
                "execution_result",
                {
                    "cell_index": cell_index,
                    "status": "error",
                    "output": {"text": f"Python execution error: {str(e)}"},
                },
            )
        except Exception as broadcast_error:
            logger.error(
                f"Failed to broadcast Python execution error: {broadcast_error}"
            )

    finally:
        if kc:
            try:
                kc.stop_channels()
                logger.info("Kernel client channels stopped successfully")
            except Exception as cleanup_error:
                logger.error(f"Error stopping kernel client channels: {cleanup_error}")


# Socket.IO event handlers
async def handle_connect(sid, environ):
    logger.info(f"Socket.IO client connected: {sid}")
    socketio_manager.connect(sid)

    # Send connection confirmation
    from ipuppy_notebooks.main import sio

    await sio.emit("connected", {"status": "Connected to global kernel"}, room=sid)


async def handle_disconnect(sid):
    logger.info(f"Socket.IO client disconnected: {sid}")
    socketio_manager.disconnect(sid)


async def handle_execute_code(sid, data):
    logger.info(f"Socket.IO received execute_code from {sid}: {data}")

    try:
        cell_index = data.get("cell_index")
        code = data.get("code")

        if cell_index is None or code is None:
            from ipuppy_notebooks.main import sio

            await sio.emit(
                "error",
                {"message": "Missing cell_index or code in execute_code message"},
                room=sid,
            )
            return

        # Ensure kernel is running and start execution in background task
        kernel_id = await kernel_manager.ensure_kernel_running()

        # Create task with proper error handling
        task = asyncio.create_task(execute_code_streaming(cell_index, code))

        # Don't await the task, but add comprehensive error handling
        def handle_task_result(task):
            try:
                if task.cancelled():
                    logger.info("execute_code_streaming task was cancelled")
                elif task.exception():
                    exception = task.exception()
                    logger.error(f"Error in execute_code_streaming: {exception}")
                    # Try to send error notification to client
                    asyncio.create_task(
                        socketio_manager.broadcast(
                            "execution_result",
                            {
                                "cell_index": cell_index,
                                "status": "error",
                                "output": {"text": f"Task error: {str(exception)}"},
                            },
                        )
                    )
                else:
                    logger.info(
                        f"execute_code_streaming task completed successfully for cell {cell_index}"
                    )
            except Exception as callback_error:
                logger.error(f"Error in task completion callback: {callback_error}")

        task.add_done_callback(handle_task_result)

    except Exception as e:
        logger.error(f"Error in execute_code event handler: {e}")
        from ipuppy_notebooks.main import sio

        await sio.emit("error", {"message": f"Server error: {str(e)}"}, room=sid)


async def handle_read_cell_input_response(sid, data):
    """Handle response from frontend for read_cell_input request."""
    request_id = data.get("request_id")
    content = data.get("content", "")
    if request_id:
        socketio_manager.handle_client_response(sid, request_id, content)
    else:
        logger.warning("Received read_cell_input_response without request_id")


async def handle_read_cell_output_response(sid, data):
    """Handle response from frontend for read_cell_output request."""
    request_id = data.get("request_id")
    outputs = data.get("outputs", [])
    if request_id:
        socketio_manager.handle_client_response(sid, request_id, outputs)
    else:
        logger.warning("Received read_cell_output_response without request_id")


async def handle_list_all_cells_response(sid, data):
    """Handle response from frontend for list_all_cells request."""
    request_id = data.get("request_id")
    cells = data.get("cells", [])
    if request_id:
        socketio_manager.handle_client_response(sid, request_id, cells)
    else:
        logger.warning("Received list_all_cells_response without request_id")


async def handle_file_completion_request(sid, data):
    """Handle file path completion request from frontend."""
    try:
        partial_path = data.get("partial_path", "")
        request_id = data.get("request_id")

        if not request_id:
            logger.warning("Received file_completion_request without request_id")
            return

        # Get completions for the partial path
        completions = get_file_completions(partial_path)

        # Send response back to client
        from ipuppy_notebooks.main import sio

        await sio.emit(
            "file_completion_response",
            {"request_id": request_id, "completions": completions},
            room=sid,
        )

    except Exception as e:
        logger.error(f"Error in file completion request handler: {e}")
        from ipuppy_notebooks.main import sio

        await sio.emit(
            "error", {"message": f"File completion error: {str(e)}"}, room=sid
        )


def get_file_completions(partial_path: str) -> list:
    """Get file completions for a partial path."""
    try:
        # If partial_path is empty, list files in current directory
        if not partial_path:
            path_obj = Path(".")
        else:
            # Expand home directory (~) if present
            original_path = partial_path
            if partial_path.startswith("~/"):
                partial_path = str(Path.home() / partial_path[2:])
            elif partial_path == "~":
                partial_path = str(Path.home())

            # Handle relative paths
            path_obj = Path(partial_path)

        # Special case: if original path was ~/  we want contents of home directory
        if "original_path" in locals() and (
            original_path == "~/" or original_path == "~"
        ):
            search_dir = Path(partial_path)  # This is the expanded home directory
            if not search_dir.exists() or not search_dir.is_dir():
                return []
            partial_name = ""  # We want all contents of this directory
        # If the path ends with a separator, we're looking for contents of a directory
        elif partial_path.endswith("/") or partial_path.endswith("\\"):
            search_dir = path_obj if path_obj.is_absolute() else Path.cwd() / path_obj
            if not search_dir.exists() or not search_dir.is_dir():
                return []
            partial_name = ""  # We want all contents of this directory
        else:
            # If not, we're looking for files/dirs that match the partial name
            search_dir = path_obj.parent if path_obj.parent else Path(".")
            search_dir = (
                search_dir if search_dir.is_absolute() else Path.cwd() / search_dir
            )
            partial_name = path_obj.name

            if not search_dir.exists() or not search_dir.is_dir():
                return []

        # Get all items in the directory
        items = list(search_dir.iterdir())

        # Filter items based on partial name
        if partial_name:
            items = [item for item in items if item.name.startswith(partial_name)]

        # Format completions as relative paths from current directory
        completions = []
        cwd = Path.cwd()

        for item in items:
            try:
                # Get relative path from current directory
                rel_path = item.relative_to(cwd)

                # Add trailing slash for directories
                if item.is_dir():
                    completions.append(str(rel_path) + "/")
                else:
                    completions.append(str(rel_path))
            except ValueError:
                # If item is not relative to cwd, just use its name
                if item.is_dir():
                    completions.append(item.name + "/")
                else:
                    completions.append(item.name)

        return completions

    except Exception as e:
        logger.error(f"Error getting file completions: {e}")
        return []

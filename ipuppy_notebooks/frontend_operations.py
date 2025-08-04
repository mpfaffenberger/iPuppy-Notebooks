"""
Frontend operations that can be triggered from the backend.
These functions send events via Socket.IO to trigger actions in the frontend.
"""

import asyncio
import logging
from typing import Optional, Any, List, Dict

from .socket_handlers import socketio_manager, execute_code_streaming

logger = logging.getLogger(__name__)


def add_new_cell(cell_index: int, cell_type: str = "code", content: str = ""):
    """
    Add a new cell at the specified index.

    Args:
        cell_index (int): The index where the new cell should be inserted
        cell_type (str): Type of cell - either "code" or "markdown"
        content (str): Initial content of the cell
    """
    data = {
        "cell_index": cell_index,
        "cell_type": cell_type,
        "content": content,
        "scroll_to_cell": True,
    }

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(socketio_manager.broadcast("add_cell", data))
    except RuntimeError:
        # No running loop, create a new one
        asyncio.run(socketio_manager.broadcast("add_cell", data))


def delete_cell(cell_index: int):
    """
    Delete a cell at the specified index.

    Args:
        cell_index (int): The index of the cell to delete
    """
    data = {"cell_index": cell_index}

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(socketio_manager.broadcast("delete_cell", data))
    except RuntimeError:
        # No running loop, create a new one
        asyncio.run(socketio_manager.broadcast("delete_cell", data))


def alter_cell_content(cell_index: int, content: str):
    """
    Alter the content of a cell at the specified index.

    Args:
        cell_index (int): The index of the cell to modify
        content (str): New content for the cell
    """
    data = {"cell_index": cell_index, "content": content, "scroll_to_cell": True}

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(socketio_manager.broadcast("alter_cell_content", data))
    except RuntimeError:
        # No running loop, create a new one
        asyncio.run(socketio_manager.broadcast("alter_cell_content", data))


def execute_cell(cell_index: int, code: str):
    """
    Execute a cell at the specified index with the given code.

    Args:
        cell_index (int): The index of the cell to execute
        code (str): The code to execute in the cell
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(execute_code_streaming(cell_index, code))
    except RuntimeError:
        # No running loop, create a new one
        asyncio.run(execute_code_streaming(cell_index, code))


async def execute_cell_and_wait(
    cell_index: int, code: str, sid: str, timeout: float = 30.0
) -> Optional[List[Any]]:
    """
    Execute a cell and wait for the execution to complete, then return the outputs.

    Args:
        cell_index (int): The index of the cell to execute
        code (str): The code to execute in the cell
        sid (str): The Socket.IO session ID of the client
        timeout (float): Maximum time to wait for execution completion

    Returns:
        Optional[List[Any]]: The outputs from the execution, or None if failed
    """
    logger.info(
        f"execute_cell_and_wait called with cell_index={cell_index}, code_length={len(code)}, sid={repr(sid)}"
    )

    try:
        # First, update the cell content
        logger.debug("Updating cell content before execution")
        alter_cell_content(cell_index, code)

        # Wait a moment for the frontend to update
        await asyncio.sleep(0.1)

        # Trigger execution
        logger.debug("Triggering cell execution")
        execute_cell(cell_index, code)

        # Wait for execution to complete by polling the cell outputs
        logger.debug(f"Waiting for execution completion (timeout={timeout}s)")
        start_time = asyncio.get_event_loop().time()

        while True:
            # Check if we've timed out
            if asyncio.get_event_loop().time() - start_time > timeout:
                logger.warning(
                    f"Timeout waiting for cell {cell_index} execution to complete"
                )
                return None

            # Wait a bit before checking
            await asyncio.sleep(0.5)

            # Read the current cell outputs
            try:
                outputs = await read_cell_output(cell_index, sid)
                if outputs is not None and len(outputs) > 0:
                    logger.info(
                        f"Cell {cell_index} execution completed with {len(outputs)} outputs"
                    )
                    return outputs
            except Exception as e:
                logger.debug(f"Error reading cell output during wait: {e}")

        return None

    except Exception as e:
        logger.error(f"Error in execute_cell_and_wait: {e}", exc_info=True)
        return None


def swap_cell_type(cell_index: int, new_type: str):
    """
    Swap a cell between code and markdown types.

    Args:
        cell_index (int): The index of the cell to swap
        new_type (str): The new type for the cell - either "code" or "markdown"
    """
    data = {"cell_index": cell_index, "new_type": new_type}

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(socketio_manager.broadcast("swap_cell_type", data))
    except RuntimeError:
        # No running loop, create a new one
        asyncio.run(socketio_manager.broadcast("swap_cell_type", data))


def move_cell(cell_index: int, new_index: int):
    """
    Move a cell from one index to another.

    Args:
        cell_index (int): The current index of the cell
        new_index (int): The new index for the cell
    """
    data = {"cell_index": cell_index, "new_index": new_index}

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(socketio_manager.broadcast("move_cell", data))
    except RuntimeError:
        # No running loop, create a new one
        asyncio.run(socketio_manager.broadcast("move_cell", data))


async def read_cell_input(cell_index: int, sid: str) -> Optional[str]:
    """
    Read the input content of a cell at the specified index.

    Args:
        cell_index (int): The index of the cell to read
        sid (str): The Socket.IO session ID of the client to request from

    Returns:
        Optional[str]: The input content of the cell, or None if failed
    """
    data = {"cell_index": cell_index}

    try:
        result = await socketio_manager.send_request_to_client(
            "read_cell_input_request", data, sid
        )
        return result
    except Exception as e:
        logger.error(
            f"Error reading cell input at index {cell_index} - Exception type: {type(e).__name__}, Exception value: {repr(e)}",
            exc_info=True,
        )
        return None


async def read_cell_output(cell_index: int, sid: str) -> Optional[List[Any]]:
    """
    Read the output content of a cell at the specified index.

    Args:
        cell_index (int): The index of the cell to read
        sid (str): The Socket.IO session ID of the client to request from

    Returns:
        Optional[List[Any]]: The output content of the cell, or None if failed
    """
    data = {"cell_index": cell_index}

    try:
        result = await socketio_manager.send_request_to_client(
            "read_cell_output_request", data, sid
        )
        return result
    except Exception as e:
        logger.error(f"Error reading cell output at index {cell_index}: {e}")
        return None


async def list_all_cells(sid: str) -> Optional[List[Dict[str, Any]]]:
    """
    List all cells in the notebook with their types and content.

    Args:
        sid (str): The Socket.IO session ID of the client to request from

    Returns:
        Optional[List[Dict[str, Any]]]: List of all cells with their properties, or None if failed
    """
    logger.info(f"list_all_cells called with sid={repr(sid)}")
    data = {}

    try:
        logger.debug("Calling send_request_to_client for list_all_cells_request")
        result = await socketio_manager.send_request_to_client(
            "list_all_cells_request", data, sid
        )
        logger.info(
            f"Successfully got list_all_cells result: {type(result)}, length={len(result) if result else 'None'}"
        )
        return result
    except Exception as e:
        logger.error(
            f"Error listing all cells - Exception type: {type(e).__name__}, Exception value: {repr(e)}",
            exc_info=True,
        )
        return None

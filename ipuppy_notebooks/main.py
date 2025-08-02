from fastapi import FastAPI, Request, HTTPException, Body, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import logging
import uvicorn
import json
import os
import asyncio
from pathlib import Path
from typing import Dict, Set
import socketio
from ipuppy_notebooks.kernels.manager import kernel_manager
from ipuppy_notebooks.kernels.executor import executor
from ipuppy_notebooks.py_notebook import load_py_notebook, dump_py_notebook

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

app = FastAPI(title="iPuppy Notebooks", description="A Jupyter notebook clone with a modern dark mode UI", docs_url="/api/v1/docs", redoc_url="/api/v1/redoc")

templates = Jinja2Templates(directory="ipuppy_notebooks/templates")
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# Create directories if they don't exist
os.makedirs("kernels", exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Socket.IO connection manager for global kernel
class SocketIOManager:
    def __init__(self):
        # Set of Socket.IO session IDs for the global kernel
        self.connections: Set[str] = set()
    
    def connect(self, sid: str):
        self.connections.add(sid)
        logger.info(f"Socket.IO connected: {sid} (total connections: {len(self.connections)})")
    
    def disconnect(self, sid: str):
        self.connections.discard(sid)
        logger.info(f"Socket.IO disconnected: {sid} (total connections: {len(self.connections)})")
    
    async def broadcast(self, event: str, data: dict):
        if self.connections:
            for sid in self.connections.copy():
                try:
                    await sio.emit(event, data, room=sid)
                except Exception as e:
                    logger.error(f"Error sending message to Socket.IO client {sid}: {e}")
                    self.connections.discard(sid)

socketio_manager = SocketIOManager()

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    logger.info(f"Socket.IO client connected: {sid}")
    socketio_manager.connect(sid)
    
    # Send connection confirmation
    await sio.emit('connected', {'status': 'Connected to global kernel'}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Socket.IO client disconnected: {sid}")
    socketio_manager.disconnect(sid)

@sio.event
async def execute_code(sid, data):
    logger.info(f"Socket.IO received execute_code from {sid}: {data}")
    
    try:
        cell_index = data.get('cell_index')
        code = data.get('code')
        
        if cell_index is None or code is None:
            await sio.emit('error', {
                'message': 'Missing cell_index or code in execute_code message'
            }, room=sid)
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
                    asyncio.create_task(socketio_manager.broadcast("execution_result", {
                        "cell_index": cell_index,
                        "status": "error",
                        "output": {"text": f"Task error: {str(exception)}"}
                    }))
                else:
                    logger.info(f"execute_code_streaming task completed successfully for cell {cell_index}")
            except Exception as callback_error:
                logger.error(f"Error in task completion callback: {callback_error}")
        
        task.add_done_callback(handle_task_result)
        
    except Exception as e:
        logger.error(f"Error in execute_code event handler: {e}")
        await sio.emit('error', {
            'message': f'Server error: {str(e)}'
        }, room=sid)

# Application startup and shutdown events
@app.on_event("startup")
async def startup_event():
    logger.info("Starting iPuppy Notebooks application...")
    await kernel_manager.startup()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down iPuppy Notebooks application...")
    await kernel_manager.shutdown()

@app.get("/old_app")
async def old_app(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Alternative way to serve the React app's index.html directly
@app.get("/react")
async def react_index():
    with open("dist/index.html", "r") as f:
        content = f.read()
    return Response(content=content, media_type="text/html")

@app.get("/api/v1/notebooks")
async def list_notebooks():
    notebooks_dir = Path(".")
    notebooks = [f.name for f in notebooks_dir.iterdir() if f.is_file() and f.suffix == ".py"]
    return {"notebooks": notebooks}

@app.get("/api/v1/notebooks/{notebook_name}")
async def get_notebook(notebook_name: str):
    # support only .py notebooks for new files
    notebook_path = Path(f"./{notebook_name}")
    if not notebook_path.exists():
        raise HTTPException(status_code=404, detail="Notebook not found")

    if notebook_path.suffix == ".py":
        return load_py_notebook(notebook_path)
    else:
        # legacy ipynb
        with open(notebook_path, "r") as f:
            return json.load(f)

@app.post("/api/v1/notebooks/{notebook_name}")
async def create_notebook(notebook_name: str):
    # sanitize filename and ensure .py extension only once
    if not notebook_name.endswith(".py"):
        notebook_name += ".py"
    notebook_path = Path(notebook_name)
    if notebook_path.exists():
        raise HTTPException(status_code=400, detail="Notebook already exists")

    initial_notebook = {
        "cells": [
            {
                "cell_type": "code",
                "source": ["print('Welcome to iPuppy Notebooks!')\n"],
                "outputs": []
            }
        ]
    }
    notebook_path.write_text(dump_py_notebook(initial_notebook), encoding="utf-8")
    return {"message": f"Notebook {notebook_path.name} created successfully"}

@app.delete("/api/v1/notebooks/{notebook_name}")
async def delete_notebook(notebook_name: str):
    notebook_path = Path(f"./{notebook_name}")
    if not notebook_path.exists():
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    notebook_path.unlink()
    return {"message": f"Notebook {notebook_name} deleted successfully"}

# Global Kernel Management Routes
@app.get("/api/v1/kernel/status")
async def get_global_kernel_status():
    try:
        return kernel_manager.get_kernel_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/kernel/reset")
async def reset_global_kernel():
    try:
        kernel_id = await kernel_manager.reset_kernel()
        return {"kernel_id": kernel_id, "status": "reset"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/kernel/ensure")
async def ensure_global_kernel():
    try:
        kernel_id = await kernel_manager.ensure_kernel_running()
        return {"kernel_id": kernel_id, "status": "running"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Code Execution Route
@app.post("/api/v1/execute")
async def execute_code(code: str = Body(..., embed=True)):
    try:
        kernel_id = await kernel_manager.ensure_kernel_running()
        outputs = await executor.execute_code(kernel_id, code)
        return {"outputs": outputs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Code Completion Route
@app.post("/api/v1/complete")
async def complete_code(request: dict = Body(...)):
    try:
        kernel_id = await kernel_manager.ensure_kernel_running()
        code = request.get("code", "")
        cursor_pos = request.get("cursor_pos", len(code))
        completions = await executor.get_completions(kernel_id, code, cursor_pos)
        return {"completions": completions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Socket.IO is now handling real-time communication - no WebSocket endpoint needed

async def execute_code_streaming(cell_index: int, code: str):
    """Execute code and stream results to Socket.IO clients"""
    logger.info(f"Starting streaming execution for cell {cell_index}")
    
    try:
        # Notify execution started
        await socketio_manager.broadcast("execution_result", {
            "cell_index": cell_index,
            "status": "running"
        })
        logger.info(f"Sent 'running' status for cell {cell_index}")
        
        # Get kernel info
        kernel_info = kernel_manager.get_kernel_info()
        if not kernel_info:
            await socketio_manager.broadcast("execution_result", {
                "cell_index": cell_index,
                "status": "error",
                "output": {"text": "Global kernel not available"}
            })
            return
        
        # Execute code with streaming
        outputs = await execute_code_with_streaming(cell_index, code)
        
        # Send final completion status
        await socketio_manager.broadcast("execution_result", {
            "cell_index": cell_index,
            "status": "completed"
        })
        
    except Exception as e:
        logger.error(f"Error in streaming execution: {e}")
        try:
            await socketio_manager.broadcast("execution_result", {
                "cell_index": cell_index,
                "status": "error",
                "output": {"text": str(e)}
            })
        except Exception as broadcast_error:
            logger.error(f"Failed to broadcast error message: {broadcast_error}")

async def execute_code_with_streaming(cell_index: int, code: str):
    """Execute code and stream outputs in real-time"""
    kc = None
    try:
        from jupyter_client import AsyncKernelManager
        
        kernel_info = kernel_manager.get_kernel_info()
        if not kernel_info:
            logger.error("No kernel info available for streaming execution")
            await socketio_manager.broadcast("execution_result", {
                "cell_index": cell_index,
                "status": "error",
                "output": {"text": "No kernel info available"}
            })
            return
            
        km = AsyncKernelManager()
        km.load_connection_info(kernel_info['connection_info'])
        
        kc = km.client()
        kc.start_channels()
        await kc.wait_for_ready(timeout=30)
        
        # Execute the code
        msg_id = kc.execute(code)
        logger.info(f"Started code execution with msg_id: {msg_id}")
        
        # Stream outputs as they come
        while True:
            try:
                msg = await asyncio.wait_for(kc.get_iopub_msg(timeout=1), timeout=30)
                
                if msg['parent_header'].get('msg_id') == msg_id:
                    msg_type = msg['header']['msg_type']
                    content = msg['content']
                    
                    output = None
                    if msg_type == 'execute_result':
                        output = {
                            'output_type': 'execute_result',
                            'data': content['data'],
                            'execution_count': content['execution_count'],
                            'text': content['data'].get('text/plain', str(content['data']))
                        }
                    elif msg_type == 'stream':
                        output = {
                            'output_type': 'stream',
                            'name': content['name'],
                            'text': content['text']
                        }
                    elif msg_type == 'error':
                        error_text = f"{content['ename']}: {content['evalue']}\n"
                        if 'traceback' in content:
                            error_text += '\n'.join(content['traceback'])
                        output = {
                            'output_type': 'error',
                            'ename': content['ename'],
                            'evalue': content['evalue'],
                            'traceback': content.get('traceback', []),
                            'text': error_text
                        }
                    elif msg_type == 'display_data':
                        output = {
                            'output_type': 'display_data',
                            'data': content['data'],
                            'metadata': content.get('metadata', {}),
                            'text': content['data'].get('text/plain', str(content['data']))
                        }
                    
                    # Stream output if we have one
                    if output:
                        try:
                            await socketio_manager.broadcast("execution_result", {
                                "cell_index": cell_index,
                                "status": "running",
                                "output": output,
                                "append": True  # Append to existing outputs
                            })
                        except Exception as broadcast_error:
                            logger.error(f"Error broadcasting output: {broadcast_error}")
                    
                    # Check if execution is done
                    if msg_type == 'status' and content['execution_state'] == 'idle':
                        logger.info(f"Code execution completed for cell {cell_index}")
                        break
                        
            except asyncio.TimeoutError:
                logger.info("Timeout waiting for kernel message, breaking execution loop")
                break
            except Exception as msg_error:
                logger.error(f"Error processing kernel message: {msg_error}")
                break
    
    except Exception as e:
        logger.error(f"Critical error in execute_code_with_streaming: {e}")
        try:
            await socketio_manager.broadcast("execution_result", {
                "cell_index": cell_index,
                "status": "error",
                "output": {"text": f"Execution error: {str(e)}"}
            })
        except Exception as broadcast_error:
            logger.error(f"Failed to broadcast execution error: {broadcast_error}")
    
    finally:
        if kc:
            try:
                kc.stop_channels()
                logger.info("Kernel client channels stopped successfully")
            except Exception as cleanup_error:
                logger.error(f"Error stopping kernel client channels: {cleanup_error}")

# Notebook Save Route
@app.put("/api/v1/notebooks/{notebook_name}")
async def save_notebook(notebook_name: str, request: Request):
    # Get the raw body first to debug what's being sent
    body = await request.body()
    logger.info(f"Received save request for {notebook_name} with body: {body.decode()}")
    
    # Early exit if body is empty
    if not body:
        logger.error("Empty request body received")
        raise HTTPException(status_code=400, detail="Request body is empty. Notebook content required.")

    # Parse JSON from the previously-read bytes (reading twice exhausts the stream)
    try:
        content = json.loads(body)
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    
    notebook_path = Path(f"./{notebook_name}")
    if not notebook_path.exists():
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    # Validate required notebook structure
    required_keys = ["cells", "metadata", "nbformat", "nbformat_minor"]
    for key in required_keys:
        if key not in content:
            logger.error(f"Missing required key in notebook content: {key}")
            raise HTTPException(status_code=400, detail=f"Missing required key in notebook content: {key}")
    
    # Validate cells structure
    if not isinstance(content["cells"], list):
        logger.error("Cells must be a list")
        raise HTTPException(status_code=400, detail="Cells must be a list")
    
    try:
        if notebook_path.suffix == ".py":
            notebook_path.write_text(dump_py_notebook(content), encoding="utf-8")
        else:
            with open(notebook_path, "w") as f:
                json.dump(content, f, indent=2)
        logger.info(f"Notebook {notebook_name} saved successfully")
        return {"message": f"Notebook {notebook_name} saved successfully"}
    except Exception as e:
        logger.error(f"Error saving notebook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount the React app's static files at root - MUST be before Socket.IO wrapping
app.mount("/", StaticFiles(directory="dist", html=True), name="react_app")

# Mount Socket.IO with FastAPI - this creates the final ASGI app
socket_app = socketio.ASGIApp(sio, app)

if __name__ == "__main__":
    uvicorn.run(
        "ipuppy_notebooks.main:socket_app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        reload_excludes=["*.py"]  # Exclude all .py files in root directory from reload watching
    )
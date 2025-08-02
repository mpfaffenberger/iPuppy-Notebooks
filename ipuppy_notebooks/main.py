from fastapi import FastAPI, Request, HTTPException, Body, Response, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import logging
import uvicorn
import json
import os
import asyncio
from pathlib import Path
from typing import Dict, Set
from ipuppy_notebooks.kernels.manager import kernel_manager
from ipuppy_notebooks.kernels.executor import executor
from ipuppy_notebooks.py_notebook import load_py_notebook, dump_py_notebook

app = FastAPI(title="iPuppy Notebooks", description="A Jupyter notebook clone with a modern dark mode UI", docs_url="/api/v1/docs", redoc_url="/api/v1/redoc")

templates = Jinja2Templates(directory="ipuppy_notebooks/templates")
app.mount("/static", StaticFiles(directory="ipuppy_notebooks/static"), name="static")
app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# Create directories if they don't exist
os.makedirs("kernels", exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WebSocket connection manager
class WebSocketManager:
    def __init__(self):
        # Maps kernel_id to set of WebSocket connections
        self.connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, kernel_id: str):
        await websocket.accept()
        if kernel_id not in self.connections:
            self.connections[kernel_id] = set()
        self.connections[kernel_id].add(websocket)
        logger.info(f"WebSocket connected for kernel {kernel_id}")
    
    def disconnect(self, websocket: WebSocket, kernel_id: str):
        if kernel_id in self.connections:
            self.connections[kernel_id].discard(websocket)
            if not self.connections[kernel_id]:
                del self.connections[kernel_id]
        logger.info(f"WebSocket disconnected for kernel {kernel_id}")
    
    async def broadcast_to_kernel(self, kernel_id: str, message: dict):
        if kernel_id in self.connections:
            disconnected = set()
            for websocket in self.connections[kernel_id].copy():
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to WebSocket: {e}")
                    disconnected.add(websocket)
            
            # Remove disconnected websockets
            for ws in disconnected:
                self.connections[kernel_id].discard(ws)

websocket_manager = WebSocketManager()

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

# Kernel Management Routes
@app.post("/api/v1/kernels")
async def start_kernel():
    try:
        kernel_id = await kernel_manager.start_kernel()
        return {"kernel_id": kernel_id, "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/kernels/{kernel_id}")
async def stop_kernel(kernel_id: str):
    try:
        result = await kernel_manager.stop_kernel(kernel_id)
        if result:
            return {"kernel_id": kernel_id, "status": "stopped"}
        else:
            raise HTTPException(status_code=404, detail="Kernel not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/kernels/{kernel_id}/status")
async def get_kernel_status(kernel_id: str):
    try:
        status = await executor.get_kernel_status(kernel_id)
        return {"kernel_id": kernel_id, "status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Code Execution Route
@app.post("/api/v1/kernels/{kernel_id}/execute")
async def execute_code(kernel_id: str, code: str = Body(..., embed=True)):
    try:
        outputs = await executor.execute_code(kernel_id, code)
        return {"outputs": outputs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time kernel communication
@app.websocket("/api/v1/kernels/{kernel_id}/ws")
async def websocket_endpoint(websocket: WebSocket, kernel_id: str):
    await websocket_manager.connect(websocket, kernel_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            if data.get("type") == "execute_code":
                cell_index = data.get("cell_index")
                code = data.get("code")
                
                if cell_index is None or code is None:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Missing cell_index or code in execute_code message"
                    })
                    continue
                
                # Start execution in background task
                asyncio.create_task(execute_code_streaming(kernel_id, cell_index, code))
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, kernel_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket, kernel_id)

async def execute_code_streaming(kernel_id: str, cell_index: int, code: str):
    """Execute code and stream results to WebSocket clients"""
    try:
        # Notify execution started
        await websocket_manager.broadcast_to_kernel(kernel_id, {
            "type": "execution_result",
            "cell_index": cell_index,
            "status": "running"
        })
        
        # Get kernel info
        kernel_info = kernel_manager.get_kernel_info(kernel_id)
        if not kernel_info:
            await websocket_manager.broadcast_to_kernel(kernel_id, {
                "type": "execution_result",
                "cell_index": cell_index,
                "status": "error",
                "output": {"text": f"Kernel {kernel_id} not found"}
            })
            return
        
        # Execute code with streaming
        outputs = await execute_code_with_streaming(kernel_id, cell_index, code)
        
        # Send final completion status
        await websocket_manager.broadcast_to_kernel(kernel_id, {
            "type": "execution_result",
            "cell_index": cell_index,
            "status": "completed"
        })
        
    except Exception as e:
        logger.error(f"Error in streaming execution: {e}")
        await websocket_manager.broadcast_to_kernel(kernel_id, {
            "type": "execution_result",
            "cell_index": cell_index,
            "status": "error",
            "output": {"text": str(e)}
        })

async def execute_code_with_streaming(kernel_id: str, cell_index: int, code: str):
    """Execute code and stream outputs in real-time"""
    from jupyter_client import AsyncKernelManager
    
    kernel_info = kernel_manager.get_kernel_info(kernel_id)
    km = AsyncKernelManager()
    km.load_connection_info(kernel_info['connection_info'])
    
    try:
        kc = km.client()
        kc.start_channels()
        await kc.wait_for_ready(timeout=30)
        
        # Execute the code
        msg_id = kc.execute(code)
        
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
                        await websocket_manager.broadcast_to_kernel(kernel_id, {
                            "type": "execution_result",
                            "cell_index": cell_index,
                            "status": "running",
                            "output": output,
                            "append": True  # Append to existing outputs
                        })
                    
                    # Check if execution is done
                    if msg_type == 'status' and content['execution_state'] == 'idle':
                        break
                        
            except asyncio.TimeoutError:
                break
    
    finally:
        kc.stop_channels()

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

# Mount the React app's static files at root - MUST be last to avoid catching API routes
app.mount("/", StaticFiles(directory="dist", html=True), name="react_app")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
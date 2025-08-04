from fastapi import FastAPI, Request, HTTPException, Body, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import logging
import uvicorn
import json
import os
import asyncio
from pathlib import Path
import socketio
from ipuppy_notebooks.kernels.manager import kernel_manager
from ipuppy_notebooks.kernels.executor import executor
from ipuppy_notebooks.py_notebook import load_py_notebook, dump_py_notebook
from ipuppy_notebooks.socket_handlers import (
    handle_connect,
    handle_disconnect,
    handle_execute_code,
    handle_read_cell_input_response,
    handle_read_cell_output_response,
    handle_list_all_cells_response,
    handle_file_completion_request,
)
from ipuppy_notebooks.agent.agent import get_data_science_puppy_agent
from ipuppy_notebooks.conversation_history import conversation_history

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi", cors_allowed_origins="*", logger=True, engineio_logger=True
)

app = FastAPI(
    title="iPuppy Notebooks",
    description="A Jupyter notebook clone with a modern dark mode UI",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

# Get package directory for static files
package_dir = Path(__file__).parent
static_dir = package_dir / "compiled_ui"

app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

# Create directories if they don't exist
os.makedirs("kernels", exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Debug: Check if static files exist
logger.info(f"Package directory: {package_dir}")
logger.info(f"Static directory: {static_dir}")
logger.info(f"Static directory exists: {static_dir.exists()}")
if static_dir.exists():
    logger.info(f"Static directory contents: {list(static_dir.iterdir())}")
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        logger.info(f"Assets directory contents: {list(assets_dir.iterdir())}")
else:
    logger.warning("Static directory does not exist - Plotly and other rich outputs will not work!")

agent = get_data_science_puppy_agent()


# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    await handle_connect(sid, environ)


@sio.event
async def disconnect(sid):
    await handle_disconnect(sid)


@sio.event
async def execute_code(sid, data):
    await handle_execute_code(sid, data)


@sio.event
async def read_cell_input_response(sid, data):
    await handle_read_cell_input_response(sid, data)


@sio.event
async def read_cell_output_response(sid, data):
    await handle_read_cell_output_response(sid, data)


@sio.event
async def list_all_cells_response(sid, data):
    await handle_list_all_cells_response(sid, data)


@sio.event
async def file_completion_request(sid, data):
    await handle_file_completion_request(sid, data)


# Application startup and shutdown events
@app.on_event("startup")
async def startup_event():
    logger.info("Starting iPuppy Notebooks application...")
    await kernel_manager.startup()


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down iPuppy Notebooks application...")
    await kernel_manager.shutdown()


# Alternative way to serve the React app's index.html directly
@app.get("/react")
async def react_index():
    with open(static_dir / "index.html", "r") as f:
        content = f.read()
    return Response(content=content, media_type="text/html")


@app.get("/api/v1/notebooks")
async def list_notebooks():
    notebooks_dir = Path(".")
    notebooks = [
        f.name for f in notebooks_dir.iterdir() if f.is_file() and f.suffix == ".py"
    ]
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
                "outputs": [],
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


# Agent Routes
@app.post("/api/v1/agent/run")
async def run_agent(request: dict = Body(...)):
    try:
        task = request.get("task", "")
        if not task.strip():
            raise HTTPException(status_code=400, detail="Task cannot be empty")

        # Note: notebook_sid is now managed via the agent's set_notebook_sid method

        logger.info(f"Starting agent task in background: {task}")

        # Create a background task to run the agent without blocking
        async def run_agent_task():
            try:
                result = await agent.run(task)

                # Send the final result via socket.io to all connected clients
                from ipuppy_notebooks.socket_handlers import socketio_manager

                await socketio_manager.broadcast(
                    "agent_task_completed",
                    {
                        "success": True,
                        "output_message": result.output_message,
                        "awaiting_user_input": result.awaiting_user_input,
                    },
                )
                logger.info("Agent task completed successfully")

            except Exception as e:
                logger.error(f"Error in background agent task: {e}")
                # Send error via socket.io
                from ipuppy_notebooks.socket_handlers import socketio_manager

                await socketio_manager.broadcast(
                    "agent_task_completed",
                    {
                        "success": False,
                        "error": str(e),
                        "output_message": f"Error executing task: {str(e)}",
                        "awaiting_user_input": False,
                    },
                )

        # Start the task in the background
        asyncio.create_task(run_agent_task())

        # Return immediately
        return {
            "success": True,
            "message": "Agent task started in background",
            "status": "running",
        }

    except Exception as e:
        logger.error(f"Error starting agent task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/agent/models")
async def get_agent_models():
    """Get all available models for the agent."""
    try:
        models = agent.get_available_models()
        current_model = agent.get_current_model()
        return {"models": models, "current_model": current_model}
    except Exception as e:
        logger.error(f"Error getting agent models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/agent/models/{model_key}")
async def set_agent_model(model_key: str):
    """Set the active model for the agent."""
    try:
        success = agent.set_model(model_key)
        if success:
            return {
                "success": True,
                "message": f"Successfully switched to model: {model_key}",
                "current_model": agent.get_current_model(),
            }
        else:
            raise HTTPException(
                status_code=400, detail=f"Failed to switch to model: {model_key}"
            )
    except Exception as e:
        logger.error(f"Error setting agent model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/agent/notebook-sid")
async def set_agent_notebook_sid(request: dict = Body(...)):
    """Set the notebook socket ID for the agent."""
    try:
        sid = request.get("sid", "")
        notebook_name = request.get("notebook_name", "")

        agent.set_notebook_sid(sid)
        if notebook_name:
            agent.set_current_notebook(notebook_name)

        return {
            "success": True,
            "message": f"Set notebook SID to: {sid}",
            "notebook_sid": agent.get_notebook_sid(),
            "current_notebook": agent.get_current_notebook(),
        }
    except Exception as e:
        logger.error(f"Error setting agent notebook SID: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Conversation History Routes
@app.get("/api/v1/agent/conversation-history/{notebook_name}")
async def get_conversation_history(notebook_name: str):
    """Get conversation history for a notebook."""
    try:
        history = conversation_history.load_conversation_history(notebook_name)
        summary = conversation_history.get_conversation_summary(notebook_name)
        return {
            "success": True,
            "notebook_name": notebook_name,
            "history": history,
            "summary": summary,
        }
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/agent/conversation-history/{notebook_name}")
async def clear_conversation_history(notebook_name: str):
    """Clear conversation history for a notebook."""
    try:
        success = conversation_history.clear_history(notebook_name)
        if success:
            return {
                "success": True,
                "message": f"Cleared conversation history for {notebook_name}",
            }
        else:
            raise HTTPException(
                status_code=500, detail="Failed to clear conversation history"
            )
    except Exception as e:
        logger.error(f"Error clearing conversation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/agent/conversation-summary/{notebook_name}")
async def get_conversation_summary(notebook_name: str):
    """Get conversation summary for a notebook."""
    try:
        summary = conversation_history.get_conversation_summary(notebook_name)
        return {"success": True, "notebook_name": notebook_name, "summary": summary}
    except Exception as e:
        logger.error(f"Error getting conversation summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Socket.IO is now handling real-time communication - no WebSocket endpoint needed


# Notebook Save Route
@app.put("/api/v1/notebooks/{notebook_name}")
async def save_notebook(notebook_name: str, request: Request):
    # Get the raw body first to debug what's being sent
    body = await request.body()
    logger.info(f"Received save request for {notebook_name} with body: {body.decode()}")

    # Early exit if body is empty
    if not body:
        logger.error("Empty request body received")
        raise HTTPException(
            status_code=400, detail="Request body is empty. Notebook content required."
        )

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
            raise HTTPException(
                status_code=400,
                detail=f"Missing required key in notebook content: {key}",
            )

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
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="react_app")

# Mount Socket.IO with FastAPI - this creates the final ASGI app
socket_app = socketio.ASGIApp(sio, app)

def main():
    """Main entry point for iPuppy Notebooks 🐶"""
    import sys
    
    # Parse basic command line arguments
    host = "0.0.0.0"
    port = 8000
    reload = False
    
    # Simple argument parsing
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--host" and i + 1 < len(sys.argv):
            host = sys.argv[i + 1]
        elif arg == "--port" and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])
        elif arg == "--reload":
            reload = True
        elif arg == "--help" or arg == "-h":
            print("🐶 iPuppy Notebooks - Agentic AI-Empowered Data Science")
            print("")
            print("Usage:")
            print("  ipuppy-notebooks [options]")
            print("  uvx run ipuppy-notebooks [options]")
            print("")
            print("Options:")
            print("  --host HOST     Host to bind to (default: 0.0.0.0)")
            print("  --port PORT     Port to bind to (default: 8000)")
            print("  --reload        Enable auto-reload for development")
            print("  --help, -h      Show this help message")
            print("")
            print("After starting, open http://localhost:8000 in your browser")
            print("and start your data science journey! 🚀")
            return
    
    print("🐶 Starting iPuppy Notebooks...")
    print(f"🌐 Server will be available at http://{host}:{port}")
    print("🚀 Press Ctrl+C to stop")
    
    uvicorn.run(
        "ipuppy_notebooks.main:socket_app",
        host=host,
        port=port,
        reload=reload,
        reload_excludes=["*.py"] if reload else None,
    )


if __name__ == "__main__":
    main()

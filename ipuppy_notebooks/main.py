from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import logging
import uvicorn
import json
import os
from pathlib import Path
from ipuppy_notebooks.kernels.manager import kernel_manager
from ipuppy_notebooks.kernels.executor import executor
from ipuppy_notebooks.py_notebook import load_py_notebook, dump_py_notebook

app = FastAPI(title="iPuppy Notebooks", description="A Jupyter notebook clone with a modern dark mode UI")

templates = Jinja2Templates(directory="ipuppy_notebooks/templates")
app.mount("/static", StaticFiles(directory="ipuppy_notebooks/static"), name="static")

# Create directories if they don't exist
os.makedirs("kernels", exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/notebooks")
async def list_notebooks():
    notebooks_dir = Path(".")
    notebooks = [f.name for f in notebooks_dir.iterdir() if f.is_file() and f.suffix == ".py"]
    return {"notebooks": notebooks}

@app.get("/notebooks/{notebook_name}")
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

@app.post("/notebooks/{notebook_name}")
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

@app.delete("/notebooks/{notebook_name}")
async def delete_notebook(notebook_name: str):
    notebook_path = Path(f"./{notebook_name}")
    if not notebook_path.exists():
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    notebook_path.unlink()
    return {"message": f"Notebook {notebook_name} deleted successfully"}

# Kernel Management Routes
@app.post("/kernels")
async def start_kernel():
    try:
        kernel_id = await kernel_manager.start_kernel()
        return {"kernel_id": kernel_id, "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/kernels/{kernel_id}")
async def stop_kernel(kernel_id: str):
    try:
        result = await kernel_manager.stop_kernel(kernel_id)
        if result:
            return {"kernel_id": kernel_id, "status": "stopped"}
        else:
            raise HTTPException(status_code=404, detail="Kernel not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/kernels/{kernel_id}/status")
async def get_kernel_status(kernel_id: str):
    try:
        status = await executor.get_kernel_status(kernel_id)
        return {"kernel_id": kernel_id, "status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Code Execution Route
@app.post("/kernels/{kernel_id}/execute")
async def execute_code(kernel_id: str, code: str = Body(..., embed=True)):
    try:
        outputs = await executor.execute_code(kernel_id, code)
        return {"outputs": outputs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Notebook Save Route
@app.put("/notebooks/{notebook_name}")
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

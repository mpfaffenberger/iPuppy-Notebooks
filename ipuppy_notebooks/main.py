from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import json
import os
from pathlib import Path
from ipuppy_notebooks.kernels.manager import kernel_manager
from ipuppy_notebooks.kernels.executor import executor

app = FastAPI(title="iPuppy Notebooks", description="A Jupyter notebook clone with a modern dark mode UI")

templates = Jinja2Templates(directory="ipuppy_notebooks/templates")
app.mount("/static", StaticFiles(directory="ipuppy_notebooks/static"), name="static")

# Create directories if they don't exist
os.makedirs("notebooks", exist_ok=True)
os.makedirs("kernels", exist_ok=True)

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/notebooks")
async def list_notebooks():
    notebooks_dir = Path("notebooks")
    notebooks = [f.name for f in notebooks_dir.iterdir() if f.is_file() and f.suffix == ".ipynb"]
    return {"notebooks": notebooks}

@app.get("/notebooks/{notebook_name}")
async def get_notebook(notebook_name: str):
    notebook_path = Path(f"notebooks/{notebook_name}")
    if not notebook_path.exists():
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    with open(notebook_path, "r") as f:
        content = json.load(f)
    
    return content

@app.post("/notebooks/{notebook_name}")
async def create_notebook(notebook_name: str):
    notebook_path = Path(f"notebooks/{notebook_name}")
    if notebook_path.exists():
        raise HTTPException(status_code=400, detail="Notebook already exists")
    
    # Create a basic notebook structure with an initial cell
    notebook_content = {
        "cells": [
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": ["# Welcome to iPuppy Notebooks!\n", "# Start coding here\n"]
            }
        ],
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.9.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }
    
    with open(notebook_path, "w") as f:
        json.dump(notebook_content, f, indent=2)
    
    return {"message": f"Notebook {notebook_name} created successfully"}

@app.delete("/notebooks/{notebook_name}")
async def delete_notebook(notebook_name: str):
    notebook_path = Path(f"notebooks/{notebook_name}")
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
async def save_notebook(notebook_name: str, content: dict = Body(...)):
    notebook_path = Path(f"notebooks/{notebook_name}")
    if not notebook_path.exists():
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    try:
        with open(notebook_path, "w") as f:
            json.dump(content, f, indent=2)
        return {"message": f"Notebook {notebook_name} saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

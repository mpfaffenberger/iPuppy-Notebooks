"""
Tools for the Data Science Puppy agent.
"""
import os
import logging
from typing import Dict, Any

from pydantic_ai import RunContext

from code_puppy.tools.command_runner import share_your_reasoning
from ipuppy_notebooks import (
    add_new_cell, 
    delete_cell, 
    alter_cell_content, 
    execute_cell, 
    swap_cell_type, 
    move_cell, 
    read_cell_input, 
    read_cell_output,
    list_all_cells
)

logger = logging.getLogger(__name__)


# Get the Socket.IO session ID from environment variable
# This should be set by the frontend when initializing the agent
NOTEBOOK_SID = os.environ.get("NOTEBOOK_SID", "")


def register_data_science_tools(agent):
    """Register all data science notebook tools to the provided agent."""
    
    @agent.tool
    def agent_add_new_cell(context: RunContext, cell_index: int, cell_type: str = "code", content: str = "") -> Dict[str, Any]:
        """Add a new cell at the specified index."""
        try:
            add_new_cell(cell_index, cell_type, content)
            return {"success": True, "message": f"Added new {cell_type} cell at index {cell_index}"}
        except Exception as e:
            logger.error(f"Error in agent_add_new_cell: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_delete_cell(context: RunContext, cell_index: int) -> Dict[str, Any]:
        """Delete a cell at the specified index."""
        try:
            delete_cell(cell_index)
            return {"success": True, "message": f"Deleted cell at index {cell_index}"}
        except Exception as e:
            logger.error(f"Error in agent_delete_cell: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_alter_cell_content(context: RunContext, cell_index: int, content: str) -> Dict[str, Any]:
        """Alter the content of a cell at the specified index."""
        try:
            alter_cell_content(cell_index, content)
            return {"success": True, "message": f"Altered content of cell at index {cell_index}"}
        except Exception as e:
            logger.error(f"Error in agent_alter_cell_content: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_execute_cell(context: RunContext, cell_index: int, code: str) -> Dict[str, Any]:
        """Execute a cell at the specified index with the given code."""
        try:
            execute_cell(cell_index, code)
            return {"success": True, "message": f"Executed cell at index {cell_index}"}
        except Exception as e:
            logger.error(f"Error in agent_execute_cell: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_swap_cell_type(context: RunContext, cell_index: int, new_type: str) -> Dict[str, Any]:
        """Swap a cell between code and markdown types."""
        try:
            swap_cell_type(cell_index, new_type)
            return {"success": True, "message": f"Swapped cell at index {cell_index} to {new_type} type"}
        except Exception as e:
            logger.error(f"Error in agent_swap_cell_type: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_move_cell(context: RunContext, cell_index: int, new_index: int) -> Dict[str, Any]:
        """Move a cell from one index to another."""
        try:
            move_cell(cell_index, new_index)
            return {"success": True, "message": f"Moved cell from index {cell_index} to {new_index}"}
        except Exception as e:
            logger.error(f"Error in agent_move_cell: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_read_cell_input(context: RunContext, cell_index: int) -> Dict[str, Any]:
        """Read the input content of a cell at the specified index."""
        if not NOTEBOOK_SID:
            return {"success": False, "error": "NOTEBOOK_SID not set"}
        
        try:
            content = read_cell_input(cell_index, NOTEBOOK_SID)
            return {"success": True, "content": content or ""}
        except Exception as e:
            logger.error(f"Error in agent_read_cell_input: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_read_cell_output(context: RunContext, cell_index: int) -> Dict[str, Any]:
        """Read the output content of a cell at the specified index."""
        if not NOTEBOOK_SID:
            return {"success": False, "error": "NOTEBOOK_SID not set"}
        
        try:
            output = read_cell_output(cell_index, NOTEBOOK_SID)
            return {"success": True, "output": output or []}
        except Exception as e:
            logger.error(f"Error in agent_read_cell_output: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_list_all_cells(context: RunContext) -> Dict[str, Any]:
        """List all cells in the notebook with their types and content."""
        if not NOTEBOOK_SID:
            return {"success": False, "error": "NOTEBOOK_SID not set"}
        
        try:
            cells = list_all_cells(NOTEBOOK_SID)
            return {"success": True, "cells": cells or []}
        except Exception as e:
            logger.error(f"Error in agent_list_all_cells: {e}")
            return {"success": False, "error": str(e)}
    
    @agent.tool
    def agent_share_your_reasoning(context: RunContext, reasoning: str, next_steps: str = None) -> Dict[str, Any]:
        """Share your reasoning and planned next steps."""
        try:
            result = share_your_reasoning(context, reasoning, next_steps)
            return {"success": True, "message": "Reasoning shared successfully"}
        except Exception as e:
            logger.error(f"Error in agent_share_your_reasoning: {e}")
            return {"success": False, "error": str(e)}

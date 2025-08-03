"""
Tools for the Data Science Puppy agent.
"""
import os
import logging
from typing import Dict, Any

from pydantic_ai import RunContext

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


async def emit_agent_message(message: str, tool_name: str = None, success: bool = True):
    """Emit a message to the puppy scientist window in the frontend."""
    try:
        from ipuppy_notebooks.socket_handlers import socketio_manager
        
        # Format the message with tool context if provided
        formatted_message = message
        if tool_name:
            prefix = "🔧" if success else "❌"
            formatted_message = f"{prefix} {tool_name}: {message}"
        
        # Broadcast to all connected clients (puppy scientist window)
        await socketio_manager.broadcast("agent_message", {
            "message": formatted_message,
            "tool_name": tool_name,
            "success": success,
            "timestamp": int(__import__('time').time() * 1000)
        })
        logger.info(f"Emitted agent message: {formatted_message}")
        
    except Exception as e:
        logger.error(f"Error emitting agent message: {e}")


def register_data_science_tools(agent):
    """Register all data science notebook tools to the provided agent."""
    
    @agent.tool
    async def agent_add_new_cell(context: RunContext, cell_index: int, cell_type: str = "code", content: str = "") -> Dict[str, Any]:
        """Add a new cell at the specified index."""
        try:
            add_new_cell(cell_index, cell_type, content)
            message = f"Added new {cell_type} cell at index {cell_index}"
            await emit_agent_message(message, "add_new_cell", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_add_new_cell: {e}")
            error_msg = f"Failed to add cell: {str(e)}"
            await emit_agent_message(error_msg, "add_new_cell", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_delete_cell(context: RunContext, cell_index: int) -> Dict[str, Any]:
        """Delete a cell at the specified index."""
        try:
            delete_cell(cell_index)
            message = f"Deleted cell at index {cell_index}"
            await emit_agent_message(message, "delete_cell", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_delete_cell: {e}")
            error_msg = f"Failed to delete cell: {str(e)}"
            await emit_agent_message(error_msg, "delete_cell", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_alter_cell_content(context: RunContext, cell_index: int, content: str) -> Dict[str, Any]:
        """Alter the content of a cell at the specified index."""
        try:
            alter_cell_content(cell_index, content)
            message = f"Altered content of cell at index {cell_index}"
            await emit_agent_message(message, "alter_cell_content", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_alter_cell_content: {e}")
            error_msg = f"Failed to alter cell content: {str(e)}"
            await emit_agent_message(error_msg, "alter_cell_content", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_execute_cell(context: RunContext, cell_index: int, code: str) -> Dict[str, Any]:
        """Execute a cell at the specified index with the given code."""
        try:
            execute_cell(cell_index, code)
            message = f"Executed cell at index {cell_index}"
            await emit_agent_message(message, "execute_cell", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_execute_cell: {e}")
            error_msg = f"Failed to execute cell: {str(e)}"
            await emit_agent_message(error_msg, "execute_cell", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_swap_cell_type(context: RunContext, cell_index: int, new_type: str) -> Dict[str, Any]:
        """Swap a cell between code and markdown types."""
        try:
            swap_cell_type(cell_index, new_type)
            message = f"Swapped cell at index {cell_index} to {new_type} type"
            await emit_agent_message(message, "swap_cell_type", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_swap_cell_type: {e}")
            error_msg = f"Failed to swap cell type: {str(e)}"
            await emit_agent_message(error_msg, "swap_cell_type", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_move_cell(context: RunContext, cell_index: int, new_index: int) -> Dict[str, Any]:
        """Move a cell from one index to another."""
        try:
            move_cell(cell_index, new_index)
            message = f"Moved cell from index {cell_index} to {new_index}"
            await emit_agent_message(message, "move_cell", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_move_cell: {e}")
            error_msg = f"Failed to move cell: {str(e)}"
            await emit_agent_message(error_msg, "move_cell", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_read_cell_input(context: RunContext, cell_index: int) -> Dict[str, Any]:
        """Read the input content of a cell at the specified index."""
        if not NOTEBOOK_SID:
            error_msg = "NOTEBOOK_SID not set"
            await emit_agent_message(error_msg, "read_cell_input", False)
            return {"success": False, "error": error_msg}
        
        try:
            content = read_cell_input(cell_index, NOTEBOOK_SID)
            message = f"Read content from cell at index {cell_index}"
            await emit_agent_message(message, "read_cell_input", True)
            return {"success": True, "content": content or ""}
        except Exception as e:
            logger.error(f"Error in agent_read_cell_input: {e}")
            error_msg = f"Failed to read cell input: {str(e)}"
            await emit_agent_message(error_msg, "read_cell_input", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_read_cell_output(context: RunContext, cell_index: int) -> Dict[str, Any]:
        """Read the output content of a cell at the specified index."""
        if not NOTEBOOK_SID:
            error_msg = "NOTEBOOK_SID not set"
            await emit_agent_message(error_msg, "read_cell_output", False)
            return {"success": False, "error": error_msg}
        
        try:
            output = read_cell_output(cell_index, NOTEBOOK_SID)
            message = f"Read output from cell at index {cell_index}"
            await emit_agent_message(message, "read_cell_output", True)
            return {"success": True, "output": output or []}
        except Exception as e:
            logger.error(f"Error in agent_read_cell_output: {e}")
            error_msg = f"Failed to read cell output: {str(e)}"
            await emit_agent_message(error_msg, "read_cell_output", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_list_all_cells(context: RunContext) -> Dict[str, Any]:
        """List all cells in the notebook with their types and content."""
        if not NOTEBOOK_SID:
            error_msg = "NOTEBOOK_SID not set"
            await emit_agent_message(error_msg, "list_all_cells", False)
            return {"success": False, "error": error_msg}
        
        try:
            cells = list_all_cells(NOTEBOOK_SID)
            message = f"Listed all cells in notebook ({len(cells or [])} cells found)"
            await emit_agent_message(message, "list_all_cells", True)
            return {"success": True, "cells": cells or []}
        except Exception as e:
            logger.error(f"Error in agent_list_all_cells: {e}")
            error_msg = f"Failed to list cells: {str(e)}"
            await emit_agent_message(error_msg, "list_all_cells", False)
            return {"success": False, "error": str(e)}
    
    @agent.tool
    async def agent_share_your_reasoning(context: RunContext, reasoning: str, next_steps: str = None) -> Dict[str, Any]:
        """Share your reasoning and planned next steps."""
        try:
            message = f"💭 Reasoning: {reasoning}"
            if next_steps:
                message += f"\n📋 Next steps: {next_steps}"
            await emit_agent_message(message, "share_reasoning", True)
            return {"success": True, "message": "Reasoning shared successfully"}
        except Exception as e:
            logger.error(f"Error in agent_share_your_reasoning: {e}")
            error_msg = f"Failed to share reasoning: {str(e)}"
            await emit_agent_message(error_msg, "share_reasoning", False)
            return {"success": False, "error": str(e)}

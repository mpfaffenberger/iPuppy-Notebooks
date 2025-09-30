"""
Tools for the Data Science Puppy agent.
"""

import logging
from typing import Dict, Any

from pydantic_ai import RunContext

from ipuppy_notebooks import (
    add_new_cell,
    delete_cell,
    alter_cell_content,
    execute_cell_and_wait,
    swap_cell_type,
    move_cell,
    read_cell_input,
    read_cell_output,
    list_all_cells,
)

logger = logging.getLogger(__name__)


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
        await socketio_manager.broadcast(
            "agent_message",
            {
                "message": formatted_message,
                "tool_name": tool_name,
                "success": success,
                "timestamp": int(__import__("time").time() * 1000),
            },
        )
        logger.info(f"Emitted agent message: {formatted_message}")

    except Exception as e:
        logger.error(f"Error emitting agent message: {e}")


def register_data_science_tools(pydantic_agent, data_science_agent):
    """Register all data science notebook tools to the provided agent.

    Args:
        pydantic_agent: The pydantic_ai Agent instance
        data_science_agent: The DataSciencePuppyAgent instance containing notebook_sid
    """

    @pydantic_agent.tool
    async def agent_add_new_cell(
        context: RunContext,
        cell_type: str = "code",
        content: str = "",
    ) -> Dict[str, Any]:
        """Add a new cell at the end of the notebook."""
        logger.info(
            f"agent_add_new_cell called with cell_type={cell_type}, content_length={len(content)}"
        )
        try:
            # Get the current notebook sid
            notebook_sid = data_science_agent.get_notebook_sid()
            
            # Get current cell count to determine append index
            cells = await list_all_cells(notebook_sid)
            append_index = len(cells) if cells else 0
            
            logger.debug(
                f"Calling add_new_cell({append_index}, {cell_type}, {repr(content)})"
            )
            add_new_cell(append_index, cell_type, content)
            message = f"Added new {cell_type} cell at the end of notebook (index {append_index})"
            logger.info(f"Successfully added cell: {message}")
            await emit_agent_message(message, "add_new_cell", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_add_new_cell: {e}", exc_info=True)
            error_msg = f"Failed to add cell: {str(e)}"
            await emit_agent_message(error_msg, "add_new_cell", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_delete_cell(
        context: RunContext, cell_index: int = 0
    ) -> Dict[str, Any]:
        """Delete a cell at the specified index."""
        logger.info(f"agent_delete_cell called with cell_index={cell_index}")
        try:
            logger.debug(f"Calling delete_cell({cell_index})")
            delete_cell(cell_index)
            message = f"Deleted cell at index {cell_index}"
            logger.info(f"Successfully deleted cell: {message}")
            await emit_agent_message(message, "delete_cell", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_delete_cell: {e}", exc_info=True)
            error_msg = f"Failed to delete cell: {str(e)}"
            await emit_agent_message(error_msg, "delete_cell", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_alter_cell_content(
        context: RunContext, cell_index: int = 0, content: str = ""
    ) -> Dict[str, Any]:
        """Alter the content of a cell at the specified index."""
        logger.info(
            f"agent_alter_cell_content called with cell_index={cell_index}, content_length={len(content)}"
        )
        try:
            logger.debug(f"Calling alter_cell_content({cell_index}, {repr(content)})")
            alter_cell_content(cell_index, content)
            message = f"Altered content of cell at index {cell_index}"
            logger.info(f"Successfully altered cell content: {message}")
            await emit_agent_message(message, "alter_cell_content", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_alter_cell_content: {e}", exc_info=True)
            error_msg = f"Failed to alter cell content: {str(e)}"
            await emit_agent_message(error_msg, "alter_cell_content", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_execute_cell(
        context: RunContext, cell_index: int = 0
    ) -> Dict[str, Any]:
        """Execute the cell at the specified index with its existing content."""
        logger.info(f"agent_execute_cell called with cell_index={cell_index}")
        notebook_sid = data_science_agent.get_notebook_sid()
        logger.debug(f"Retrieved notebook_sid: {repr(notebook_sid)}")

        if not notebook_sid:
            error_msg = "Notebook connection not established. Please ensure a notebook is open and connected before executing cells."
            logger.error("agent_execute_cell failed: NOTEBOOK_SID not set")
            await emit_agent_message(error_msg, "execute_cell", False)
            return {"success": False, "error": error_msg, "needs_notebook": True}

        try:
            # First read the existing cell content
            logger.debug(f"Reading existing content for cell {cell_index}")
            cell_content = await read_cell_input(cell_index, notebook_sid)

            if cell_content is None:
                error_msg = f"Could not read content from cell {cell_index}"
                logger.error(error_msg)
                await emit_agent_message(error_msg, "execute_cell", False)
                return {"success": False, "error": error_msg}

            if not cell_content.strip():
                error_msg = f"Cell {cell_index} is empty - nothing to execute"
                logger.warning(error_msg)
                await emit_agent_message(error_msg, "execute_cell", False)
                return {"success": False, "error": error_msg}

            logger.debug(
                f"Executing cell {cell_index} with existing content (length: {len(cell_content)})"
            )
            await emit_agent_message(
                f"Executing cell {cell_index}...", "execute_cell", True
            )

            outputs = await execute_cell_and_wait(
                cell_index, cell_content, notebook_sid, timeout=30.0
            )

            if outputs is not None:
                message = f"Executed cell {cell_index} successfully with {len(outputs)} outputs"
                logger.info(message)
                await emit_agent_message(message, "execute_cell", True)
                return {
                    "success": True,
                    "message": message,
                    "outputs": outputs,
                    "cell_index": cell_index,
                }
            else:
                error_msg = (
                    f"Cell {cell_index} execution timed out or produced no outputs"
                )
                logger.warning(error_msg)
                await emit_agent_message(error_msg, "execute_cell", False)
                return {"success": False, "error": error_msg}

        except Exception as e:
            logger.error(f"Error in agent_execute_cell: {e}", exc_info=True)
            error_msg = f"Failed to execute cell: {str(e)}"
            await emit_agent_message(error_msg, "execute_cell", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_swap_cell_type(
        context: RunContext, cell_index: int = 0, new_type: str = ""
    ) -> Dict[str, Any]:
        """Swap a cell between code and markdown types."""
        logger.info(
            f"agent_swap_cell_type called with cell_index={cell_index}, new_type={new_type}"
        )
        try:
            logger.debug(f"Calling swap_cell_type({cell_index}, {new_type})")
            swap_cell_type(cell_index, new_type)
            message = f"Swapped cell at index {cell_index} to {new_type} type"
            logger.info(f"Successfully swapped cell type: {message}")
            await emit_agent_message(message, "swap_cell_type", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_swap_cell_type: {e}", exc_info=True)
            error_msg = f"Failed to swap cell type: {str(e)}"
            await emit_agent_message(error_msg, "swap_cell_type", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_move_cell(
        context: RunContext, cell_index: int = 0, new_index: int = 0
    ) -> Dict[str, Any]:
        """Move a cell from one index to another."""
        logger.info(
            f"agent_move_cell called with cell_index={cell_index}, new_index={new_index}"
        )
        try:
            logger.debug(f"Calling move_cell({cell_index}, {new_index})")
            move_cell(cell_index, new_index)
            message = f"Moved cell from index {cell_index} to {new_index}"
            logger.info(f"Successfully moved cell: {message}")
            await emit_agent_message(message, "move_cell", True)
            return {"success": True, "message": message}
        except Exception as e:
            logger.error(f"Error in agent_move_cell: {e}", exc_info=True)
            error_msg = f"Failed to move cell: {str(e)}"
            await emit_agent_message(error_msg, "move_cell", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_read_cell_input(
        context: RunContext, cell_index: int = 0
    ) -> Dict[str, Any]:
        """Read the input content of a cell at the specified index."""
        logger.info(f"agent_read_cell_input called with cell_index={cell_index}")
        notebook_sid = data_science_agent.get_notebook_sid()
        logger.debug(f"Retrieved notebook_sid: {repr(notebook_sid)}")

        if not notebook_sid:
            error_msg = "Notebook connection not established. Please ensure a notebook is open and connected before reading cell content."
            logger.error("agent_read_cell_input failed: NOTEBOOK_SID not set")
            await emit_agent_message(error_msg, "read_cell_input", False)
            return {"success": False, "error": error_msg, "needs_notebook": True}

        try:
            logger.debug(f"Calling read_cell_input({cell_index}, {repr(notebook_sid)})")
            content = await read_cell_input(cell_index, notebook_sid)
            message = f"Read content from cell at index {cell_index}"
            logger.info(
                f"Successfully read cell input: {message}, content_length={len(content or '')}"
            )
            await emit_agent_message(message, "read_cell_input", True)
            return {"success": True, "content": content or ""}
        except Exception as e:
            logger.error(f"Error in agent_read_cell_input: {e}", exc_info=True)
            error_msg = f"Failed to read cell input: {str(e)}"
            await emit_agent_message(error_msg, "read_cell_input", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_read_cell_output(
        context: RunContext, cell_index: int = 0
    ) -> Dict[str, Any]:
        """Read the output content of a cell at the specified index."""
        logger.info(f"agent_read_cell_output called with cell_index={cell_index}")
        notebook_sid = data_science_agent.get_notebook_sid()
        logger.debug(f"Retrieved notebook_sid: {repr(notebook_sid)}")

        if not notebook_sid:
            error_msg = "Notebook connection not established. Please ensure a notebook is open and connected before reading cell outputs."
            logger.error("agent_read_cell_output failed: NOTEBOOK_SID not set")
            await emit_agent_message(error_msg, "read_cell_output", False)
            return {"success": False, "error": error_msg, "needs_notebook": True}

        try:
            logger.debug(
                f"Calling read_cell_output({cell_index}, {repr(notebook_sid)})"
            )
            output = await read_cell_output(cell_index, notebook_sid)
            message = f"Read output from cell at index {cell_index}"
            logger.info(
                f"Successfully read cell output: {message}, output_length={len(output or [])}"
            )
            await emit_agent_message(message, "read_cell_output", True)
            return {"success": True, "output": output or []}
        except Exception as e:
            logger.error(f"Error in agent_read_cell_output: {e}", exc_info=True)
            error_msg = f"Failed to read cell output: {str(e)}"
            await emit_agent_message(error_msg, "read_cell_output", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_list_all_cells(context: RunContext) -> Dict[str, Any]:
        """List all cells in the notebook with their types and content."""
        logger.info("agent_list_all_cells called")
        notebook_sid = data_science_agent.get_notebook_sid()
        logger.debug(f"Retrieved notebook_sid: {repr(notebook_sid)}")

        if not notebook_sid:
            error_msg = "Notebook connection not established. Please ensure a notebook is open and connected before listing cells."
            logger.error("agent_list_all_cells failed: NOTEBOOK_SID not set")
            await emit_agent_message(error_msg, "list_all_cells", False)
            return {"success": False, "error": error_msg, "needs_notebook": True}

        try:
            logger.debug(f"Calling list_all_cells({repr(notebook_sid)})")
            cells = await list_all_cells(notebook_sid)
            message = f"Listed all cells in notebook ({len(cells or [])} cells found)"
            logger.info(f"Successfully listed cells: {message}")
            logger.debug(f"Cells data: {repr(cells)}")
            await emit_agent_message(message, "list_all_cells", True)
            return {"success": True, "cells": cells or []}
        except Exception as e:
            logger.error(f"Error in agent_list_all_cells: {e}", exc_info=True)
            error_msg = f"Failed to list cells: {str(e)}"
            await emit_agent_message(error_msg, "list_all_cells", False)
            return {"success": False, "error": str(e)}

    @pydantic_agent.tool
    async def agent_share_your_reasoning(
        context: RunContext, reasoning: str = "", next_steps: str = ""
    ) -> Dict[str, Any]:
        """Share your reasoning and planned next steps."""
        logger.info(
            f"agent_share_your_reasoning called with reasoning_length={len(reasoning)}, has_next_steps={next_steps is not None}"
        )
        try:
            message = f"💭 Reasoning: {reasoning}"
            if next_steps:
                message += f"\n📋 Next steps: {next_steps}"
                logger.debug(f"Including next steps: {repr(next_steps)}")
            logger.info(f"Successfully sharing reasoning: {len(message)} characters")
            await emit_agent_message(message, "share_reasoning", True)
            return {"success": True, "message": "Reasoning shared successfully"}
        except Exception as e:
            logger.error(f"Error in agent_share_your_reasoning: {e}", exc_info=True)
            error_msg = f"Failed to share reasoning: {str(e)}"
            await emit_agent_message(error_msg, "share_reasoning", False)
            return {"success": False, "error": str(e)}

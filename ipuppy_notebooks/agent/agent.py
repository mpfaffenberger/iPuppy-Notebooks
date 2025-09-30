"""
Data Science Puppy agent - main module.
"""

import sys

import pathlib

import logging

import pydantic
from pydantic_ai import Agent

from ipuppy_notebooks.agent.prompts import get_system_prompt
from ipuppy_notebooks.agent.tools import register_data_science_tools
from ipuppy_notebooks.conversation_history import conversation_history

logger = logging.getLogger(__name__)

# Ensure ~/.code_puppy directory exists
home_dir = pathlib.Path.home()
code_puppy_dir = home_dir / ".code_puppy"
if not code_puppy_dir.exists():
    try:
        code_puppy_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created directory: {code_puppy_dir}")
    except Exception as e:
        logger.error(f"Failed to create directory {code_puppy_dir}: {e}")
        # We might not be able to proceed without this directory, but let's try

# Try to import ModelFactory, but fall back to direct model creation if not available
try:
    from code_puppy.model_factory import ModelFactory
    from code_puppy.config import MODELS_FILE
    USE_MODEL_FACTORY = True
except ImportError:
    USE_MODEL_FACTORY = False
    logger.warning("code_puppy.model_factory not available")


class AgentResponse(pydantic.BaseModel):
    """Represents a response from the agent."""

    output_message: str = pydantic.Field(
        ..., description="The final output message to display to the user"
    )
    awaiting_user_input: bool = pydantic.Field(
        False, description="True if user input is needed to continue the task"
    )
# type: ignore


class DataSciencePuppyAgent:
    """A data science specialized agent that controls iPuppy Notebooks."""

    def __init__(self):
        # Socket ID for notebook operations
        self.notebook_sid = ""
        # Current notebook name for conversation history
        self.current_notebook = ""

        # Load model
        try:
            self.config = ModelFactory.load_config()
            # Get the first available model as default
            self.current_model_key = list(self.config.keys())[0]
            self.model = ModelFactory.get_model(self.current_model_key, self.config)
        except Exception as e:
            logger.warning(f"Failed to load model via ModelFactory: {e}")
            sys.exit(1)

        # Create agent
        self.agent = Agent(
            model=self.model,
            instructions=get_system_prompt(),
            output_type=AgentResponse,
            retries=3,
        )

        # Register tools
        register_data_science_tools(self.agent, self)

    def set_model(self, model_key: str) -> bool:
        """Set the active model by key from the configuration."""
        try:
            if model_key not in self.config:
                logger.error(
                    f"Model key '{model_key}' not found in configuration. Available keys: {list(self.config.keys())}"
                )
                return False

            # Create new model instance
            new_model = ModelFactory.get_model(model_key, self.config)

            # Update the agent with new model
            self.model = new_model
            self.current_model_key = model_key

            # Create a new agent instance with the new model
            # (pydantic_ai doesn't support model swapping on existing agents)
            self.agent = Agent(
                model=self.model,
                instructions=get_system_prompt(),
                output_type=AgentResponse,
                retries=3,
            )

            # Re-register tools on the new agent
            register_data_science_tools(self.agent, self)

            logger.info(f"Successfully switched to model: {model_key}")
            return True

        except Exception as e:
            logger.error(f"Failed to switch to model '{model_key}': {e}")
            return False

    def get_available_models(self) -> dict:
        """Get all available models from the configuration."""
        return {key: config.get("name", key) for key, config in self.config.items()}

    def get_current_model(self) -> str:
        """Get the currently active model key."""
        return self.current_model_key

    def set_notebook_sid(self, sid: str):
        """Set the notebook socket ID for tool operations."""
        self.notebook_sid = sid
        logger.info(f"Set notebook_sid to: {sid}")

    def get_notebook_sid(self) -> str:
        """Get the current notebook socket ID."""
        return self.notebook_sid

    def set_current_notebook(self, notebook_name: str):
        """Set the current notebook name for conversation history."""
        self.current_notebook = notebook_name
        logger.info(f"Set current_notebook to: {notebook_name}")

    def get_current_notebook(self) -> str:
        """Get the current notebook name."""
        return self.current_notebook

    async def run(self, task: str) -> AgentResponse:
        """Run a data science task with the agent."""
        try:
            # Save user message to conversation history
            if self.current_notebook:
                conversation_history.add_message(self.current_notebook, "user", task)

            # Get conversation context for the agent
            context = ""
            if self.current_notebook:
                context = conversation_history.get_recent_context(
                    self.current_notebook, max_messages=10
                )

            # Prepare the full prompt with context
            full_task = task
            if context and context != "No previous conversation history.":
                full_task = f"{context}\n\n=== Current Request ===\n{task}"

            result = await self.agent.run(full_task)

            # Save agent response to conversation history
            if self.current_notebook and result.output:
                conversation_history.add_message(
                    self.current_notebook,
                    "agent",
                    result.output.output_message,
                    metadata={"awaiting_user_input": result.output.awaiting_user_input},
                )

            return result.output
        except Exception as e:
            logger.error(f"Error running agent: {e}")
            error_response = AgentResponse(
                output_message=f"Error executing data science task: {str(e)}",
                awaiting_user_input=False,
            )

            # Save error response to conversation history
            if self.current_notebook:
                conversation_history.add_message(
                    self.current_notebook,
                    "agent",
                    error_response.output_message,
                    metadata={"error": True},
                )

            return error_response


# Singleton instance
_data_science_puppy_agent = None


def get_data_science_puppy_agent() -> DataSciencePuppyAgent:
    """Get or create a singleton instance of the data science puppy agent."""
    global _data_science_puppy_agent
    if _data_science_puppy_agent is None:
        _data_science_puppy_agent = DataSciencePuppyAgent()
    return _data_science_puppy_agent

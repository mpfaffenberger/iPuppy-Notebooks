"""
Data Science Puppy agent - main module.
"""
import sys

import pathlib

import os
import logging

import pydantic
from pydantic_ai import Agent

from ipuppy_notebooks.agent.prompts import get_system_prompt
from ipuppy_notebooks.agent.tools import register_data_science_tools

logger = logging.getLogger(__name__)

# Try to import ModelFactory, but fall back to direct model creation if not available
try:
    from code_puppy.model_factory import ModelFactory
    MODELS_JSON_PATH = os.environ.get("MODELS_JSON_PATH", None)
    if MODELS_JSON_PATH is None:
        # Try to find the models.json file relative to the module
        import code_puppy.model_factory
        MODELS_JSON_PATH = pathlib.Path(code_puppy.model_factory.__file__).parent / "models.json"
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


class DataSciencePuppyAgent:
    """A data science specialized agent that controls iPuppy Notebooks."""
    
    def __init__(self):
        # Socket ID for notebook operations
        self.notebook_sid = ""

        # Load model
        try:
            self.config = ModelFactory.load_config(MODELS_JSON_PATH)
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
                logger.error(f"Model key '{model_key}' not found in configuration. Available keys: {list(self.config.keys())}")
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
        return {key: config.get('name', key) for key, config in self.config.items()}
    
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

    async def run(self, task: str) -> AgentResponse:
        """Run a data science task with the agent."""
        try:
            result = await self.agent.run(task)
            return result.output
        except Exception as e:
            logger.error(f"Error running agent: {e}")
            return AgentResponse(
                output_message=f"Error executing data science task: {str(e)}",
                awaiting_user_input=False
            )

# Singleton instance
_data_science_puppy_agent = None


def get_data_science_puppy_agent() -> DataSciencePuppyAgent:
    """Get or create a singleton instance of the data science puppy agent."""
    global _data_science_puppy_agent
    if _data_science_puppy_agent is None:
        _data_science_puppy_agent = DataSciencePuppyAgent()
    return _data_science_puppy_agent

"""
Data Science Puppy agent - main module.
"""
import pathlib

import os
import logging
from typing import Optional

import pydantic
from pydantic_ai import Agent

from code_puppy.model_factory import ModelFactory
from ipuppy_notebooks.agent.prompts import get_system_prompt
from ipuppy_notebooks.agent.tools import register_data_science_tools

logger = logging.getLogger(__name__)
MODELS_JSON_PATH = os.environ.get("MODELS_JSON_PATH", None)
if MODELS_JSON_PATH is None:
    MODELS_JSON_PATH = pathlib.Path(ModelFactory.__file__).parent / "models.json"
config = ModelFactory.load_config(MODELS_JSON_PATH)


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

        # Load model
        config = ModelFactory.load_config()
        self.model = ModelFactory.get_model(self.model_name, config)
        
        # Create agent
        self.agent = Agent(
            model=self.model,
            instructions=get_system_prompt(),
            output_type=AgentResponse,
            retries=3,
        )
        
        # Register tools
        register_data_science_tools(self.agent)
    
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

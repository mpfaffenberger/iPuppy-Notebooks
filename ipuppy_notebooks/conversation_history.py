"""
Conversation history management for iPuppy Notebooks.
Handles saving, loading, and managing agent conversation history.
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class ConversationHistory:
    """Manages conversation history for iPuppy Notebooks."""

    def __init__(self, history_dir: str = "conversation_history"):
        self.history_dir = Path(history_dir)
        self.history_dir.mkdir(exist_ok=True)
        logger.info(
            f"ConversationHistory initialized with directory: {self.history_dir}"
        )

    def get_history_file(self, notebook_name: str) -> Path:
        """Get the history file path for a given notebook."""
        # Clean notebook name for filename
        clean_name = notebook_name.replace(".py", "").replace(".ipynb", "")
        safe_name = "".join(
            c for c in clean_name if c.isalnum() or c in ("-", "_")
        ).rstrip()
        return self.history_dir / f"{safe_name}_history.json"

    def load_conversation_history(self, notebook_name: str) -> List[Dict[str, Any]]:
        """Load conversation history for a notebook."""
        history_file = self.get_history_file(notebook_name)

        if not history_file.exists():
            logger.info(f"No history file found for {notebook_name}, starting fresh")
            return []

        try:
            with open(history_file, "r", encoding="utf-8") as f:
                history = json.load(f)

            logger.info(
                f"Loaded {len(history)} conversation entries for {notebook_name}"
            )
            return history

        except Exception as e:
            logger.error(f"Error loading conversation history for {notebook_name}: {e}")
            return []

    def save_conversation_history(
        self, notebook_name: str, history: List[Dict[str, Any]]
    ) -> bool:
        """Save conversation history for a notebook."""
        history_file = self.get_history_file(notebook_name)

        try:
            with open(history_file, "w", encoding="utf-8") as f:
                json.dump(history, f, indent=2, ensure_ascii=False)

            logger.info(
                f"Saved {len(history)} conversation entries for {notebook_name}"
            )
            return True

        except Exception as e:
            logger.error(f"Error saving conversation history for {notebook_name}: {e}")
            return False

    def add_message(
        self,
        notebook_name: str,
        role: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Add a message to the conversation history."""
        history = self.load_conversation_history(notebook_name)

        entry = {
            "role": role,  # 'user' or 'agent'
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {},
        }

        history.append(entry)
        return self.save_conversation_history(notebook_name, history)

    def clear_history(self, notebook_name: str) -> bool:
        """Clear conversation history for a notebook."""
        history_file = self.get_history_file(notebook_name)

        try:
            if history_file.exists():
                history_file.unlink()
            logger.info(f"Cleared conversation history for {notebook_name}")
            return True

        except Exception as e:
            logger.error(
                f"Error clearing conversation history for {notebook_name}: {e}"
            )
            return False

    def get_recent_context(self, notebook_name: str, max_messages: int = 10) -> str:
        """Get recent conversation context as a formatted string for the agent."""
        history = self.load_conversation_history(notebook_name)

        if not history:
            return "No previous conversation history."

        # Get the most recent messages
        recent_history = history[-max_messages:]

        context_lines = ["=== Recent Conversation History ==="]
        for entry in recent_history:
            timestamp = entry.get("timestamp", "")
            role = entry.get("role", "unknown")
            message = entry.get("message", "")

            # Format timestamp for readability
            try:
                dt = datetime.fromisoformat(timestamp)
                time_str = dt.strftime("%Y-%m-%d %H:%M:%S")
            except:
                time_str = timestamp

            context_lines.append(f"[{time_str}] {role.upper()}: {message}")

        context_lines.append("=== End of Recent History ===")
        return "\n".join(context_lines)

    def get_conversation_summary(self, notebook_name: str) -> Dict[str, Any]:
        """Get a summary of the conversation history."""
        history = self.load_conversation_history(notebook_name)

        if not history:
            return {
                "total_messages": 0,
                "user_messages": 0,
                "agent_messages": 0,
                "first_message_time": None,
                "last_message_time": None,
            }

        user_messages = len([h for h in history if h.get("role") == "user"])
        agent_messages = len([h for h in history if h.get("role") == "agent"])

        return {
            "total_messages": len(history),
            "user_messages": user_messages,
            "agent_messages": agent_messages,
            "first_message_time": history[0].get("timestamp") if history else None,
            "last_message_time": history[-1].get("timestamp") if history else None,
        }


# Global conversation history manager
conversation_history = ConversationHistory()

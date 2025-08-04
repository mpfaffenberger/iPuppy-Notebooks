"""Utility functions to convert between VS-Code style ``.py`` notebook files and the
internal JSON cell structure used by the iPuppy front-end.

Cell delimiters follow the common convention::

    # %%            – code cell
    # %% [markdown] – markdown cell

Anything between two delimiters (or delimiter to EOF) is that cell's source.
The returned structure is compatible with Jupyter "notebook" cell dicts but
only uses the subset our UI needs: ``cell_type``, ``source`` and ``outputs``.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Dict, Literal

# Import the new frontend operations functions

Cell = Dict[str, object]

_DELIM_PREFIXES = ("# %", "## %", "# %%")


def _is_delimiter(line: str) -> bool:
    line = line.lstrip()
    return line.startswith(_DELIM_PREFIXES)


def _parse_delimiter(line: str) -> Literal["code", "markdown"]:
    """Return cell type encoded in delimiter line."""
    lower = line.lower()
    if "markdown" in lower:
        return "markdown"
    return "code"


def load_py_notebook(path: Path) -> Dict[str, object]:
    """Read a .py notebook file and return a notebook-like dict."""
    text = path.read_text(encoding="utf-8").splitlines(keepends=True)

    cells: List[Cell] = []
    current_lines: List[str] = []
    current_type: Literal["code", "markdown"] = "code"
    in_markdown_quotes = False

    def _flush():
        if current_lines:
            # For markdown cells, remove the triple quotes wrapper
            if current_type == "markdown":
                # Remove opening triple quotes if present
                if current_lines and current_lines[0].strip() == '"""':
                    current_lines.pop(0)
                # Remove closing triple quotes if present
                if current_lines and current_lines[-1].strip() == '"""':
                    current_lines.pop()

            cells.append(
                {
                    "cell_type": current_type,
                    "source": current_lines.copy(),
                    "outputs": [],
                }
            )
            current_lines.clear()

    for line in text:
        if _is_delimiter(line):
            # start new cell
            _flush()
            current_type = _parse_delimiter(line)
            in_markdown_quotes = False
            continue  # delimiter itself not included

        # Handle triple quotes for markdown cells
        if current_type == "markdown":
            stripped_line = line.strip()
            if stripped_line == '"""':
                if not in_markdown_quotes:
                    # Opening triple quotes - start collecting markdown content
                    in_markdown_quotes = True
                    continue  # Don't include the opening quotes
                else:
                    # Closing triple quotes - end of markdown content
                    in_markdown_quotes = False
                    continue  # Don't include the closing quotes
            elif in_markdown_quotes:
                # We're inside triple quotes, collect the content
                current_lines.append(line)
            # If we haven't seen opening quotes yet, skip until we do
        else:
            # Regular code cell
            current_lines.append(line)

    _flush()  # last cell

    return {
        "cells": cells,
        "metadata": {},
        "nbformat": 4,
        "nbformat_minor": 4,
    }


def dump_py_notebook(notebook: Dict[str, object]) -> str:
    """Serialize notebook dict to .py notebook string."""
    lines: List[str] = []
    cells: List[Cell] = notebook.get("cells", [])  # type: ignore[arg-type]
    for idx, cell in enumerate(cells):
        cell_type: str = str(cell.get("cell_type", "code"))
        if cell_type == "markdown":
            lines.append("# %% [markdown]\n")
            # Wrap markdown content in triple quotes to make it valid Python
            lines.append('"""\n')
            # convert markdown lines: make sure each ends with newline
            for l in cell.get("source", []):
                # markdown lines already include newlines in our UI
                lines.append(l)
            # Close the triple quotes
            if not lines[-1].endswith("\n"):
                lines.append("\n")
            lines.append('"""\n')
        else:
            lines.append("# %%\n")
            for l in cell.get("source", []):
                lines.append(l)
        # Ensure newline separation between cells (except after last)
        if idx != len(cells) - 1 and (not lines[-1].endswith("\n")):
            lines.append("\n")
    return "".join(lines)

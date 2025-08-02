# iPuppy Notebooks 🐶

A modern, dark-themed Jupyter notebook clone built with FastAPI and Jinja2 templates. No bloated IDEs or overpriced tools needed!

## Features

- Modern dark mode UI with purple accents
- File system management (create, delete, save notebooks)
- iPython kernel execution
- Notebook cell creation and management
- Bootstrap 5 powered responsive design

## Installation

1. Clone or download this repository
2. Install [uv](https://docs.astral.sh/uv/) if you haven't already:

```bash
pip install uv
```

3. Install the required dependencies:

```bash
uv pip install -r pyproject.toml
```

## Usage

1. Start the server:

```bash
python main.py
```

2. Open your browser and navigate to `http://localhost:8000`

3. Create a new notebook or open an existing one

4. Start a kernel to execute code cells

## Project Structure

```
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── templates/           # Jinja2 HTML templates
│   ├── base.html        # Base template with layout
│   └── index.html       # Main notebook interface
├── static/              # Static assets
│   ├── css/style.css    # Custom styling
│   └── js/main.js       # Frontend JavaScript
├── notebooks/           # Notebook files storage
├── kernels/            # Kernel management modules
│   ├── manager.py       # Kernel lifecycle management
│   └── executor.py      # Code execution functionality
```

## Future Enhancements

- Integrate with code-puppy for AI-assisted data science
- Add Markdown cell rendering
- Implement cell reordering and deletion
- Add support for multiple kernels
- Create a more robust notebook saving mechanism

## License

MIT License

## Author

Created by Michael Pfaffenberger on a rainy weekend in May 2025 to solve the problems of heavy IDEs and expensive tools like Windsurf and Cursor.

*iPuppy Notebooks is powered by code-puppy, your sassy, playful open-source AI code agent!*
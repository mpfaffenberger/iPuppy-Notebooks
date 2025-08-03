# 🐶 iPuppy Notebooks 🐶

**Agentic AI-Empowered Data Science for the Modern Era** 🚀🐕

A revolutionary notebook environment that combines the power of Jupyter-style computing with intelligent AI assistance. Built with FastAPI backend and React frontend, iPuppy Notebooks puts the fun back in data science! 🎉

## ✨ Features

🐕 **Puppy Scientist AI Agent** - Your personal data science companion that helps analyze data, write code, and answer questions  
🌙 **Modern Dark Theme** - Sleek monochromatic design with zinc color palette and JetBrains Mono fonts  
⚡ **Real-time Execution** - WebSocket-powered code execution with instant feedback  
📱 **Responsive Design** - Works beautifully on desktop and mobile  
🔄 **Cell Management** - Create, reorder, expand, and manage code/markdown cells  
⌨️ **Smart Shortcuts** - Shift+Enter to run cells and navigate seamlessly  
💾 **Auto-Save** - Never lose your work (currently disabled to prevent server reloads)  
🐍 **Python Kernel** - Full iPython kernel with autocomplete and rich output  

## 🚀 Quick Start

### Prerequisites 🐾
- Python 3.8+
- Node.js 16+
- [uv](https://docs.astral.sh/uv/) package manager

### Installation 📦

1. **Clone the repository** 🐕
   ```bash
   git clone <repository-url>
   cd iPuppy-Notebooks
   ```

2. **Backend Setup** 🐍
   ```bash
   # Install Python dependencies
   uv pip install -r pyproject.toml
   ```

3. **Frontend Setup** ⚛️
   ```bash
   # Install Node dependencies
   npm install
   
   # Build the React frontend
   npm run build
   ```

### Launch 🚀

1. **Start the FastAPI server** 🌐
   ```bash
   python main.py
   ```

2. **Open your browser** 🌍
   Navigate to `http://localhost:8000` and start your data science journey! 🐶

## 🎯 Usage Guide

### Getting Started 🐾
1. **Create a Notebook** - Click "create" in the sidebar and give your notebook a name
2. **Add Cells** - Use the "add cell" button to create code or markdown cells
3. **Run Code** - Press the 🚀 run button or use Shift+Enter to execute cells
4. **Chat with Puppy Scientist** - Ask questions and get AI-powered assistance in the sidebar

### Backend Operations 🐕

iPuppy Notebooks now supports triggering frontend operations directly from the backend! The following operations can be initiated server-side:

- `add_new_cell(cell_index, cell_type, content)` - Add a new cell at the specified index
- `delete_cell(cell_index)` - Delete a cell at the specified index
- `alter_cell_content(cell_index, content)` - Modify the content of a cell
- `execute_cell(cell_index, code)` - Execute a cell at the specified index
- `swap_cell_type(cell_index, new_type)` - Toggle a cell between code and markdown
- `move_cell(cell_index, new_index)` - Move a cell to a new position
- `read_cell_input(cell_index, sid)` - Read the input content of a cell (requires client session ID)
- `read_cell_output(cell_index, sid)` - Read the output content of a cell (requires client session ID)

To use these functions, simply import them:

```python
from ipuppy_notebooks import add_new_cell, delete_cell, alter_cell_content

# Example usage
add_new_cell(0, "code", "print('Hello from the backend!')")
delete_cell(1)
alter_cell_content(2, "x = 42\nprint(x)")
```

These operations will broadcast events via Socket.IO to all connected frontend clients, enabling real-time synchronization of notebook state across all devices.

### Keyboard Shortcuts ⌨️
- **Shift+Enter** - Execute current cell and move to next
- **Cell Navigation** - Seamlessly move between cells after execution

### Cell Types 📝
- **Code Cells** - Execute Python code with full kernel support
- **Markdown Cells** - Rich text formatting and documentation

## 🏗️ Architecture

```
🐶 iPuppy Notebooks Architecture 🐶
├── 🐍 Backend (FastAPI)
│   ├── main.py                 # FastAPI server and WebSocket handling
│   ├── ipuppy_notebooks/       # Core notebook functionality
│   └── notebooks/              # Stored notebook files
├── ⚛️ Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Header.tsx      # Top navigation with kernel status
│   │   │   ├── Sidebar.tsx     # Notebooks + Puppy Scientist
│   │   │   ├── NotebookCell.tsx # Individual cell component
│   │   │   └── NotebookContainer.tsx # Main notebook view
│   │   ├── App.tsx            # Main application logic
│   │   └── main.tsx           # React entry point
│   └── public/
│       └── puppy.svg          # Custom puppy favicon 🐕
```

## 🎨 Design Philosophy

iPuppy Notebooks embraces a **modern monochromatic aesthetic** with:
- 🎨 Zinc color palette (grey variants only)
- 🔤 JetBrains Mono monospace typography
- 🌙 Dark theme optimized for long coding sessions
- ✨ Subtle animations and clean interfaces
- 🐕 Playful puppy branding throughout

## 🤖 AI Agent Integration

The **Puppy Scientist** 🐕‍🦺 is your intelligent companion that can:
- 📊 Analyze your data and suggest insights
- 💻 Help write and debug Python code
- 📖 Explain complex concepts and libraries
- 🔍 Answer questions about your notebooks
- 🚀 Suggest optimizations and best practices

*Currently simulated - full AI integration coming soon!* 🎯

## 🛣️ Roadmap

### Phase 1: Foundation ✅
- [x] Modern React + TypeScript frontend
- [x] FastAPI backend with WebSocket support
- [x] Cell management and execution
- [x] Keyboard shortcuts and navigation
- [x] Modern UI/UX design

### Phase 2: AI Integration 🚧
- [ ] Real Puppy Scientist AI agent
- [ ] Code completion and suggestions
- [ ] Intelligent error handling
- [ ] Data analysis automation

### Phase 3: Advanced Features 🔮
- [ ] Collaborative editing
- [ ] Version control integration
- [ ] Plugin system
- [ ] Advanced visualization tools
- [ ] Export to various formats

## 🤝 Contributing

Want to help make iPuppy Notebooks even better? We'd love your contributions! 🐕

1. Fork the repository
2. Create a feature branch
3. Make your improvements
4. Submit a pull request

## 📄 License

MIT License - Feel free to use iPuppy Notebooks for your data science adventures! 🐾

## 🐕 About the Creator

Created with ❤️ by **Michael Pfaffenberger** to revolutionize how we approach data science. No more bloated IDEs or expensive proprietary tools - just pure, puppy-powered productivity! 🐶✨

---

**Ready to unleash your data science potential?** 🐕🚀  
*Woof woof! Let's analyze some data together!* 🐾📊
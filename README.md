# 🐶 iPuppy Notebooks 🐶

**Agentic AI-Empowered Data Science for the Modern Era** 🚀🐕

A revolutionary notebook environment that combines the power of Jupyter-style computing with intelligent AI assistance. Built with FastAPI backend and React frontend, iPuppy Notebooks puts the fun back in data science! 🎉

## ✨ Features

🐕 **Puppy Scientist AI Agent** - Fully integrated AI assistant that autonomously controls notebooks, writes code, executes analyses, and provides data science expertise  
🌙 **Modern Dark Theme** - Sleek monochromatic design with zinc color palette and JetBrains Mono fonts  
⚡ **Real-time Execution** - WebSocket-powered code execution with instant feedback and auto-scroll to outputs  
📊 **Rich Output Support** - LaTeX math rendering, Plotly charts, matplotlib/seaborn plots, images, videos, and more  
🧮 **LaTeX in Markdown** - Write beautiful mathematical expressions with KaTeX rendering (both inline `$x$` and display `$$x$$`)  
📱 **Responsive Design** - Works beautifully on desktop and mobile  
🔄 **Cell Management** - Create, reorder, expand, and manage code/markdown cells with full programmatic control  
⌨️ **Smart Shortcuts** - Shift+Enter to run cells and navigate seamlessly with intelligent tab handling  
🤖 **Agentic Operations** - AI can directly manipulate notebooks: add cells, execute code, read outputs, and more  
🐍 **Python Kernel** - Full iPython kernel with autocomplete, rich MIME type support, and matplotlib inline display  
🎨 **Animated UI** - Puppy spinner animations and smooth transitions throughout  

## 🚀 Quick Start

### How to Run 🏃‍♂️

The fastest way to get iPuppy Notebooks running:

1. **Set up your API keys** 🔑
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export GEMINI_API_KEY="your-gemini-api-key"
   export ANTHROPIC_API_KEY="your-anthropic-api-key"
   # Add any other AI provider keys you want to use
   ```

2. **Run with uvx** ⚡
   ```bash
   uvx ipuppy-notebooks
   ```

That's it! iPuppy Notebooks will start and be available at `http://localhost:8000` 🐶

### Development Setup 🛠️

For development or if you prefer to build from source:

#### Prerequisites 🐾
- Python 3.10+
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
   
   # Install code_puppy for AI model management (optional but recommended)
   # Follow instructions at: https://github.com/anthropics/code_puppy
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
3. **Run Code** - Press the 🚀 run button or use Shift+Enter to execute cells (automatically scrolls to output!)
4. **Chat with Puppy Scientist** - Ask questions and watch the AI autonomously control your notebook, write code, and analyze data
5. **Write Math** - Use LaTeX in markdown cells: `$inline$` or `$$display$$` for beautiful mathematical expressions
6. **Rich Outputs** - Enjoy Plotly charts, matplotlib plots, LaTeX rendering, images, and more

### AI Agent Operations 🤖

The **Puppy Scientist AI Agent** can autonomously control your notebook through these operations:

**Notebook Manipulation:**
- `add_new_cell(cell_index, cell_type, content)` - Add new code/markdown cells
- `delete_cell(cell_index)` - Remove cells
- `alter_cell_content(cell_index, content)` - Modify cell content
- `execute_cell(cell_index)` - Execute cells and wait for results
- `swap_cell_type(cell_index, new_type)` - Switch between code/markdown
- `move_cell(cell_index, new_index)` - Reorder cells

**State Reading (requires active notebook):**
- `list_all_cells()` - Get complete notebook overview
- `read_cell_input(cell_index)` - Read cell source code
- `read_cell_output(cell_index)` - Read execution outputs

**Communication:**
- `share_your_reasoning(reasoning, next_steps)` - Explain thought process

The agent uses these tools to autonomously:
- 📊 Analyze your data and create visualizations
- 💻 Write, execute, and debug Python code
- 📝 Create markdown documentation with LaTeX math
- 🔍 Inspect notebook state and outputs
- 🚀 Implement complete data science workflows

Example conversation:
```
You: "Analyze the iris dataset and create some visualizations"
🐶: *Creates cells, loads data, performs EDA, generates Plotly charts*
```

### Keyboard Shortcuts ⌨️
- **Shift+Enter** - Execute current cell and move to next (with auto-scroll to output)
- **Tab** - Smart indentation and autocomplete in code cells
- **Cell Navigation** - Seamlessly move between cells after execution

### Cell Types 📝
- **Code Cells** - Execute Python code with full IPython kernel, rich outputs, and autocomplete
- **Markdown Cells** - Rich text formatting with LaTeX math support (`$inline$` and `$$display$$`)

## 🏗️ Architecture

```
🐶 iPuppy Notebooks Architecture 🐶
├── 🐍 Backend (FastAPI)
│   ├── main.py                 # FastAPI server and WebSocket handling
│   ├── ipuppy_notebooks/       # Core notebook functionality
│   │   ├── agent/              # AI agent system
│   │   │   ├── agent.py        # DataSciencePuppyAgent main class
│   │   │   ├── tools.py        # Notebook manipulation tools
│   │   │   └── prompts.py      # System prompts and instructions
│   │   ├── kernels/            # Jupyter kernel management
│   │   │   ├── manager.py      # Kernel lifecycle and initialization
│   │   │   └── executor.py     # Code execution handling
│   │   ├── frontend_operations.py # Backend→Frontend communication
│   │   └── socket_handlers.py  # WebSocket event handling
│   └── notebooks/              # Stored notebook files (.py format)
├── ⚛️ Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Header.tsx      # Top navigation with kernel status
│   │   │   ├── Sidebar.tsx     # Notebooks + Puppy Scientist chat
│   │   │   ├── NotebookCell.tsx # Individual cell with LaTeX support
│   │   │   └── NotebookContainer.tsx # Main notebook view
│   │   ├── lib/
│   │   │   └── tabHandler.ts   # Smart tab indentation system
│   │   ├── App.tsx            # Main application logic & WebSocket
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

The **Puppy Scientist** 🐕‍🦺 is a fully autonomous AI agent powered by pydantic-ai that can:
- 🎯 **Autonomous Operation** - Takes high-level requests and executes complete workflows independently
- 📊 **Data Analysis** - Loads, cleans, analyzes data and creates professional visualizations
- 💻 **Code Generation** - Writes, executes, and debugs Python code in real-time
- 🧮 **Mathematical Communication** - Creates markdown cells with LaTeX equations and explanations
- 🔍 **Notebook Inspection** - Reads existing notebook state and builds upon your work
- 🚀 **Best Practices** - Follows data science methodologies and coding standards
- 🐕 **Personality** - Fun, informal, and pedantic about data science principles (refuses to make pie charts!)

**Supported AI Models:**
- Claude (Anthropic) - Recommended for best performance
- GPT-4 series (OpenAI) 
- QWEN models (Alibaba)
- Any model supported by pydantic-ai

The agent maintains conversation history per notebook and can switch between different models on the fly! 🎯

## 🛣️ Roadmap

### Phase 1: Foundation ✅
- [x] Modern React + TypeScript frontend
- [x] FastAPI backend with WebSocket support
- [x] Cell management and execution
- [x] Keyboard shortcuts and navigation
- [x] Modern UI/UX design

### Phase 2: AI Integration ✅
- [x] Fully autonomous Puppy Scientist AI agent
- [x] Real-time notebook manipulation by AI
- [x] Multi-model support (Claude, GPT-4, QWEN, etc.)
- [x] Conversation history per notebook
- [x] Intelligent error handling and guidance

### Phase 3: Rich Content ✅
- [x] LaTeX math rendering in markdown cells
- [x] Comprehensive MIME type support (images, videos, audio, JSON, CSV)
- [x] Plotly charts with proper timing
- [x] Matplotlib/seaborn inline display
- [x] Auto-scroll to outputs on execution
- [x] Animated puppy spinner and smooth UI transitions

### Phase 4: Advanced Features 🔮
- [ ] Collaborative editing
- [ ] Version control integration
- [ ] Plugin system
- [ ] Export to various formats (PDF, HTML, etc.)
- [ ] Custom visualization libraries
- [ ] Advanced data connectors

## 🤝 Contributing

Want to help make iPuppy Notebooks even better? We'd love your contributions! 🐕

1. Fork the repository
2. Create a feature branch
3. Make your improvements
4. Submit a pull request

## 📄 License

MIT License - Feel free to use iPuppy Notebooks for your data science adventures! 🐾

## 🐕 About the Creator

Created with ❤️ by **Michael Pfaffenberger** to revolutionize how we approach data science. iPuppy Notebooks combines the best of Jupyter-style computing with cutting-edge AI assistance - no more bloated IDEs or expensive proprietary tools, just pure, puppy-powered productivity! 🐶✨

**Why iPuppy Notebooks?**
- 🤖 **True AI Partnership** - The agent doesn't just suggest, it actually does the work
- 📊 **Beautiful Math & Viz** - LaTeX rendering and rich outputs make presentations ready
- ⚡ **Lightning Fast** - Modern architecture with real-time updates
- 🎨 **Thoughtful Design** - Every detail crafted for the data science workflow
- 🐕 **Pure Joy** - Data science should be fun, not frustrating!

---

**Ready to unleash your data science potential?** 🐕🚀  
*Ask the Puppy Scientist: "Analyze the Titanic dataset and create some visualizations"*  
*Watch as it autonomously loads data, performs EDA, and generates beautiful charts!* 🐾📊
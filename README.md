# iPuppyNotebooks 🐶

A web-based Jupyter-like system featuring Code Puppy integration for AI-assisted notebook cell editing!

## High-Level Architecture Plan

### Core Components

1. **Frontend (React)**
   - Notebook editor interface
   - Cell components (code, markdown, output)
   - Code Puppy editing panel
   - Real-time collaboration features

2. **Backend (Node.js/Express)**
   - REST API for notebook operations
   - WebSocket server for real-time updates
   - Code execution environment
   - Code Puppy service integration

3. **Storage**
   - File-based storage (JSON notebooks)
   - Maybe MongoDB for user data later

4. **Code Puppy Integration**
   - API endpoint for sending cell content to Code Puppy
   - Response handling and cell update mechanism
   - Editing suggestions UI

### Key Features

- Create, edit, and execute notebook cells
- AI-assisted code editing with Code Puppy
- Real-time collaboration (stretch goal)
- Multiple language support (Python, JavaScript initially)
- Export notebooks to various formats

### Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, WebSocket
- **Execution**: Docker containers or subprocess execution
- **Storage**: File system (JSON) or MongoDB
- **Code Puppy**: API integration with the Code Puppy service

### Current Implementation Status

- ✅ Basic server structure with Express
- ✅ WebSocket server for real-time collaboration
- ✅ Notebook manager for in-memory storage
- ✅ Code Puppy client for API integration
- ✅ REST API endpoints for notebook operations
- ✅ Basic frontend with notebook interface
- ✅ Code Puppy integration endpoints (edit, explain, generate)

Let's build this thing! 🚀
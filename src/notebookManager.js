// Notebook management utility functions 🐶

class NotebookManager {
  constructor() {
    this.notebooks = new Map(); // In-memory storage for now
  }

  // Create a new notebook
  createNotebook() {
    const id = this.generateId();
    const notebook = {
      id,
      cells: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.notebooks.set(id, notebook);
    return notebook;
  }

  // Get a notebook by ID
  getNotebook(id) {
    return this.notebooks.get(id);
  }

  // Get all notebooks
  getAllNotebooks() {
    return Array.from(this.notebooks.values());
  }

  // Update a notebook
  updateNotebook(id, updates) {
    const notebook = this.notebooks.get(id);
    if (!notebook) {
      return null;
    }
    
    Object.assign(notebook, updates);
    notebook.updatedAt = new Date();
    this.notebooks.set(id, notebook);
    return notebook;
  }

  // Delete a notebook
  deleteNotebook(id) {
    return this.notebooks.delete(id);
  }

  // Generate a unique ID for notebooks
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Add a cell to a notebook
  addCell(notebookId, cell) {
    const notebook = this.getNotebook(notebookId);
    if (!notebook) {
      return null;
    }
    
    const newCell = {
      id: this.generateId(),
      ...cell
    };
    
    notebook.cells.push(newCell);
    this.updateNotebook(notebookId, { cells: notebook.cells });
    return newCell;
  }

  // Update a cell in a notebook
  updateCell(notebookId, cellId, updates) {
    const notebook = this.getNotebook(notebookId);
    if (!notebook) {
      return null;
    }

    const cellIndex = notebook.cells.findIndex(cell => cell.id === cellId);
    if (cellIndex === -1) {
      return null;
    }

    Object.assign(notebook.cells[cellIndex], updates);
    this.updateNotebook(notebookId, { cells: notebook.cells });
    return notebook.cells[cellIndex];
  }
}

module.exports = NotebookManager;
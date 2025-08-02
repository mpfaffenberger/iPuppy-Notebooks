const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const NotebookManager = require('./notebookManager'); // 🐶
const CodePuppyClient = require('./codePuppyClient'); // 🚀

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time collaboration
const wss = new WebSocket.Server({ server });

// Initialize managers
const notebookManager = new NotebookManager();
const codePuppyClient = new CodePuppyClient();

app.use(cors());
app.use(bodyParser.json());

// Serve static files from public directory
app.use(express.static('public'));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// REST API endpoints for notebooks
app.get('/api/notebooks', (req, res) => {
  const notebooks = notebookManager.getAllNotebooks();
  res.json({ notebooks });
});

app.post('/api/notebooks', (req, res) => {
  const notebook = notebookManager.createNotebook();
  res.json(notebook);
});

app.get('/api/notebooks/:id', (req, res) => {
  const notebook = notebookManager.getNotebook(req.params.id);
  if (!notebook) {
    return res.status(404).json({ error: 'Notebook not found' });
  }
  res.json(notebook);
});

app.put('/api/notebooks/:id', (req, res) => {
  const notebook = notebookManager.updateNotebook(req.params.id, req.body);
  if (!notebook) {
    return res.status(404).json({ error: 'Notebook not found' });
  }
  res.json(notebook);
});

app.delete('/api/notebooks/:id', (req, res) => {
  const success = notebookManager.deleteNotebook(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Notebook not found' });
  }
  res.json({ success: true });
});

// Code Puppy integration endpoint
app.post('/api/code-puppy/edit', async (req, res) => {
  try {
    const { content, language } = req.body;
    const editedContent = await codePuppyClient.editCode(content, language);
    res.json({ success: true, editedContent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Code Puppy explanation endpoint
app.post('/api/code-puppy/explain', async (req, res) => {
  try {
    const { content, language } = req.body;
    const explanation = await codePuppyClient.explainCode(content, language);
    res.json({ success: true, explanation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Code Puppy generation endpoint
app.post('/api/code-puppy/generate', async (req, res) => {
  try {
    const { prompt, language } = req.body;
    const generatedCode = await codePuppyClient.generateCode(prompt, language);
    res.json({ success: true, generatedCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected 🐶');
  
  ws.on('message', (message) => {
    // Broadcast to all clients for real-time collaboration
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  
  ws.on('close', () => {
    console.log('Client disconnected 🐾');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`iPuppyNotebooks server 🐶 running on port ${PORT} 🚀`);
});
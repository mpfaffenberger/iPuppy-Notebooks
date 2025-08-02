import axios from 'axios';

// Configure API base URL
const API_BASE_URL = '/api/v1';

// Create a dedicated API instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export { api };
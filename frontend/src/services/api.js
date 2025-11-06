import axios from 'axios';


const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

const apiClient = axios.create({
  baseURL: API_BASE,
    headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    },
    
});

export default apiClient;
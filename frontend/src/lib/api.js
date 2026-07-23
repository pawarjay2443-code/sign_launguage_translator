import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const recognizeLandmarks = async (data) => {
  const res = await apiClient.post('/api/recognize', data);
  return res.data;
};

export const getStatus = async () => {
  const res = await apiClient.get('/api/status');
  return res.data;
};

export const sendSpace = async () => {
  const res = await apiClient.post('/api/space');
  return res.data;
};

export const sendBackspace = async () => {
  const res = await apiClient.post('/api/backspace');
  return res.data;
};

export const sendClear = async () => {
  const res = await apiClient.post('/api/clear');
  return res.data;
};

export const sendReset = async () => {
  const res = await apiClient.post('/api/reset');
  return res.data;
};

export const sendSpeak = async (text) => {
  const res = await apiClient.post('/api/speak', { text });
  return res.data;
};

export const getLessons = async () => {
  const res = await apiClient.get('/api/lessons');
  return res.data;
};

export const sendAssistantMessage = async (message, sessionId, context) => {
  const res = await apiClient.post('/api/assistant', {
    message,
    session_id: sessionId,
    context,
  });
  return res.data;
};

export const getAssistantSuggestions = async () => {
  const res = await apiClient.get('/api/assistant/suggestions');
  return res.data;
};

export const getHealth = async () => {
  const res = await apiClient.get('/api/health');
  return res.data;
};

export default apiClient;

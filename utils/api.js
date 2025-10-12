import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token inválido, cerrar sesión
    localStorage.removeItem('token');
    window.location.href = '/';
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Hook para usar en componentes
export const useApi = () => {
  const { token } = useAuth();

  const get = (endpoint) => apiFetch(endpoint);
  
  const post = (endpoint, data) => 
    apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data) });
  
  const put = (endpoint, data) => 
    apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(data) });
  
  const del = (endpoint) => 
    apiFetch(endpoint, { method: 'DELETE' });

  return { get, post, put, del };
};
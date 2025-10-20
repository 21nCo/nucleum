import { env } from '$env/dynamic/public';

export const API_BASE_URL = env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}

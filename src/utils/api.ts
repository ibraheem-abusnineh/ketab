export const API_BASE = ((): string => {
  // Use environment variable if provided (standard for Amplify/App Runner)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // In development, backend runs on port 5000
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5000';
  }
  // In production, default to same origin
  return '';
})();

export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  const url = typeof input === 'string' ? `${API_BASE}${input}` : input;
  
  // Automatically add Authorization header if admin token exists in localStorage
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  
  const headers = new Headers(init?.headers || {});
  if (adminToken && !headers.has('Authorization')) {
    headers.set('Authorization', adminToken);
  }

  const response = await fetch(url as RequestInfo, {
    ...init,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response;
}

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`,
  };
}

export function handleAuthError(response: Response): boolean {
  if (response.status === 401) {
    // Token is invalid or expired
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    // Only redirect if we're not already on login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return true;
  }
  return false;
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem('admin_token');
  return !!token;
}

export function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

export function clearAuth(): void {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
}


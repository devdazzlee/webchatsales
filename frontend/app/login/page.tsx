'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      // Verify token is still valid
      fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.valid) {
            // Token is valid, redirect to dashboard
            router.push('/dashboard');
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
          }
        })
        .catch(() => {
          // Network error, remove token
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        });
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        // Store token in localStorage
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000', color: 'var(--ink)' }}>
      <div className="w-full max-w-md">
        <div className="border rounded-lg p-8" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <Image 
                src="/logo.png" 
                alt="WebChatSales Logo" 
                width={80} 
                height={80}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>Admin Login</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>WebChatSales Dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border rounded transition-colors"
                style={{ 
                  background: 'var(--bg)', 
                  borderColor: 'var(--line)', 
                  color: 'var(--ink)' 
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                placeholder="Enter username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border rounded transition-colors"
                style={{ 
                  background: 'var(--bg)', 
                  borderColor: 'var(--line)', 
                  color: 'var(--ink)' 
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--emerald)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
                placeholder="Enter password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 text-black font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-emerald hover:opacity-90"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              ← Back to Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


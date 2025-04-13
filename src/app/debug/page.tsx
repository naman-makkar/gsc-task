'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthStatus {
  status: string;
  token?: string;
  payload?: Record<string, any>;
  error?: string;
}

interface ServerAuthStatus {
  status: string;
  userId?: string;
  tokenExists?: boolean;
  verificationResult?: string;
  serverTime?: string;
  error?: string;
  details?: string;
}

const DebugPage: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [cookies, setCookies] = useState<string>('Loading...');
  const [apiTest, setApiTest] = useState<Record<string, any> | string>('Not tested');
  const [serverAuthStatus, setServerAuthStatus] = useState<ServerAuthStatus | string | null>('Checking...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie || 'No cookies found');

    // Test client-side authentication
    const checkAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/user/profile');
        
        if (response.ok) {
          const data = await response.json();
          setAuthStatus({ status: 'Authenticated', token: data.token, payload: data });
        } else {
          setAuthStatus({ status: 'Not authenticated' });
        }
      } catch (err: unknown) {
        console.error('Error fetching auth status:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to fetch auth status: ${message}`);
        setAuthStatus({ status: 'Error' });
      } finally {
        setLoading(false);
      }
    };

    // Test server-side authentication
    const checkServerAuth = async () => {
      try {
        setServerAuthStatus('Checking...');
        const response = await fetch('/api/debug/auth-status');
        const data: ServerAuthStatus = await response.json();
        setServerAuthStatus(data);
      } catch (err: unknown) {
        console.error('Error fetching server auth status:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setServerAuthStatus(`Error: ${message}`);
      }
    };

    checkAuth();
    checkServerAuth();
  }, []);

  const testGscApi = async () => {
    setApiTest('Testing...');
    try {
      const response = await fetch('/api/gsc/sites');
      
      if (response.ok) {
        const data = await response.json();
        setApiTest(data);
      } else {
        const text = await response.text();
        setApiTest(`Failed: ${response.status} - ${text}`);
      }
    } catch (error: unknown) {
      setApiTest(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleRefreshServerStatus = () => {
    setServerAuthStatus('Refreshing...');
    const checkServerAuth = async () => {
      try {
        const response = await fetch('/api/debug/auth-status');
        const data: ServerAuthStatus = await response.json();
        setServerAuthStatus(data);
      } catch (err: unknown) {
        console.error('Error refreshing server auth status:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setServerAuthStatus(`Error: ${message}`);
      }
    };
    checkServerAuth();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Client-Side Authentication Status</h2>
          <div className="p-4 bg-gray-100 rounded mb-4">
            {loading ? (
              <p>Loading status...</p>
            ) : error ? (
              <p className="text-red-600 dark:text-red-400">Error: {error}</p>
            ) : authStatus ? (
              <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(authStatus, null, 2)}</pre>
            ) : (
              <p>No status information available.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Server-Side Authentication Status</h2>
          <button onClick={handleRefreshServerStatus} className="mb-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
            Refresh Status
          </button>
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded mb-4">
            {typeof serverAuthStatus === 'string' ? (
              <p>{serverAuthStatus}</p>
            ) : serverAuthStatus ? (
              <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(serverAuthStatus, null, 2)}</pre>
            ) : (
              <p>No server status information available.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cookies</h2>
          <div className="p-4 bg-gray-100 rounded overflow-x-auto">
            <pre className="whitespace-pre-wrap">{cookies}</pre>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          <div className="p-4 bg-gray-100 rounded mb-4 overflow-x-auto">
            <pre className="text-xs whitespace-pre-wrap break-all">
              {typeof apiTest === 'string' ? apiTest : JSON.stringify(apiTest, null, 2)}
            </pre>
          </div>
          <button
            onClick={testGscApi}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test GSC API (/api/gsc/sites)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Go Home
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default DebugPage; 
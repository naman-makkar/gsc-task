'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugPage() {
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('Loading...');
  const [apiTest, setApiTest] = useState<string>('Not tested');
  const [serverAuthStatus, setServerAuthStatus] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie || 'No cookies found');

    // Test client-side authentication
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/profile');
        
        if (response.ok) {
          const data = await response.json();
          setAuthStatus('Authenticated');
          setUserProfile(data);
        } else {
          setAuthStatus('Not authenticated');
        }
      } catch (error) {
        setAuthStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Test server-side authentication
    const checkServerAuth = async () => {
      try {
        const response = await fetch('/api/debug/auth-status');
        
        if (response.ok) {
          const data = await response.json();
          setServerAuthStatus(data);
        } else {
          setServerAuthStatus({ error: `Failed with status: ${response.status}` });
        }
      } catch (error) {
        setServerAuthStatus({ 
          error: `Error: ${error instanceof Error ? error.message : String(error)}` 
        });
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
        setApiTest(`Success: Found ${data.length} sites`);
      } else {
        const text = await response.text();
        setApiTest(`Failed: ${response.status} - ${text}`);
      }
    } catch (error) {
      setApiTest(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const refreshServerAuth = async () => {
    setServerAuthStatus('Refreshing...');
    try {
      const response = await fetch('/api/debug/auth-status');
      
      if (response.ok) {
        const data = await response.json();
        setServerAuthStatus(data);
      } else {
        setServerAuthStatus({ error: `Failed with status: ${response.status}` });
      }
    } catch (error) {
      setServerAuthStatus({ 
        error: `Error: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Client-Side Authentication Status</h2>
          <div className="p-4 bg-gray-100 rounded mb-4">
            <p><strong>Status:</strong> {authStatus}</p>
            {userProfile && (
              <div className="mt-2">
                <p><strong>Email:</strong> {userProfile.email}</p>
                <p><strong>Name:</strong> {userProfile.name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Server-Side Authentication Status</h2>
          <div className="p-4 bg-gray-100 rounded mb-4 overflow-x-auto">
            {serverAuthStatus === 'Refreshing...' ? (
              <p>Refreshing...</p>
            ) : serverAuthStatus ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(serverAuthStatus, null, 2)}</pre>
            ) : (
              <p>Loading server auth status...</p>
            )}
          </div>
          <button
            onClick={refreshServerAuth}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Refresh Server Auth Status
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cookies</h2>
          <div className="p-4 bg-gray-100 rounded overflow-x-auto">
            <pre className="whitespace-pre-wrap">{cookies}</pre>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          <div className="p-4 bg-gray-100 rounded mb-4">
            <p><strong>Status:</strong> {apiTest}</p>
          </div>
          <button
            onClick={testGscApi}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test GSC API
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
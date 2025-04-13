'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Home() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const error = searchParams.get('error');

  // Function to handle Google login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Call our API to get the Google OAuth URL
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Google's OAuth consent screen
        window.location.href = data.url;
      } else {
        console.error('No URL returned from auth endpoint');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      setIsLoading(false);
    }
  };

  // Error messages mapping
  const errorMessages: Record<string, string> = {
    'auth_error': 'Authentication failed. Please try again.',
    'no_code': 'No authorization code received.',
    'no_token': 'Failed to receive access token.',
    'no_user_info': 'Could not retrieve user information.',
    'db_error': 'Database error occurred.',
    'token_error': 'Error storing authentication tokens.',
    'unknown': 'An unknown error occurred. Please try again.'
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">GSC Report Builder</h1>
          <p className="text-gray-600">
            Create custom reports with your Google Search Console data
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {errorMessages[error] || 'An error occurred during authentication.'}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex items-center justify-center w-full bg-white border border-gray-300 rounded-md shadow-sm px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 mr-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
                <path fill="none" d="M1 1h22v22H1z" />
              </svg>
              Login with Google
            </>
          )}
        </button>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Connect your Google Search Console account to analyze and build custom reports.
          </p>
        </div>
      </div>
    </main>
  );
}

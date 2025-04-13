'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// Client component that uses useSearchParams
function LoginPage() {
  const router = useRouter();
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-slate-900 text-slate-200">
      <div className="max-w-sm w-full bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="text-center mb-8">
            {/* Optional: Add an icon or logo here if you have one */}
            {/* <Image src="/logo-dark.png" alt="Logo" width={64} height={64} className="mx-auto mb-4" /> */}
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100 mb-2">GSC Report Builder</h1>
            <p className="text-sm text-slate-400">
              Connect your Google account to access reports.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-md mb-6 shadow-sm">
              <p className="font-medium text-red-200">Authentication Error</p>
              <p className="text-sm">{errorMessages[error] || 'An unknown error occurred.'}</p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 text-white rounded-lg shadow-md px-4 py-3 text-base font-medium transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2 -ml-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1Z"></path>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <div className="mt-6 text-center text-xs text-slate-400">
            <p>
              Securely connect using Google OAuth.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// Main component with Suspense
export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <LoginPage />
    </Suspense>
  );
}

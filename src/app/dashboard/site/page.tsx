'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ReportBuilderProvider } from '@/context/ReportBuilderContext';
import { ReportBuilder } from '@/components/ReportBuilder/ReportBuilder';

type UserProfile = {
  name: string;
  email: string;
};

export default function SiteDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteUrl = searchParams.get('url');
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if no site URL provided
    if (!siteUrl) {
      router.push('/dashboard');
      return;
    }
    
    const fetchData = async () => {
      try {
        // Fetch user profile
        const profileResponse = await fetch('/api/user/profile');
        
        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            router.push('/');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }
        
        const profileData = await profileResponse.json();
        setUserProfile(profileData);
        
        // Save selected site to user settings
        const saveResponse = await fetch('/api/gsc/selected-site', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ siteUrl }),
        });
        
        if (!saveResponse.ok) {
          console.warn('Failed to save selected site');
          // Continue anyway as this is not critical
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, siteUrl]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg">Loading site data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Site Data</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                  GSC Report Builder
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              {userProfile && (
                <div className="flex items-center">
                  <span className="text-gray-700 mr-4">{userProfile.name || userProfile.email}</span>
                  <button
                    onClick={handleLogout}
                    className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-4 flex items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Properties
            </Link>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Build Report for {siteUrl}</h2>
            
            {/* Report Builder */}
            <ReportBuilderProvider siteUrl={siteUrl}>
              <ReportBuilder siteUrl={siteUrl} />
            </ReportBuilderProvider>
          </div>
        </div>
      </div>
    </div>
  );
} 
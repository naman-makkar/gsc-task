'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Site = {
  siteUrl: string;
  permissionLevel: string;
};

type UserProfile = {
  name: string;
  email: string;
};

export default function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const router = useRouter();

  // Fetch user profile and sites data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile
        const profileResponse = await fetch('/api/user/profile');
        
        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            // If unauthorized, redirect to login
            router.push('/');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }
        
        const profileData = await profileResponse.json();
        setUserProfile(profileData);

        // Fetch user's GSC sites
        const sitesResponse = await fetch('/api/gsc/sites');
        
        if (!sitesResponse.ok) {
          throw new Error('Failed to fetch sites');
        }
        
        const sitesData = await sitesResponse.json();
        setSites(sitesData);
        
        // Check if user has a previously selected site
        const selectedSiteResponse = await fetch('/api/gsc/selected-site');
        
        if (selectedSiteResponse.ok) {
          const selectedSiteData = await selectedSiteResponse.json();
          if (selectedSiteData.selectedSite) {
            setSelectedSite(selectedSiteData.selectedSite);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    router.push('/');
  };
  
  const handleSiteSelection = (siteUrl: string) => {
    router.push(`/dashboard/site?url=${encodeURIComponent(siteUrl)}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg">Loading your dashboard...</span>
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
            <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => router.push('/')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to the selected site dashboard if there's only one site
  if (sites.length === 1 && !selectedSite) {
    const siteUrl = sites[0].siteUrl;
    router.push(`/dashboard/site?url=${encodeURIComponent(siteUrl)}`);
    return null;
  }

  // If there's a previously selected site, show a quick access card
  const hasSelectedSite = selectedSite && sites.some(site => site.siteUrl === selectedSite);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">GSC Report Builder</h1>
              </div>
              <div className="ml-6 flex space-x-4">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    true ? 'text-white bg-blue-600' : 'text-gray-300 hover:text-white hover:bg-blue-700'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-blue-700"
                >
                  Reports
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
          {hasSelectedSite && (
            <div className="mb-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Continue with your previous site</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">{selectedSite}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {sites.find(site => site.siteUrl === selectedSite)?.permissionLevel || 'Access level unknown'}
                  </p>
                </div>
                <button
                  onClick={() => handleSiteSelection(selectedSite)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Search Console Properties</h2>
            
            {sites.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No Search Console properties found for your account.</p>
                <p className="text-gray-500 mt-2">
                  Please make sure you have access to properties in Google Search Console.
                </p>
                <div className="mt-6">
                  <a 
                    href="https://search.google.com/search-console" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Google Search Console
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sites.map((site) => (
                  <div 
                    key={site.siteUrl} 
                    className="relative border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSiteSelection(site.siteUrl)}
                  >
                    <div className="p-5">
                      <div className="truncate font-medium text-gray-900 mb-1">
                        {site.siteUrl}
                      </div>
                      <div className="text-sm text-gray-500">
                        {site.permissionLevel}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                          Select
                          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {selectedSite === site.siteUrl && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
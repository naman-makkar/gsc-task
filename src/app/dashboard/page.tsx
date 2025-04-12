'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';

import AnimatedPageWrapper from '@/components/ui/AnimatedPageWrapper'; // Assuming alias setup
import DashboardHeader from '@/components/ui/DashboardHeader';     // Assuming alias setup
import PreviousSiteCard from '@/components/ui/PreviousSiteCard';   // Assuming alias setup
import PropertyCard from '@/components/ui/PropertyCard';       // Assuming alias setup

type Site = {
  siteUrl: string;
  permissionLevel: string;
};

type UserProfile = {
  name: string;
  email: string;
  avatar?: string; // Changed to correct field name 'avatar'
};

export default function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let shouldRedirect = false; // Variable to track redirection
    let fetchedSitesData: Site[] | null = null; // Variable to hold sites data for finally block
    let previouslySelectedSiteUrl: string | null = null; // Variable to hold selection status for finally block

    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      shouldRedirect = false; // Reset on each fetch attempt
      fetchedSitesData = null;
      previouslySelectedSiteUrl = null;

      try {
        const [profileResponse, sitesResponse, selectedSiteResponse] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/gsc/sites'),
          fetch('/api/gsc/selected-site')
        ]);

        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            router.push('/');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }
        const profileData = await profileResponse.json();
        setUserProfile(profileData);

        if (!sitesResponse.ok) throw new Error('Failed to fetch sites');
        const sitesData = await sitesResponse.json();
        fetchedSitesData = sitesData || []; // Store for finally block
        setSites(fetchedSitesData || []); // Ensure we pass an array, defaulting to []

        if (selectedSiteResponse.ok) {
          const selectedSiteData = await selectedSiteResponse.json();
          if (selectedSiteData.selectedSite) {
            previouslySelectedSiteUrl = selectedSiteData.selectedSite; // Store for finally block
            setSelectedSite(previouslySelectedSiteUrl);
          }
        }

        // Check for redirection condition
        if ((fetchedSitesData?.length === 1) && !previouslySelectedSiteUrl) {
          shouldRedirect = true; // Set flag for finally block
          const siteUrl = fetchedSitesData[0].siteUrl;
          // Store this as the selected site before redirecting
          await fetch('/api/gsc/selected-site', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl }),
          });
          router.push(`/dashboard/site?url=${encodeURIComponent(siteUrl)}`);
          // Don't set isLoading to false yet, let the redirect happen
          return; // Exit fetch function early
        }

      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        // Set loading to false ONLY if we are NOT redirecting
        if (!shouldRedirect) {
             setIsLoading(false);
        }
        // Clean up local variables if needed (optional)
        fetchedSitesData = null;
        previouslySelectedSiteUrl = null;
      }
    };

    fetchUserData();

    // Cleanup function (optional, depends on fetch library/needs)
    // return () => { /* Abort fetch or cleanup */ };

  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout');
      router.push('/');
    } catch (error) {
      console.error("Logout failed:", error);
      // Handle logout error display if necessary
    }
  };

  const handleSiteSelection = async (siteUrl: string) => {
    try {
      // Optimistically update UI or show loading state
      setSelectedSite(siteUrl);
      // Store the selected site
      await fetch('/api/gsc/selected-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl }),
      });
      router.push(`/dashboard/site?url=${encodeURIComponent(siteUrl)}`);
    } catch (error) {
      console.error("Failed to select site:", error);
      setError("Could not save your site selection. Please try again.");
      setSelectedSite(null); // Revert optimistic update
    }
  };

  // Framer Motion Variants for Staggered Grid
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Stagger delay between cards
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" />
        <span className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading your dashboard...</span>
      </div>
    );
  }

  // Find the data for the previously selected site
  const previousSiteData = sites.find(site => site.siteUrl === selectedSite);

  // Log user profile data just before rendering
  if (userProfile) {
    console.log('Dashboard Page - UserProfile Data:', userProfile);
    console.log('Dashboard Page - avatar:', userProfile.avatar); // Log the correct field
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
      {userProfile && (
        <DashboardHeader
          userName={userProfile.name}
          userEmail={userProfile.email}
          avatarUrl={userProfile.avatar} // Pass the correct field 'avatar'
          onLogout={handleLogout}
        />
      )}

      <AnimatedPageWrapper className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section - Animated */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            Welcome, {userProfile?.name || 'User'} 👋
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Select one of your Google Search Console websites below to get started.
          </p>
        </motion.div>

        {/* Display Error if any */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900 dark:border-red-700 dark:text-red-300"
            role="alert"
          >
             <strong className="font-bold mr-2"><AlertTriangle className="inline w-5 h-5 mr-1"/>Error:</strong>
             <span className="block sm:inline">{error}</span>
          </motion.div>
        )}

        {/* Previous Site Card - Animated */}
        {previousSiteData && (
          <PreviousSiteCard
            siteUrl={previousSiteData.siteUrl}
            permissionLevel={previousSiteData.permissionLevel}
            onContinue={handleSiteSelection}
          />
        )}

        {/* Property Selection Grid - Animated */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Your Search Console Properties
          </h2>

          {sites.length === 0 && !isLoading && !error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10"
             >
              <p className="text-gray-500 dark:text-gray-400">No Search Console properties found.</p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Ensure you have access in Google Search Console.
              </p>
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:scale-[1.03]"
              >
                Go to Google Search Console
              </a>
            </motion.div>
          ) : (
            <motion.div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {sites.map((site, index) => (
                <PropertyCard
                  key={site.siteUrl}
                  siteUrl={site.siteUrl}
                  permissionLevel={site.permissionLevel}
                  onSelect={handleSiteSelection}
                  animationVariants={cardVariants}
                  custom={index} // Pass index for stagger effect
                />
              ))}
            </motion.div>
          )}
        </div>
      </AnimatedPageWrapper>
    </div>
  );
} 
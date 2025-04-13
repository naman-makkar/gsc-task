'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

import { ReportBuilderProvider } from '@/context/ReportBuilderContext';
import { ReportBuilder } from '@/components/ReportBuilder/ReportBuilder';
import AnimatedPageWrapper from '@/components/ui/AnimatedPageWrapper';
import DashboardHeader from '@/components/ui/DashboardHeader';

type UserProfile = {
  name: string;
  email: string;
  avatar?: string;
};

export default function SiteDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteUrl = searchParams.get('url');

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteUrl) {
      console.warn("No site URL found, redirecting to dashboard.");
      router.push('/dashboard');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch user profile (required for header)
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

        // No need to explicitly save selected site here if API call is robust
        // The primary action is displaying the builder for the given siteUrl

      } catch (err: unknown) {
        console.error("Site Dashboard fetch error:", err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred loading site data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, siteUrl]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout');
      router.push('/');
    } catch (error: unknown) {
      console.error("Logout failed:", error);
      // Handle logout error display if necessary
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" />
        <span className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading site dashboard...</span>
      </div>
    );
  }

  // Error State (only if essential data like user profile failed)
  if (error && !userProfile) { // Show fatal error if profile load failed
     return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
         <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-red-300 dark:border-red-700">
           <div className="text-center mb-6">
             <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
             <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Error Loading Site Data</h3>
             <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
           </div>
           <div className="mt-6">
             <button
               onClick={() => router.push('/dashboard')}
               className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:scale-[1.03]"
             >
               Return to Dashboard
             </button>
           </div>
         </div>
       </div>
     );
  }

  if (!siteUrl) {
    // This case should ideally be handled by the redirect in useEffect,
    // but adding a fallback message just in case.
    return (
       <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <p className="text-red-500">Site URL is missing.</p>
          <Link href="/dashboard" className="mt-4 text-blue-600 hover:underline">Go back to Dashboard</Link>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
      {userProfile && (
        <DashboardHeader
          userName={userProfile.name}
          userEmail={userProfile.email}
          avatarUrl={userProfile.avatar}
          onLogout={handleLogout}
        />
      )}

      <AnimatedPageWrapper className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="mb-6"
         >
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 ease-in-out group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform duration-200 ease-in-out group-hover:-translate-x-1" />
            Back to Properties
          </Link>
        </motion.div>

        <motion.h1
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: 0.2 }}
           className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 truncate"
         >
           Report Builder: <span className="font-medium text-gray-700 dark:text-gray-300">{siteUrl}</span>
         </motion.h1>

         {error && userProfile && (
           <motion.div
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900 dark:border-red-700 dark:text-red-300"
             role="alert"
           >
              <strong className="font-bold mr-2"><AlertTriangle className="inline w-5 h-5 mr-1"/>Notice:</strong>
              <span className="block sm:inline">{error}</span>
           </motion.div>
         )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700"
        >
          <ReportBuilderProvider siteUrl={siteUrl}>
            <ReportBuilder siteUrl={siteUrl} />
          </ReportBuilderProvider>
        </motion.div>
      </AnimatedPageWrapper>
    </div>
  );
} 
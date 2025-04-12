'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, ArrowLeft, Calendar, FileText } from 'lucide-react';

import AnimatedPageWrapper from '@/components/ui/AnimatedPageWrapper';
import DashboardHeader from '@/components/ui/DashboardHeader';

interface Report {
  id: string;
  reportId: string;
  siteUrl: string;
  dateRange: string; // Assuming this is pre-formatted string like "Last 7 Days" or "Jan 1 - Jan 7"
  created_at: string;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export default function ReportListPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch both reports and user profile concurrently
        const [reportsResponse, profileResponse] = await Promise.all([
          fetch('/api/reports/get'),
          fetch('/api/user/profile')
        ]);

        // Handle Profile Response
        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            router.push('/'); // Redirect to login if unauthorized
            return;
          }
          // Don't throw immediately, maybe reports fetched ok
          console.error('Failed to fetch user profile');
        } else {
          const profileData = await profileResponse.json();
          setUserProfile(profileData);
        }

        // Handle Reports Response
        if (!reportsResponse.ok) {
          throw new Error('Failed to fetch reports');
        }
        const reportsData = await reportsResponse.json();
        setReports(reportsData.success && reportsData.reports ? reportsData.reports : []);

      } catch (err: any) {
        console.error("Reports page fetch error:", err);
        setError(err.message || 'Failed to load page data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout');
      router.push('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" />
        <span className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading reports...</span>
      </div>
    );
  }

  // Error state (only if critical data failed - e.g., profile for header)
  if (error && !userProfile) {
    return (
       <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
         <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-red-300 dark:border-red-700">
           <div className="text-center mb-6">
             <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
             <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Error Loading Page</h3>
             <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error || 'Could not load user profile data.'}</p>
           </div>
           <div className="mt-6">
             <button
               onClick={() => router.push('/')} // Go to login on profile error
               className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:scale-[1.03]"
             >
               Go to Login
             </button>
           </div>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800">
      {/* Render header only if profile loaded */} 
      {userProfile && (
        <DashboardHeader
          userName={userProfile.name}
          userEmail={userProfile.email}
          avatarUrl={userProfile.avatar}
          onLogout={handleLogout}
        />
      )}

      <AnimatedPageWrapper className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
         {/* Back Link */}
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
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Main Content Container */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white dark:bg-slate-800 shadow-xl rounded-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-200">
              Saved Reports
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View your previously generated GSC reports.
            </p>
          </div>

          {/* Error notice (non-fatal, e.g., reports failed but profile ok) */}
          {error && userProfile && (
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

          {/* Report List or Empty State */}
          {reports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-12"
            >
              <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" strokeWidth={1} />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No reports found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                You haven't generated any reports yet.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:scale-[1.03]"
                >
                  Generate a New Report
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              className="overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 sm:rounded-md"
            >
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report) => (
                  <motion.li
                    key={report.id}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  >
                    <Link
                      href={`/dashboard/report-results?reportId=${report.reportId}`}
                      className="block hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                            {report.siteUrl}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              View Report
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              {/* Assuming dateRange is a simple string like "Last 7 Days" */}
                              {report.dateRange}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                            <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <p>
                              Generated: <time dateTime={report.created_at}>{formatDate(report.created_at)}</time>
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </motion.div>
      </AnimatedPageWrapper>
    </div>
  );
} 
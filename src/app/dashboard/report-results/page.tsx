'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, ArrowLeft, Calendar, FileText, BrainCircuit, Download, Sheet, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { IntentAnalysis, SEOIntent } from '@/lib/gemini';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
  ColumnDef,
} from '@tanstack/react-table';

import AnimatedPageWrapper from '@/components/ui/AnimatedPageWrapper';
import DashboardHeader from '@/components/ui/DashboardHeader';

interface ReportData {
  success: boolean;
  data: any[];
  request: {
    siteUrl: string;
    metrics: string[];
    timeRange: {
      startDate: string;
      endDate: string;
    };
    dimensions: string[];
  };
}

interface ReportRow {
  query: string;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
  intent?: IntentAnalysis['intent'];
  category?: IntentAnalysis['category'];
  funnel_stage?: IntentAnalysis['funnel_stage'];
  main_keywords?: IntentAnalysis['main_keywords'];
}

// Add UserProfile interface
interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

// Helper component for intent badges (with dark mode)
const IntentBadge: React.FC<{ intent: SEOIntent | undefined }> = ({ intent }) => {
  const getIntentColor = (intent: SEOIntent | undefined): string => {
    switch (intent) {
      case 'Informational': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Navigational': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Transactional': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Commercial Investigation': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Mixed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getIntentColor(intent)}`}>
      {intent || 'N/A'}
    </span>
  );
};

// Create a separate client component that uses useSearchParams
function ReportResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId');
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIntents, setIsLoadingIntents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intents, setIntents] = useState<IntentAnalysis[]>([]);
  const [isAnalyzingIntents, setIsAnalyzingIntents] = useState(false);
  const [intentsError, setIntentsError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);

  // State for TanStack Table
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // State variables for Export to Sheets
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [exportSheetError, setExportSheetError] = useState<string | null>(null);
  const [exportSheetSuccessUrl, setExportSheetSuccessUrl] = useState<string | null>(null);

  // Function to load intents, wrapped in useCallback
  const loadIntents = useCallback(async (currentReportId: string) => {
    if (!currentReportId) return;
    console.log(`Attempting to load existing intents for report ID: ${currentReportId}`);
    setIsLoadingIntents(true);
    setIntentsError(null);
    try {
      const intentResponse = await fetch(`/api/gemini/report-intents?reportId=${currentReportId}`);
      if (intentResponse.ok) {
        const intentData = await intentResponse.json();
        if (intentData.success && intentData.intents && intentData.intents.length > 0) {
          console.log(`Loaded ${intentData.intents.length} existing intents.`);
          setIntents(intentData.intents);
        } else {
          console.log('No existing intents found or failed to load.');
          setIntents([]); // Ensure intents state is empty if none found
        }
      } else {
         console.error('Failed to fetch existing intents:', intentResponse.statusText);
         setIntents([]);
      }
    } catch (err) {
      console.error('Error loading existing intents:', err);
      setIntentsError('Could not load existing intent data.');
      setIntents([]);
    } finally {
      setIsLoadingIntents(false);
    }
  }, []);

  useEffect(() => {
    const loadPageData = async () => {
      setIsLoading(true);
      setError(null);
      setIntentsError(null);
      let loadedReportData: ReportData | null = null;

      try {
        // Fetch Profile first, as it's needed for header
        const profileResponse = await fetch('/api/user/profile');
        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            router.push('/');
            return;
          }
          throw new Error('Failed to load user profile'); // Critical error
        }
        const profileData = await profileResponse.json();
        setUserProfile(profileData);

        // Now handle report data loading (localStorage or Supabase)
        const storedData = localStorage.getItem('lastReportData');
        if (storedData) {
            try {
                loadedReportData = JSON.parse(storedData);
                // Optional: Verify if stored data matches reportId if necessary
                // if (reportId && loadedReportData?.request?.reportId !== reportId) { loadedReportData = null; }
            } catch (e) {
                console.error("Error parsing stored report data:", e);
                localStorage.removeItem('lastReportData'); // Clear corrupted data
                loadedReportData = null;
            }
        }

        if (!loadedReportData && reportId) {
          console.log(`Loading report ${reportId} from Supabase...`);
          const reportApiResponse = await fetch(`/api/reports/get?reportId=${reportId}`);
          if (!reportApiResponse.ok) {
            throw new Error('Failed to load report from database');
          }
          const result = await reportApiResponse.json();
          if (result.success && result.report) {
            loadedReportData = result.report.data; // Assuming report data is nested
            // No need to save back to localStorage here, it was loaded because it wasn't there or didn't match
          } else {
             throw new Error(result.error || 'Report not found in database');
          }
        } else if (!reportId && !loadedReportData) {
            throw new Error('No report ID specified and no data in local storage.');
        }

        if (loadedReportData) {
            setReportData(loadedReportData);
             // Load intents if reportId is available (either from URL or potentially from loadedReportData if stored)
            const effectiveReportId = reportId || (loadedReportData as any)?.reportId; // Adjust if reportId is stored differently
            if (effectiveReportId) {
                await loadIntents(effectiveReportId);
            }
        }

      } catch (err: any) {
        console.error("Error loading report results page:", err);
        setError(err.message || 'Failed to load page data');
        setReportData(null); // Clear report data on error
        setIntents([]); // Clear intents on error
        setUserProfile(null); // Clear profile on error if necessary
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [reportId, router, loadIntents]); // Added router dependency
  
  // Prepare data for table
  const tableData = useMemo<ReportRow[]>(() => {
    if (!reportData?.data) return [];
    return reportData.data.map(row => {
      const query = row.keys[0];
      const intentData = intents.find(i => i.query === query);
      return {
        query: query,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        intent: intentData?.intent,
        category: intentData?.category,
        funnel_stage: intentData?.funnel_stage,
        main_keywords: intentData?.main_keywords,
      };
    });
  }, [reportData, intents]);

  // Define table columns
  const columns = useMemo<ColumnDef<ReportRow>[]>(() => {
    if (!reportData?.request?.metrics) return [];

    const metricColumns: ColumnDef<ReportRow>[] = reportData.request.metrics.map(metric => ({
      accessorKey: metric,
      header: ({ column }) => (
        <button
          className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <span>{metric}</span>
          {column.getIsSorted() === 'asc' ? <span className="ml-1">🔼</span> : column.getIsSorted() === 'desc' ? <span className="ml-1">🔽</span> : ''}
        </button>
      ),
      cell: info => {
        const value = info.getValue<number | undefined>();
        if (value === undefined || value === null) return '-';
        if (metric === 'ctr') return `${(value * 100).toFixed(2)}%`;
        if (metric === 'position') return value.toFixed(1);
        return value.toLocaleString();
      },
    }));

    return [
      {
        accessorKey: 'query',
        header: ({ column }) => (
           <button
             className="flex items-center space-x-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
             onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
           >
              <span>Query</span>
              {column.getIsSorted() === 'asc' ? <span className="ml-1">🔼</span> : column.getIsSorted() === 'desc' ? <span className="ml-1">🔽</span> : ''}
           </button>
        ),
        cell: info => {
          const query = info.getValue<string>();
          const keywords = info.row.original.main_keywords;
          return (
            <div className="relative group">
              <span className="cursor-help border-b border-dotted border-gray-400 dark:border-gray-500 dark:text-gray-300">{query}</span>
              {keywords && keywords.length > 0 && (
                <div className="absolute z-10 invisible group-hover:visible bg-black dark:bg-gray-700 text-white dark:text-gray-200 text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap shadow-lg">
                  Keywords: {keywords.join(', ')}
                  <svg className="absolute text-black dark:text-gray-700 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                </div>
              )}
            </div>
          );
        },
      },
      ...metricColumns,
      {
        accessorKey: 'intent',
        header: 'Intent',
        cell: info => <IntentBadge intent={info.getValue<SEOIntent | undefined>()} />,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: info => <span className="text-xs text-gray-600 dark:text-gray-400">{info.getValue<string>() || 'N/A'}</span>,
      },
      {
        accessorKey: 'funnel_stage',
        header: 'Funnel Stage',
        cell: info => <span className="text-xs text-gray-600 dark:text-gray-400">{info.getValue<string>() || 'N/A'}</span>,
      },
    ];
  }, [reportData, intents]);

  // TanStack Table instance
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50, // Default page size
      },
    },
  });

  // Analysis & Export Handlers
  const handleAnalyzeIntents = async () => {
    if (!reportData || !reportId) return;
    
    try {
      setIsAnalyzingIntents(true);
      setIntentsError(null);
      setRateLimitInfo(null);
      setIsLoadingIntents(true);
      
      const visibleQueries = reportData.data.slice(0, 100).map(row => row.keys[0]);
      
      const intentResponse = await fetch(`/api/gemini/report-intents?reportId=${reportId}`);
      
      if (intentResponse.ok) {
        const intentData = await intentResponse.json();
        
        if (intentData.success && intentData.intents.length > 0) {
          setIntents(intentData.intents);
          if (intentData.intents.length >= visibleQueries.length) {
            setIsAnalyzingIntents(false);
            return;
          }
        }
      }
      
      const response = await fetch('/api/gemini/analyze-intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId,
          queries: visibleQueries,
          visibleOnly: true
        }),
      });
      
      const data = await response.json();
      
      if (response.status === 429) {
        setRateLimitInfo({
          rateLimited: true,
          processed: data.processed || 0,
          remaining: data.remaining || visibleQueries.length,
          suggestion: data.suggestion || 'Try again in a few minutes'
        });
        
        if (data.partialSuccess && data.intents) {
          setIntents(data.intents);
        }
        
        setIntentsError('Rate limit exceeded. ' + (data.error || 'Try again in a few minutes.'));
      } else if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze intents');
      } else if (data.success) {
        setIntents(data.intents);
        
        if (data.hasMoreQueries) {
          setRateLimitInfo({
            rateLimited: true,
            processed: data.total - data.remainingQueries,
            remaining: data.remainingQueries,
            suggestion: 'Only analyzed a portion of queries due to rate limits. Try analyzing the rest later.'
          });
        }
      } else {
        throw new Error('Failed to analyze intents');
      }
    } catch (err: any) {
      console.error('Error analyzing intents:', err);
      setIntentsError(err.message || 'An error occurred while analyzing intents');
    } finally {
      setIsAnalyzingIntents(false);
      setIsLoadingIntents(false);
    }
  };
  
  const handleExportCSVWithIntents = () => {
    if (!reportData || intents.length === 0) return;
    
    const headers = [
      'Query',
      ...reportData.request.metrics,
      'Intent',
      'Category',
      'Funnel Stage',
      'Main Keywords'
    ];
    
    const rows = reportData.data.map(row => {
      const query = row.keys[0];
      const intentData = intents.find(i => i.query === query);
      
      return [
        `"${query.replace(/"/g, '""')}"`,
        ...reportData.request.metrics.map(metric => row[metric] || 0),
        intentData?.intent || 'Unknown',
        intentData?.category || 'Unknown',
        intentData?.funnel_stage || 'Unknown',
        `"${(intentData?.main_keywords || []).join(', ')}"`
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gsc-report-with-intents-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportCSV = () => {
    if (!reportData) return;
    
    const headers = ['Query', ...reportData.request.metrics];
    const rows = reportData.data.map(row => [
      `"${row.keys[0].replace(/"/g, '""')}"`,
      ...reportData.request.metrics.map(metric => row[metric] || 0)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gsc-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Calculate summary totals
  const summaryTotals = useMemo(() => {
    if (!reportData?.data) return { totalClicks: 0, totalImpressions: 0 };
    return reportData.data.reduce((acc, row) => {
      acc.totalClicks += row.clicks || 0;
      acc.totalImpressions += row.impressions || 0;
      return acc;
    }, { totalClicks: 0, totalImpressions: 0 });
  }, [reportData]);
  
  // --- Handler for Exporting to Google Sheets ---
  const handleExportToSheets = async () => {
    if (!reportData || !tableData) {
      setExportSheetError('No report data available to export.');
      return;
    }

    setIsExportingSheet(true);
    setExportSheetError(null);
    setExportSheetSuccessUrl(null);

    try {
      // 1. Prepare data payload
      
      // --- Define Headers Explicitly --- 
      // Order matters! Must match the desired sheet output.
      const explicitHeaders = [
          'Query', 
          ...(reportData.request.metrics || []), // Include dynamic metrics
          // Only include intent headers if intent data exists
          ...(intents.length > 0 ? ['Intent', 'Category', 'Funnel Stage', 'Main Keywords'] : []) 
      ];

      // Use the currently filtered and sorted rows from the table instance for export
      const rowsToExport = table.getRowModel().rows.map(row => row.original); 
      
      const reportTitle = `GSC Report - ${reportData.request.siteUrl} - ${new Date().toISOString().slice(0, 10)}`;

      // 2. Call the backend API endpoint
      console.log('[handleExportToSheets] Sending headers:', explicitHeaders);
      const response = await fetch('/api/sheets/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            reportTitle,
            headers: explicitHeaders, // <-- Send the clean headers
            rows: rowsToExport 
         }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed with status ${response.status}`);
      }

      // 3. Handle success
      if (result.success && result.spreadsheetUrl) {
        setExportSheetSuccessUrl(result.spreadsheetUrl);
        // Optionally open the sheet automatically:
        // window.open(result.spreadsheetUrl, '_blank'); 
      } else {
        throw new Error('Export succeeded but no spreadsheet URL was returned.');
      }

    } catch (err: any) {
      console.error('Error exporting to Google Sheets:', err);
      setExportSheetError(err.message || 'An unknown error occurred during export.');
    } finally {
      setIsExportingSheet(false);
    }
  };

  // Add handleLogout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout');
      router.push('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Loading State (Consistent Styling)
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-400" />
        <span className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading report results...</span>
      </div>
    );
  }

  // Error state (Consistent Styling)
  if (error || !reportData) {
    // Check if the error is due to missing profile, otherwise show general error
    const isAuthError = error?.includes('profile') || !userProfile;
    return (
       <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
         <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-red-300 dark:border-red-700">
           <div className="text-center mb-6">
             <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
             <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Error Loading Report</h3>
             <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error || 'Could not load report data.'}</p>
           </div>
           <div className="mt-6">
             <Link
               href={isAuthError ? '/' : '/dashboard/reports'} // Go to login or reports list
               className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:scale-[1.03]"
             >
               {isAuthError ? 'Go to Login' : 'Back to Reports'}
             </Link>
           </div>
         </div>
       </div>
    );
  }

  // Main component render
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
        {/* Back Link */}
        <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="mb-6"
         >
          <Link
            href="/dashboard/reports" // Link back to the reports list
            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 ease-in-out group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform duration-200 ease-in-out group-hover:-translate-x-1" />
            Back to Reports
          </Link>
        </motion.div>

        {/* Main Content Container */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white dark:bg-slate-800 shadow-xl rounded-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700"
        >
          {/* Report Title and Info */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-200">
              Report Results
            </h1>
            {reportData.request && (
               <p className="text-gray-500 dark:text-gray-400 mt-1">
                 For site: <span className="font-medium text-gray-700 dark:text-gray-300">{reportData.request.siteUrl}</span> | Date Range: <span className="font-medium text-gray-700 dark:text-gray-300">{reportData.request.timeRange.startDate} to {reportData.request.timeRange.endDate}</span>
               </p>
            )}
          </div>

          {/* Action Buttons & Notices */}
          <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
             <div className="flex flex-wrap gap-2">
                {/* Analyze Intents Button */}
                <button
                   onClick={handleAnalyzeIntents}
                   disabled={isLoadingIntents || isAnalyzingIntents || !reportData?.data?.length}
                   className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out"
                >
                   {isAnalyzingIntents ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   ) : (
                     <Sparkles className="mr-2 h-4 w-4" />
                   )}
                   {isAnalyzingIntents ? 'Analyzing...' : intents.length > 0 ? 'Re-Analyze Intents with AI' : 'Analyze Intents with AI'}
                </button>

                {/* Export Buttons */} 
                <button
                   onClick={intents.length > 0 ? handleExportCSVWithIntents : handleExportCSV}
                   disabled={!reportData?.data?.length}
                   className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out"
                 >
                   <Download className="mr-2 h-4 w-4" />
                   {intents.length > 0 ? 'Export CSV (with Intents)' : 'Export CSV'}
                 </button>
                 <button
                     onClick={handleExportToSheets}
                     disabled={isExportingSheet || !reportData?.data?.length}
                     className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out"
                   >
                     {isExportingSheet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sheet className="mr-2 h-4 w-4" />}
                     {isExportingSheet ? 'Exporting...' : 'Export to Google Sheet'}
                   </button>
             </div>
             {/* Rate Limit Info */}
             {rateLimitInfo && (
                 <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 md:mt-0">
                    Gemini API Limit: {rateLimitInfo.remaining} / {rateLimitInfo.limit} requests remaining this minute.
                 </div>
             )}
          </div>

          {/* Intent Analysis Error/Notice */}
          {intentsError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-300 text-sm flex items-center">
                 <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                 <span>{intentsError}</span>
              </div>
          )}
           {/* Google Sheets Export Status */}
           {exportSheetError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-300 text-sm flex items-center">
                 <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                 <span>Sheets Export Failed: {exportSheetError}</span>
              </div>
           )}
           {exportSheetSuccessUrl && (
             <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700 rounded-md text-green-700 dark:text-green-300 text-sm flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>Successfully exported to Google Sheets!</span>
                <a href={exportSheetSuccessUrl} target="_blank" rel="noopener noreferrer" className="ml-2 font-medium underline hover:text-green-600 dark:hover:text-green-200">
                    Open Sheet
                </a>
             </div>
           )}

          {/* TanStack Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                 {table.getRowModel().rows.length === 0 && (
                    <tr>
                       <td colSpan={columns.length} className="text-center py-10 text-gray-500 dark:text-gray-400">
                          No data available for this report.
                       </td>
                    </tr>
                 )}
              </tbody>
            </table>
          </div>

           {/* Pagination Controls */}
           <div className="py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 mt-4">
              <div className="flex-1 flex justify-between sm:hidden">
                 <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                 >
                    Previous
                 </button>
                 <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                 >
                    Next
                 </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                 <div>
                    <p className="text-sm text-gray-700 dark:text-gray-400">
                       Showing <span className="font-medium">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span>
                       {' '}to{' '}
                       <span className="font-medium">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}</span>
                       {' '}of{' '}
                       <span className="font-medium">{table.getFilteredRowModel().rows.length}</span> results
                    </p>
                 </div>
                 <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                       <button
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                       >
                          <span className="sr-only">Previous</span>
                          {/* Heroicon name: solid/chevron-left */}
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                             <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                       </button>
                       {/* Current page indicator could be added here if needed */}
                       <button
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                       >
                          <span className="sr-only">Next</span>
                          {/* Heroicon name: solid/chevron-right */}
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                             <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                       </button>
                    </nav>
                 </div>
              </div>
           </div>
        </motion.div>
      </AnimatedPageWrapper>
    </div>
  );
}

// Main component with Suspense
export default function ReportResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
          <p className="text-gray-700 dark:text-gray-300">Loading report data...</p>
        </div>
      </div>
    }>
      <ReportResultsContent />
    </Suspense>
  );
} 
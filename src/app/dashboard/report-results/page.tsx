'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

// Helper component for intent badges
const IntentBadge: React.FC<{ intent: SEOIntent | undefined }> = ({ intent }) => {
  const getIntentColor = (intent: SEOIntent | undefined): string => {
    switch (intent) {
      case 'Informational': return 'bg-blue-100 text-blue-800';
      case 'Navigational': return 'bg-purple-100 text-purple-800';
      case 'Transactional': return 'bg-green-100 text-green-800';
      case 'Commercial Investigation': return 'bg-orange-100 text-orange-800';
      case 'Mixed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getIntentColor(intent)}`}>
      {intent || 'Unknown'}
    </span>
  );
};

export default function ReportResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId');
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
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

  // New state variables for Export to Sheets
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
    const loadReportAndIntents = async () => {
      setIsLoading(true);
      setError(null);
      setIntentsError(null);
      
      let loadedReportData: ReportData | null = null;
      
      try {
        // 1. Try to load report data from localStorage
        const storedData = localStorage.getItem('lastReportData');
        if (storedData) {
          loadedReportData = JSON.parse(storedData);
          setReportData(loadedReportData);
        }
        
        // 2. If not in localStorage or doesn't match reportId, load from Supabase
        if ((!loadedReportData || !reportId) && reportId) {
          console.log(`Loading report ${reportId} from Supabase...`);
          const response = await fetch(`/api/reports/get?reportId=${reportId}`);
          if (!response.ok) {
            throw new Error('Failed to load report from database');
          }
          const result = await response.json();
          if (result.success && result.report) {
            loadedReportData = result.report.data; // The actual report data is nested
            setReportData(loadedReportData);
            localStorage.setItem('lastReportData', JSON.stringify(loadedReportData));
          } else {
             throw new Error(result.error || 'Report not found in database');
          }
        } else if (!reportId && !loadedReportData) {
            throw new Error('No report ID specified and no data in local storage.');
        }

        // 3. If report data was loaded successfully, load existing intents
        if (loadedReportData && reportId) {
           await loadIntents(reportId);
        }
        
      } catch (err: any) {
        console.error("Error loading report/intents:", err);
        setError(err.message || 'Failed to load report data');
        setReportData(null); // Clear report data on error
        setIntents([]); // Clear intents on error
      } finally {
        setIsLoading(false);
      }
    };
    
    if (reportId) {
        loadReportAndIntents();
    } else if (localStorage.getItem('lastReportData')) {
        loadReportAndIntents(); 
    } else {
        setError('No report ID provided.');
        setIsLoading(false);
    }
  }, [reportId, loadIntents]);
  
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
          className="flex items-center space-x-1 text-xs font-medium text-gray-600 uppercase tracking-wider hover:text-gray-800"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <span>{metric}</span>
          {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
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
             className="flex items-center space-x-1 text-xs font-medium text-gray-600 uppercase tracking-wider hover:text-gray-800"
             onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
           >
              <span>Query</span>
              {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
           </button>
        ),
        cell: info => {
          const query = info.getValue<string>();
          const keywords = info.row.original.main_keywords;
          return (
            <div className="relative group">
              <span className="cursor-help border-b border-dotted border-gray-400">{query}</span>
              {keywords && keywords.length > 0 && (
                <div className="absolute z-10 invisible group-hover:visible bg-black text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap">
                  Keywords: {keywords.join(', ')}
                  <svg className="absolute text-black h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                </div>
              )}
            </div>
          );
        },
      },
      ...metricColumns,
      ...(intents.length > 0 ? [
        {
          accessorKey: 'intent',
          header: ({ column }) => (
             <button 
               className="flex items-center space-x-1 text-xs font-medium text-gray-600 uppercase tracking-wider hover:text-gray-800"
               onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
             >
                <span>Intent</span>
                {column.getIsSorted() === 'asc' ? ' 🔼' : column.getIsSorted() === 'desc' ? ' 🔽' : ''}
             </button>
          ),
          cell: info => <IntentBadge intent={info.getValue<SEOIntent>()} />,
          filterFn: 'equals',
        },
        {
          accessorKey: 'category',
          header: <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Category</span>,
          cell: info => info.getValue() || '-',
        },
        {
          accessorKey: 'funnel_stage',
          header: <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Funnel Stage</span>,
          cell: info => info.getValue() || '-',
        },
      ] as ColumnDef<ReportRow>[] : []),
    ];
  }, [reportData, intents]);

  // TanStack Table instance with Pagination
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
            pageSize: 50,
        },
    }
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg">Loading report data...</span>
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
            <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Report</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
          </div>
          <div className="mt-6">
            <Link href="/dashboard" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!reportData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <svg className="mx-auto h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Report Data</h3>
            <p className="mt-1 text-sm text-gray-500">No report data was found. Please generate a new report.</p>
          </div>
          <div className="mt-6">
            <Link href="/dashboard" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
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
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-4 flex items-center">
            <Link
              href={`/dashboard/site?url=${encodeURIComponent(reportData.request.siteUrl)}`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Report Builder
            </Link>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                GSC Search Analytics Report
              </h1>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleAnalyzeIntents}
                  disabled={isAnalyzingIntents || isLoadingIntents || !reportData}
                  className={`
                    px-4 py-2 rounded-md text-white transition
                    ${
                      (isAnalyzingIntents || isLoadingIntents) ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                    }
                  `}
                >
                  {isAnalyzingIntents ? 'Analyzing...' : isLoadingIntents ? 'Loading Intents...' : (intents.length > 0 ? 'Reanalyze Intents' : 'Analyze Intents')}
                </button>
                
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Export CSV
                </button>
                
                {intents.length > 0 && (
                  <button
                    onClick={handleExportCSVWithIntents}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                  >
                    Export CSV with Intents
                  </button>
                )}

                <button
                  onClick={handleExportToSheets}
                  disabled={isExportingSheet || !reportData}
                  className={`px-4 py-2 rounded-md text-white transition flex items-center space-x-2
                    ${isExportingSheet ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}
                  `}
                >
                  {isExportingSheet ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6C4.9 2 4 .9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/><path d="M15.5 13.5h-1v-1h-1v1h-1v1h1v1h1v-1h1v-1zM11 19h2v-1.5h1V16h-1v-1.5h-2v1.5h-1V16h1v1.5h-1V19z"/></svg>
                      <span>Export to Sheets</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="mb-4 space-y-2">
              {exportSheetError && (
                <div className="p-3 border border-red-300 bg-red-50 rounded-md text-red-800 text-sm">
                  <p><strong>Sheets Export Failed:</strong> {exportSheetError}</p>
                </div>
              )}
              {exportSheetSuccessUrl && (
                <div className="p-3 border border-green-300 bg-green-50 rounded-md text-green-800 text-sm flex justify-between items-center">
                  <p>Successfully exported!</p>
                  <a 
                    href={exportSheetSuccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition"
                  >
                    Open Google Sheet
                  </a>
                </div>
              )}
              {intentsError && (
                 <div className="p-3 border border-red-300 bg-red-50 rounded-md text-red-800 text-sm">
                   <p>{intentsError}</p>
                   {rateLimitInfo && (
                     <div className="mt-1 text-xs">
                       <p>Processed {rateLimitInfo.processed} of {rateLimitInfo.processed + rateLimitInfo.remaining} queries.</p>
                       <p className="mt-1">{rateLimitInfo.suggestion}</p>
                     </div>
                   )}
                 </div>
               )}
            </div>
            
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Site</h3>
                <p className="text-lg font-semibold text-gray-900">{reportData.request.siteUrl}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Date Range</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {reportData.request.timeRange.startDate} to {reportData.request.timeRange.endDate}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Metrics</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {reportData.request.metrics.join(', ')}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Total Clicks</h3>
                <p className="text-lg font-semibold text-gray-900">{summaryTotals.totalClicks.toLocaleString()}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-500">Total Impressions</h3>
                <p className="text-lg font-semibold text-gray-900">{summaryTotals.totalImpressions.toLocaleString()}</p>
              </div>
            </div>
            
            {intents.length > 0 && (
              <div className="mb-4">
                <label htmlFor="intentFilter" className="block text-sm font-medium text-gray-700 mr-2">Filter by Intent:</label>
                <select
                  id="intentFilter"
                  value={(table.getColumn('intent')?.getFilterValue() as string) ?? ''}
                  onChange={e => table.getColumn('intent')?.setFilterValue(e.target.value || undefined)}
                  className="mt-1 block w-full md:w-1/4 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="">All Intents</option>
                  {['Informational', 'Navigational', 'Transactional', 'Commercial Investigation', 'Mixed', 'Unknown'].map(intent => (
                    <option key={intent} value={intent}>{intent}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} scope="col" className="px-6 py-3 text-left">
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map(row => (
                      <tr key={row.id} className={row.index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} className="text-center py-4 text-sm text-gray-700">
                        {isLoadingIntents ? 'Loading intent data...' : reportData.data.length === 0 ? 'No report data found.' : 'No results match your filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* --- Pagination Controls --- */}
            {tableData.length > 0 && (
                <div className="flex items-center justify-between mt-4 text-gray-700">
                    {/* Page Size Selector */}
                    <div className="flex items-center space-x-2 text-sm">
                        <span>Rows per page:</span>
                        <select
                            value={table.getState().pagination.pageSize}
                            onChange={e => {
                                table.setPageSize(Number(e.target.value))
                            }}
                            className="border border-gray-300 rounded px-2 py-1 text-gray-700"
                        >
                            {[10, 25, 50, 100, 250].map(pageSize => (
                                <option key={pageSize} value={pageSize}>
                                    {pageSize}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center space-x-2 text-sm">
                        <span>
                            Page{' '}
                            <strong>
                                {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                            </strong>
                        </span>
                        <span className="hidden sm:inline">|</span>
                        <span className="hidden sm:inline">Go to page:</span>
                        <input
                            type="number"
                            defaultValue={table.getState().pagination.pageIndex + 1}
                            onChange={e => {
                                const page = e.target.value ? Number(e.target.value) - 1 : 0
                                table.setPageIndex(page)
                            }}
                            className="border border-gray-300 rounded px-2 py-1 w-16 hidden sm:inline-block text-gray-700"
                        />
                        <button
                            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            {'<<'}
                        </button>
                        <button
                            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            {'<'}
                        </button>
                        <button
                            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            {'>'}
                        </button>
                        <button
                            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            {'>>'}
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { querySearchAnalytics } from '@/lib/google';
import { MetricType, TimeRange } from '@/lib/types';

interface ReportRequest {
  siteUrl: string;
  metrics: MetricType[];
  timeRange: {
    startDate: string;
    endDate: string;
  };
  dimensions?: string[];
}

// Format site URL for GSC API
function formatSiteUrlForGSC(url: string): string {
  // If URL already has the proper GSC format (sc-domain: or https://), return as is
  if (url.startsWith('sc-domain:') || url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  
  // If it's a domain without protocol, prefix with sc-domain:
  if (!url.includes('://') && !url.startsWith('sc-domain:')) {
    return `sc-domain:${url}`;
  }
  
  return url;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const requestData: ReportRequest = await request.json();
    
    const { siteUrl, metrics, timeRange, dimensions = ['query'] } = requestData;
    
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL is required' },
        { status: 400 }
      );
    }
    
    if (!metrics || metrics.length === 0) {
      return NextResponse.json(
        { error: 'At least one metric is required' },
        { status: 400 }
      );
    }
    
    if (!timeRange?.startDate || !timeRange?.endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }
    
    // Format the site URL properly for GSC API
    const formattedSiteUrl = formatSiteUrlForGSC(siteUrl);
    
    console.log('Generating report for site:', formattedSiteUrl);
    console.log('Metrics:', metrics);
    console.log('Time range:', timeRange);
    console.log('Dimensions:', dimensions);
    
    // Query GSC Search Analytics API
    const searchData = await querySearchAnalytics(
      user.id,
      formattedSiteUrl,
      timeRange.startDate,
      timeRange.endDate,
      dimensions
    );
    
    // Return the report data
    return NextResponse.json({
      success: true,
      data: searchData,
      request: {
        siteUrl: formattedSiteUrl,
        metrics,
        timeRange,
        dimensions,
      }
    });
    
  } catch (error: any) {
    console.error('Error generating report:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate report', details: error.message },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { fetchSearchAnalyticsData } from '@/lib/google';
import { MetricType } from '@/lib/types';

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
    const requestData = await request.json();
    const { siteUrl, startDate, endDate, metrics, dimensions = ['query'] } = requestData;
    
    // Validate required parameters
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL is required' },
        { status: 400 }
      );
    }
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      );
    }
    
    if (!metrics || metrics.length === 0) {
      return NextResponse.json(
        { error: 'At least one metric is required' },
        { status: 400 }
      );
    }
    
    // Validate metrics are of the correct type
    const validMetrics: MetricType[] = ['clicks', 'impressions', 'ctr', 'position'];
    const invalidMetrics = metrics.filter((m: string) => !validMetrics.includes(m as MetricType));
    
    if (invalidMetrics.length > 0) {
      return NextResponse.json(
        { error: `Invalid metrics: ${invalidMetrics.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Format the site URL properly for GSC API
    const formattedSiteUrl = formatSiteUrlForGSC(siteUrl);
    
    console.log(`Fetching GSC data for ${formattedSiteUrl} from ${startDate} to ${endDate}`);
    
    // Fetch search analytics data with caching
    const data = await fetchSearchAnalyticsData(
      user.id,
      formattedSiteUrl,
      startDate,
      endDate,
      metrics,
      dimensions
    );
    
    return NextResponse.json({
      success: true,
      data,
      request: {
        siteUrl: formattedSiteUrl,
        startDate,
        endDate,
        metrics,
        dimensions
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching GSC data:', error);
    
    // Handle specific errors
    if (error.message?.includes('auth') || error.code === 401) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('permissions') || error.code === 403) {
      return NextResponse.json(
        { error: 'Insufficient permissions to access this site' },
        { status: 403 }
      );
    }
    
    if (error.message?.includes('quota') || error.code === 429) {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch GSC data', details: error.message },
      { status: 500 }
    );
  }
} 
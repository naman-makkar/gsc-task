import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { querySearchAnalytics } from '@/lib/google';

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

export async function GET(request: NextRequest) {
  try {
    // Get user from request
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const siteUrl = searchParams.get('siteUrl');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dimensions = searchParams.getAll('dimension') || ['query'];
    
    // Validate required parameters
    if (!siteUrl || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: siteUrl, startDate, endDate' },
        { status: 400 }
      );
    }
    
    // Format the site URL properly for GSC API
    const formattedSiteUrl = formatSiteUrlForGSC(siteUrl);
    
    console.log(`Fetching GSC data for ${formattedSiteUrl} from ${startDate} to ${endDate}`);
    
    // Get search analytics data
    const data = await querySearchAnalytics(
      user.id,
      formattedSiteUrl,
      startDate,
      endDate,
      dimensions
    );
    
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error fetching search analytics:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle token expiry or auth errors
    if (message?.includes('auth') || message === 'Authentication failed') {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch search analytics data', details: message },
      { status: 500 }
    );
  }
} 
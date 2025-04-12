import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { listSites } from '@/lib/google';

export async function GET(request: NextRequest) {
  try {
    // Get user from request
    const user = await getUserFromRequest(request);
    console.log('API - GSC Sites - User authenticated:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('API - GSC Sites - Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get sites from Google Search Console
    console.log('API - GSC Sites - Fetching sites for user ID:', user.id);
    const sites = await listSites(user.id);
    console.log('API - GSC Sites - Sites fetched:', sites.length);
    
    // Transform the data to a more convenient format
    const formattedSites = sites.map((site: any) => ({
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel,
    }));
    
    return NextResponse.json(formattedSites);
  } catch (error: any) {
    console.error('Error fetching GSC sites:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Handle token expiry or auth errors
    if (error.message?.includes('auth') || error.code === 401) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { listSites } from '@/lib/google';

// Define a type for the site object, allowing nullable siteUrl
interface GscSite {
  siteUrl?: string | null; // Allow null/undefined
  permissionLevel?: string | null; // Allow null/undefined
}

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
    const sites: GscSite[] = await listSites(user.id);
    console.log('API - GSC Sites - Sites fetched:', sites.length);
    
    // Transform the data, filtering out sites without a siteUrl
    const formattedSites = sites
      .filter((site): site is Required<GscSite> => !!site.siteUrl) // Type guard to filter and ensure siteUrl exists
      .map((site) => ({
        siteUrl: site.siteUrl, // Now guaranteed to be string
        permissionLevel: site.permissionLevel || 'unknown', // Provide default if null/undefined
      }));
    
    return NextResponse.json({ sites: formattedSites });
  } catch (error: unknown) {
    console.error('Error fetching GSC sites:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific errors based on message content
    if (message === 'Authentication failed. Please re-authorize the application.') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === 'GSC API quota exceeded. Please try again later.') {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    // Add other specific error checks if needed
    
    return NextResponse.json(
      { error: 'Failed to fetch GSC sites', details: message },
      { status: 500 }
    );
  }
} 
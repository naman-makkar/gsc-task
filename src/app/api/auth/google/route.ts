import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import { getUserFromRequest, getUserSites } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?error=Authentication failed`);
    }

    const _response = await getUserSites(user.id);

    // Generate Google OAuth URL with appropriate scopes
    const authUrl = getAuthUrl();
    
    // Return the URL as JSON so frontend can redirect
    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';

export async function GET(request: NextRequest) {
  try {
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
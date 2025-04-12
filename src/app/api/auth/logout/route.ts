import { NextRequest, NextResponse } from 'next/server';
import { removeTokenCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Create a response that redirects to the home page
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Remove the authentication cookie
    return removeTokenCookie(response);
  } catch (error) {
    console.error('Error during logout:', error);
    
    // Redirect to home page even if there's an error
    return NextResponse.redirect(new URL('/', request.url));
  }
} 
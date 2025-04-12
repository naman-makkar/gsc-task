import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromRequest } from './lib/auth';

// Define protected paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/api/gsc/', // All Google Search Console API routes
];

// Check if a path should be protected
const isProtectedPath = (path: string): boolean => {
  return protectedPaths.some(protectedPath => 
    path === protectedPath || 
    path.startsWith(`${protectedPath}/`)
  );
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip middleware for non-protected paths
  if (!isProtectedPath(path)) {
    return NextResponse.next();
  }
  
  // Get user from token - this is now async
  const user = await getUserFromRequest(request);
  
  // If no user found, redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('from', path);
    return NextResponse.redirect(url);
  }
  
  // Allow the request to proceed for authenticated users
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except for static files, api auth routes, and non-protected paths
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}; 
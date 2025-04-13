import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getTokenFromCookies, verifyToken } from '@/lib/auth';
import { getTokensFromDatabase } from '@/lib/google';

export async function GET(request: NextRequest) {
  try {
    // Check if there's a token in the cookies
    const token = getTokenFromCookies(request);
    const tokenStatus = token ? 'present' : 'missing';
    
    // Verify the token if present
    const tokenPayload = token ? await verifyToken(token) : null;
    const tokenValid = !!tokenPayload;
    
    // Get user from token
    const user = await getUserFromRequest(request);
    const userId = user ? user.id : null;
    
    // Check database tokens if user is authenticated
    let dbTokens = null;
    if (userId) {
      try {
        dbTokens = await getTokensFromDatabase(userId);
      } catch (error) {
        console.error('Error fetching tokens from DB:', error);
      }
    }
    
    // Return debugging information
    return NextResponse.json({
      cookieToken: {
        status: tokenStatus,
        valid: tokenValid,
        payload: tokenPayload ? {
          subject: tokenPayload.sub,
          // Don't include the full payload for security
          expiry: tokenPayload.exp
        } : null
      },
      user: userId ? { id: userId } : null,
      dbTokensFound: !!dbTokens,
      dbTokensExpiry: dbTokens ? dbTokens.expiry_date : null,
      serverTime: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Error fetching auth status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve auth status', details: message },
      { status: 500 }
    );
  }
} 
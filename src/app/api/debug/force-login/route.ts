import { NextRequest, NextResponse } from 'next/server';
import { createToken, setTokenCookie } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// NOTE: This is a development-only endpoint for debugging authentication issues
// It should be disabled or removed in production
export async function GET(request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });
  }
  
  try {
    // Find a user in the database
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      return NextResponse.json({
        error: 'No users found in database',
        details: usersError
      }, { status: 500 });
    }
    
    const user = users[0];
    console.log('Force login for user:', user.email, 'with ID:', user.id);
    
    // Create a token for this user
    const token = await createToken({ sub: user.id });
    
    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    console.log('Generated token and redirecting to dashboard');
    
    // Set the session cookie
    return setTokenCookie(response, token);
    
  } catch (error: any) {
    console.error('Error in force login endpoint:', error);
    
    return NextResponse.json({
      error: 'Failed to create debug session',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserProfile } from '@/lib/google';
import { supabaseAdmin } from '@/lib/supabase';
import { createToken, setTokenCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Get the authorization code from URL
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  // Handle errors
  const error = searchParams.get('error');
  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=auth_error', request.url));
  }

  // If no code, redirect back to home
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url));
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);
    
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/?error=no_token', request.url));
    }

    // Get user profile with access token
    const userInfo = await getUserProfile(tokens.access_token);
    
    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/?error=no_user_info', request.url));
    }

    // Calculate token expiry date
    const expiryDate = new Date();
    if (tokens.expiry_date) {
      expiryDate.setTime(tokens.expiry_date);
    } else if (tokens.expires_in) {
      expiryDate.setSeconds(expiryDate.getSeconds() + Number(tokens.expires_in));
    }

    // Store or update user in database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        email: userInfo.email,
        name: userInfo.name || '',
        avatar_url: userInfo.picture || '',
      })
      .select('id')
      .single();

    if (userError || !user) {
      console.error('Error storing user:', userError);
      return NextResponse.redirect(new URL('/?error=db_error', request.url));
    }

    // Store tokens in database
    const { error: tokenError } = await supabaseAdmin
      .from('tokens')
      .upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        expiry_date: expiryDate.toISOString(),
        scope: tokens.scope,
      });

    if (tokenError) {
      console.error('Error storing tokens:', tokenError);
      return NextResponse.redirect(new URL('/?error=token_error', request.url));
    }

    // Create JWT for the user session
    const token = createToken({ sub: user.id });
    
    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    // Set the session cookie
    return setTokenCookie(response, token);
    
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return NextResponse.redirect(new URL('/?error=unknown', request.url));
  }
} 
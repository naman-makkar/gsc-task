import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode, getUserProfile } from '@/lib/google';
import { supabaseAdmin } from '@/lib/supabase';
import { createToken, setTokenCookie } from '@/lib/auth';

// Define an interface to match the actual structure of tokens from Google
interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  expires_in?: number;
  scope?: string;
}

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
    const tokens = await getTokensFromCode(code) as GoogleTokens;
    
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/?error=no_token', request.url));
    }

    // Get user profile with access token
    const userInfo = await getUserProfile(tokens.access_token);
    
    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/?error=no_user_info', request.url));
    }

    console.log('User authenticated:', userInfo.email);

    // Calculate token expiry date
    const expiryDate = new Date();
    if (tokens.expiry_date) {
      expiryDate.setTime(tokens.expiry_date);
    } else if (tokens.expires_in) {
      expiryDate.setSeconds(expiryDate.getSeconds() + Number(tokens.expires_in));
    }

    // First check if user already exists in the database
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', userInfo.email)
      .single();

    let userId;

    if (existingUser) {
      // User exists, use existing ID
      console.log('Found existing user with ID:', existingUser.id);
      userId = existingUser.id;
      
      // Update user profile info (optional)
      await supabaseAdmin
        .from('users')
        .update({
          name: userInfo.name || '',
          avatar_url: userInfo.picture || '',
        })
        .eq('id', userId);
    } else {
      // User doesn't exist, create new
      console.log('Creating new user for:', userInfo.email);
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: userInfo.email,
          name: userInfo.name || '',
          avatar_url: userInfo.picture || '',
        })
        .select('id')
        .single();

      if (createError || !newUser) {
        console.error('Error creating user:', createError);
        return NextResponse.redirect(new URL('/?error=db_error', request.url));
      }
      
      userId = newUser.id;
    }

    // Check if tokens already exist for this user
    const { data: existingTokens } = await supabaseAdmin
      .from('tokens')
      .select('id, refresh_token')
      .eq('user_id', userId)
      .single();

    // Store or update tokens
    if (existingTokens) {
      // Update existing tokens
      const { error: updateError } = await supabaseAdmin
        .from('tokens')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existingTokens.refresh_token, // Keep existing refresh token if new one not provided
          expiry_date: expiryDate.toISOString(),
          scope: tokens.scope,
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating tokens:', updateError);
        return NextResponse.redirect(new URL('/?error=token_error', request.url));
      }
    } else {
      // Insert new tokens
      const { error: insertError } = await supabaseAdmin
        .from('tokens')
        .insert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          expiry_date: expiryDate.toISOString(),
          scope: tokens.scope,
        });

      if (insertError) {
        console.error('Error storing tokens:', insertError);
        return NextResponse.redirect(new URL('/?error=token_error', request.url));
      }
    }

    // Create JWT for the user session
    const token = await createToken({ sub: userId });
    console.log('Created JWT token:', token ? 'SUCCESS' : 'FAILED');
    
    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    console.log('Redirecting to:', '/dashboard');
    
    // Set the session cookie
    const cookieResponse = setTokenCookie(response, token);
    console.log('Set auth cookie in response');
    
    return cookieResponse;
    
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return NextResponse.redirect(new URL('/?error=unknown', request.url));
  }
} 
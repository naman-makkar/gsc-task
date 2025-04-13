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
      }, {
        onConflict: 'email',
      })
      .select('id')
      .single();

    if (userError || !user) {
      console.error('Error storing user:', userError);
      return NextResponse.redirect(new URL('/?error=db_error', request.url));
    }

    const userId = user.id;

    // Fetch existing tokens for the user to preserve refresh token if needed
    const { data: existingTokenData } = await supabaseAdmin
      .from('tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .maybeSingle();

    // Prepare token data for upsert
    const tokenUpsertData: {
      user_id: string;
      access_token: string;
      refresh_token?: string;
      expiry_date: string;
      scope?: string;
    } = {
      user_id: userId,
      access_token: tokens.access_token,
      expiry_date: expiryDate.toISOString(),
      scope: tokens.scope,
    };

    // Set refresh_token in the upsert data ONLY if we have one
    if (tokens.refresh_token) {
      tokenUpsertData.refresh_token = tokens.refresh_token;
    } else if (existingTokenData?.refresh_token) {
      tokenUpsertData.refresh_token = existingTokenData.refresh_token;
    } else {
      console.warn(`[api/auth/callback/google] No new or existing refresh token found for user ID: ${userId}. Omitting from upsert.`);
    }

    // Store tokens in database using upsert
    console.log('[api/auth/callback/google] Attempting token upsert for user ID:', userId);
    console.log('[api/auth/callback/google] Upsert data prepared:', JSON.stringify(tokenUpsertData, null, 2));
    const { error: tokenError } = await supabaseAdmin
      .from('tokens')
      .upsert(tokenUpsertData, {
        onConflict: 'user_id',
      });

    if (tokenError) {
      // Log the detailed error
      console.error('[api/auth/callback/google] Error upserting tokens:', JSON.stringify(tokenError, null, 2));
      return NextResponse.redirect(new URL('/?error=token_error', request.url));
    }

    console.log('[api/auth/callback/google] Token upsert successful for user ID:', userId);

    // Create JWT for the user session
    const token = await createToken({ sub: user.id });
    
    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    // Set the session cookie
    return setTokenCookie(response, token);
    
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return NextResponse.redirect(new URL('/?error=unknown', request.url));
  }
} 
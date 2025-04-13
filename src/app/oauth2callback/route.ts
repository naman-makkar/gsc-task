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

    // Store or update user in database using upsert
    console.log('Upserting user data for:', userInfo.email);
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        email: userInfo.email,
        name: userInfo.name || '',
        avatar_url: userInfo.picture || '',
      }, {
        onConflict: 'email', // Specify the conflict target
        // ignoreDuplicates: false, // This is the default, ensures update happens
      })
      .select('id') // Select the id after upsert
      .single();

    if (userError || !user) {
      console.error('Error upserting user:', userError);
      return NextResponse.redirect(new URL('/?error=db_error', request.url));
    }

    const userId = user.id;
    console.log('User ID after upsert:', userId);

    // Fetch existing tokens for the user to preserve refresh token if needed
    const { data: existingTokenData } = await supabaseAdmin
      .from('tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle as the token might not exist yet

    // Prepare token data for upsert, initially without refresh_token
    const tokenUpsertData: {
      user_id: string;
      access_token: string;
      refresh_token?: string; // Still keep optional in type for clarity
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
      console.log('Using new refresh token provided by Google.');
    } else if (existingTokenData?.refresh_token) {
      tokenUpsertData.refresh_token = existingTokenData.refresh_token;
      console.log('Using existing refresh token from database.');
    } else {
      // No new refresh token from Google and no existing one found.
      // Do NOT add refresh_token to the upsert data.
      // This relies on the DB column being nullable or the UPSERT logic handling updates correctly without it.
      console.warn(`No new or existing refresh token found for user ID: ${userId}. Omitting refresh_token from upsert data.`);
    }

    // Store or update tokens in database using upsert
    console.log('Attempting to upsert token data for user ID:', userId);
    // Log the exact data being prepared for upsert, censoring sensitive parts if necessary in real logs
    console.log('Upsert data prepared:', JSON.stringify(tokenUpsertData, null, 2)); 

    const { error: tokenError } = await supabaseAdmin
      .from('tokens')
      .upsert(tokenUpsertData, { // Pass the prepared data
        onConflict: 'user_id', // Specify the conflict target
        // ignoreDuplicates: false, // Ensure update happens
      });

    if (tokenError) {
      // Log the detailed error object for debugging
      console.error('Error upserting tokens:', JSON.stringify(tokenError, null, 2)); 
      // Specific check for refresh token potentially being null if Google doesn't always return it
      // and the DB constraint requires it not to be null.
      // For now, just log and redirect.
      return NextResponse.redirect(new URL('/?error=token_error', request.url));
    } else {
      // Add success log for confirmation
      console.log('Token upsert successful for user ID:', userId); 
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
import { serialize, parse } from 'cookie';
import * as jose from 'jose';
import { NextRequest, NextResponse } from 'next/server';

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || '';
const COOKIE_NAME = process.env.COOKIE_NAME || 'gsc_auth_token';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Check if JWT_SECRET is defined during server initialization
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not defined in environment variables!');
}

// Create a JWT token for the user
export const createToken = async (payload: any): Promise<string> => {
  if (!JWT_SECRET) {
    console.error('Error creating token: JWT_SECRET is not defined');
    throw new Error('JWT_SECRET is not defined');
  }
  
  console.log('Creating token with payload sub:', payload.sub);
  
  // Create a Secret Key from the JWT_SECRET
  const secretKey = new TextEncoder().encode(JWT_SECRET);
  
  // Set expiration time
  const expirationTime = Math.floor(Date.now() / 1000) + MAX_AGE;
  
  // Create and sign the JWT
  const token = await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expirationTime)
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .sign(secretKey);
  
  return token;
};

// Verify JWT token
export const verifyToken = async (token: string): Promise<any> => {
  if (!JWT_SECRET) {
    console.error('Error verifying token: JWT_SECRET is not defined');
    throw new Error('JWT_SECRET is not defined');
  }
  
  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Set JWT token in HTTP-only cookie
export const setTokenCookie = (
  res: NextResponse,
  token: string
): NextResponse => {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false, // Set to true in production
    maxAge: MAX_AGE,
    sameSite: 'lax',
    path: '/',
  });

  console.log('Setting cookie:', COOKIE_NAME);
  res.headers.set('Set-Cookie', cookie);
  return res;
};

// Remove the token cookie
export const removeTokenCookie = (res: NextResponse): NextResponse => {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    expires: new Date(0),
    sameSite: 'lax',
    path: '/',
  });

  res.headers.set('Set-Cookie', cookie);
  return res;
};

// Get the token from cookies
export const getTokenFromCookies = (req: NextRequest): string | null => {
  const cookies = parse(req.headers.get('cookie') || '');
  return cookies[COOKIE_NAME] || null;
};

// Get the current user from the token in cookies
export const getUserFromRequest = async (req: NextRequest): Promise<{ id: string } | null> => {
  const token = getTokenFromCookies(req);
  console.log('Auth cookie token:', token ? 'FOUND' : 'NOT FOUND');
  
  if (!token) return null;
  
  const payload = await verifyToken(token);
  console.log('Token verification result:', payload ? 'VALID' : 'INVALID');
  
  if (!payload) return null;
  
  return { id: payload.sub as string };
}; 
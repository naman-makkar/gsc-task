import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';
import { getSupabase } from './supabase';

// Define interface to match actual structure of tokens from Google
interface GoogleTokens {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  expires_in?: number;
  scope?: string;
}

// Google OAuth2 client setup
export const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth credentials in environment variables');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// Function to get authorization URL
export const getAuthUrl = () => {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force to get refresh_token every time
    scope: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
  });
};

// Exchange authorization code for tokens
export const getTokensFromCode = async (code: string): Promise<GoogleTokens> => {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens as GoogleTokens;
};

// Get user profile from tokens
export const getUserProfile = async (accessToken: string) => {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2',
  });
  
  const userInfo = await oauth2.userinfo.get();
  return userInfo.data;
};

// Function to get tokens from the database
export const getTokensFromDatabase = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('tokens')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error) throw error;
  return data;
};

/**
 * Gets a valid access token for a user, refreshing if necessary
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  // Get the user's tokens from Supabase
  const { data: tokens, error } = await supabase
    .from('tokens')
    .select('access_token, refresh_token, expiry_date')
    .eq('user_id', userId)
    .single();
  
  if (error || !tokens) {
    throw new Error('Failed to retrieve user tokens');
  }
  
  // Check if token is expired or will expire in the next 5 minutes
  const expiresAt = new Date(tokens.expiry_date).getTime();
  const now = Date.now();
  const isExpired = now + 5 * 60 * 1000 >= expiresAt;
  
  // If token is still valid, return it
  if (!isExpired) {
    return tokens.access_token;
  }
  
  // Token is expired, refresh it
  console.log('Access token expired, refreshing...');
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update tokens in database
    const { error: updateError } = await supabase
      .from('tokens')
      .update({
        access_token: credentials.access_token,
        expiry_date: new Date(Date.now() + (credentials as any).expires_in * 1000 || 3600 * 1000).toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      throw new Error('Failed to update tokens');
    }
    
    return credentials.access_token as string;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

// Function to create a webmasters API client with valid token
export const createSearchConsoleClient = async (userId: string) => {
  const accessToken = await getValidAccessToken(userId);
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.webmasters({
    version: 'v3',
    auth: oauth2Client,
  });
};

// Example function to list sites in Search Console
export const listSites = async (userId: string) => {
  const searchConsole = await createSearchConsoleClient(userId);
  const response = await searchConsole.sites.list();
  return response.data.siteEntry || [];
};

/**
 * Queries the Google Search Console API for search analytics data
 */
export async function querySearchAnalytics(
  userId: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ['query'],
  rowLimit: number = 1000,
  startRow: number = 0
): Promise<any> {
  try {
    // Get a valid access token
    const accessToken = await getValidAccessToken(userId);
    
    // Create authorized client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    // Create Search Console API client
    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client
    });
    
    // Prepare request body
    const requestBody = {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      startRow,
      searchType: 'web',
      aggregationType: 'auto'
    };
    
    console.log(`Fetching GSC data for ${siteUrl} from ${startDate} to ${endDate}`);
    
    // Make the API request - Do NOT encode the siteUrl, pass it directly
    const response = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl, // Removed encodeURIComponent
      requestBody
    });
    
    const rows = response.data.rows || [];
    
    // Check if we need to paginate
    if (rows.length === rowLimit) {
      // There might be more data, fetch next page
      const nextPageRows = await querySearchAnalytics(
        userId,
        siteUrl,
        startDate,
        endDate,
        dimensions,
        rowLimit,
        startRow + rowLimit
      );
      
      // Combine results
      return [...rows, ...nextPageRows];
    }
    
    return rows;
  } catch (error: any) {
    console.error('Error querying Search Console API:', error);
    
    // Handle specific API errors
    if (error.code === 401) {
      throw new Error('Authentication failed. Please re-authorize the application.');
    } else if (error.code === 403) {
      throw new Error('Insufficient permissions to access Search Console data for this site.');
    } else if (error.code === 429) {
      throw new Error('GSC API quota exceeded. Please try again later.');
    }
    
    throw new Error(`Failed to query GSC data: ${error.message}`);
  }
}

/**
 * Fetches search analytics data with caching logic
 */
export async function fetchSearchAnalyticsData(
  userId: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  metrics: string[],
  dimensions: string[] = ['query']
): Promise<any> {
  const supabase = getSupabase();
  
  // Create a cache key based on the request parameters
  const cacheKey = `${siteUrl}|${startDate}|${endDate}|${dimensions.join(',')}`;
  
  // Check if we have cached data
  const { data: cachedData, error: cacheError } = await supabase
    .from('reports_data')
    .select('data, created_at')
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
    .single();
  
  // If we have cached data that's less than 24 hours old, use it
  if (cachedData && !cacheError) {
    const cacheAge = Date.now() - new Date(cachedData.created_at).getTime();
    const cacheAgeHours = cacheAge / (1000 * 60 * 60);
    
    if (cacheAgeHours < 24) {
      console.log('Using cached GSC data');
      return cachedData.data;
    }
  }
  
  // No valid cache, fetch fresh data
  console.log('Fetching fresh GSC data');
  const gscData = await querySearchAnalytics(
    userId,
    siteUrl,
    startDate,
    endDate,
    dimensions
  );
  
  // Filter to include only requested metrics in the response
  const filteredData = gscData.map((row: any) => {
    const filteredRow: any = {
      keys: row.keys
    };
    
    // Include only requested metrics
    metrics.forEach((metric) => {
      if (row[metric] !== undefined) {
        filteredRow[metric] = row[metric];
      }
    });
    
    return filteredRow;
  });
  
  // Cache the data
  const { error: insertError } = await supabase
    .from('reports_data')
    .upsert({
      user_id: userId,
      cache_key: cacheKey,
      data: filteredData,
      created_at: new Date().toISOString()
    });
  
  if (insertError) {
    console.error('Failed to cache GSC data:', insertError);
    // Continue anyway, as this is not critical
  }
  
  return filteredData;
} 
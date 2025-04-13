import { google, sheets_v4, searchconsole_v1 } from 'googleapis';
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

// Define a more specific type for the token credentials if possible
interface RefreshedCredentials {
  access_token?: string | null;
  expires_in?: number | null;
  // Add other expected properties if known
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
    const refreshedCreds = credentials as RefreshedCredentials; // Type assertion
    
    // Update tokens in database
    const { error: updateError } = await supabase
      .from('tokens')
      .update({
        access_token: refreshedCreds.access_token,
        expiry_date: new Date(Date.now() + (refreshedCreds.expires_in || 3600) * 1000).toISOString()
      })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      throw new Error('Failed to update tokens');
    }
    
    return refreshedCreds.access_token as string;
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
): Promise<searchconsole_v1.Schema$ApiDataRow[] | undefined> {
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
    
    const rows = response.data.rows;
    
    // Check if we need to paginate
    if (rows && rows.length === rowLimit) {
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
      
      // Combine results, handling potential undefined nextPageRows
      return [...rows, ...(nextPageRows || [])];
    }
    
    return rows;
  } catch (error: unknown) {
    console.error('Error querying Search Console API:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific API errors
    if (message === 'Authentication failed. Please re-authorize the application.') {
      throw new Error('Authentication failed. Please re-authorize the application.');
    } else if (message === 'Insufficient permissions to access Search Console data for this site.') {
      throw new Error('Insufficient permissions to access Search Console data for this site.');
    } else if (message === 'GSC API quota exceeded. Please try again later.') {
      throw new Error('GSC API quota exceeded. Please try again later.');
    }
    
    throw new Error(`Failed to query GSC data: ${message}`);
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
): Promise<searchconsole_v1.Schema$ApiDataRow[] | undefined> {
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

  if (!gscData) { // Handle case where querySearchAnalytics returns undefined
      console.warn('querySearchAnalytics returned undefined data.');
      return undefined; 
  }
  
  // Filter to include only requested metrics in the response
  const filteredData = gscData.map((row: searchconsole_v1.Schema$ApiDataRow) => { // Use specific type for row
    const filteredRow: Record<string, any> = {
      keys: row.keys
    };
    
    // Include only requested metrics
    metrics.forEach((metric) => {
      if (row[metric as keyof searchconsole_v1.Schema$ApiDataRow] !== undefined) { // Type assertion for metric key
        filteredRow[metric] = row[metric as keyof searchconsole_v1.Schema$ApiDataRow];
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
      data: filteredData as Record<string, unknown>[], // Use Record<string, unknown>[] for data type
      created_at: new Date().toISOString()
    });
  
  if (insertError) {
    console.error('Failed to cache GSC data:', insertError);
    // Continue anyway, as this is not critical
  }
  
  return filteredData as searchconsole_v1.Schema$ApiDataRow[]; // Assert final type
}

// Function to create a new Google Sheet
export async function createGoogleSheet(userId: string, title: string): Promise<string | undefined> {
    try {
        const accessToken = await getValidAccessToken(userId);
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ access_token: accessToken });

        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: title,
                },
            },
        });

        return spreadsheet.data.spreadsheetId ?? undefined; // Handle potential null/undefined
    } catch (error: unknown) {
        console.error('Error creating Google Sheet:', error);
        throw error; // Re-throw for the API route to handle
    }
}

// Function to write data to a Google Sheet
export async function writeToGoogleSheet(
    userId: string, 
    spreadsheetId: string, 
    data: (string | number | null)[][] // Use more specific type for data
): Promise<sheets_v4.Schema$UpdateValuesResponse | null> { // Use specific return type
    try {
        const accessToken = await getValidAccessToken(userId);
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ access_token: accessToken });

        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A1', // Assuming data starts at A1 of Sheet1
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: data,
            },
        });

        return response.data;
    } catch (error: unknown) {
        console.error('Error writing to Google Sheet:', error);
        throw error; // Re-throw for the API route to handle
    }
} 
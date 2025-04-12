import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getUserFromRequest } from '@/lib/auth';
import { getValidAccessToken, getOAuth2Client } from '@/lib/google';
import { IntentAnalysis } from '@/lib/gemini'; // Assuming this is where the type is defined

interface ExportDataRow {
    query: string;
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
    intent?: IntentAnalysis['intent'];
    category?: IntentAnalysis['category'];
    funnel_stage?: IntentAnalysis['funnel_stage'];
    main_keywords?: string[];
}

interface ExportRequestBody {
    reportTitle: string;
    headers: string[];
    rows: ExportDataRow[];
}

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate User
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get Request Body Data
        const { reportTitle, headers, rows }: ExportRequestBody = await request.json();
        if (!reportTitle || !headers || !rows || !Array.isArray(headers) || !Array.isArray(rows)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        console.log(`[sheets/export] Received request to export report: "${reportTitle}" for user ${user.id}`);

        // 3. Get Valid Google Access Token
        let accessToken;
        try {
            accessToken = await getValidAccessToken(user.id);
            console.log(`[sheets/export] Obtained access token: ${accessToken ? accessToken.substring(0, 10) + '...' : ' FAILED'}`);
        } catch (tokenError) {
            console.error('[sheets/export] Error getting access token:', tokenError);
            return NextResponse.json({ error: 'Failed to get Google auth token. Re-authenticate.' }, { status: 401 });
        }
        if (!accessToken) {
             return NextResponse.json({ error: 'Failed to obtain valid token.' }, { status: 401 });
        }

        // 4. Initialize Google Sheets API Client using OAuth2Client
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ access_token: accessToken });
        
        // Pass the configured client to the auth parameter
        const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

        // 5. Create a New Spreadsheet
        console.log(`[sheets/export] Creating new spreadsheet: "${reportTitle}"`);
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: reportTitle,
                },
            },
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;
        const spreadsheetUrl = spreadsheet.data.spreadsheetUrl;

        if (!spreadsheetId || !spreadsheetUrl) {
            throw new Error('Failed to create spreadsheet');
        }
        console.log(`[sheets/export] Spreadsheet created with ID: ${spreadsheetId}`);

        // 6. Format Data for Sheets API
        const values = [
            headers, // Use the headers directly from the request
            ...rows.map(row => headers.map(header => {
                // Convert header to a potential key (handle case and spaces)
                let key: keyof ExportDataRow | string = header.toLowerCase().replace(/\s+/g, ''); // e.g., "funnel stage" -> "funnelstage"
                // Manual mapping for keys that don't directly match properties
                if (key === 'funnelstage') key = 'funnel_stage';
                if (key === 'mainkeywords') key = 'main_keywords';
                // Simple properties like 'query', 'clicks', 'intent', 'category' should match directly now

                let value = row[key as keyof ExportDataRow];

                // Specific formatting
                if (key === 'ctr' && typeof value === 'number') {
                    value = (value * 100).toFixed(2) + '%';
                } else if (key === 'position' && typeof value === 'number') {
                    value = value.toFixed(1);
                } else if (key === 'main_keywords' && Array.isArray(value)) {
                    value = value.join(', ');
                }
                
                // Handle null/undefined/objects
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return JSON.stringify(value);
                return value;
            }))
        ];

        // 7. Write Data to the Sheet
        console.log(`[sheets/export] Writing ${values.length} rows to spreadsheet ID: ${spreadsheetId}`);
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Sheet1!A1', // Start writing at the top-left cell of the first sheet
            valueInputOption: 'USER_ENTERED', // Interpret values as if user typed them
            requestBody: {
                values: values,
            },
        });
        console.log(`[sheets/export] Successfully wrote data to spreadsheet.`);

        // 8. Return Success Response with Sheet URL
        return NextResponse.json({
            success: true,
            message: 'Successfully exported to Google Sheets!',
            spreadsheetUrl: spreadsheetUrl,
        });

    } catch (error: any) {
        console.error('[sheets/export] Error exporting to Google Sheets:', error);
        let errorMessage = 'Failed to export to Google Sheets.';
        let status = 500;

        // Check for specific Google API errors
        if (error.response?.data?.error) {
            const googleError = error.response.data.error;
            errorMessage = googleError.message || errorMessage;
            status = googleError.code || status;
            console.error('[sheets/export] Google API Error Details:', googleError);
            if (status === 403) {
                 errorMessage = 'Permission denied. Ensure the Google Sheets API is enabled and the required scope was granted.';
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        return NextResponse.json({ error: errorMessage }, { status: status });
    }
} 
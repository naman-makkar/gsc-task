import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getReportIntents } from '@/lib/intent-storage';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get report ID from query parameters
    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('reportId');
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }
    
    // First, get the report to verify it belongs to the user
    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('reports_data')
      .select('user_id')
      .like('cache_key', `report_${reportId}_%`)
      .limit(1)
      .single();
    
    if (reportError || !reportData) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Verify the report belongs to the authenticated user
    if (reportData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to this report' },
        { status: 403 }
      );
    }
    
    // Get all intents for this report
    const intents = await getReportIntents(reportId);
    
    return NextResponse.json({
      success: true,
      reportId,
      count: intents.length,
      intents
    });
    
  } catch (error: unknown) {
    // Get reportId from searchParams within the catch block if needed
    const searchParams = request.nextUrl.searchParams;
    const reportIdForError = searchParams.get('reportId');
    console.error(`[report-intents] Error fetching intents for report ${reportIdForError || 'UNKNOWN'}:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve intent analysis', details: message },
      { status: 500 }
    );
  }
} 
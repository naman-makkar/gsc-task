import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the report data from the request body
    const requestData = await request.json();
    const { reportData, reportId } = requestData;
    
    if (!reportData || !reportId) {
      return NextResponse.json(
        { error: 'Report data and ID are required' },
        { status: 400 }
      );
    }
    
    // Create a unique cache key for this report
    const cacheKey = `report_${reportId}_${reportData.request.siteUrl}_${reportData.request.timeRange.startDate}_${reportData.request.timeRange.endDate}`;
    
    console.log(`Saving report ${reportId} to Supabase for user ${user.id}`);
    
    // Save the report to Supabase
    const { error } = await supabaseAdmin
      .from('reports_data')
      .upsert({
        user_id: user.id,
        cache_key: cacheKey,
        data: reportData,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving report to Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to save report data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      reportId
    });
    
  } catch (error: unknown) {
    console.error('Error saving report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to save report', details: message },
      { status: 500 }
    );
  }
} 
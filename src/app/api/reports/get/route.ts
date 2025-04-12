import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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
    
    // Get report ID from query params
    const searchParams = request.nextUrl.searchParams;
    const reportId = searchParams.get('reportId');
    
    if (reportId) {
      // Looking for a specific report
      // Extract cache key pattern for this reportId
      const cacheKeyPattern = `report_${reportId}_%`;
      
      // Get the specific report for this user and reportId
      const { data, error } = await supabaseAdmin
        .from('reports_data')
        .select('*')
        .eq('user_id', user.id)
        .like('cache_key', cacheKeyPattern)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching report from Supabase:', error);
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        report: data
      });
    } else {
      // Get all reports for this user
      const { data, error } = await supabaseAdmin
        .from('reports_data')
        .select('id, cache_key, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching reports from Supabase:', error);
        return NextResponse.json(
          { error: 'Failed to fetch reports' },
          { status: 500 }
        );
      }
      
      // Format the reports for easier consumption
      const formattedReports = data.map(report => {
        // Extract report details from cache key
        const keyParts = report.cache_key.split('_');
        const reportId = keyParts[1];
        
        // Extract site and date info if available
        let siteUrl = 'Unknown site';
        let dateRange = 'Unknown date range';
        
        if (keyParts.length > 2) {
          siteUrl = keyParts[2];
          if (keyParts.length > 4) {
            dateRange = `${keyParts[3]} to ${keyParts[4]}`;
          }
        }
        
        return {
          id: report.id,
          reportId,
          siteUrl,
          dateRange,
          created_at: report.created_at
        };
      });
      
      return NextResponse.json({
        success: true,
        reports: formattedReports
      });
    }
    
  } catch (error: any) {
    console.error('Error getting reports:', error);
    return NextResponse.json(
      { error: 'Failed to get report data', details: error.message },
      { status: 500 }
    );
  }
} 
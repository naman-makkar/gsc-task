import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Endpoint to get the currently selected site
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the selected site from database
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('selected_site')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch selected site' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      selectedSite: data?.selected_site || null
    });
  } catch (error) {
    console.error('Error fetching selected site:', error);
    return NextResponse.json(
      { error: 'Failed to fetch selected site' },
      { status: 500 }
    );
  }
}

// Endpoint to update the selected site
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the site URL from request body
    const requestData = await request.json();
    const { siteUrl } = requestData;
    
    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Site URL is required' },
        { status: 400 }
      );
    }
    
    // First check if the user already has a settings record
    const { data: existingData } = await supabaseAdmin
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    let result;
    
    if (existingData) {
      // Update existing record
      result = await supabaseAdmin
        .from('user_settings')
        .update({ selected_site: siteUrl })
        .eq('user_id', user.id);
    } else {
      // Create new record
      result = await supabaseAdmin
        .from('user_settings')
        .insert({
          user_id: user.id,
          selected_site: siteUrl
        });
    }
    
    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to update selected site' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      selectedSite: siteUrl
    });
  } catch (error) {
    console.error('Error updating selected site:', error);
    return NextResponse.json(
      { error: 'Failed to update selected site' },
      { status: 500 }
    );
  }
} 
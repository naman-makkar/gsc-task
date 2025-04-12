import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get user from request
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch user profile from database
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('email, name, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (error || !data) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      email: data.email,
      name: data.name,
      avatar: data.avatar_url,
    });
  } catch (error) {
    console.error('Error in profile route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
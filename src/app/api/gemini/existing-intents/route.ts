import { NextRequest, NextResponse } from 'next/server';
import { getExistingIntents } from '@/lib/intent-storage';
import { getUserFromRequest } from '@/lib/auth';
import { IntentAnalysis } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    // Check user authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get queries from request body
    const { queries } = await request.json();
    
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid queries parameter' },
        { status: 400 }
      );
    }

    // Get existing intents from database
    const existingIntents: IntentAnalysis[] = await getExistingIntents(queries);
    
    return NextResponse.json({ intents: existingIntents });
  } catch (error) {
    console.error('Error fetching existing intents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch existing intents' },
      { status: 500 }
    );
  }
} 
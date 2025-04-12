import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { IntentAnalysis, batchAnalyzeIntents } from '@/lib/gemini';
import { getExistingIntents, storeIntentAnalysis } from '@/lib/intent-storage';

// Helper for default analysis structure
const defaultAnalysis = (query: string): IntentAnalysis => ({
  query,
  intent: 'Unknown',
  category: 'Unknown',
  funnel_stage: 'Unknown',
  main_keywords: [],
});

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
    
    // Parse request data
    const requestData = await request.json();
    const { reportId, queries, visibleOnly } = requestData;
    
    // Validate inputs
    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }
    
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { error: 'Queries array is required and must not be empty' },
        { status: 400 }
      );
    }
    
    console.log(`[analyze-intents] Starting analysis for ${queries.length} queries. Report ID: ${reportId}, VisibleOnly: ${visibleOnly}`);
    
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
    
    // Step 1: Check existing intents based on query text
    let existingIntents: IntentAnalysis[] = [];
    try {
      existingIntents = await getExistingIntents(queries);
      console.log(`[analyze-intents] Found ${existingIntents.length} existing intents based on query text.`);
    } catch (error) {
      console.error('[analyze-intents] Error retrieving existing intents:', error);
    }
    
    // Step 2: Identify queries needing *new* Gemini analysis
    const existingQueriesSet = new Set(existingIntents.map(item => item.query));
    const queriesToAnalyze = queries.filter(query => !existingQueriesSet.has(query));
    console.log(`[analyze-intents] ${queriesToAnalyze.length} queries need NEW Gemini analysis.`);

    // Step 3: Process queries needing NEW analysis with Gemini
    let newIntents: IntentAnalysis[] = [];
    if (queriesToAnalyze.length > 0) {
      const useSinglePromptMode = visibleOnly; // Use single prompt efficiently if it's just visible ones
      const batchSize = useSinglePromptMode ? 0 : 1; 
      // Limit if not using single prompt, otherwise analyze all needing it
      const maxQueriesToAnalyze = useSinglePromptMode ? queriesToAnalyze.length : 10; 
      let limitedQueries = queriesToAnalyze;
      let hasMoreQueries = false;
      if (queriesToAnalyze.length > maxQueriesToAnalyze) {
        limitedQueries = queriesToAnalyze.slice(0, maxQueriesToAnalyze);
        hasMoreQueries = true;
        console.log(`[analyze-intents] Limiting NEW Gemini analysis to ${maxQueriesToAnalyze} queries.`);
      }

      console.log(`[analyze-intents] Analyzing ${limitedQueries.length} new queries with Gemini (Batch Size: ${batchSize})...`);
      try {
        newIntents = await batchAnalyzeIntents(limitedQueries, batchSize);
        console.log(`[analyze-intents] Gemini analysis completed for ${newIntents.length} newly analyzed queries.`);
      } catch (error: any) {
         console.error('[analyze-intents] Error during Gemini batch analysis:', error);
         // Handle rate limit error specifically
         if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
           return NextResponse.json({
             error: 'Rate limit exceeded on Gemini API.',
             partialSuccess: existingIntents.length > 0,
             rateLimited: true,
             processed: existingIntents.length, 
             remaining: queries.length - existingIntents.length,
             suggestion: 'Try again in a few minutes.'
           }, { status: 429 });
         }
         // For other Gemini errors, log but continue to try and save existing intents
      }
    } else {
        console.log('[analyze-intents] No queries required NEW Gemini analysis.');
    }
    
    // Step 4: Combine ALL relevant intents (existing + newly analyzed)
    // Create a map for quick lookup of new results
    const newIntentsMap = new Map(newIntents.map(item => [item.query, item]));
    // Combine: Use new result if available, otherwise use existing, otherwise default
    const intentsToSave = queries.map(query => {
        return newIntentsMap.get(query) || existingIntents.find(e => e.query === query) || defaultAnalysis(query);
    });
    console.log(`[analyze-intents] Prepared ${intentsToSave.length} total intents for saving/association with report ${reportId}.`);

    // Step 5: ALWAYS attempt to save/update these intents with the CURRENT reportId
    if (intentsToSave.length > 0) {
        console.log(`[analyze-intents] Attempting to store/update ${intentsToSave.length} intents for report ${reportId}...`);
        const stored = await storeIntentAnalysis(reportId, intentsToSave);
        if (stored) {
            console.log('[analyze-intents] Successfully stored/updated intents for this report.');
        } else {
            console.error('[analyze-intents] Failed to store/update intents for this report.');
            // Optionally return a specific error/warning to the frontend
        }
    } else {
        console.log('[analyze-intents] No intents (existing or new) to save for this report.');
    }

    // Step 6: Prepare final response (use the `intentsToSave` which includes everything)
    const sortedIntents = intentsToSave; // Already in the correct order relative to input `queries`
    
    console.log('[analyze-intents] Analysis & Save complete. Returning response.');
    return NextResponse.json({
      success: true,
      reportId,
      total: sortedIntents.length,
      cached: existingIntents.length, 
      new: newIntents.length, 
      intents: sortedIntents, 
      // Determine hasMoreQueries based on the initial request flag
      hasMoreQueries: !visibleOnly, // If visibleOnly was true, we assume it wasn't the full set
      // Remaining queries is hard to calculate accurately here, set to 0 for simplicity now
      // as the primary goal is analyzing the *requested* queries (visible or limited)
      remainingQueries: 0 
    });
    
  } catch (error: any) {
    console.error('[analyze-intents] Top-level error:', error);
    if (error.message?.includes('429')) {
      return NextResponse.json({ error: 'Rate limit likely exceeded.', rateLimited: true }, { status: 429 });
    }
    return NextResponse.json({ error: 'Failed to analyze query intents', details: error.message }, { status: 500 });
  }
} 
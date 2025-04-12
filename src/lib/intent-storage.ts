import { supabaseAdmin } from './supabase';
import { IntentAnalysis, SEOIntent, FunnelStage } from './gemini';

/**
 * Store intent analysis results in Supabase
 * 
 * @param reportId - The unique report ID
 * @param intents - Array of intent analysis results
 * @returns Promise resolving to success status
 */
export async function storeIntentAnalysis(
  reportId: string,
  intents: IntentAnalysis[]
): Promise<boolean> {
  if (intents.length === 0) {
    console.log('[storeIntentAnalysis] No intents provided to store.');
    return true; // Nothing to store, technically successful
  }
  
  console.log(`[storeIntentAnalysis] Attempting to store ${intents.length} intents for report ${reportId}...`);
  
  try {
    const formattedData = intents.map(intent => ({
      report_id: reportId,
      query: intent.query,
      intent: intent.intent || 'Unknown',
      category: intent.category || 'Unknown',
      funnel_stage: intent.funnel_stage || 'Unknown',
      main_keywords: intent.main_keywords || [],
      analyzed_at: new Date().toISOString()
    }));
    
    if (formattedData.length > 0) {
        console.log('[storeIntentAnalysis] Sample data being upserted:', JSON.stringify(formattedData[0]));
        console.log(`[storeIntentAnalysis] Using reportId: ${reportId} for upsert.`); 
    }

    const { error } = await supabaseAdmin
      .from('report_intents')
      .upsert(formattedData, { 
        onConflict: 'query', 
        ignoreDuplicates: false
      });
    
    if (error) {
      // Log the specific Supabase error
      console.error('[storeIntentAnalysis] Supabase upsert error:', error);
      console.error('[storeIntentAnalysis] Error details:', JSON.stringify(error, null, 2));
      return false;
    }
    
    console.log(`[storeIntentAnalysis] Successfully stored/updated ${intents.length} intents for report ${reportId}.`);
    return true;
  } catch (error) {
    console.error('[storeIntentAnalysis] Unexpected error during storage:', error);
    return false;
  }
}

/**
 * Retrieve existing intent analysis for specified queries, including new fields
 * 
 * @param queries - Array of search queries to check
 * @returns Promise resolving to matching intent analysis results
 */
export async function getExistingIntents(
  queries: string[]
): Promise<IntentAnalysis[]> {
  try {
    if (queries.length === 0) return [];
    
    // Get existing intent data from Supabase, selecting all relevant columns
    const { data, error } = await supabaseAdmin
      .from('report_intents')
      .select('query, intent, category, funnel_stage, main_keywords')
      .in('query', queries);
    
    if (error) {
      console.error('Error retrieving existing intents:', error);
      return [];
    }
    
    // Map to IntentAnalysis interface
    return data.map(item => ({
      query: item.query,
      intent: item.intent as SEOIntent || 'Unknown',
      category: item.category || 'Unknown',
      funnel_stage: item.funnel_stage as FunnelStage || 'Unknown',
      main_keywords: item.main_keywords || [] // Default to empty array if null/undefined
    }));
  } catch (error) {
    console.error('Failed to retrieve existing intents:', error);
    return [];
  }
}

/**
 * Get all intent analysis results for a specific report, including new fields
 * 
 * @param reportId - The unique report ID
 * @returns Promise resolving to all intent analysis for the report
 */
export async function getReportIntents(
  reportId: string
): Promise<IntentAnalysis[]> {
  console.log(`[getReportIntents] Fetching intents for report ${reportId}...`);
  try {
    const { data, error } = await supabaseAdmin
      .from('report_intents')
      .select('query, intent, category, funnel_stage, main_keywords')
      .eq('report_id', reportId);
    
    if (error) {
      console.error(`[getReportIntents] Error retrieving intents for report ${reportId}:`, error);
      return [];
    }
    
    console.log(`[getReportIntents] Found ${data.length} intents for report ${reportId}.`);
    // Map to IntentAnalysis interface
    return data.map(item => ({
      query: item.query,
      intent: item.intent as SEOIntent || 'Unknown',
      category: item.category || 'Unknown',
      funnel_stage: item.funnel_stage as FunnelStage || 'Unknown',
      main_keywords: item.main_keywords || []
    }));
  } catch (error) {
    console.error(`[getReportIntents] Failed to retrieve intents for report ${reportId}:`, error);
    return [];
  }
} 
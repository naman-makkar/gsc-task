import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with the API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Warning: GEMINI_API_KEY is not defined in environment variables');
}
const genAI = new GoogleGenerativeAI(apiKey || '');

/**
 * SEO Intent Categories
 */
export type SEOIntent = 'Informational' | 'Navigational' | 'Transactional' | 'Commercial Investigation' | 'Mixed' | 'Unknown';

/**
 * Marketing Funnel Stages
 */
export type FunnelStage = 'Awareness' | 'Consideration' | 'Decision' | 'Post-Purchase' | 'Unknown';

/**
 * Updated Interface for storing richer intent analysis results
 */
export interface IntentAnalysis {
  query: string;
  intent: SEOIntent;
  category?: string; // e.g., "SEO Software", "Travel Tips", "Local Restaurant"
  funnel_stage?: FunnelStage;
  main_keywords?: string[];
  error?: string;
}

/**
 * Sleep utility for delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Default analysis result for fallbacks
 */
const defaultAnalysis = (query: string, error?: string): IntentAnalysis => ({
  query,
  intent: 'Unknown',
  category: 'Unknown',
  funnel_stage: 'Unknown',
  main_keywords: [],
  error,
});

/**
 * Analyzes a batch of queries using a single prompt asking for rich JSON output
 */
async function analyzeMultipleQueriesWithSinglePrompt(
  queries: string[], 
  model: any, // Keep any for external library model type for now
  maxRetries = 3
): Promise<IntentAnalysis[]> {
  let retries = 0;
  const queriesJson = JSON.stringify(queries);

  while (retries <= maxRetries) {
    try {
      const prompt = `
        You are an expert SEO analyst specializing in search intent and query classification.
        Analyze the user intent, category, funnel stage, and main keywords for each search query in the following JSON array:
        ${queriesJson}

        Return the analysis as a JSON array where each object has the following structure:
        {
          "query": "<original_query>",
          "intent": "<Informational | Navigational | Transactional | Commercial Investigation | Mixed | Unknown>",
          "category": "<Brief topic description, e.g., 'Software Review', 'Travel Guide', 'Local Service'>",
          "funnel_stage": "<Awareness | Consideration | Decision | Post-Purchase | Unknown>",
          "main_keywords": ["<keyword1>", "<keyword2>"]
        }

        Ensure the 'intent' and 'funnel_stage' values are ONLY from the provided options.
        If unsure about any field, use "Unknown" or an empty array for keywords.
        
        Output ONLY the JSON array. Do not include any introductory text or markdown formatting.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      let jsonString = response.text().trim();
      
      // Clean the response: remove markdown code fences if present
      jsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      
      const analysisResults = JSON.parse(jsonString) as IntentAnalysis[];
      
      // Validate the structure and fill in missing results
      const finalResults: IntentAnalysis[] = queries.map(q => {
        const found = analysisResults.find(r => r.query === q);
        // Provide default values if a query result is missing or incomplete
        return {
          query: q,
          intent: found?.intent || 'Unknown',
          category: found?.category || 'Unknown',
          funnel_stage: found?.funnel_stage || 'Unknown',
          main_keywords: found?.main_keywords || [],
        };
      });

      return finalResults;
    } catch (error: unknown) {
      const isRateLimit = error instanceof Error && error.message?.includes('429') || 
                          error instanceof Error && error.message?.includes('Too Many Requests') ||
                          typeof error === 'object' && error !== null && 'status' in error && error.status === 429;

      if (isRateLimit && retries < maxRetries) {
        const backoffTime = Math.pow(2, retries + 2) * 1000;
        console.log(`Rate limit hit for batch prompt. Retrying in ${backoffTime/1000}s...`);
        await sleep(backoffTime);
        retries++;
      } else {
        console.error('Error analyzing batch query intent with single prompt:', error);
        // Fallback: return default analysis for all queries in the batch
        return queries.map(q => defaultAnalysis(q)); 
      }
    }
  }
  // Fallback if all retries fail
  return queries.map(q => defaultAnalysis(q));
}

/**
 * Main function to batch process queries for intent analysis.
 * Uses single-prompt analysis if batchSize is set to 0.
 */
export async function batchAnalyzeIntents(
  queries: string[],
  batchSize: number = 5,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<IntentAnalysis[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not defined');
    return queries.map(q => defaultAnalysis(q));
  }

  const uniqueQueries = [...new Set(queries)];
  if (uniqueQueries.length === 0) return [];

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const allResults: IntentAnalysis[] = [];
  let currentBatch: string[] = [];

  for (let i = 0; i < queries.length; i++) {
    currentBatch.push(queries[i]);

    if (currentBatch.length === batchSize || i === queries.length - 1) {
      console.log(`Analyzing batch of ${currentBatch.length} queries...`);
      let retries = 0;
      let delay = initialDelay;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          const batchResults = await analyzeMultipleQueriesWithSinglePrompt(currentBatch, model);
          allResults.push(...batchResults);
          success = true;
          console.log(`Batch analysis successful (attempt ${retries + 1})`);
        } catch (error: unknown) {
          retries++;
          console.error(`Batch analysis attempt ${retries} failed:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('429')) {
            if (retries >= maxRetries) {
              console.error(`Rate limit hit, max retries (${maxRetries}) reached for batch. Skipping.`);
              // Add default error analysis for each query in the failed batch
              allResults.push(...currentBatch.map(q => defaultAnalysis(q, 'Rate Limit Exceeded')));
              break; // Exit retry loop for this batch
            }
            delay = Math.min(delay * 2, 30000); // Exponential backoff, max 30 seconds
            console.log(`Rate limit likely hit, retrying batch in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // For non-rate-limit errors, fail the batch immediately
            console.error('Non-retriable error encountered for batch. Skipping.');
            allResults.push(...currentBatch.map(q => defaultAnalysis(q, 'Analysis Error')));
            break; // Exit retry loop for this batch
          }
        }
      }
      // Reset batch for next iteration
      currentBatch = [];
    }
  }

  return allResults;
} 
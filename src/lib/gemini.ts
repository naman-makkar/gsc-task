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
}

/**
 * Sleep utility for delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Default analysis result for fallbacks
 */
const defaultAnalysis = (query: string): IntentAnalysis => ({
  query,
  intent: 'Unknown',
  category: 'Unknown',
  funnel_stage: 'Unknown',
  main_keywords: [],
});

/**
 * Analyzes a single query intent with richer analysis
 */
async function analyzeSingleQuery(query: string, model: any, maxRetries = 3): Promise<IntentAnalysis> {
  let retries = 0;
  while (retries <= maxRetries) {
    try {
      const prompt = `
        Analyze the following search query for SEO insights:
        Query: "${query}"

        Provide your analysis in JSON format with the following fields:
        - "intent": Classify into ONE: Informational, Navigational, Transactional, Commercial Investigation, Mixed, Unknown.
        - "category": A brief descriptor of the topic (e.g., "DIY Home Repair", "JavaScript Frameworks", "Luxury Hotels").
        - "funnel_stage": Classify into ONE: Awareness, Consideration, Decision, Post-Purchase, Unknown.
        - "main_keywords": An array of the 1-3 most important keywords or entities in the query.

        Example Response:
        {
          "intent": "Informational",
          "category": "Recipe",
          "funnel_stage": "Awareness",
          "main_keywords": ["chocolate chip cookie recipe"]
        }
        
        Output ONLY the JSON object.
      `;
      const result = await model.generateContent(prompt);
      const response = result.response;
      let jsonString = response.text().trim();
      jsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      
      const analysis = JSON.parse(jsonString) as Omit<IntentAnalysis, 'query'>;

      // Basic validation
      if (!analysis.intent || !analysis.category || !analysis.funnel_stage || !analysis.main_keywords) {
          throw new Error('Model response missing required fields.')
      }

      return { query, ...analysis };
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.includes('Too Many Requests') ||
                          error.status === 429;
      if (isRateLimit && retries < maxRetries) {
        const backoffTime = Math.pow(2, retries + 2) * 1000;
        console.log(`Rate limit hit for single query. Retrying in ${backoffTime/1000}s...`);
        await sleep(backoffTime);
        retries++;
      } else {
        console.error(`Error analyzing query "${query}":`, error);
        return defaultAnalysis(query); // Fallback on error
      }
    }
  }
  return defaultAnalysis(query); // Fallback if all retries fail
}

/**
 * Analyzes a batch of queries using a single prompt asking for rich JSON output
 */
async function analyzeMultipleQueriesWithSinglePrompt(queries: string[], model: any, maxRetries = 3): Promise<IntentAnalysis[]> {
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
    } catch (error: any) {
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.includes('Too Many Requests') ||
                          error.status === 429;

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
  batchSize: number = 1 // Set to 0 to use single-prompt mode
): Promise<IntentAnalysis[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not defined');
    return queries.map(q => defaultAnalysis(q));
  }

  const uniqueQueries = [...new Set(queries)];
  if (uniqueQueries.length === 0) return [];

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Single-prompt mode: Analyze all queries in one go
  if (batchSize === 0) {
    console.log(`Analyzing ${uniqueQueries.length} queries using single-prompt mode.`);
    return analyzeMultipleQueriesWithSinglePrompt(uniqueQueries, model);
  }

  // Batch mode: Process queries in smaller batches
  const results: IntentAnalysis[] = [];
  console.log(`Analyzing ${uniqueQueries.length} queries in batches of ${batchSize}.`);
  
  for (let i = 0; i < uniqueQueries.length; i += batchSize) {
    const batch = uniqueQueries.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueQueries.length/batchSize)}...`);
    
    const batchPromises = batch.map(query => analyzeSingleQuery(query, model));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    console.log(`Finished batch ${Math.floor(i/batchSize) + 1}. Processed ${results.length}/${uniqueQueries.length} queries.`);
    
    // Add delay between batches if not the last batch
    if (i + batchSize < uniqueQueries.length) {
      const delayMs = 3000; // 3 seconds
      console.log(`Waiting ${delayMs/1000}s before next batch...`);
      await sleep(delayMs);
    }
  }
  
  return results;
} 
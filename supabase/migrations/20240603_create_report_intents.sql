-- Create a table to store search query intent analysis
CREATE TABLE report_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL,
  query TEXT NOT NULL,
  intent TEXT NOT NULL,
  category TEXT,                      -- Added: General topic category
  funnel_stage TEXT,                  -- Added: Marketing funnel stage
  main_keywords JSONB,                -- Added: Main keywords/entities (as JSON array)
  analyzed_at TIMESTAMPTZ DEFAULT NOW(), -- Fixed: Use TIMESTAMPTZ for PostgreSQL
  
  -- Unique constraint to avoid duplicate analysis for the same query string
  UNIQUE(query)
); 
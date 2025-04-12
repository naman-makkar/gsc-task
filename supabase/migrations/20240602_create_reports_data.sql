-- Create a table to cache GSC report data
CREATE TABLE IF NOT EXISTS reports_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to avoid duplicate cache entries
  UNIQUE(user_id, cache_key)
); 
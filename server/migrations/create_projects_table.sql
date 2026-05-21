-- Projects Table: stores each user's PRD pipeline state
-- Purpose: persistent storage so users can resume PRDs across sessions / devices

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  stage NUMERIC NOT NULL DEFAULT 0,         -- 0, 1, 1.5, 2, 5, 6, 6.5
  session_data JSONB,                       -- full pipelineState blob (intake, prd, agentFeedback, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index: list a user's projects fast
CREATE INDEX IF NOT EXISTS idx_projects_user_email ON projects(user_email, updated_at DESC);

-- Index: share-token lookups (session_data->>shareToken)
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects((session_data->>'shareToken'));

-- Auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

-- Grant permissions
GRANT ALL ON TABLE projects TO authenticated;
GRANT ALL ON TABLE projects TO service_role;
GRANT ALL ON TABLE projects TO anon;

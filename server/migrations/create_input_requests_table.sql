-- Input Requests Table for Phase 2: Input Request System
-- Purpose: Track expert input requests during PRD generation (Mode A collaboration)

CREATE TABLE IF NOT EXISTS input_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage VARCHAR NOT NULL,                    -- Stage identifier (e.g., 'technical_feasibility', 'delivery_reality')
  stage_draft TEXT,                          -- Snapshot of AI draft at time of request
  requested_by VARCHAR NOT NULL,             -- Email of person requesting (Ojas)
  requested_from VARCHAR NOT NULL,           -- Email of person being asked (Adwait, Ashish, etc.)
  question TEXT NOT NULL,                    -- The specific question being asked
  response TEXT,                             -- Response from the expert
  include_in_context BOOLEAN DEFAULT FALSE,  -- Did owner decide to use this as AI input?
  status VARCHAR DEFAULT 'pending',          -- pending, responded, incorporated, noted
  teams_message_id VARCHAR,                  -- Teams message ID for threading (future use)
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

-- Index for querying by PRD
CREATE INDEX idx_input_requests_prd_id ON input_requests(prd_id);

-- Index for querying user's pending requests
CREATE INDEX idx_input_requests_requested_from ON input_requests(requested_from, status);

-- Index for querying by status
CREATE INDEX idx_input_requests_status ON input_requests(status);

-- Team routing table (who to ping for which stages)
CREATE TABLE IF NOT EXISTS team_expertise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR NOT NULL UNIQUE,
  user_name VARCHAR NOT NULL,
  role VARCHAR NOT NULL,                     -- Tech Lead, CBO, Delivery Lead, etc.
  domain TEXT NOT NULL,                      -- Expertise description
  suggested_stages VARCHAR[],                -- Array of stage identifiers where this person should be suggested
  avatar_url VARCHAR,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert Rian team members from routing table
INSERT INTO team_expertise (user_email, user_name, role, domain, suggested_stages) VALUES
  ('adwait.natekar@rian.io', 'Adwait Natekar', 'Tech Lead / Dev Lead', 'VOX architecture, C# backend, React frontend, AWS infra, code review', ARRAY['technical_feasibility', 'security', 'delivery_reality']),
  ('ashish@rian.io', 'Ashish Shinde', 'CBO / CSO', 'Business strategy, client relationships, commercial decisions', ARRAY['business_value', 'intake']),
  ('sumant@rian.io', 'Sumant Jamdar', 'Delivery & Operations', 'Delivery feasibility, timelines, SLAs, operational constraints', ARRAY['delivery_reality']),
  ('rohit@rian.io', 'Rohit', 'QC Lead', 'Quality gates, QC standards, subtitle/dubbing QC requirements', ARRAY['qc']),
  ('vishal.kaushal@rian.io', 'Vishal Kaushal', 'R&D (TTS+)', 'TTS pipeline, voice cloning, audio models, ElevenLabs', ARRAY['technical_feasibility']),
  ('rugved@rian.io', 'Rugved Myakal', 'R&D (OCR)', 'OCR pipeline, Azure DI, image translation, DTP', ARRAY['technical_feasibility']),
  ('saijash@rian.io', 'Saijash', 'CTO', 'Final technical authority, architecture decisions, AI strategy', ARRAY['technical_feasibility', 'security', 'debate']),
  ('ojas@rian.io', 'Ojas', 'Product', 'PRD owner, primary builder', ARRAY[])
ON CONFLICT (user_email) DO NOTHING;

-- Grant permissions
GRANT ALL ON TABLE input_requests TO authenticated;
GRANT ALL ON TABLE input_requests TO service_role;
GRANT ALL ON TABLE input_requests TO anon;

GRANT ALL ON TABLE team_expertise TO authenticated;
GRANT ALL ON TABLE team_expertise TO service_role;
GRANT ALL ON TABLE team_expertise TO anon;

-- WE_PROJECTS CASCADE Intelligence Database Schema
-- Tenant: WE_PROJECTS (Activ8 Leadership Consulting)
-- Separate from Julie/Exit Planning

-- Documents table
CREATE TABLE IF NOT EXISTS cascade_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(50) NOT NULL DEFAULT 'WE_PROJECTS',
  title TEXT NOT NULL,
  content TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extractions table (intelligence insights)
CREATE TABLE IF NOT EXISTS cascade_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES cascade_documents(id) ON DELETE CASCADE,
  extraction_type VARCHAR(100) NOT NULL,
  extracted_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  tags TEXT[],
  context_snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metadata table (document analysis metadata)
CREATE TABLE IF NOT EXISTS cascade_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES cascade_documents(id) ON DELETE CASCADE,
  intelligence_tags TEXT[],
  concepts_count INTEGER DEFAULT 0,
  entities_count INTEGER DEFAULT 0,
  complexity_score INTEGER DEFAULT 0,
  extraction_confidence DECIMAL(3,2),
  metadata_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cascade_documents_domain ON cascade_documents(domain);
CREATE INDEX IF NOT EXISTS idx_cascade_documents_status ON cascade_documents(status);
CREATE INDEX IF NOT EXISTS idx_cascade_documents_created_at ON cascade_documents(created_at);

CREATE INDEX IF NOT EXISTS idx_cascade_extractions_document_id ON cascade_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_cascade_extractions_type ON cascade_extractions(extraction_type);
CREATE INDEX IF NOT EXISTS idx_cascade_extractions_confidence ON cascade_extractions(confidence_score);
CREATE INDEX IF NOT EXISTS idx_cascade_extractions_tags ON cascade_extractions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_cascade_extractions_created_at ON cascade_extractions(created_at);

CREATE INDEX IF NOT EXISTS idx_cascade_metadata_document_id ON cascade_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_cascade_metadata_complexity ON cascade_metadata(complexity_score);
CREATE INDEX IF NOT EXISTS idx_cascade_metadata_confidence ON cascade_metadata(extraction_confidence);
CREATE INDEX IF NOT EXISTS idx_cascade_metadata_tags ON cascade_metadata USING GIN(intelligence_tags);
CREATE INDEX IF NOT EXISTS idx_cascade_metadata_json ON cascade_metadata USING GIN(metadata_json);

-- Views for common queries
CREATE OR REPLACE VIEW we_projects_intelligence AS
SELECT 
  d.id as document_id,
  d.title,
  d.domain,
  e.extraction_type,
  e.extracted_value,
  e.confidence_score,
  e.tags,
  e.context_snippet,
  e.created_at
FROM cascade_documents d
JOIN cascade_extractions e ON d.id = e.document_id
WHERE d.domain = 'WE_PROJECTS' AND d.status = 'active';

CREATE OR REPLACE VIEW we_projects_summary AS
SELECT 
  COUNT(DISTINCT d.id) as total_documents,
  COUNT(e.id) as total_extractions,
  AVG(e.confidence_score) as avg_confidence,
  COUNT(DISTINCT e.extraction_type) as extraction_types,
  d.domain
FROM cascade_documents d
JOIN cascade_extractions e ON d.id = e.document_id
WHERE d.domain = 'WE_PROJECTS' AND d.status = 'active'
GROUP BY d.domain;
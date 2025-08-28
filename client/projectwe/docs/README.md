# WE_PROJECTS CASCADE Intelligence Export

## 📋 Overview

This export contains the complete **WE_PROJECTS** (Activ8 Leadership Consulting) CASCADE Intelligence system - a separate tenant from Julie/Exit Planning.

**Business Entity**: Activ8 - Leadership development and high-performance consulting company
**Primary Facilitator**: Erik (leadership speaker/coach)
**Core Documents**: 68 A8/Activ8 methodology documents
**Intelligence Points**: 4,102 extracted insights
**Processing Method**: GPT-5 CASCADE analysis with 16,960 reasoning tokens

---

## 📁 Export Structure

```
WE_PROJECTS_CASCADE_EXPORT/
├── data/                           # All database extractions and intelligence
│   ├── we_projects_extractions.csv           # 4,102 intelligence extractions
│   ├── we_projects_extractions_with_docmeta.csv
│   ├── WE-PROJECTS-MASTER-INTELLIGENCE-*.json # GPT-5 master analysis
│   └── WE-PROJECTS-CASCADE-SUMMARY.json      # Processing summary
├── reports/                        # GPT-5 CASCADE processing outputs
│   ├── gpt5-cascade/              # Individual document analyses
│   ├── CASCADE-REPORT-*.json      # Analysis reports
│   └── GPT5-*.json               # Processing outputs
├── api/                           # API routes and implementation
│   ├── we-projects/              # WE_PROJECTS API endpoints
│   ├── cascade-intelligence/     # CASCADE intelligence API
│   └── page.tsx                  # Layer 4 dashboard component
├── agents/                        # Monitoring and processing agents
│   ├── projectwe-monitoring-agent.ts
│   └── *.js processing scripts
├── config/                        # Configuration files
└── docs/                          # This documentation
```

---

## 🎯 WE_PROJECTS Business Intelligence

### Core Entity: Activ8
- **Business Focus**: Leadership development, high-performance consulting
- **Methodologies**: Experiential learning, accountability systems, strategic transformation
- **Target Market**: Executive teams, organizational development, leadership coaching

### Intelligence Layers
1. **FOUNDATION** (354 concepts, 215 findings): Leadership development, personal transformation
2. **STRATEGIC** (468 concepts, 213 findings): Fear management, role transitions, strategic thinking  
3. **IMPLEMENTATION** (431 concepts, 213 findings): Experiential learning, coaching methods
4. **EVOLUTION** (259 concepts, 213 findings): Deep transformation insights, accountability systems

### Key Frameworks
- **Accountability Engine**: Accountability vs responsibility methodology
- **Advisor Collaborative**: Practice transformation framework
- **Learning Culture**: Sustained behavioral change practices
- **High Performance Culture**: Team standards and operationalization
- **Conversations for Results**: Communication methodology

---

## 🚀 Installation Instructions

### 1. Database Setup
```sql
-- Create CASCADE tables for WE_PROJECTS tenant
CREATE TABLE cascade_documents (
  id UUID PRIMARY KEY,
  domain VARCHAR(50) DEFAULT 'WE_PROJECTS',
  title TEXT NOT NULL,
  content TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cascade_extractions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES cascade_documents(id),
  extraction_type VARCHAR(100),
  extracted_value TEXT,
  confidence_score DECIMAL(3,2),
  tags TEXT[],
  context_snippet TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cascade_metadata (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES cascade_documents(id),
  intelligence_tags TEXT[],
  concepts_count INTEGER,
  entities_count INTEGER,
  complexity_score INTEGER,
  extraction_confidence DECIMAL(3,2),
  metadata_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Data Import
```bash
# Import extractions data
psql -d your_database -c "\COPY cascade_extractions FROM 'data/we_projects_extractions.csv' CSV HEADER"

# Import documents (create from extractions)
# Run the data migration script included
```

### 3. API Integration
```bash
# Copy API routes to your Next.js project
cp -r api/we-projects/ src/app/api/
cp -r api/cascade-intelligence/ src/app/api/

# Copy dashboard component
cp api/page.tsx src/app/(platform)/we-projects-layer4/
```

### 4. Agent Deployment
```bash
# Copy monitoring agents
cp agents/*.ts src/agents/
cp agents/*.js scripts/

# Configure environment variables
echo "GITHUB_TOKEN=your_token" >> .env
echo "VERCEL_TOKEN=your_token" >> .env
echo "MCP_ENDPOINT=http://localhost:3456" >> .env
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Required for WE_PROJECTS
DATABASE_URL=postgresql://...
DOMAIN_FILTER=WE_PROJECTS
TENANT=WE_PROJECTS

# GPT-5 Processing
OPENAI_API_KEY=your_key
GPT5_MODEL=gpt-4-turbo  # Or actual GPT-5 when available

# Monitoring
GITHUB_TOKEN=your_github_token
VERCEL_TOKEN=your_vercel_token
WEBHOOK_URL=your_slack_webhook  # Optional
```

### API Endpoints
- `GET /api/we-projects/intelligence` - Get WE_PROJECTS intelligence data
- `GET /api/we-projects/cascade-intelligence` - Layer 4 deep analysis
- `GET /api/we-projects/documents` - Document management
- `POST /api/we-projects/intelligence/export` - Export functionality

---

## 📊 Data Schema

### Extraction Types
- **FOUNDATION_FINDING**: Surface-level insights and observations
- **FOUNDATION_CONCEPT**: Core concepts and entities
- **STRATEGIC_FINDING**: Strategic patterns and business implications  
- **STRATEGIC_CONCEPT**: Strategic frameworks and methodologies
- **IMPLEMENTATION_FINDING**: Implementation patterns and processes
- **IMPLEMENTATION_CONCEPT**: Tools and methodologies
- **EVOLUTION_FINDING**: Deep transformational insights
- **EVOLUTION_CONCEPT**: Advanced frameworks and paradigm shifts

### Confidence Levels
- **0.85-0.90**: High confidence insights (majority of data)
- **0.90-0.95**: Very high confidence strategic findings
- **Tags**: WE_PROJECTS|LAYER|gpt5 format

---

## 🎮 Usage Examples

### Query Strategic Insights
```javascript
const response = await fetch('/api/we-projects/intelligence?type=insights&limit=100');
const { insights } = await response.json();
```

### Access Layer 4 Dashboard
Navigate to `/we-projects-layer4` for the complete intelligence dashboard with:
- Multi-layer visualization
- Analytical writeups
- Network graphs  
- Pattern detection

### Export Intelligence
```javascript
const exportData = await fetch('/api/we-projects/intelligence/export');
```

---

## 🔍 Key Intelligence Insights

### Strategic Patterns
1. **Leadership Transformation**: Tactical → Strategic role evolution
2. **Accountability Systems**: Voluntary engagement vs task completion
3. **Fear Management**: From avoidance to strategic risk-taking
4. **Experiential Learning**: Deep personal/professional integration

### Business Value
- **Life-changing transformations** with measurable impact
- **Strategic role transitions** (e.g., "Tactical CFO" → "Strategic CFO")
- **Holistic development** across personal and professional domains
- **Scalable methodologies** through frameworks and certification

### Competitive Advantages
- **Unique packaging** of common-sense principles into actionable methodologies
- **2-day intensives** + 30-40 day integration windows
- **Whole-person transformation** transferring across life domains
- **Environment creation** vs command-and-control leadership

---

## 🚨 Important Notes

1. **Separate Tenant**: WE_PROJECTS is completely separate from Julie/Exit Planning
2. **Domain Filter**: Always filter by `domain='WE_PROJECTS'` in queries
3. **GPT-5 Processing**: Requires significant token budget for reprocessing
4. **Confidence Levels**: 85-90% validated insights across all layers
5. **Business Context**: Activ8 leadership consulting, not exit planning

---

## 📞 Support

This export represents the complete WE_PROJECTS CASCADE Intelligence system as of August 2025. For questions about implementation or data structure, refer to the original source system documentation.

**Entity**: Activ8 Leadership & High Performance Consulting  
**Processing Method**: GPT-5 CASCADE Analysis  
**Confidence**: 85-90% validated intelligence  
**Scope**: 68 unique A8 methodology documents
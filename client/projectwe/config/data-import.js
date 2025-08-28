#!/usr/bin/env node
/**
 * WE_PROJECTS CASCADE Intelligence Data Import Script
 * Imports CSV extraction data into PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const csv = require('csv-parse');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cascade_intelligence',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

const DOMAIN = 'WE_PROJECTS';
const DATA_DIR = path.join(__dirname, '../data');

async function importWEProjectsData() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('📡 Connected to PostgreSQL database');

    // Read and parse CSV file
    const csvPath = path.join(DATA_DIR, 'we_projects_extractions.csv');
    console.log('📄 Reading CSV file:', csvPath);
    
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records = [];
    await new Promise((resolve, reject) => {
      csv.parse(csvData, {
        columns: true,
        skip_empty_lines: true
      }, (err, data) => {
        if (err) reject(err);
        else {
          records.push(...data);
          resolve();
        }
      });
    });

    console.log(`📊 Parsed ${records.length} extraction records`);

    // Group by document to create document entries first
    const documentsMap = new Map();
    records.forEach(record => {
      const docId = record.document_id;
      const title = record.title;
      
      if (!documentsMap.has(docId)) {
        documentsMap.set(docId, {
          id: docId,
          title: title,
          domain: DOMAIN,
          status: 'active'
        });
      }
    });

    console.log(`📚 Found ${documentsMap.size} unique documents`);

    // Insert documents
    const insertDocumentQuery = `
      INSERT INTO cascade_documents (id, domain, title, status, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO NOTHING
    `;

    let documentCount = 0;
    for (const doc of documentsMap.values()) {
      await client.query(insertDocumentQuery, [
        doc.id,
        doc.domain,
        doc.title,
        doc.status
      ]);
      documentCount++;
      
      if (documentCount % 10 === 0) {
        console.log(`📝 Inserted ${documentCount}/${documentsMap.size} documents`);
      }
    }

    console.log(`✅ Inserted ${documentCount} documents`);

    // Insert extractions
    const insertExtractionQuery = `
      INSERT INTO cascade_extractions (
        document_id, extraction_type, extracted_value, confidence_score, 
        tags, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    let extractionCount = 0;
    for (const record of records) {
      // Parse tags
      const tags = record.tags ? record.tags.split('|') : [];
      
      // Parse created_at
      const createdAt = record.created_at || new Date().toISOString();
      
      await client.query(insertExtractionQuery, [
        record.document_id,
        record.extraction_type,
        record.extracted_value,
        parseFloat(record.confidence) || 0.85,
        tags,
        createdAt
      ]);
      
      extractionCount++;
      
      if (extractionCount % 100 === 0) {
        console.log(`💡 Inserted ${extractionCount}/${records.length} extractions`);
      }
    }

    console.log(`✅ Inserted ${extractionCount} extractions`);

    // Create summary metadata
    const metadataQuery = `
      INSERT INTO cascade_metadata (
        document_id, intelligence_tags, concepts_count, entities_count, 
        complexity_score, extraction_confidence
      )
      SELECT 
        d.id,
        array_agg(DISTINCT unnest(e.tags)),
        count(*) FILTER (WHERE e.extraction_type LIKE '%CONCEPT%'),
        count(*) FILTER (WHERE e.extraction_type LIKE '%FINDING%'),
        LEAST(95, 40 + count(*) * 2),
        avg(e.confidence_score)
      FROM cascade_documents d
      JOIN cascade_extractions e ON d.id = e.document_id
      WHERE d.domain = $1
      GROUP BY d.id
      ON CONFLICT (document_id) DO UPDATE SET
        intelligence_tags = EXCLUDED.intelligence_tags,
        concepts_count = EXCLUDED.concepts_count,
        entities_count = EXCLUDED.entities_count,
        complexity_score = EXCLUDED.complexity_score,
        extraction_confidence = EXCLUDED.extraction_confidence
    `;

    await client.query(metadataQuery, [DOMAIN]);
    console.log('📋 Generated metadata for all documents');

    // Import master intelligence JSON if exists
    const masterIntelligenceFile = fs.readdirSync(DATA_DIR)
      .find(f => f.startsWith('WE-PROJECTS-MASTER-INTELLIGENCE-') && f.endsWith('.json'));
    
    if (masterIntelligenceFile) {
      const masterData = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, masterIntelligenceFile), 'utf-8')
      );
      
      // Store master intelligence as special document
      const masterDocId = uuidv4();
      await client.query(insertDocumentQuery, [
        masterDocId,
        DOMAIN,
        'WE_PROJECTS Master Intelligence Report',
        'active'
      ]);

      // Store as metadata
      await client.query(`
        INSERT INTO cascade_metadata (
          document_id, intelligence_tags, metadata_json, extraction_confidence
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (document_id) DO UPDATE SET metadata_json = EXCLUDED.metadata_json
      `, [
        masterDocId,
        ['WE_PROJECTS', 'MASTER', 'GPT5'],
        JSON.stringify(masterData),
        0.95
      ]);
      
      console.log('📊 Imported master intelligence report');
    }

    // Final verification
    const summary = await client.query(`
      SELECT 
        COUNT(DISTINCT d.id) as documents,
        COUNT(e.id) as extractions,
        ROUND(AVG(e.confidence_score)::numeric, 3) as avg_confidence
      FROM cascade_documents d
      JOIN cascade_extractions e ON d.id = e.document_id
      WHERE d.domain = $1
    `, [DOMAIN]);

    console.log('\n🎯 Import Summary:');
    console.log(`   Domain: ${DOMAIN}`);
    console.log(`   Documents: ${summary.rows[0].documents}`);
    console.log(`   Extractions: ${summary.rows[0].extractions}`);
    console.log(`   Avg Confidence: ${summary.rows[0].avg_confidence}`);
    
    console.log('\n✅ WE_PROJECTS CASCADE Intelligence import completed successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run import if called directly
if (require.main === module) {
  importWEProjectsData().catch(console.error);
}

module.exports = { importWEProjectsData };
#!/usr/bin/env node

/**
 * Import CASCADE GPT-5 JSON files into Layer 4 Intelligence format
 * Maps real WE Projects CASCADE analysis to the dashboard structure
 */

const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Map CASCADE layers to our Layer 1-4 system
const LAYER_MAPPING = {
  'FOUNDATION': 1,      // Surface metrics and facts
  'STRATEGIC': 3,       // Strategic analysis
  'IMPLEMENTATION': 2,  // Analytical/tactical patterns
  'SYNTHESIS': 4       // Deep intelligence insights
};

async function parseC ASCADEFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.results || !Array.isArray(data.results)) {
      console.warn(`No results found in ${filePath}`);
      return null;
    }

    // Extract insights from each layer
    const insights = {
      surface: [],
      analytical: [],
      strategic: [],
      quantum: [] // Layer 4 - deep insights
    };

    // Parse each CASCADE layer result
    data.results.forEach(result => {
      if (!result.success || !result.content) return;
      
      const layer = LAYER_MAPPING[result.layer] || 1;
      const contentLines = result.content.split('\n').filter(line => line.trim());
      
      // Extract key insights based on layer
      switch(layer) {
        case 1: // FOUNDATION - Surface facts
          insights.surface = extractKeyPoints(result.content, [
            'Core thesis',
            'Key concepts',
            'Facts and metrics',
            'Problem statement'
          ]).slice(0, 5);
          break;
          
        case 2: // IMPLEMENTATION - Analytical patterns
          insights.analytical = extractKeyPoints(result.content, [
            'Core processes',
            'Tools/templates',
            'Implementation steps',
            'Quick wins',
            'Metrics to track'
          ]).slice(0, 5);
          break;
          
        case 3: // STRATEGIC - Strategic implications
          insights.strategic = extractKeyPoints(result.content, [
            'Strategic themes',
            'Competitive advantages',
            'Market opportunities',
            'Business model insights'
          ]).slice(0, 5);
          break;
          
        case 4: // SYNTHESIS - Deep intelligence
          insights.quantum = extractKeyPoints(result.content, [
            'Pattern synthesis',
            'Non-obvious connections',
            'Emergent opportunities',
            'Transformational insights',
            'Future implications'
          ]).slice(0, 5);
          break;
      }
    });

    // Calculate intelligence score based on CASCADE processing
    const intelligenceScore = calculateIntelligenceScore(data);
    const complexityIndex = calculateComplexityIndex(data);

    return {
      title: cleanFileName(path.basename(filePath)),
      document: data.document,
      tenant: data.tenant || 'WE_PROJECTS',
      processedAt: data.processedAt,
      layersCompleted: data.layersCompleted || 0,
      intelligenceScore,
      complexityIndex,
      insights,
      rawData: data
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

function extractKeyPoints(content, keywords) {
  const points = [];
  const lines = content.split('\n');
  
  let capturing = false;
  let currentSection = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if this line starts a relevant section
    for (const keyword of keywords) {
      if (trimmed.toLowerCase().includes(keyword.toLowerCase())) {
        capturing = true;
        currentSection = keyword;
        break;
      }
    }
    
    // Capture bullet points and key statements
    if (capturing && trimmed.startsWith('-')) {
      const point = trimmed.substring(1).trim();
      if (point.length > 20 && point.length < 200) {
        points.push(point);
      }
    }
    
    // Stop capturing at next major section
    if (trimmed === '' || trimmed.match(/^[A-Z][a-z]+.*:$/)) {
      capturing = false;
    }
  }
  
  // If no bullet points found, extract first few sentences
  if (points.length === 0) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    return sentences
      .filter(s => s.length > 30 && s.length < 200)
      .slice(0, 5)
      .map(s => s.trim());
  }
  
  return points;
}

function calculateIntelligenceScore(data) {
  let score = 50; // Base score
  
  // Add points for completed layers
  score += (data.layersCompleted || 0) * 10;
  
  // Add points for successful processing
  const successCount = data.results?.filter(r => r.success).length || 0;
  score += successCount * 5;
  
  // Add points for content depth (token usage indicates depth)
  const totalTokens = data.results?.reduce((sum, r) => 
    sum + (r.tokens?.total_tokens || 0), 0) || 0;
  
  if (totalTokens > 10000) score += 15;
  else if (totalTokens > 5000) score += 10;
  else if (totalTokens > 2000) score += 5;
  
  return Math.min(97, score);
}

function calculateComplexityIndex(data) {
  let complexity = 40; // Base complexity
  
  // Add complexity based on reasoning tokens (indicates deep analysis)
  const reasoningTokens = data.results?.reduce((sum, r) => 
    sum + (r.reasoningTokens || 0), 0) || 0;
  
  complexity += Math.min(30, Math.floor(reasoningTokens / 100));
  
  // Add complexity for multi-layer analysis
  complexity += (data.layersCompleted || 0) * 5;
  
  // Add complexity based on content length
  const contentLength = data.results?.reduce((sum, r) => 
    sum + (r.content?.length || 0), 0) || 0;
  
  if (contentLength > 20000) complexity += 15;
  else if (contentLength > 10000) complexity += 10;
  else if (contentLength > 5000) complexity += 5;
  
  return Math.min(95, complexity);
}

function cleanFileName(filename) {
  return filename
    .replace('.json', '')
    .replace('-gpt5', '')
    .replace('A8-', '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function importToDatabase(documents) {
  console.log(`\n📊 Importing ${documents.length} documents to database...`);
  
  for (const doc of documents) {
    try {
      // Check if document already exists
      const existing = await prisma.we_projects_documents.findFirst({
        where: {
          title: doc.title
        }
      });

      if (existing) {
        // Update existing document
        await prisma.we_projects_documents.update({
          where: { id: existing.id },
          data: {
            intelligence_score: doc.intelligenceScore,
            complexity_index: doc.complexityIndex,
            insights: doc.insights,
            processed_at: new Date(doc.processedAt),
            layers_completed: doc.layersCompleted
          }
        });
        console.log(`✅ Updated: ${doc.title}`);
      } else {
        // Create new document
        await prisma.we_projects_documents.create({
          data: {
            title: doc.title,
            document_name: doc.document,
            tenant: doc.tenant,
            intelligence_score: doc.intelligenceScore,
            complexity_index: doc.complexityIndex,
            insights: doc.insights,
            processed_at: new Date(doc.processedAt),
            layers_completed: doc.layersCompleted,
            category: determineCategory(doc.title, doc.insights),
            content: extractSummary(doc.rawData)
          }
        });
        console.log(`✅ Created: ${doc.title}`);
      }
    } catch (error) {
      console.error(`❌ Error importing ${doc.title}:`, error.message);
    }
  }
}

function determineCategory(title, insights) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('culture') || titleLower.includes('team') || titleLower.includes('leadership')) {
    return 'Leadership & Culture';
  }
  if (titleLower.includes('case') || titleLower.includes('study')) {
    return 'Case Studies';
  }
  if (titleLower.includes('tool') || titleLower.includes('kit') || titleLower.includes('template')) {
    return 'Tools & Resources';
  }
  if (titleLower.includes('roadmap') || titleLower.includes('strategy')) {
    return 'Strategy';
  }
  if (titleLower.includes('methodology') || titleLower.includes('framework')) {
    return 'Frameworks';
  }
  if (titleLower.includes('family') || titleLower.includes('enterprise')) {
    return 'Family Enterprise';
  }
  
  return 'Business Intelligence';
}

function extractSummary(rawData) {
  if (!rawData.results || rawData.results.length === 0) return '';
  
  // Get first meaningful content from FOUNDATION layer
  const foundation = rawData.results.find(r => r.layer === 'FOUNDATION');
  if (foundation && foundation.content) {
    const lines = foundation.content.split('\n').filter(l => l.trim());
    // Find core thesis or first paragraph
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Core thesis') || lines[i].includes('Overview')) {
        return lines.slice(i + 1, i + 4).join(' ').trim();
      }
    }
    // Return first few sentences if no specific section found
    return lines.slice(0, 3).join(' ').trim();
  }
  
  return 'Intelligence analysis document';
}

async function main() {
  try {
    console.log('🚀 CASCADE to Layer 4 Intelligence Import Tool');
    console.log('==============================================\n');

    // Read all JSON files from CASCADE reports directory
    const reportsDir = path.join(__dirname, '../reports/gpt5-cascade');
    const files = await fs.readdir(reportsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log(`📁 Found ${jsonFiles.length} CASCADE JSON files to import\n`);

    // Parse all CASCADE files
    const documents = [];
    for (const file of jsonFiles) {
      const filePath = path.join(reportsDir, file);
      console.log(`📄 Processing: ${file}`);
      
      const parsed = await parseCASCADEFile(filePath);
      if (parsed) {
        documents.push(parsed);
        console.log(`   ✓ Intelligence Score: ${parsed.intelligenceScore}`);
        console.log(`   ✓ Complexity Index: ${parsed.complexityIndex}`);
        console.log(`   ✓ Layers Completed: ${parsed.layersCompleted}`);
      }
    }

    console.log(`\n✅ Successfully parsed ${documents.length} documents`);

    // Import to database
    await importToDatabase(documents);

    // Generate summary statistics
    const avgIntelligence = Math.round(
      documents.reduce((sum, d) => sum + d.intelligenceScore, 0) / documents.length
    );
    const avgComplexity = Math.round(
      documents.reduce((sum, d) => sum + d.complexityIndex, 0) / documents.length
    );

    console.log('\n📊 Import Statistics:');
    console.log('======================');
    console.log(`Total Documents: ${documents.length}`);
    console.log(`Average Intelligence Score: ${avgIntelligence}`);
    console.log(`Average Complexity Index: ${avgComplexity}`);
    console.log(`Categories: ${[...new Set(documents.map(d => determineCategory(d.title, d.insights)))].join(', ')}`);

    console.log('\n✨ Import complete! Your real WE Projects intelligence is now available in the Layer 4 dashboard.');
    console.log('🌐 Visit: http://localhost:3010/we-projects-layer4');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
main();
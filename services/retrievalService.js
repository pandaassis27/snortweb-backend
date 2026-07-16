import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the modular knowledge base once
const kbDir = path.join(__dirname, '../config/knowledge');
let knowledgeBase = [];

try {
  const files = fs.readdirSync(kbDir).filter(file => file.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(kbDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    knowledgeBase = knowledgeBase.concat(data);
  }
} catch (error) {
  console.error('[RAG ERROR] Failed to load modular knowledge base:', error.message);
}

/**
 * Normalizes text for better matching.
 */
const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/gi, '').trim();

/**
 * Enhanced fuzzy search logic.
 */
export const searchKnowledge = async (query) => {
  if (!query || knowledgeBase.length === 0) return [];

  const normalizedQuery = normalize(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length >= 2);

  if (queryTokens.length === 0 && normalizedQuery.length < 2) return [];

  const scoredKB = knowledgeBase.map(entry => {
    let score = 0;
    
    // Category boosting
    if (normalizedQuery.includes(normalize(entry.category || ''))) {
      score += 15;
    }

    // Keyword exact and partial token matching
    if (entry.keywords) {
      entry.keywords.forEach(keyword => {
        const normKeyword = normalize(keyword);
        if (normalizedQuery.includes(normKeyword)) {
          score += 10;
        } else if (normKeyword.includes(normalizedQuery)) {
          score += 8;
        }
        
        queryTokens.forEach(token => {
          if (normKeyword.includes(token)) {
            score += 2; // Partial token matching
          }
        });
      });
    }

    // Synonym Matching
    if (entry.synonyms) {
      entry.synonyms.forEach(synonym => {
        const normSynonym = normalize(synonym);
        if (normalizedQuery.includes(normSynonym)) {
          score += 8;
        }
      });
    }

    return { ...entry, score };
  });

  const relevantResults = scoredKB
    .filter(entry => entry.score > 5)
    .sort((a, b) => b.score - a.score);

  return relevantResults.slice(0, 3);
};


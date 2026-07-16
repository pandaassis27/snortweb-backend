import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the knowledge base once
const kbPath = path.join(__dirname, '../config/knowledgeBase.json');
let knowledgeBase = [];

try {
  const kbData = fs.readFileSync(kbPath, 'utf8');
  knowledgeBase = JSON.parse(kbData);
} catch (error) {
  console.error('[RAG ERROR] Failed to load knowledgeBase.json:', error.message);
}

/**
 * Normalizes text for better matching.
 */
const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/gi, '').trim();

/**
 * Searches the modular knowledge base using keyword, synonym, and partial phrase matching.
 * This function acts as the abstraction layer. In the future, this entire logic
 * can be replaced with OpenAI Embeddings + Vector Database (e.g., Pinecone/Qdrant)
 * without touching the controller.
 * 
 * @param {string} query The user's query
 * @returns {Array} Array of relevant knowledge objects
 */
export const searchKnowledge = async (query) => {
  if (!query || knowledgeBase.length === 0) return [];

  const normalizedQuery = normalize(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length >= 2); // basic stopwords filter

  if (queryTokens.length === 0 && normalizedQuery.length < 2) return [];

  // Scoring function
  const scoredKB = knowledgeBase.map(entry => {
    let score = 0;

    // 1. Exact/Partial Phrase Matching (High Weight)
    if (normalizedQuery.includes(normalize(entry.category))) {
      score += 15; // Category boosting
    }

    // 2. Keyword Matching
    entry.keywords.forEach(keyword => {
      const normKeyword = normalize(keyword);
      if (normalizedQuery.includes(normKeyword)) {
        score += 10;
      }
      // Partial token matching
      queryTokens.forEach(token => {
        if (normKeyword.includes(token)) {
          score += 2;
        }
      });
    });

    // 3. Synonym Matching
    if (entry.synonyms) {
      entry.synonyms.forEach(synonym => {
        const normSynonym = normalize(synonym);
        if (normalizedQuery.includes(normSynonym)) {
          score += 8;
        }
      });
    }

    // 4. Content overlap (Low Weight)
    const normContent = normalize(entry.content);
    queryTokens.forEach(token => {
      if (normContent.includes(token)) {
        score += 1;
      }
    });

    return { ...entry, score };
  });

  // Sort by score descending and filter out low-confidence results
  const relevantResults = scoredKB
    .filter(entry => entry.score > 5) // Threshold for relevance
    .sort((a, b) => b.score - a.score);

  // Return the top 3 most relevant context chunks
  return relevantResults.slice(0, 3);
};

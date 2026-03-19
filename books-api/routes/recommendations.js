const express = require('express');
const axios = require('axios');
const { readStore, updateStore } = require('../lib/store');

const router = express.Router();

const OPENLIBRARY_API = 'https://openlibrary.org/search.json';
const OPENLIBRARY_COVERS_API = 'https://covers.openlibrary.org/b/id';

const getCoverUrlFromDoc = (doc) => {
  if (!doc) return null;

  const coverId = doc.cover_i || doc.cover_id;
  if (coverId) {
    return `${OPENLIBRARY_COVERS_API}/${coverId}-M.jpg`;
  }

  if (doc.cover_edition_key) {
    return `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg`;
  }

  if (Array.isArray(doc.isbn) && doc.isbn.length > 0) {
    return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
  }

  return null;
};

// Extract genres from a book based on OpenLibrary subjects
const getBookGenres = async (bookId) => {
  try {
    const response = await axios.get(`https://openlibrary.org${bookId}.json`, {
      timeout: 3000,
    });
    return response.data.subjects || [];
  } catch (error) {
    console.error(`Failed to fetch genres for book ${bookId}:`, error.message);
    return [];
  }
};

// Search OpenLibrary and push unique results into the recommendations array
const collectFromSearch = async (params, inputBookIds, recommendations) => {
  try {
    const response = await axios.get(OPENLIBRARY_API, { params, timeout: 5000 });
    if (!response.data.docs) return;
    response.data.docs.forEach((doc) => {
      if (!doc.key || !doc.title) return;
      if (inputBookIds.has(doc.key)) return;
      const existing = recommendations.find((r) => r.id === doc.key);
      if (existing) {
        existing.relevanceScore = (existing.relevanceScore || 1) + 1;
      } else {
        recommendations.push({
          id: doc.key,
          title: doc.title,
          author: (doc.author_name && doc.author_name[0]) || 'Unknown Author',
          year: doc.first_publish_year,
          cover: getCoverUrlFromDoc(doc),
          relevanceScore: 1,
        });
      }
    });
  } catch (err) {
    // silently skip failed sub-searches
  }
};

// Get recommendations based on input books
// Algorithm: genre-based → author-based → keyword fallback (never hard-fails)
router.post('/', async (req, res) => {
  const { books } = req.body;
  const userId = req.user.uid;

  if (!books || books.length !== 5) {
    return res.status(400).json({
      error: 'Exactly 5 books are required',
    });
  }

  try {
    // Collect all genres from input books
    const allGenres = new Set();
    const inputBookIds = new Set();
    const inputAuthors = new Set();
    const inputTitleWords = new Set();

    // Get genres from each input book
    for (const book of books) {
      if (book.id) inputBookIds.add(book.id);
      if (book.author) inputAuthors.add(book.author);

      // Collect significant title words for keyword fallback
      if (book.title) {
        book.title.split(/\s+/).filter((w) => w.length > 4).forEach((w) => inputTitleWords.add(w));
      }

      if (Array.isArray(book.genres) && book.genres.length > 0) {
        book.genres.slice(0, 8).forEach((genre) => allGenres.add(genre));
        continue;
      }

      try {
        const subjects = book.id ? await getBookGenres(book.id) : [];
        if (subjects.length > 0) {
          subjects.slice(0, 8).forEach((genre) => allGenres.add(genre));
          continue;
        }

        const response = await axios.get(OPENLIBRARY_API, {
          params: { title: book.title, author: book.author, limit: 1 },
          timeout: 5000,
        });

        if (response.data.docs && response.data.docs.length > 0) {
          const doc = response.data.docs[0];
          if (doc.key) inputBookIds.add(doc.key);
          // try subject, subject_facet, subject_key — whatever OpenLibrary returns
          const subs = doc.subject || doc.subject_facet || doc.subject_key || [];
          subs.slice(0, 8).forEach((genre) => allGenres.add(genre));
        }
      } catch (error) {
        console.error(`Failed to fetch genres for book: ${book.title}`, error.message);
      }
    }

    // ── TIER 1: genre-based search ───────────────────────────────────────────
    const recommendations = [];

    if (allGenres.size > 0) {
      const genresArray = Array.from(allGenres).slice(0, 10);
      for (const genre of genresArray) {
        await collectFromSearch(
          { subject: genre, limit: 30, sort: 'rating' },
          inputBookIds,
          recommendations,
        );
        recommendations.forEach((r) => {
          if (!r.matchedGenres) r.matchedGenres = [];
          if (!r.matchedGenres.includes(genre)) r.matchedGenres.push(genre);
        });
      }
    }

    // ── TIER 2: author-based fallback ────────────────────────────────────────
    if (recommendations.length < 10) {
      for (const author of inputAuthors) {
        await collectFromSearch(
          { author, limit: 20, sort: 'new' },
          inputBookIds,
          recommendations,
        );
      }
    }

    // ── TIER 3: title-keyword fallback ───────────────────────────────────────
    if (recommendations.length < 10) {
      for (const word of Array.from(inputTitleWords).slice(0, 5)) {
        await collectFromSearch(
          { q: word, limit: 20, sort: 'rating' },
          inputBookIds,
          recommendations,
        );
      }
    }

    // ── TIER 4: popular books last resort ────────────────────────────────────
    if (recommendations.length < 5) {
      await collectFromSearch(
        { q: 'fiction', limit: 30, sort: 'rating' },
        inputBookIds,
        recommendations,
      );
    }

    // Sort by relevance score and take top 20
    const topRecommendations = recommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    updateStore((store) => {
      store.recommendations[userId] = {
        inputBooks: books,
        recommendations: topRecommendations,
        createdAt: new Date().toISOString(),
      };
    });

    return res.json({
      message: 'Recommendations generated successfully',
      recommendations: topRecommendations,
      count: topRecommendations.length,
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error.message,
    });
  }
});

// Get user's last recommendations
router.get('/', async (req, res) => {
  const userId = req.user.uid;

  try {
    const store = readStore();

    if (store.recommendations[userId]) {
      return res.json(store.recommendations[userId]);
    }

    res.status(404).json({
      error: 'No recommendations found for this user',
      message: 'Generate recommendations first by POSTing 5 books',
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      error: 'Failed to fetch recommendations',
    });
  }
});

module.exports = router;

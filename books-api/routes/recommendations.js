const express = require('express');
const axios = require('axios');

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

// In-memory storage for recommendations (replace with Firestore in real implementation)
const recommendationsStore = {};

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

// Get recommendations based on input books
// Algorithm: Extract all genres from input books, search for books matching those genres
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

    // Get genres from each input book
    for (const book of books) {
      if (book.id) {
        inputBookIds.add(book.id);
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
          params: {
            title: book.title,
            author: book.author,
            limit: 1,
          },
          timeout: 3000,
        });

        if (response.data.docs && response.data.docs.length > 0) {
          const doc = response.data.docs[0];
          if (doc.key) {
            inputBookIds.add(doc.key);
          }

          if (doc.subject) {
            doc.subject.slice(0, 8).forEach((genre) => allGenres.add(genre));
          }
        }
      } catch (error) {
        console.error(`Failed to fetch genres for book: ${book.title}`, error.message);
      }
    }

    if (allGenres.size === 0) {
      return res.status(400).json({
        error: 'Could not find genres for the input books',
      });
    }

    // Search for recommendations using collected genres
    const recommendations = [];
    const genresArray = Array.from(allGenres).slice(0, 10); // Limit to 10 genres for search

    for (const genre of genresArray) {
      try {
        const response = await axios.get(OPENLIBRARY_API, {
          params: {
            subject: genre,
            limit: 30,
            sort: 'rating',
          },
          timeout: 3000,
        });

        if (response.data.docs) {
          response.data.docs.forEach((doc) => {
            // Skip input books
            if (inputBookIds.has(doc.key)) return;

            // Check if already in recommendations
            const existing = recommendations.find((r) => r.id === doc.key);
            if (existing) {
              existing.matchedGenres = (existing.matchedGenres || []).concat(genre);
              existing.relevanceScore = existing.matchedGenres.length;
            } else {
              const coverUrl = getCoverUrlFromDoc(doc);

              recommendations.push({
                id: doc.key,
                title: doc.title,
                author: (doc.author_name && doc.author_name[0]) || 'Unknown Author',
                year: doc.first_publish_year,
                cover: coverUrl,
                matchedGenres: [genre],
                relevanceScore: 1,
              });
            }
          });
        }
      } catch (error) {
        console.error(`Failed to search for genre: ${genre}`, error.message);
      }
    }

    // Sort by relevance score and take top 20
    const topRecommendations = recommendations
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    // Store recommendations for user (in Firestore in real implementation)
    recommendationsStore[userId] = {
      inputBooks: books,
      recommendations: topRecommendations,
      createdAt: new Date(),
    };

    res.json({
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
    if (recommendationsStore[userId]) {
      return res.json(recommendationsStore[userId]);
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

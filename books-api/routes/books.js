const express = require('express');
const axios = require('axios');

const router = express.Router();

const OPENLIBRARY_API = 'https://openlibrary.org/search.json';
const OPENLIBRARY_COVERS_API = 'https://covers.openlibrary.org/b/id';

const normalizeDescription = (description) => {
  if (!description) return null;
  if (typeof description === 'string') return description;
  if (typeof description?.value === 'string') return description.value;
  return null;
};

const readAuthorName = async (authorRef) => {
  if (!authorRef) return null;
  if (authorRef.name) return authorRef.name;
  if (!authorRef.author?.key && !authorRef.key) return null;

  const authorKey = authorRef.author?.key || authorRef.key;
  try {
    const response = await axios.get(`https://openlibrary.org${authorKey}.json`, { timeout: 5000 });
    return response.data?.name || null;
  } catch {
    return null;
  }
};

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

// Cache for frequently searched books
const searchCache = {};
const summaryCache = {};
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

const toSentenceList = (text) => {
  if (!text || typeof text !== 'string') return [];
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const listToPhrase = (items = [], max = 3) => {
  const picked = items.filter(Boolean).slice(0, max);
  if (picked.length === 0) return '';
  if (picked.length === 1) return picked[0];
  if (picked.length === 2) return `${picked[0]} and ${picked[1]}`;
  return `${picked[0]}, ${picked[1]}, and ${picked[2]}`;
};

const buildBriefSummary = ({ title, author, year, description, subjects }) => {
  const subjectPhrase = listToPhrase(subjects, 3);
  const descSentences = toSentenceList(description).slice(0, 2);
  const summary = [];

  const introParts = [
    `${title || 'This book'} by ${author || 'an unknown author'}`,
    year ? `was first published in ${year}` : null,
  ].filter(Boolean);

  if (subjectPhrase) {
    summary.push(`${introParts.join(' ')} and stands out for ${subjectPhrase}.`);
  } else {
    summary.push(`${introParts.join(' ')} offers a memorable reading experience with strong storytelling.`);
  }

  if (descSentences.length > 0) {
    summary.push(...descSentences);
  }

  if (subjectPhrase) {
    summary.push(`Readers who enjoy ${subjectPhrase} are likely to connect with this one.`);
  } else {
    summary.push('It is especially worth reading for its characters, atmosphere, and emotional impact.');
  }

  return summary.slice(0, 4).join(' ');
};

// Search books endpoint
router.get('/search', async (req, res) => {
  const { query, limit = 20 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  // Check cache
  if (searchCache[query] && Date.now() - searchCache[query].timestamp < CACHE_DURATION) {
    return res.json({
      books: searchCache[query].books,
      source: 'cache',
    });
  }

  try {
    const response = await axios.get(OPENLIBRARY_API, {
      params: {
        title: query,
        limit,
      },
      timeout: 5000,
    });

    // Transform OpenLibrary response to our format
    const books = (response.data.docs || [])
      .slice(0, limit)
      .map((doc) => {
        const coverUrl = getCoverUrlFromDoc(doc);

        return {
          id: doc.key || `unknown-${Math.random()}`,
          title: doc.title || 'Unknown Title',
          author: (doc.author_name && doc.author_name[0]) || 'Unknown Author',
          year: doc.first_publish_year || 'Unknown',
          cover: coverUrl,
          isbn: (doc.isbn && doc.isbn[0]) || null,
          description: doc.first_sentence ? doc.first_sentence[0] : null,
          genres: doc.subject || [],
        };
      });

    // Cache the result
    searchCache[query] = {
      books,
      timestamp: Date.now(),
    };

    res.json({
      books,
      source: 'openlibrary',
      count: books.length,
    });
  } catch (error) {
    console.error('Book search error:', error.message);
    res.status(500).json({
      error: 'Failed to search books',
      message: error.message,
    });
  }
});

// Get a brief 3-4 sentence summary for a book
router.get('/summary', async (req, res) => {
  const { bookId, title, author } = req.query;

  if (!bookId && !title) {
    return res.status(400).json({ error: 'bookId or title is required' });
  }

  const cacheKey = `${bookId || ''}|${title || ''}|${author || ''}`;
  if (summaryCache[cacheKey] && Date.now() - summaryCache[cacheKey].timestamp < CACHE_DURATION) {
    return res.json({ ...summaryCache[cacheKey].payload, source: 'cache' });
  }

  try {
    let bookData = {
      title: title || 'Unknown Title',
      author: author || 'Unknown Author',
      year: null,
      description: '',
      subjects: [],
    };

    if (bookId && String(bookId).startsWith('/works/')) {
      const workResponse = await axios.get(`https://openlibrary.org${bookId}.json`, { timeout: 5000 });
      const work = workResponse.data;
      bookData = {
        title: work.title || bookData.title,
        author: bookData.author,
        year: work.first_publish_date || null,
        description: typeof work.description === 'string' ? work.description : work.description?.value || '',
        subjects: Array.isArray(work.subjects) ? work.subjects : [],
      };
    } else if (title) {
      const searchResponse = await axios.get(OPENLIBRARY_API, {
        params: { title, author, limit: 1 },
        timeout: 5000,
      });
      const doc = searchResponse.data.docs?.[0];
      if (doc) {
        let description = '';
        if (doc.key) {
          try {
            const workResponse = await axios.get(`https://openlibrary.org${doc.key}.json`, { timeout: 5000 });
            const work = workResponse.data;
            description = typeof work.description === 'string' ? work.description : work.description?.value || '';
          } catch (workError) {
            // Non-blocking: keep summary generation using search data
          }
        }
        bookData = {
          title: doc.title || bookData.title,
          author: (doc.author_name && doc.author_name[0]) || bookData.author,
          year: doc.first_publish_year || null,
          description,
          subjects: Array.isArray(doc.subject) ? doc.subject : [],
        };
      }
    }

    const summary = buildBriefSummary(bookData);
    const payload = {
      id: bookId || null,
      title: bookData.title,
      author: bookData.author,
      summary,
    };

    summaryCache[cacheKey] = {
      payload,
      timestamp: Date.now(),
    };

    return res.json({ ...payload, source: 'openlibrary' });
  } catch (error) {
    console.error('Book summary error:', error.message);
    return res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message,
    });
  }
});

// Get detailed book information using query params to avoid slash path issues.
router.get('/details', async (req, res) => {
  const { bookId, title, author } = req.query;

  if (!bookId && !title) {
    return res.status(400).json({ error: 'bookId or title is required' });
  }

  try {
    let book = null;

    if (bookId && String(bookId).startsWith('/works/')) {
      const response = await axios.get(`https://openlibrary.org${bookId}.json`, { timeout: 5000 });
      const work = response.data;
      const authorNames = await Promise.all((work.authors || []).slice(0, 3).map(readAuthorName));
      book = {
        id: work.key || bookId,
        title: work.title || title || 'Unknown Title',
        author: authorNames.filter(Boolean).join(', ') || author || 'Unknown Author',
        year: work.first_publish_date || 'Unknown',
        cover: Array.isArray(work.covers) && work.covers[0] ? `${OPENLIBRARY_COVERS_API}/${work.covers[0]}-M.jpg` : null,
        description: normalizeDescription(work.description),
        genres: Array.isArray(work.subjects) ? work.subjects : [],
        pages: work.number_of_pages || null,
        editions: work.edition_count || null,
      };
    }

    if (!book && title) {
      const searchResponse = await axios.get(OPENLIBRARY_API, {
        params: { title, author, limit: 1 },
        timeout: 5000,
      });
      const doc = searchResponse.data.docs?.[0];
      if (!doc) {
        return res.status(404).json({ error: 'Book not found' });
      }

      const fallbackId = doc.key || null;
      let description = doc.first_sentence ? doc.first_sentence[0] : null;
      if (fallbackId) {
        try {
          const response = await axios.get(`https://openlibrary.org${fallbackId}.json`, { timeout: 5000 });
          description = normalizeDescription(response.data?.description) || description;
        } catch {
          // Keep fallback description from search doc.
        }
      }

      book = {
        id: fallbackId,
        title: doc.title || title,
        author: (doc.author_name && doc.author_name[0]) || author || 'Unknown Author',
        year: doc.first_publish_year || 'Unknown',
        cover: getCoverUrlFromDoc(doc),
        description,
        genres: Array.isArray(doc.subject) ? doc.subject : [],
        pages: null,
        editions: doc.edition_count || null,
      };
    }

    return res.json(book);
  } catch (error) {
    console.error('Get book details error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch book details',
      message: error.message,
    });
  }
});

// Get book by ID (get more details)
router.get('/:bookId', async (req, res) => {
  const { bookId } = req.params;

  if (!bookId) {
    return res.status(400).json({ error: 'Book ID is required' });
  }

  try {
    const response = await axios.get(`https://openlibrary.org${bookId}.json`, {
      timeout: 5000,
    });

    const book = response.data;
    let coverUrl = null;

    if (book.covers && book.covers.length > 0) {
      coverUrl = `${OPENLIBRARY_COVERS_API}/${book.covers[0]}-M.jpg`;
    }

    res.json({
      id: book.key,
      title: book.title,
      author: book.authors ? book.authors.map((a) => a.name || a.key).join(', ') : 'Unknown',
      year: book.first_publish_date || 'Unknown',
      cover: coverUrl,
      description: book.description ? (typeof book.description === 'string' ? book.description : book.description.value) : null,
      genres: book.subjects || [],
      pages: book.number_of_pages,
      editions: book.editions_count,
    });
  } catch (error) {
    console.error('Get book error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch book details',
      message: error.message,
    });
  }
});

module.exports = router;

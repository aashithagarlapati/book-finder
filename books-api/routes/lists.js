const express = require('express');

const router = express.Router();

// In-memory storage for reading lists (replace with Firestore in real implementation)
const readingListsStore = {};

// Helper to initialize user's list
const ensureUserList = (userId) => {
  if (!readingListsStore[userId]) {
    readingListsStore[userId] = [];
  }
};

// Add book to reading list
router.post('/add', async (req, res) => {
  const { book } = req.body;
  const userId = req.user.uid;

  if (!book || !book.id) {
    return res.status(400).json({ error: 'Book information is required' });
  }

  try {
    ensureUserList(userId);

    // Check if book already in list
    const exists = readingListsStore[userId].some((b) => b.id === book.id);
    if (exists) {
      return res.status(400).json({ error: 'Book already in your reading list' });
    }

    // Add book to list
    const bookEntry = {
      ...book,
      addedAt: new Date(),
      status: 'want-to-read', // 'want-to-read', 'reading', 'read'
    };

    readingListsStore[userId].push(bookEntry);

    res.status(201).json({
      message: 'Book added to reading list',
      book: bookEntry,
    });
  } catch (error) {
    console.error('Add to list error:', error);
    res.status(500).json({
      error: 'Failed to add book to list',
      message: error.message,
    });
  }
});

// Get user's reading list
router.get('/', async (req, res) => {
  const userId = req.user.uid;

  try {
    ensureUserList(userId);

    const books = readingListsStore[userId];

    res.json({
      count: books.length,
      books,
    });
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({
      error: 'Failed to fetch reading list',
    });
  }
});

// Remove book from reading list
router.delete('/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user.uid;

  try {
    ensureUserList(userId);

    const index = readingListsStore[userId].findIndex((b) => b.id === bookId);

    if (index === -1) {
      return res.status(404).json({ error: 'Book not found in reading list' });
    }

    const removedBook = readingListsStore[userId].splice(index, 1);

    res.json({
      message: 'Book removed from reading list',
      book: removedBook[0],
    });
  } catch (error) {
    console.error('Remove from list error:', error);
    res.status(500).json({
      error: 'Failed to remove book from list',
    });
  }
});

// Update book status (want-to-read, reading, read)
router.patch('/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const { status } = req.body;
  const userId = req.user.uid;

  const normalizedStatus = status === 'finished' ? 'read' : status;

  const validStatuses = ['want-to-read', 'reading', 'read'];
  if (!validStatuses.includes(normalizedStatus)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')} (or finished)`,
    });
  }

  try {
    ensureUserList(userId);

    const book = readingListsStore[userId].find((b) => b.id === bookId);

    if (!book) {
      return res.status(404).json({ error: 'Book not found in reading list' });
    }

    book.status = normalizedStatus;
    book.updatedAt = new Date();

    res.json({
      message: 'Book status updated',
      book,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      error: 'Failed to update book status',
    });
  }
});

module.exports = router;

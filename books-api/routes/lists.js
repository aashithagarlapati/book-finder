const express = require('express');
const { readStore, updateStore } = require('../lib/store');

const router = express.Router();

// Helper to initialize user's list
const ensureUserList = (userId) => {
  return updateStore((store) => {
    if (!store.readingLists[userId]) {
      store.readingLists[userId] = [];
    }

    return store.readingLists[userId];
  });
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

    const bookEntry = updateStore((store) => {
      const userList = store.readingLists[userId] || [];
      const exists = userList.some((entry) => entry.id === book.id);

      if (exists) {
        return null;
      }

      const nextBook = {
        ...book,
        addedAt: new Date().toISOString(),
        status: 'want-to-read',
      };

      userList.push(nextBook);
      store.readingLists[userId] = userList;
      return nextBook;
    });

    if (!bookEntry) {
      return res.status(400).json({ error: 'Book already in your reading list' });
    }

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

    const store = readStore();
    const books = store.readingLists[userId] || [];

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

    const removedBook = updateStore((store) => {
      const userList = store.readingLists[userId] || [];
      const index = userList.findIndex((entry) => entry.id === bookId);

      if (index === -1) {
        return null;
      }

      return userList.splice(index, 1)[0];
    });

    if (!removedBook) {
      return res.status(404).json({ error: 'Book not found in reading list' });
    }

    res.json({
      message: 'Book removed from reading list',
      book: removedBook,
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

    const book = updateStore((store) => {
      const userList = store.readingLists[userId] || [];
      const existingBook = userList.find((entry) => entry.id === bookId);

      if (!existingBook) {
        return null;
      }

      existingBook.status = normalizedStatus;
      existingBook.updatedAt = new Date().toISOString();
      return existingBook;
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found in reading list' });
    }

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

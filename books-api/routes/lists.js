const express = require('express');
const { readStore, updateStore } = require('../lib/store');
const { recordActivity } = require('../lib/activity');

const router = express.Router();

const VALID_STATUSES = ['want-to-read', 'reading', 'read'];
const normalizeStatus = (status) => (status === 'finished' ? 'read' : status);

const resolveStatus = (status) => {
  const normalized = normalizeStatus(status);
  return VALID_STATUSES.includes(normalized) ? normalized : 'want-to-read';
};

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
  const { book, status } = req.body;
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
        status: resolveStatus(status),
      };

      userList.push(nextBook);
      store.readingLists[userId] = userList;
      recordActivity(store, {
        userId,
        displayName: req.user.displayName,
        type: 'reading-list-added',
        status: nextBook.status,
        book: {
          id: nextBook.id,
          title: nextBook.title,
          author: nextBook.author,
          cover: nextBook.cover || null,
        },
      });
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

const parseBookId = (rawBookId) => {
  if (typeof rawBookId !== 'string') {
    return rawBookId;
  }

  // Be tolerant of encoded IDs coming from clients/proxies.
  try {
    return decodeURIComponent(rawBookId);
  } catch {
    return rawBookId;
  }
};

const updateBookStatus = (userId, displayName, rawBookId, status) => {
  const normalizedStatus = normalizeStatus(status);
  const targetBookId = parseBookId(rawBookId);

  if (!VALID_STATUSES.includes(normalizedStatus)) {
    return {
      error: {
        status: 400,
        body: {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')} (or finished)`,
        },
      },
    };
  }

  if (!targetBookId) {
    return {
      error: {
        status: 400,
        body: {
          error: 'Book ID is required',
        },
      },
    };
  }

  const book = updateStore((store) => {
    const userList = store.readingLists[userId] || [];
    const existingBook = userList.find((entry) => entry.id === targetBookId || entry.id === rawBookId);

    if (!existingBook) {
      return null;
    }

    existingBook.status = normalizedStatus;
    existingBook.updatedAt = new Date().toISOString();
    recordActivity(store, {
      userId,
      displayName,
      type: 'reading-status-updated',
      status: normalizedStatus,
      book: {
        id: existingBook.id,
        title: existingBook.title,
        author: existingBook.author,
        cover: existingBook.cover || null,
      },
    });
    return existingBook;
  });

  if (!book) {
    return {
      error: {
        status: 404,
        body: {
          error: 'Book not found in reading list',
        },
      },
    };
  }

  return { book };
};

// Update book status via body payload (preferred; avoids path encoding issues)
router.patch('/status', async (req, res) => {
  const { bookId, status } = req.body;
  const userId = req.user.uid;

  try {
    ensureUserList(userId);

    const result = updateBookStatus(userId, req.user.displayName, bookId, status);
    if (result.error) {
      return res.status(result.error.status).json(result.error.body);
    }

    return res.json({
      message: 'Book status updated',
      book: result.book,
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({
      error: 'Failed to update book status',
    });
  }
});

// Update book status (want-to-read, reading, read)
router.patch('/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const { status } = req.body;
  const userId = req.user.uid;

  try {
    ensureUserList(userId);

    const result = updateBookStatus(userId, req.user.displayName, bookId, status);
    if (result.error) {
      return res.status(result.error.status).json(result.error.body);
    }

    res.json({
      message: 'Book status updated',
      book: result.book,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      error: 'Failed to update book status',
    });
  }
});

module.exports = router;

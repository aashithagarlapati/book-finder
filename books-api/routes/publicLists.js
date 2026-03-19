const express = require('express');

const router = express.Router();

// In-memory storage for public lists (replace with Firestore in real implementation)
const publicListsStore = {};
let listIdCounter = 1;

// Create a public list
router.post('/create', async (req, res) => {
  const { listName, description, books, isPublic } = req.body;
  const userId = req.user.uid;

  if (!listName || !books || books.length === 0) {
    return res.status(400).json({
      error: 'List name and at least one book are required',
    });
  }

  try {
    const listId = `list-${listIdCounter++}`;

    const newList = {
      id: listId,
      userId,
      listName,
      description: description || '',
      books,
      isPublic: isPublic === true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    publicListsStore[listId] = newList;

    res.status(201).json({
      message: 'List created successfully',
      list: newList,
    });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({
      error: 'Failed to create list',
      message: error.message,
    });
  }
});

// Get all public lists (with pagination)
router.get('/', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const publicLists = Object.values(publicListsStore)
      .filter((list) => list.isPublic)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);

    const paginatedLists = publicLists.slice(startIndex, endIndex);

    res.json({
      total: publicLists.length,
      page: parseInt(page),
      limit: parseInt(limit),
      lists: paginatedLists,
    });
  } catch (error) {
    console.error('Get public lists error:', error);
    res.status(500).json({
      error: 'Failed to fetch public lists',
    });
  }
});

// Get a specific public list by ID
router.get('/:listId', async (req, res) => {
  const { listId } = req.params;

  try {
    const list = publicListsStore[listId];

    if (!list || !list.isPublic) {
      return res.status(404).json({ error: 'List not found' });
    }

    res.json(list);
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({
      error: 'Failed to fetch list',
    });
  }
});

// Get user's own lists (public and private)
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user ? req.user.uid : null;

  try {
    const userLists = Object.values(publicListsStore)
      .filter((list) => list.userId === userId)
      .filter((list) => list.isPublic || userId === currentUserId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      userId,
      count: userLists.length,
      lists: userLists,
    });
  } catch (error) {
    console.error('Get user lists error:', error);
    res.status(500).json({
      error: 'Failed to fetch user lists',
    });
  }
});

// Update a public list (only by creator)
router.patch('/:listId', async (req, res) => {
  const { listId } = req.params;
  const { listName, description, books, isPublic } = req.body;
  const userId = req.user.uid;

  try {
    const list = publicListsStore[listId];

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own lists' });
    }

    if (listName) list.listName = listName;
    if (description !== undefined) list.description = description;
    if (books && books.length > 0) list.books = books;
    if (isPublic !== undefined) list.isPublic = isPublic;
    list.updatedAt = new Date();

    res.json({
      message: 'List updated successfully',
      list,
    });
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({
      error: 'Failed to update list',
    });
  }
});

// Delete a public list (only by creator)
router.delete('/:listId', async (req, res) => {
  const { listId } = req.params;
  const userId = req.user.uid;

  try {
    const list = publicListsStore[listId];

    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    if (list.userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own lists' });
    }

    delete publicListsStore[listId];

    res.json({
      message: 'List deleted successfully',
      list,
    });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({
      error: 'Failed to delete list',
    });
  }
});

module.exports = router;

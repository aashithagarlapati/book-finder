const express = require('express');
const authenticate = require('../middleware/authenticate');
const { readStore, updateStore } = require('../lib/store');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const store = readStore();
    const notifs = ((store.notifications || {})[req.user.uid] || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unread = notifs.filter((n) => !n.read).length;
    return res.json({ count: notifs.length, unread, notifications: notifs });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/read', authenticate, async (req, res) => {
  try {
    updateStore((store) => {
      const notifs = (store.notifications || {})[req.user.uid] || [];
      notifs.forEach((n) => { n.read = true; });
      return null;
    });
    return res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

router.delete('/', authenticate, async (req, res) => {
  try {
    updateStore((store) => {
      if (store.notifications) {
        store.notifications[req.user.uid] = [];
      }
      return null;
    });
    return res.json({ message: 'Notifications cleared' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

module.exports = router;

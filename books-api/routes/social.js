const express = require('express');
const authenticate = require('../middleware/authenticate');
const { readStore, updateStore } = require('../lib/store');
const { notify } = require('../lib/notify');

const router = express.Router();

const getFollowingSet = (store, userId) => new Set(store.follows[userId] || []);
const getFollowerCount = (store, targetUserId) => Object.values(store.follows || {})
  .filter((followedIds) => (followedIds || []).includes(targetUserId))
  .length;

const getFollowingCount = (store, userId) => (store.follows[userId] || []).length;

const buildUserPreview = (store, currentUserId, user) => ({
  uid: user.uid,
  displayName: user.displayName,
  email: user.email,
  isFollowing: getFollowingSet(store, currentUserId).has(user.uid),
  followerCount: getFollowerCount(store, user.uid),
  followingCount: getFollowingCount(store, user.uid),
  reviewCount: Object.values(store.reviews || {}).reduce((count, reviews) => count + (reviews || []).filter((review) => review.userId === user.uid).length, 0),
  publicListCount: Object.values(store.publicLists || {}).filter((list) => list.userId === user.uid && list.isPublic).length,
});

router.get('/users', authenticate, async (req, res) => {
  try {
    const store = readStore();
    const query = String(req.query.q || '').trim().toLowerCase();
    const users = (store.users || [])
      .filter((user) => user.uid !== req.user.uid)
      .filter((user) => {
        if (!query) return true;
        return user.displayName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
      })
      .map((user) => buildUserPreview(store, req.user.uid, user))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return res.json({ count: users.length, users });
  } catch (error) {
    console.error('List social users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/follow/:targetUserId', authenticate, async (req, res) => {
  const { targetUserId } = req.params;

  if (!targetUserId || targetUserId === req.user.uid) {
    return res.status(400).json({ error: 'Invalid user to follow' });
  }

  try {
    const result = updateStore((store) => {
      const targetUser = (store.users || []).find((user) => user.uid === targetUserId);
      if (!targetUser) {
        return { error: 'not-found' };
      }

      if (!store.follows[req.user.uid]) {
        store.follows[req.user.uid] = [];
      }

      if (!store.follows[req.user.uid].includes(targetUserId)) {
        store.follows[req.user.uid].push(targetUserId);

        // Notify the followed user
        notify(store, targetUserId, {
          type: 'new-follower',
          message: `${req.user.displayName} started following you`,
          actorId: req.user.uid,
          actorName: req.user.displayName,
          ref: { userId: req.user.uid },
        });
      }

      return {
        uid: targetUser.uid,
        displayName: targetUser.displayName,
        email: targetUser.email,
        isFollowing: true,
      };
    });

    if (result?.error === 'not-found') {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'User followed', user: result });
  } catch (error) {
    console.error('Follow user error:', error);
    return res.status(500).json({ error: 'Failed to follow user' });
  }
});

router.delete('/follow/:targetUserId', authenticate, async (req, res) => {
  const { targetUserId } = req.params;

  try {
    updateStore((store) => {
      const current = store.follows[req.user.uid] || [];
      store.follows[req.user.uid] = current.filter((uid) => uid !== targetUserId);
      return null;
    });

    return res.json({ message: 'User unfollowed' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

router.get('/users/:targetUserId', authenticate, async (req, res) => {
  const { targetUserId } = req.params;

  try {
    const store = readStore();
    const user = (store.users || []).find((entry) => entry.uid === targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const publicLists = Object.values(store.publicLists || {})
      .filter((list) => list.userId === targetUserId && list.isPublic)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const recentActivities = (store.activities || [])
      .filter((activity) => activity.userId === targetUserId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    return res.json({
      user: buildUserPreview(store, req.user.uid, user),
      publicLists,
      activities: recentActivities,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.get('/feed', authenticate, async (req, res) => {
  try {
    const store = readStore();
    const following = getFollowingSet(store, req.user.uid);
    const feed = (store.activities || [])
      .filter((activity) => following.has(activity.userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);

    return res.json({ count: feed.length, activities: feed });
  } catch (error) {
    console.error('Get feed error:', error);
    return res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

router.get('/users/:targetUserId/followers', authenticate, async (req, res) => {
  const { targetUserId } = req.params;
  try {
    const store = readStore();
    const followers = (store.users || [])
      .filter((user) => (store.follows[user.uid] || []).includes(targetUserId))
      .map((user) => buildUserPreview(store, req.user.uid, user));
    return res.json({ count: followers.length, users: followers });
  } catch (error) {
    console.error('Get followers error:', error);
    return res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

router.get('/users/:targetUserId/following', authenticate, async (req, res) => {
  const { targetUserId } = req.params;
  try {
    const store = readStore();
    const followingIds = new Set(store.follows[targetUserId] || []);
    const following = (store.users || [])
      .filter((user) => followingIds.has(user.uid))
      .map((user) => buildUserPreview(store, req.user.uid, user));
    return res.json({ count: following.length, users: following });
  } catch (error) {
    console.error('Get following error:', error);
    return res.status(500).json({ error: 'Failed to fetch following' });
  }
});

module.exports = router;
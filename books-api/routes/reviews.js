const express = require('express');
const authenticate = require('../middleware/authenticate');
const { readStore, updateStore } = require('../lib/store');
const { recordActivity } = require('../lib/activity');
const { notify } = require('../lib/notify');

const router = express.Router();

router.get('/', async (req, res) => {
  const { bookId } = req.query;

  if (!bookId) {
    return res.status(400).json({ error: 'bookId is required' });
  }

  try {
    const store = readStore();
    const reviews = (store.reviews[bookId] || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { bookId, title, author, cover, content } = req.body;

  if (!bookId || !content || !String(content).trim()) {
    return res.status(400).json({ error: 'bookId and review content are required' });
  }

  try {
    const review = updateStore((store) => {
      const reviewId = `review-${store.counters.review++}`;
      const nextReview = {
        id: reviewId,
        bookId,
        userId: req.user.uid,
        displayName: req.user.displayName,
        content: String(content).trim(),
        likes: [],
        createdAt: new Date().toISOString(),
      };

      if (!store.reviews[bookId]) {
        store.reviews[bookId] = [];
      }

      store.reviews[bookId].unshift(nextReview);
      recordActivity(store, {
        userId: req.user.uid,
        displayName: req.user.displayName,
        type: 'reviewed-book',
        reviewId,
        reviewText: nextReview.content,
        book: {
          id: bookId,
          title: title || 'Unknown Title',
          author: author || 'Unknown Author',
          cover: cover || null,
        },
      });

      // Notify other people who reviewed the same book
      const coReviewers = new Set(
        (store.reviews[bookId] || [])
          .filter((r) => r.userId !== req.user.uid)
          .map((r) => r.userId)
      );
      coReviewers.forEach((targetUserId) => {
        notify(store, targetUserId, {
          type: 'co-review',
          message: `${req.user.displayName} also reviewed ${title || 'a book you reviewed'}`,
          actorId: req.user.uid,
          actorName: req.user.displayName,
          ref: { bookId, title },
        });
      });

      return nextReview;
    });

    return res.status(201).json({
      message: 'Review added',
      review,
    });
  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({ error: 'Failed to add review' });
  }
});

router.patch('/:reviewId', authenticate, async (req, res) => {
  const { reviewId } = req.params;
  const { content } = req.body;

  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Review content is required' });
  }

  try {
    const result = updateStore((store) => {
      for (const bookId of Object.keys(store.reviews || {})) {
        const review = (store.reviews[bookId] || []).find((entry) => entry.id === reviewId);
        if (!review) {
          continue;
        }

        if (review.userId !== req.user.uid) {
          return { error: 'forbidden' };
        }

        review.content = String(content).trim();
        review.updatedAt = new Date().toISOString();

        (store.activities || []).forEach((activity) => {
          if (activity.type === 'reviewed-book' && activity.reviewId === reviewId) {
            activity.reviewText = review.content;
          }
        });

        return { review };
      }

      return { error: 'not-found' };
    });

    if (result.error === 'not-found') {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (result.error === 'forbidden') {
      return res.status(403).json({ error: 'You can only edit your own reviews' });
    }

    return res.json({ message: 'Review updated', review: result.review });
  } catch (error) {
    console.error('Update review error:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
});

router.delete('/:reviewId', authenticate, async (req, res) => {
  const { reviewId } = req.params;

  try {
    const result = updateStore((store) => {
      for (const bookId of Object.keys(store.reviews || {})) {
        const reviewIndex = (store.reviews[bookId] || []).findIndex((entry) => entry.id === reviewId);
        if (reviewIndex === -1) {
          continue;
        }

        const review = store.reviews[bookId][reviewIndex];
        if (review.userId !== req.user.uid) {
          return { error: 'forbidden' };
        }

        store.reviews[bookId].splice(reviewIndex, 1);
        if (store.reviews[bookId].length === 0) {
          delete store.reviews[bookId];
        }

        store.activities = (store.activities || []).filter((activity) => !(activity.type === 'reviewed-book' && activity.reviewId === reviewId));
        return { review };
      }

      return { error: 'not-found' };
    });

    if (result.error === 'not-found') {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (result.error === 'forbidden') {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    return res.json({ message: 'Review deleted', review: result.review });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
});

router.post('/:reviewId/like', authenticate, async (req, res) => {
  const { reviewId } = req.params;

  try {
    const result = updateStore((store) => {
      for (const bookId of Object.keys(store.reviews || {})) {
        const review = (store.reviews[bookId] || []).find((r) => r.id === reviewId);
        if (!review) continue;

        if (!Array.isArray(review.likes)) review.likes = [];
        if (!review.likes.includes(req.user.uid)) {
          review.likes.push(req.user.uid);

          // Notify the review owner (not themselves)
          if (review.userId !== req.user.uid) {
            notify(store, review.userId, {
              type: 'review-liked',
              message: `${req.user.displayName} liked your review of ${review.bookTitle || 'a book'}`,
              actorId: req.user.uid,
              actorName: req.user.displayName,
              ref: { reviewId, bookId },
            });
          }
        }

        return { likeCount: review.likes.length };
      }
      return { error: 'not-found' };
    });

    if (result?.error === 'not-found') {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.json({ message: 'Review liked', likeCount: result.likeCount });
  } catch (error) {
    console.error('Like review error:', error);
    return res.status(500).json({ error: 'Failed to like review' });
  }
});

router.delete('/:reviewId/like', authenticate, async (req, res) => {
  const { reviewId } = req.params;

  try {
    const result = updateStore((store) => {
      for (const bookId of Object.keys(store.reviews || {})) {
        const review = (store.reviews[bookId] || []).find((r) => r.id === reviewId);
        if (!review) continue;

        if (!Array.isArray(review.likes)) review.likes = [];
        review.likes = review.likes.filter((uid) => uid !== req.user.uid);
        return { likeCount: review.likes.length };
      }
      return { error: 'not-found' };
    });

    if (result?.error === 'not-found') {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.json({ message: 'Review unliked', likeCount: result.likeCount });
  } catch (error) {
    console.error('Unlike review error:', error);
    return res.status(500).json({ error: 'Failed to unlike review' });
  }
});

module.exports = router;
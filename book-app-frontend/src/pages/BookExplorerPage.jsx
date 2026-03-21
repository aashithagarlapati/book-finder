import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { books, lists, reviews } from '../api/client';
import './BookExplorerPage.css';

const STATUS_OPTIONS = [
  { value: 'want-to-read', label: 'Want to read' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Finished' },
];

function BookExplorerPage({ user }) {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailBook, setDetailBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [shelfBooks, setShelfBooks] = useState([]);
  const [status, setStatus] = useState('want-to-read');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [editingReviewId, setEditingReviewId] = useState('');
  const [editingReviewText, setEditingReviewText] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const shelfById = useMemo(() => {
    const map = new Map();
    shelfBooks.forEach((book) => map.set(book.id, book));
    return map;
  }, [shelfBooks]);

  const loadShelf = async () => {
    try {
      const response = await lists.getMyList();
      setShelfBooks(response.data.books || []);
    } catch {
      // Keep page usable even if shelf load fails.
    }
  };

  useEffect(() => {
    loadShelf();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const response = await books.search(trimmed, 8);
        setResults(response.data.books || []);
      } catch {
        setError('Could not search for books right now.');
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const loadReviews = async (bookId) => {
    setReviewsLoading(true);
    try {
      const response = await reviews.getForBook(bookId);
      setReviewsList(response.data.reviews || []);
    } catch {
      setReviewsList([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSelectBook = async (book) => {
    setSelectedBook(book);
    setDetailBook(null);
    setDetailLoading(true);
    setDetailError('');
    setError('');
    setInfo('');

    const existing = shelfById.get(book.id);
    setStatus(existing?.status || 'want-to-read');

    try {
      const response = await books.getDetails(book);
      setDetailBook(response.data);
      await loadReviews(book.id);
    } catch {
      setDetailError('Could not load book details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const bookId = searchParams.get('bookId');
    const title = searchParams.get('title');
    const author = searchParams.get('author');
    const cover = searchParams.get('cover');
    const year = searchParams.get('year');

    if (!bookId) {
      if (title && !query.trim()) {
        setQuery(title);
      }
      return;
    }

    if (selectedBook?.id === bookId) {
      return;
    }

    const linkedBook = {
      id: bookId,
      title: title || 'Unknown Title',
      author: author || 'Unknown Author',
      cover: cover || null,
      year: year || null,
    };

    if (title && !query.trim()) {
      setQuery(title);
    }

    handleSelectBook(linkedBook);
  }, [searchParams]);

  const handleSaveStatus = async () => {
    if (!selectedBook) return;

    setActionLoading(true);
    setError('');
    setInfo('');

    try {
      if (shelfById.has(selectedBook.id)) {
        await lists.updateStatus(selectedBook.id, status);
        setInfo('Reading status updated.');
      } else {
        await lists.add(detailBook || selectedBook, status);
        setInfo('Book added to your list.');
      }

      await loadShelf();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save this book to your list.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedBook || !reviewText.trim()) {
      setError('Write a review before posting.');
      return;
    }

    setActionLoading(true);
    setError('');
    setInfo('');

    try {
      await reviews.create({
        bookId: selectedBook.id,
        title: detailBook?.title || selectedBook.title,
        author: detailBook?.author || selectedBook.author,
        cover: detailBook?.cover || selectedBook.cover || null,
        content: reviewText.trim(),
      });
      setReviewText('');
      setInfo('Review posted.');
      await loadReviews(selectedBook.id);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not post review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEditReview = (review) => {
    setEditingReviewId(review.id);
    setEditingReviewText(review.content);
    setError('');
    setInfo('');
  };

  const handleSaveEditedReview = async () => {
    if (!editingReviewId || !editingReviewText.trim()) {
      setError('Review text cannot be empty.');
      return;
    }

    setActionLoading(true);
    setError('');
    setInfo('');
    try {
      await reviews.update(editingReviewId, editingReviewText.trim());
      setEditingReviewId('');
      setEditingReviewText('');
      setInfo('Review updated.');
      await loadReviews(selectedBook.id);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    setActionLoading(true);
    setError('');
    setInfo('');
    try {
      await reviews.remove(reviewId);
      if (editingReviewId === reviewId) {
        setEditingReviewId('');
        setEditingReviewText('');
      }
      setInfo('Review deleted.');
      await loadReviews(selectedBook.id);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not delete review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLike = async (review) => {
    const alreadyLiked = (review.likes || []).includes(user?.uid);
    try {
      if (alreadyLiked) {
        await reviews.unlike(review.id);
      } else {
        await reviews.like(review.id);
      }
      await loadReviews(selectedBook.id);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update like.');
    }
  };

  const selectedShelfBook = selectedBook ? shelfById.get(selectedBook.id) : null;

  return (
    <div className="book-explorer-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Explore Books</h1>
            <p>Search as you type, open book details, save titles to your list, and read what others wrote.</p>
          </div>
        </div>

        {error && <div className="msg-error">{error}</div>}
        {info && <div className="msg-success">{info}</div>}

        <div className="explorer-layout">
          <section className="explorer-search card">
            <label htmlFor="book-search">Search for a book</label>
            <input
              id="book-search"
              type="text"
              placeholder="Start typing a title or author..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <p className="explorer-hint">Results appear automatically once you type at least two characters.</p>

            <div className="explorer-results">
              {searching ? (
                <div className="explorer-empty"><span className="spinner" /> Searching...</div>
              ) : results.length === 0 ? (
                <div className="explorer-empty">No live results yet.</div>
              ) : (
                results.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    className={`search-result ${selectedBook?.id === book.id ? 'is-active' : ''}`}
                    onClick={() => handleSelectBook(book)}
                  >
                    <span className="search-result-title">{book.title}</span>
                    <span className="search-result-meta">{book.author}{book.year ? ` • ${book.year}` : ''}</span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="explorer-detail card">
            {!selectedBook ? (
              <div className="explorer-placeholder">Choose a book from the search results to inspect details and reviews.</div>
            ) : detailLoading ? (
              <div className="explorer-placeholder"><span className="spinner" /> Loading details...</div>
            ) : detailError ? (
              <div className="msg-error">{detailError}</div>
            ) : (
              <>
                <div className="detail-hero">
                  <div className="detail-cover">
                    {detailBook?.cover || selectedBook.cover ? (
                      <img src={detailBook?.cover || selectedBook.cover} alt={detailBook?.title || selectedBook.title} />
                    ) : (
                      <div className="detail-cover-placeholder">{(detailBook?.title || selectedBook.title)?.charAt(0) || 'B'}</div>
                    )}
                  </div>
                  <div className="detail-copy">
                    <h2>{detailBook?.title || selectedBook.title}</h2>
                    <p className="detail-author">{detailBook?.author || selectedBook.author}</p>
                    <div className="detail-meta-row">
                      {detailBook?.year && <span className="badge-blue">{detailBook.year}</span>}
                      {selectedShelfBook && <span className="badge-red">On your shelf: {selectedShelfBook.status}</span>}
                    </div>
                    <p className="detail-description">{detailBook?.description || 'No description available yet for this title.'}</p>
                    {Array.isArray(detailBook?.genres) && detailBook.genres.length > 0 && (
                      <div className="detail-genres">
                        {detailBook.genres.slice(0, 8).map((genre) => (
                          <span key={genre} className="badge-blue">{genre}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-actions card-subtle">
                  <div className="status-picker">
                    <label htmlFor="book-status">Reading status</label>
                    <select id="book-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={handleSaveStatus} disabled={actionLoading}>
                    {actionLoading ? <span className="spinner" /> : selectedShelfBook ? 'Update status' : 'Add to my list'}
                  </button>
                </div>

                <div className="reviews-block">
                  <div className="reviews-head">
                    <h3>Reader Reviews</h3>
                    <span>{reviewsList.length} review{reviewsList.length === 1 ? '' : 's'}</span>
                  </div>

                  <form className="review-form" onSubmit={handleSubmitReview}>
                    <textarea
                      placeholder="What did you think about this book?"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                    <button className="btn btn-primary" type="submit" disabled={actionLoading || !reviewText.trim()}>
                      {actionLoading ? <span className="spinner" /> : 'Post review'}
                    </button>
                  </form>

                  {reviewsLoading ? (
                    <div className="explorer-empty"><span className="spinner" /> Loading reviews...</div>
                  ) : reviewsList.length === 0 ? (
                    <div className="explorer-empty">No reviews yet. Be the first to write one.</div>
                  ) : (
                    <div className="review-list">
                      {reviewsList.map((review) => (
                        <article key={review.id} className="review-card card-subtle">
                          <div className="review-meta">
                            <strong>{review.displayName}</strong>
                            <span>{new Date(review.createdAt).toLocaleString()}</span>
                          </div>
                          {editingReviewId === review.id ? (
                            <div className="review-editor">
                              <textarea value={editingReviewText} onChange={(e) => setEditingReviewText(e.target.value)} />
                              <div className="review-editor-actions">
                                <button className="btn btn-primary btn-sm" onClick={handleSaveEditedReview} disabled={actionLoading}>
                                  Save
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingReviewId(''); setEditingReviewText(''); }} disabled={actionLoading}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p>{review.content}</p>
                          )}
                          {review.userId === user?.uid && editingReviewId !== review.id && (
                            <div className="review-owner-actions">
                              <button className="btn btn-ghost btn-sm" onClick={() => handleStartEditReview(review)}>
                                Edit
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteReview(review.id)} disabled={actionLoading}>
                                Delete
                              </button>
                            </div>
                          )}
                          {editingReviewId !== review.id && (
                            <button
                              className={`review-like-btn${(review.likes || []).includes(user?.uid) ? ' is-liked' : ''}`}
                              onClick={() => handleToggleLike(review)}
                              title={(review.likes || []).includes(user?.uid) ? 'Unlike' : 'Like'}
                            >
                              {(review.likes || []).includes(user?.uid) ? '♥' : '♡'}
                              {(review.likes || []).length > 0 && <span>{review.likes.length}</span>}
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default BookExplorerPage;
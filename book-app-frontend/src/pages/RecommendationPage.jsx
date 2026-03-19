import { useEffect, useMemo, useState } from 'react';
import { books, recommendations, lists } from '../api/client';
import BookCard from '../components/BookCard';
import './RecommendationPage.css';

const STEPS = ['Pick books', 'Your picks', 'Discover'];

function RecommendationPage({ user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recoLoading, setRecoLoading] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());
  const [error, setError] = useState('');
  const [summaryById, setSummaryById] = useState({});
  const [summaryBook, setSummaryBook] = useState(null);
  const [summaryLoadingId, setSummaryLoadingId] = useState(null);
  const [summaryError, setSummaryError] = useState('');
  const sessionRecoKey = useMemo(() => {
    const userKey = user?.uid || user?.email || 'anonymous';
    return `bookfinder:recs:${userKey}`;
  }, [user]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionRecoKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.recommended)) {
        setRecommended(parsed.recommended);
      }
      if (parsed.summaryById && typeof parsed.summaryById === 'object') {
        setSummaryById(parsed.summaryById);
      }
    } catch {
      // Ignore bad session data
    }
  }, [sessionRecoKey]);

  useEffect(() => {
    if (recommended.length === 0) return;
    try {
      sessionStorage.setItem(sessionRecoKey, JSON.stringify({
        recommended,
        summaryById,
      }));
    } catch {
      // Session storage can fail in private browsing modes
    }
  }, [recommended, summaryById, sessionRecoKey]);

  const curStep = recommended.length > 0 ? 2 : selected.length > 0 ? 1 : 0;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await books.search(query);
      setResults(res.data.books || []);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBook = (book) => {
    if (selected.find((b) => b.id === book.id)) {
      setSelected(selected.filter((b) => b.id !== book.id));
      return;
    }
    if (selected.length >= 5) { setError('Maximum 5 books — remove one to swap.'); return; }
    setError('');
    setSelected([...selected, book]);
  };

  const handleGetReco = async () => {
    if (selected.length !== 5) { setError('Please select exactly 5 books.'); return; }
    setRecoLoading(true);
    setError('');
    try {
      const res = await recommendations.generate(selected);
      const nextRecommendations = res.data.recommendations || [];
      setRecommended(nextRecommendations);
      try {
        sessionStorage.setItem(sessionRecoKey, JSON.stringify({
          recommended: nextRecommendations,
          summaryById,
        }));
      } catch {
        // Non-blocking
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate recommendations.');
    } finally {
      setRecoLoading(false);
    }
  };

  const handleAddToList = async (book) => {
    try {
      await lists.add(book);
      setAddedIds(new Set([...addedIds, book.id]));
    } catch {
      setError('Could not add to list.');
    }
  };

  const handleReset = () => {
    setSelected([]); setRecommended([]); setResults([]);
    setQuery(''); setError(''); setAddedIds(new Set());
    setSummaryById({});
    setSummaryBook(null);
    setSummaryError('');
    try {
      sessionStorage.removeItem(sessionRecoKey);
    } catch {
      // Non-blocking
    }
  };

  const handleViewSummary = async (book) => {
    setSummaryBook(book);
    setSummaryError('');

    if (summaryById[book.id]) {
      return;
    }

    try {
      setSummaryLoadingId(book.id);
      const res = await books.getSummary(book);
      const summaryText = res.data?.summary || 'No summary available yet.';
      setSummaryById((prev) => ({ ...prev, [book.id]: summaryText }));
    } catch {
      setSummaryError('Could not fetch summary right now. Please try again.');
    } finally {
      setSummaryLoadingId(null);
    }
  };

  const isSelected = (id) => selected.some((b) => b.id === id);

  return (
    <div className="reco-page">
      <div className="container">

        {/* Header */}
        <div className="page-header">
          <h1>Personalised Recommendations</h1>
          <p>Choose five books you love and we&rsquo;ll suggest your next great read.</p>
        </div>

        {/* Step indicator */}
        <div className="step-indicator">
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div className={`step-item ${curStep === i ? 'active' : ''} ${curStep > i ? 'done' : ''}`}>
                <div className="step-dot">{curStep > i ? '✓' : i + 1}</div>
                <span className="step-label">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`step-line ${curStep > i ? 'done' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {error && <div className="msg-error">{error}</div>}

        {recommended.length === 0 ? (
          <>
            {/* Search */}
            <div className="search-section">
              <h2>Search for books</h2>

              {/* Selected chips */}
              {selected.length > 0 && (
                <div className="selected-chips">
                  {selected.map((b) => (
                    <span key={b.id} className="chip">
                      {b.title}
                      <button className="chip-remove" onClick={() => toggleBook(b)} title="Remove">✕</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="counter-bar">
                <p className="counter-text">
                  <strong>{selected.length} / 5</strong> books selected
                  {selected.length === 5 && (
                    <span style={{ color: 'var(--card-light)', marginLeft: 8 }}>— ready!</span>
                  )}
                </p>
                {selected.length === 5 && (
                  <button className="btn btn-primary" onClick={handleGetReco} disabled={recoLoading}>
                    {recoLoading ? <span className="spinner" /> : 'Get my recommendations →'}
                  </button>
                )}
              </div>

              <form className="search-bar" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search a title, author or series…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Search'}
                </button>
              </form>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="search-results">
                <h3>{results.length} result{results.length !== 1 ? 's' : ''}</h3>
                <div className="results-grid">
                  {results.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onAdd={toggleBook}
                      buttonText={isSelected(book.id) ? '✓ Selected' : 'Select'}
                      buttonVariant={isSelected(book.id) ? 'ghost' : 'primary'}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Recommendations */
          <div className="reco-results">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
              <h2>Your personalised picks</h2>
              <button className="btn btn-ghost" onClick={handleReset}>← Start over</button>
            </div>
            <p className="reco-subtitle">Based on the five books you chose — save anything that catches your eye.</p>
            <div className="reco-grid">
              {recommended.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onAdd={handleAddToList}
                  onViewSummary={handleViewSummary}
                  summaryLoading={summaryLoadingId === book.id}
                  buttonText={addedIds.has(book.id) ? '✓ Saved' : 'Save to list'}
                  buttonVariant={addedIds.has(book.id) ? 'ghost' : 'primary'}
                />
              ))}
            </div>
          </div>
        )}

        {summaryBook && (
          <div className="summary-modal-overlay" onClick={() => setSummaryBook(null)}>
            <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
              <div className="summary-modal-header">
                <div>
                  <h3>{summaryBook.title}</h3>
                  <p>{summaryBook.author}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSummaryBook(null)}>
                  Close
                </button>
              </div>

              {summaryLoadingId === summaryBook.id ? (
                <div className="summary-loading"><span className="spinner" /> Loading summary...</div>
              ) : summaryError ? (
                <div className="msg-error">{summaryError}</div>
              ) : (
                <p className="summary-text">
                  {summaryById[summaryBook.id] || 'No summary available yet.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationPage;

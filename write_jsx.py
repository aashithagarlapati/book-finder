import os

base = "/Users/prag/Library/CloudStorage/OneDrive-Personal/Aashitha/Dev/book-app/book-app-frontend/src"

files = {}

# ─── RecommendationPage.jsx ───────────────────────────────────────────────
files["pages/RecommendationPage.jsx"] = """\
import { useState } from 'react';
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
  const [step, setStep] = useState(0); // 0=pick, 1=picks, 2=discover (auto-advance)

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
      setRecommended(res.data.recommendations || []);
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
                  buttonText={addedIds.has(book.id) ? '✓ Saved' : 'Save to list'}
                  buttonVariant={addedIds.has(book.id) ? 'ghost' : 'primary'}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationPage;
"""

# ─── ReadingListPage.jsx ──────────────────────────────────────────────────
files["pages/ReadingListPage.jsx"] = """\
import { useState, useEffect } from 'react';
import { lists } from '../api/client';
import './ReadingListPage.css';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'want-to-read', label: 'Want to read' },
  { key: 'reading', label: 'Reading' },
  { key: 'read', label: 'Finished' },
];

const STATUS_LABELS = {
  'want-to-read': 'Want to read',
  'reading': 'Reading',
  'read': 'Finished',
};
const STATUS_CLASS = {
  'want-to-read': 'want',
  'reading': 'reading',
  'read': 'read',
};

function ReadingListPage({ user }) {
  const [readingList, setReadingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadList(); }, []);

  const loadList = async () => {
    setLoading(true); setError('');
    try {
      const res = await lists.getMyList();
      setReadingList(res.data.books || []);
    } catch {
      setError('Could not load your reading list.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (bookId) => {
    try {
      await lists.remove(bookId);
      setReadingList((prev) => prev.filter((b) => b.id !== bookId));
    } catch {
      setError('Could not remove book.');
    }
  };

  const handleStatus = async (bookId, status) => {
    try {
      await lists.updateStatus(bookId, status);
      setReadingList((prev) => prev.map((b) => b.id === bookId ? { ...b, status } : b));
    } catch {
      setError('Could not update status.');
    }
  };

  const filtered = filter === 'all' ? readingList : readingList.filter((b) => b.status === filter);
  const stats = {
    total: readingList.length,
    'want-to-read': readingList.filter((b) => b.status === 'want-to-read').length,
    reading: readingList.filter((b) => b.status === 'reading').length,
    read: readingList.filter((b) => b.status === 'read').length,
  };

  return (
    <div className="reading-list-page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1>My Reading List</h1>
            <p>{stats.total} book{stats.total !== 1 ? 's' : ''} on your shelf</p>
          </div>
        </div>

        {error && <div className="msg-error">{error}</div>}

        {/* Stats */}
        <div className="stats-row">
          {[
            { n: stats.total, l: 'Total' },
            { n: stats['want-to-read'], l: 'Want to read' },
            { n: stats.reading, l: 'Reading now' },
            { n: stats.read, l: 'Finished' },
          ].map(({ n, l }) => (
            <div key={l} className="stat-card">
              <div className="stat-number">{n}</div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              className={`filter-btn ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <span className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">I</div>
            <h3>Nothing here yet</h3>
            <p>
              {filter === 'all'
                ? 'Get recommendations or browse community lists to add books.'
                : `No books with status "${STATUS_LABELS[filter] || filter}".`}
            </p>
          </div>
        ) : (
          <div className="list-items">
            {filtered.map((book) => (
              <div key={book.id} className="list-item">
                <div className="list-item-cover">
                  {book.cover
                    ? <img src={book.cover} alt={book.title} />
                    : <div className="no-cover">{book.title?.charAt(0) ?? 'B'}</div>}
                </div>
                <div className="list-item-info">
                  <div className="list-item-title">{book.title}</div>
                  <div className="list-item-author">{book.author}</div>
                </div>
                <div className="list-item-actions">
                  <span className={`status-badge ${STATUS_CLASS[book.status] || 'want'}`}>
                    {STATUS_LABELS[book.status] || book.status}
                  </span>
                  <select
                    className="status-select"
                    value={book.status}
                    onChange={(e) => handleStatus(book.id, e.target.value)}
                  >
                    <option value="want-to-read">Want to read</option>
                    <option value="reading">Reading</option>
                    <option value="read">Finished</option>
                  </select>
                  <button className="remove-btn" onClick={() => handleRemove(book.id)} title="Remove">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReadingListPage;
"""

# ─── PublicListsPage.jsx ──────────────────────────────────────────────────
files["pages/PublicListsPage.jsx"] = """\
import { useState, useEffect } from 'react';
import { publicLists, lists } from '../api/client';
import './PublicListsPage.css';

function PublicListsPage({ user }) {
  const [allLists, setAllLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ listName: '', description: '', isPublic: true });
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [userBooks, setUserBooks] = useState([]);
  const [addedListIds, setAddedListIds] = useState(new Set());

  useEffect(() => { loadAll(); loadUserBooks(); }, []);

  const loadAll = async () => {
    setLoading(true); setError('');
    try {
      const res = await publicLists.getAll();
      setAllLists(res.data.lists || []);
    } catch { setError('Could not load community lists.'); }
    finally { setLoading(false); }
  };

  const loadUserBooks = async () => {
    try {
      const res = await lists.getMyList();
      setUserBooks(res.data.books || []);
    } catch { /* silent */ }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.listName || selectedBooks.length === 0) {
      setError('Please name your list and select at least one book.');
      return;
    }
    try {
      const res = await publicLists.create(form.listName, form.description, selectedBooks, form.isPublic);
      setAllLists([res.data.list, ...allLists]);
      setShowModal(false);
      setForm({ listName: '', description: '', isPublic: true });
      setSelectedBooks([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create list.');
    }
  };

  const handleAddAll = async (list) => {
    try {
      for (const book of list.books) await lists.add(book);
      setAddedListIds(new Set([...addedListIds, list.id]));
    } catch { setError('Some books may already be in your list.'); }
  };

  const toggleBook = (book) => {
    if (selectedBooks.some((b) => b.id === book.id)) {
      setSelectedBooks(selectedBooks.filter((b) => b.id !== book.id));
    } else {
      setSelectedBooks([...selectedBooks, book]);
    }
  };

  return (
    <div className="public-lists-page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Community Lists</h1>
            <p>Curated reading lists shared by fellow readers.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Share a list
          </button>
        </div>

        {error && <div className="msg-error">{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <span className="spinner" />
          </div>
        ) : allLists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <p>No community lists yet. Be the first to share one!</p>
          </div>
        ) : (
          <div className="lists-grid">
            {allLists.map((list) => (
              <div key={list.id} className="list-card">
                <div className="list-card-header">
                  <div className="list-card-title">{list.listName}</div>
                  <span className="list-card-count">{list.books?.length ?? 0} books</span>
                </div>
                {list.description && (
                  <p className="list-card-desc">{list.description}</p>
                )}
                {list.books?.length > 0 && (
                  <div className="list-card-books">
                    {list.books.slice(0, 3).map((b) => (
                      <div key={b.id} className="list-card-book">
                        <strong>{b.title}</strong> by {b.author}
                      </div>
                    ))}
                    {list.books.length > 3 && (
                      <div className="list-card-book">
                        +{list.books.length - 3} more
                      </div>
                    )}
                  </div>
                )}
                <div className="list-card-meta">
                  <span className="list-card-owner">by {list.owner || 'a reader'}</span>
                  <div className="list-card-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleAddAll(list)}
                      disabled={addedListIds.has(list.id)}
                    >
                      {addedListIds.has(list.id) ? '✓ Added' : 'Add all'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Share a reading list</h2>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label htmlFor="listName">List name</label>
                  <input
                    id="listName"
                    type="text"
                    placeholder="e.g. Best mysteries of the decade"
                    value={form.listName}
                    onChange={(e) => setForm({ ...form, listName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="desc">Description (optional)</label>
                  <textarea
                    id="desc"
                    placeholder="Tell others why you love these books…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows="2"
                  />
                </div>
                <div className="form-group">
                  <label>Pick books from your shelf</label>
                  {userBooks.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                      Your reading list is empty. Add books first.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                      {userBooks.map((book) => (
                        <label key={book.id} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                          <input
                            type="checkbox"
                            checked={selectedBooks.some((b) => b.id === book.id)}
                            onChange={() => toggleBook(book)}
                            style={{ accentColor: 'var(--card)' }}
                          />
                          <span><strong style={{ color: 'var(--text)' }}>{book.title}</strong> — {book.author}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                      style={{ accentColor: 'var(--card)' }}
                    />
                    Make this list public
                  </label>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Share list</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicListsPage;
"""

# ─── Footer.jsx ───────────────────────────────────────────────────────────
files["components/Footer.jsx"] = """\
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="footer-brand">&#9670; BookFinder</span>
        <span className="footer-copy">A curated reading experience &mdash; built with curiosity.</span>
      </div>
    </footer>
  );
}

export default Footer;
"""

files["components/Footer.css"] = """\
.footer {
  border-top: 1px solid var(--border);
  padding: var(--sp-6) 0;
  margin-top: auto;
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.footer-brand {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
.footer-copy {
  font-size: var(--text-xs);
  color: var(--text-faint);
}
"""

for rel, content in files.items():
    path = os.path.join(base, rel)
    with open(path, "w") as f:
        f.write(content)
    print(f"✓ {rel}")

print("All JSX/CSS files written.")

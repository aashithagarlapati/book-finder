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

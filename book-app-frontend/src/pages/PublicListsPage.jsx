import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { publicLists, lists } from '../api/client';
import { buildBookPagePath } from '../utils/bookLinks';
import './PublicListsPage.css';

function PublicListsPage({ user }) {
  const location = useLocation();
  const [communityLists, setCommunityLists] = useState([]);
  const [myLists, setMyLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ listName: '', description: '', isPublic: true });
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [userBooks, setUserBooks] = useState([]);
  const [shelfBookIds, setShelfBookIds] = useState(new Set());
  const [selectedByList, setSelectedByList] = useState({});

  useEffect(() => { loadAll(); loadMyLists(); loadUserBooks(); }, []);

  useEffect(() => {
    if (!location.hash) return;

    const targetId = location.hash.replace('#', '');
    const target = document.getElementById(targetId);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('list-card--highlight');
    const timer = setTimeout(() => target.classList.remove('list-card--highlight'), 1800);
    return () => clearTimeout(timer);
  }, [location.hash, communityLists, myLists, loading]);

  const loadAll = async () => {
    setLoading(true); setError(''); setInfo('');
    try {
      const res = await publicLists.getAll();
      const lists = res.data.lists || [];
      setCommunityLists(lists.filter((list) => list.userId !== user?.uid));
    } catch { setError('Could not load community lists.'); }
    finally { setLoading(false); }
  };

  const loadMyLists = async () => {
    try {
      const res = await publicLists.getUserLists(user.uid);
      const mine = res.data.lists || [];
      const myIds = new Set(mine.map((list) => list.id));
      setMyLists(mine);
      setCommunityLists((prev) => prev.filter((list) => list.userId !== user?.uid && !myIds.has(list.id)));
    } catch {
      setError('Could not load your shared lists.');
    }
  };

  const loadUserBooks = async () => {
    try {
      const res = await lists.getMyList();
      const books = res.data.books || [];
      setUserBooks(books);
      setShelfBookIds(new Set(books.map((book) => book.id)));
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
      setMyLists((prev) => [res.data.list, ...prev]);
      setShowModal(false);
      setForm({ listName: '', description: '', isPublic: true });
      setSelectedBooks([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create list.');
    }
  };

  const isBookOnShelf = (bookId) => shelfBookIds.has(bookId);

  const isListFullyOnShelf = (list) => {
    const books = list.books || [];
    return books.length > 0 && books.every((book) => isBookOnShelf(book.id));
  };

  const toggleBookForList = (listId, bookId) => {
    setSelectedByList((prev) => {
      const current = new Set(prev[listId] || []);
      if (current.has(bookId)) {
        current.delete(bookId);
      } else {
        current.add(bookId);
      }

      return {
        ...prev,
        [listId]: Array.from(current),
      };
    });
  };

  const toggleSelectAllForList = (list) => {
    const listId = list.id;
    const selectableIds = (list.books || []).map((book) => book.id);

    setSelectedByList((prev) => {
      const current = new Set(prev[listId] || []);
      const allSelected = selectableIds.length > 0 && selectableIds.every((id) => current.has(id));

      if (allSelected) {
        selectableIds.forEach((id) => current.delete(id));
      } else {
        selectableIds.forEach((id) => current.add(id));
      }

      return {
        ...prev,
        [listId]: Array.from(current),
      };
    });
  };

  const addBooksToShelf = async (booksToAdd, listId = null) => {
    const uniqueBooks = (booksToAdd || []).filter((book, index, arr) => arr.findIndex((b) => b.id === book.id) === index);
    const pendingBooks = uniqueBooks.filter((book) => !isBookOnShelf(book.id));

    if (pendingBooks.length === 0) {
      setInfo('All selected books are already in your list.');
      return;
    }

    setError('');
    setInfo('');

    const results = await Promise.allSettled(
      pendingBooks.map((book) => lists.add(book))
    );

    const addedIds = pendingBooks
      .filter((_, index) => results[index].status === 'fulfilled')
      .map((book) => book.id);

    const failedCount = pendingBooks.length - addedIds.length;

    if (addedIds.length > 0) {
      setShelfBookIds((prev) => {
        const next = new Set(prev);
        addedIds.forEach((id) => next.add(id));
        return next;
      });
      await loadUserBooks();
    }

    if (listId) {
      setSelectedByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] || []).filter((id) => !addedIds.includes(id)),
      }));
    }

    if (addedIds.length > 0 && failedCount === 0) {
      setInfo(`Added ${addedIds.length} book${addedIds.length === 1 ? '' : 's'} to your list.`);
      return;
    }

    if (addedIds.length > 0 && failedCount > 0) {
      setInfo(`Added ${addedIds.length} book${addedIds.length === 1 ? '' : 's'}. ${failedCount} could not be added.`);
      return;
    }

    setError('Could not add selected books.');
  };

  const handleAddAll = async (list) => {
    await addBooksToShelf(list.books || [], list.id);
  };

  const handleAddSelected = async (list) => {
    const selectedIds = selectedByList[list.id] || [];
    if (selectedIds.length === 0) {
      setError('Select one or more books first.');
      return;
    }

    const booksToAdd = (list.books || []).filter((book) => selectedIds.includes(book.id));
    await addBooksToShelf(booksToAdd, list.id);
  };

  const handleDeleteMyList = async (listId) => {
    try {
      await publicLists.delete(listId);
      setMyLists((prev) => prev.filter((list) => list.id !== listId));
      setCommunityLists((prev) => prev.filter((list) => list.id !== listId));
      setInfo('List deleted.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete list.');
    }
  };

  const handleToggleVisibility = async (list) => {
    try {
      const updatedVisibility = !list.isPublic;
      const res = await publicLists.update(list.id, { isPublic: updatedVisibility });
      const updated = res.data.list;
      setMyLists((prev) => prev.map((entry) => (entry.id === list.id ? updated : entry)));

      setCommunityLists((prev) => prev.filter((entry) => entry.id !== updated.id));

      setInfo(updated.isPublic ? 'List is now public.' : 'List is now private.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update list visibility.');
    }
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
        {info && <div className="msg-success">{info}</div>}

        <section className="lists-section">
          <div className="section-head">
            <h2>Community Lists</h2>
            <p>Lists from other readers.</p>
          </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <span className="spinner" />
          </div>
        ) : communityLists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <p>No community lists from other readers yet.</p>
          </div>
        ) : (
          <div className="lists-grid">
            {communityLists.map((list) => (
              <div id={`public-list-${list.id}`} key={list.id} className="list-card">
                <div className="list-card-header">
                  <div className="list-card-title">{list.listName}</div>
                  <span className="list-card-count">{list.books?.length ?? 0} books</span>
                </div>
                {list.description && (
                  <p className="list-card-desc">{list.description}</p>
                )}
                {list.books?.length > 0 && (
                  <div className="list-card-books">
                    {list.books.map((b) => (
                      <div key={b.id} className="list-card-book list-card-book--selectable">
                        <input
                          type="checkbox"
                          checked={(selectedByList[list.id] || []).includes(b.id)}
                          onChange={() => toggleBookForList(list.id, b.id)}
                        />
                        <Link className="book-inline-link" to={buildBookPagePath(b)}>
                          <strong>{b.title}</strong> by {b.author}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                <div className="list-card-meta">
                  <span className="list-card-owner">by {list.owner || 'a reader'}</span>
                  <div className="list-card-actions list-card-actions--triple">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleSelectAllForList(list)}
                    >
                      Select all
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleAddSelected(list)}
                      disabled={(selectedByList[list.id] || []).length === 0}
                    >
                      Add selected
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleAddAll(list)}
                      disabled={isListFullyOnShelf(list)}
                    >
                      {isListFullyOnShelf(list) ? '✓ Added' : 'Add all'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </section>

        <section className="lists-section">
          <div className="section-head">
            <h2>My Shared Lists</h2>
            <p>Manage the lists you created.</p>
          </div>

          {myLists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p>You have not shared any lists yet.</p>
            </div>
          ) : (
            <div className="lists-grid">
              {myLists.map((list) => (
                <div id={`public-list-${list.id}`} key={list.id} className="list-card">
                  <div className="list-card-header">
                    <div className="list-card-title">{list.listName}</div>
                    <span className="list-card-count">{list.books?.length ?? 0} books</span>
                  </div>
                  {list.description && (
                    <p className="list-card-desc">{list.description}</p>
                  )}
                  <div className="list-card-books">
                    {(list.books || []).slice(0, 4).map((book) => (
                      <div key={book.id} className="list-card-book">
                        <Link className="book-inline-link" to={buildBookPagePath(book)}>
                          <strong>{book.title}</strong> by {book.author}
                        </Link>
                      </div>
                    ))}
                  </div>
                  <div className="list-card-meta">
                    <span className="list-card-owner">{list.isPublic ? 'Public' : 'Private'}</span>
                    <div className="list-card-actions list-card-actions--double">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggleVisibility(list)}
                      >
                        {list.isPublic ? 'Make private' : 'Make public'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteMyList(list.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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
                    <p className="modal-inline-note">
                      Your reading list is empty. Add books first.
                    </p>
                  ) : (
                    <div className="modal-book-picker">
                      {userBooks.map((book) => (
                        <label key={book.id} className="modal-book-option">
                          <input
                            type="checkbox"
                            className="modal-book-checkbox"
                            checked={selectedBooks.some((b) => b.id === book.id)}
                            onChange={() => toggleBook(book)}
                          />
                          <span className="modal-book-meta">
                            <Link className="book-inline-link" to={buildBookPagePath(book)}>
                              <strong>{book.title}</strong>
                            </Link>
                            <span className="modal-book-author">{book.author}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="modal-visibility-row">
                    <input
                      type="checkbox"
                      className="modal-book-checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
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

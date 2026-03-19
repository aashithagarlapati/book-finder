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
  'finished': 'Finished',
  'read': 'Finished',
};
const STATUS_CLASS = {
  'want-to-read': 'want',
  'reading': 'reading',
  'finished': 'read',
  'read': 'read',
};

const normalizeStatus = (status) => (status === 'finished' ? 'read' : status);

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
      setReadingList((prev) => prev.map((b) => b.id === bookId ? { ...b, status: normalizeStatus(status) } : b));
    } catch {
      setError('Could not update status.');
    }
  };

  const filtered = filter === 'all'
    ? readingList
    : readingList.filter((b) => normalizeStatus(b.status) === normalizeStatus(filter));
  const stats = {
    total: readingList.length,
    'want-to-read': readingList.filter((b) => normalizeStatus(b.status) === 'want-to-read').length,
    reading: readingList.filter((b) => normalizeStatus(b.status) === 'reading').length,
    read: readingList.filter((b) => normalizeStatus(b.status) === 'read').length,
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
                    value={normalizeStatus(book.status)}
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { social } from '../api/client';
import { buildBookPagePath } from '../utils/bookLinks';
import './SocialPage.css';

const describeActivity = (activity) => {
  if (activity.type === 'reading-list-added') {
    return `added ${activity.book?.title || 'a book'} to their list (${activity.status || 'want-to-read'})`;
  }

  if (activity.type === 'reading-status-updated') {
    return `updated ${activity.book?.title || 'a book'} to ${activity.status || 'a new status'}`;
  }

  if (activity.type === 'reviewed-book') {
    return `reviewed ${activity.book?.title || 'a book'}`;
  }

  if (activity.type === 'shared-public-list') {
    return `shared a public list: ${activity.list?.listName || 'Reading List'}`;
  }

  return 'shared an update';
};

function SocialPage() {
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const loadPage = async (searchQuery = '') => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, feedRes] = await Promise.all([
        social.listUsers(searchQuery),
        social.getFeed(),
      ]);
      setUsers(usersRes.data.users || []);
      setActivities(feedRes.data.activities || []);
    } catch {
      setError('Could not load social activity right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPage(query.trim());
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  const handleToggleFollow = async (user) => {
    setError('');
    try {
      if (user.isFollowing) {
        await social.unfollow(user.uid);
      } else {
        await social.follow(user.uid);
      }

      await loadPage();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update follow state.');
    }
  };

  return (
    <div className="social-page">
      <div className="container">
        <div className="page-header">
          <h1>Reading Network</h1>
          <p>Follow other readers and keep up with what they are reading and reviewing.</p>
        </div>

        {error && <div className="msg-error">{error}</div>}

        {loading ? (
          <div className="social-loading"><span className="spinner" /> Loading social activity...</div>
        ) : (
          <div className="social-layout">
            <section className="social-users card">
              <div className="social-section-head">
                <h2>Readers</h2>
                <p>Discover other readers and choose who you want to follow.</p>
              </div>

              <input
                type="text"
                placeholder="Search readers by name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="social-user-list">
                {users.length === 0 ? (
                  <div className="social-empty">No other readers are available yet.</div>
                ) : (
                  users.map((user) => (
                    <article key={user.uid} className="social-user-card card-subtle">
                      <div>
                        <Link className="social-user-link" to={`/social/users/${user.uid}`}>
                          {user.displayName}
                        </Link>
                        <p>{user.email}</p>
                        <div className="social-user-stats">
                          <span>{user.followerCount} followers</span>
                          <span>{user.followingCount} following</span>
                          <span>{user.publicListCount} public lists</span>
                        </div>
                      </div>
                      <button
                        className={`btn ${user.isFollowing ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                        onClick={() => handleToggleFollow(user)}
                      >
                        {user.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="social-feed card">
              <div className="social-section-head">
                <h2>Feed</h2>
                <p>Updates from people you follow.</p>
              </div>

              <div className="social-feed-list">
                {activities.length === 0 ? (
                  <div className="social-empty">Follow someone to see their reading and review updates.</div>
                ) : (
                  activities.map((activity) => (
                    <article key={activity.id} className="feed-card card-subtle">
                      <div className="feed-head">
                        <strong>{activity.displayName || 'Reader'}</strong>
                        <span>{new Date(activity.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="feed-summary">{describeActivity(activity)}</p>
                      {activity.book && (
                        <div className="feed-book-row">
                          <Link className="feed-book-link" to={buildBookPagePath(activity.book)}>
                            <span className="badge-blue">{activity.book.title}</span>
                          </Link>
                          {activity.book.author && <span>{activity.book.author}</span>}
                        </div>
                      )}
                      {activity.list && (
                        <div className="feed-book-row">
                          <span className="badge-blue">{activity.list.listName}</span>
                          <span>{activity.list.count} books</span>
                        </div>
                      )}
                      {activity.reviewText && <p className="feed-review">“{activity.reviewText}”</p>}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default SocialPage;
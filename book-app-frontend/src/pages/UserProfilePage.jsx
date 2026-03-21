import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { social } from '../api/client';
import './UserProfilePage.css';

const describeActivity = (activity) => {
  if (activity.type === 'reading-list-added') return `Added ${activity.book?.title || 'a book'} to their list (${activity.status})`;
  if (activity.type === 'reading-status-updated') return `Updated ${activity.book?.title || 'a book'} to ${activity.status}`;
  if (activity.type === 'reviewed-book') return `Reviewed ${activity.book?.title || 'a book'}`;
  if (activity.type === 'shared-public-list') return `Shared the public list ${activity.list?.listName || 'a list'}`;
  return 'Shared an update';
};

function UserProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview'); // 'overview' | 'followers' | 'following'
  const [listUsers, setListUsers] = useState([]);
  const [listUsersLoading, setListUsersLoading] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await social.getProfile(userId);
      setProfile(response.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (tab === 'overview') {
      setListUsers([]);
      return;
    }
    setListUsersLoading(true);
    const fetcher = tab === 'followers' ? social.getFollowers : social.getFollowing;
    fetcher(userId)
      .then((res) => setListUsers(res.data.users || []))
      .catch(() => setListUsers([]))
      .finally(() => setListUsersLoading(false));
  }, [tab, userId]);

  const handleFollowUser = async (targetUser) => {
    try {
      if (targetUser.isFollowing) {
        await social.unfollow(targetUser.uid);
      } else {
        await social.follow(targetUser.uid);
      }
      setListUsers((prev) =>
        prev.map((u) => u.uid === targetUser.uid ? { ...u, isFollowing: !u.isFollowing } : u)
      );
      await loadProfile();
    } catch {
      // silent
    }
  };

  const handleFollowToggle = async () => {
    if (!profile?.user) return;
    setError('');
    try {
      if (profile.user.isFollowing) {
        await social.unfollow(profile.user.uid);
      } else {
        await social.follow(profile.user.uid);
      }
      await loadProfile();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update follow state.');
    }
  };

  return (
    <div className="user-profile-page">
      <div className="container">
        {loading ? (
          <div className="user-profile-loading"><span className="spinner" /> Loading profile...</div>
        ) : error ? (
          <div className="msg-error">{error}</div>
        ) : (
          <>
            <div className="profile-hero card">
              <div>
                <Link className="profile-back" to="/social">← Back to discovery</Link>
                <h1>{profile.user.displayName}</h1>
                <p>{profile.user.email}</p>
                <div className="profile-stats">
                  <button
                    className={`profile-stat-badge${tab === 'followers' ? ' is-active' : ''}`}
                    onClick={() => setTab(tab === 'followers' ? 'overview' : 'followers')}
                  >
                    {profile.user.followerCount} followers
                  </button>
                  <button
                    className={`profile-stat-badge${tab === 'following' ? ' is-active' : ''}`}
                    onClick={() => setTab(tab === 'following' ? 'overview' : 'following')}
                  >
                    {profile.user.followingCount} following
                  </button>
                  <span className="badge-blue">{profile.user.reviewCount} reviews</span>
                  <span className="badge-blue">{profile.user.publicListCount} public lists</span>
                </div>
              </div>
              <button className={`btn ${profile.user.isFollowing ? 'btn-ghost' : 'btn-primary'}`} onClick={handleFollowToggle}>
                {profile.user.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>

            {(tab === 'followers' || tab === 'following') && (
              <div className="profile-user-list-section card">
                <div className="profile-section-head profile-tab-head">
                  <h2>{tab === 'followers' ? 'Followers' : 'Following'}</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('overview')}>✕ Back to overview</button>
                </div>
                {listUsersLoading ? (
                  <div className="user-profile-loading"><span className="spinner" /></div>
                ) : listUsers.length === 0 ? (
                  <div className="social-empty">
                    {tab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                  </div>
                ) : (
                  <div className="profile-user-list">
                    {listUsers.map((u) => (
                      <article key={u.uid} className="card-subtle profile-user-card">
                        <div>
                          <Link className="social-user-link" to={`/social/users/${u.uid}`}>{u.displayName}</Link>
                          <p>{u.email}</p>
                        </div>
                        <button
                          className={`btn ${u.isFollowing ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                          onClick={() => handleFollowUser(u)}
                        >
                          {u.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'overview' && (
              <div className="profile-layout">
                <section className="card">
                <div className="profile-section-head">
                  <h2>Public Lists</h2>
                  <p>Lists this reader has shared publicly.</p>
                </div>
                <div className="profile-list-grid">
                  {(profile.publicLists || []).length === 0 ? (
                    <div className="social-empty">No public lists shared yet.</div>
                  ) : (
                    profile.publicLists.map((list) => (
                      <article key={list.id} className="card-subtle profile-list-card">
                        <strong>{list.listName}</strong>
                        <p>{list.description || 'No description provided.'}</p>
                        <span>{list.books?.length || 0} books</span>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="card">
                <div className="profile-section-head">
                  <h2>Recent Activity</h2>
                  <p>What this reader has been doing lately.</p>
                </div>
                <div className="profile-activity-list">
                  {(profile.activities || []).length === 0 ? (
                    <div className="social-empty">No recent activity yet.</div>
                  ) : (
                    profile.activities.map((activity) => (
                      <article key={activity.id} className="card-subtle">
                        <div className="profile-activity-head">
                          <strong>{new Date(activity.createdAt).toLocaleString()}</strong>
                        </div>
                        <p className="feed-summary">{describeActivity(activity)}</p>
                        {activity.reviewText && <p className="feed-review">“{activity.reviewText}”</p>}
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default UserProfilePage;
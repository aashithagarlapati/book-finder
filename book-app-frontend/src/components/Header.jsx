import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { notifications as notificationsApi } from '../api/client';
import './Header.css';

function Header({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifList, setNotifList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    onLogout();
    navigate('/auth');
  };

  const firstName = user?.displayName
    ? user.displayName.split(' ')[0]
    : user?.email?.split('@')[0];

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getAll();
      setNotifList(res.data.notifications || []);
      setUnreadCount(res.data.unread || 0);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTogglePanel = async () => {
    const opening = !showPanel;
    setShowPanel(opening);
    if (opening && unreadCount > 0) {
      try {
        await notificationsApi.markAllRead();
        setUnreadCount(0);
        setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // non-critical
      }
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationsApi.clearAll();
      setNotifList([]);
      setUnreadCount(0);
    } catch {
      // non-critical
    }
  };

  const notifTypeLabel = (type) => {
    if (type === 'new-follower') return '👤';
    if (type === 'co-review') return '📖';
    if (type === 'review-liked') return '♥';
    return '🔔';
  };

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-inner">
          <Link to="/" className="header-brand">
            <span className="brand-icon">◈</span>
            <span className="brand-name">BookFinder</span>
          </Link>

          <nav className="header-nav">
            {[
              { to: '/', label: 'Home' },
              { to: '/recommendations', label: 'Discover' },
              { to: '/books', label: 'Search' },
              { to: '/my-list', label: 'My List' },
              { to: '/public-lists', label: 'Community' },
              { to: '/social', label: 'Following' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`nav-link${isActive(to) ? ' nav-link--active' : ''}`}
              >
                {label}
                {isActive(to) && <span className="nav-dot" />}
              </Link>
            ))}
          </nav>

          <div className="header-user">
            <div className="notif-bell-wrap" ref={panelRef}>
              <button
                className={`notif-bell-btn${unreadCount > 0 ? ' has-unread' : ''}`}
                onClick={handleTogglePanel}
                aria-label="Notifications"
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>

              {showPanel && (
                <div className="notif-panel">
                  <div className="notif-panel-head">
                    <strong>Notifications</strong>
                    {notifList.length > 0 && (
                      <button className="btn btn-ghost btn-xs" onClick={handleClearAll}>Clear all</button>
                    )}
                  </div>
                  {notifList.length === 0 ? (
                    <p className="notif-empty">No notifications yet.</p>
                  ) : (
                    <div className="notif-list">
                      {notifList.map((n) => (
                        <div key={n.id} className={`notif-item${n.read ? '' : ' is-unread'}`}>
                          <span className="notif-icon">{notifTypeLabel(n.type)}</span>
                          <div className="notif-body">
                            <p>{n.message}</p>
                            <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <span className="user-greeting">Hi, {firstName}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

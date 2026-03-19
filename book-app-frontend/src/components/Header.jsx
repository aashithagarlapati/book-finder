import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';

function Header({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    onLogout();
    navigate('/auth');
  };

  const firstName = user?.displayName
    ? user.displayName.split(' ')[0]
    : user?.email?.split('@')[0];

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
              { to: '/my-list', label: 'My List' },
              { to: '/public-lists', label: 'Community' },
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

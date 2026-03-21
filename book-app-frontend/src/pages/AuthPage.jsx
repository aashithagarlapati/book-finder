import { useState } from 'react';
import { auth } from '../api/client';
import './AuthPage.css';

const QUOTES = [
  {
    text: "Why, sometimes I've believed as many as six impossible things before breakfast.",
    author: "Lewis Carroll",
    book: "Alice's Adventures in Wonderland",
  },
  {
    text: "Curiouser and curiouser!",
    author: "Lewis Carroll",
    book: "Alice's Adventures in Wonderland",
  },
  {
    text: "There's no place like home.",
    author: "L. Frank Baum",
    book: "The Wonderful Wizard of Oz",
  },
  {
    text: "Somewhere over the rainbow, skies are blue.",
    author: "L. Frank Baum",
    book: "The Wonderful Wizard of Oz",
  },
  {
    text: "All the world is made of faith, and trust, and pixie dust.",
    author: "J.M. Barrie",
    book: "Peter Pan",
  },
  {
    text: "Second star to the right and straight on till morning.",
    author: "J.M. Barrie",
    book: "Peter Pan",
  },
  {
    text: "Isn't it splendid to think of all the things there are to find out about?",
    author: "L.M. Montgomery",
    book: "Anne of Green Gables",
  },
  {
    text: "Tomorrow is always fresh, with no mistakes in it yet.",
    author: "L.M. Montgomery",
    book: "Anne of Green Gables",
  },
  {
    text: "Fifteen men on the dead man's chest - Yo-ho-ho, and a bottle of rum!",
    author: "Robert Louis Stevenson",
    book: "Treasure Island",
  },
  {
    text: "I'd rather take coffee than compliments just now.",
    author: "Louisa May Alcott",
    book: "Little Women",
  },
];

const getQuoteSet = () => {
  const shuffled = [...QUOTES].sort(() => Math.random() - 0.5);
  return {
    featured: shuffled[0],
    supporting: shuffled.slice(1, 4),
  };
};

const QUOTE_SET = getQuoteSet();

const getAuthErrorMessage = (error) => {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (typeof error?.code === 'string' && error.code.trim()) {
    return error.code;
  }

  return 'Authentication failed. Please try again.';
};

function AuthPage({ onLogin }) {
  const accountAvailable = auth.isAccountModeAvailable();
  const firebaseAvailable = auth.isFirebaseConfigured();
  const demoAvailable = auth.isDemoEnabled();
  const [isSignup, setIsSignup] = useState(false);
  const defaultMode = auth.getDefaultAuthMode() || (accountAvailable ? 'account' : 'demo');
  const [authMode, setAuthMode] = useState(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        if (!displayName) { setError('Display name is required'); setLoading(false); return; }
        const res = await auth.signup(email, password, displayName, { mode: authMode });
        if (res.data.token) onLogin(res.data.user, res.data.token);
      } else {
        const res = await auth.login(email, password, { mode: authMode });
        if (res.data.token) onLogin(res.data.user, res.data.token);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  return (
    <div className="auth-page">
      {/* Left decorative panel */}
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-panel-brand">
            <span className="panel-icon">◈</span>
            <span className="panel-wordmark">BookFinder</span>
          </div>
          <p className="auth-panel-kicker">Stories that grow with you</p>
          <blockquote className="auth-quote">
            <p>“{QUOTE_SET.featured.text}”</p>
            <cite>
              — {QUOTE_SET.featured.author}
              <span>{QUOTE_SET.featured.book}</span>
            </cite>
          </blockquote>
          <div className="auth-quote-stack" aria-label="More book lines">
            {QUOTE_SET.supporting.map((quote) => (
              <div key={`${quote.author}-${quote.text}`} className="quote-chip">
                <p>“{quote.text}”</p>
                <small>{quote.book}</small>
              </div>
            ))}
          </div>
          <div className="auth-panel-lines" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="panel-line" style={{ '--i': i }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1>{isSignup ? 'Create an account' : 'Welcome back'}</h1>
            <p>{isSignup ? 'Join a community of readers.' : 'Sign in to your reading space.'}</p>
          </div>

          {(accountAvailable || demoAvailable) && (
            <div className="auth-mode-switch">
              {accountAvailable && (
                <button
                  type="button"
                  className={`auth-mode-btn ${authMode === 'account' ? 'auth-mode-btn--active' : ''}`}
                  onClick={() => setAuthMode('account')}
                >
                  Account
                </button>
              )}
              {demoAvailable && (
                <button
                  type="button"
                  className={`auth-mode-btn ${authMode === 'demo' ? 'auth-mode-btn--active' : ''}`}
                  onClick={() => setAuthMode('demo')}
                >
                  Demo mode
                </button>
              )}
            </div>
          )}

          {error && <div className="msg-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div className="form-group">
                <label htmlFor="displayName">Your name</label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="e.g. Emma"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            {' '}
            <button type="button" className="link-btn" onClick={switchMode}>
              {isSignup ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          <div className="auth-note">
            <span>
              {authMode === 'demo'
                ? 'Demo mode — any email and password works to get started.'
                : firebaseAvailable
                  ? 'Account mode — uses Firebase email/password authentication.'
                  : 'Account mode — saves your login and lists for future sessions.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;

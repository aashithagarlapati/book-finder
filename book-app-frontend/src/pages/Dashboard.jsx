import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard({ user }) {
  const navigate = useNavigate();
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0];

  const features = [
    {
      num: '01',
      title: 'Get Recommendations',
      description: 'Tell us five books you love. Our algorithm discovers hidden gems and new worlds matched to your taste.',
      action: () => navigate('/recommendations'),
      cta: 'Start discovering',
    },
    {
      num: '02',
      title: 'My Reading List',
      description: 'Your personal bookshelf. Track what you\'re reading, what you\'ve finished, and what\'s waiting.',
      action: () => navigate('/my-list'),
      cta: 'Open my shelf',
    },
    {
      num: '03',
      title: 'Community Lists',
      description: 'Browse curated lists from fellow readers. Add their favourites to your own shelf with one click.',
      action: () => navigate('/public-lists'),
      cta: 'Browse lists',
    },
  ];

  return (
    <div className="dashboard">
      {/* Hero */}
      <section className="dash-hero">
        <div className="container">
          <div className="dash-hero-inner">
            <p className="dash-greeting">Hello, {firstName} — ready to read?</p>
            <h1 className="dash-headline">
              What will you<br />
              <em>discover</em> next?
            </h1>
            <p className="dash-sub">
              Enter five favourite books and let BookFinder surface your next obsession.
            </p>
            <button
              className="btn btn-primary btn-lg dash-cta"
              onClick={() => navigate('/recommendations')}
            >
              Get personalised picks
            </button>
          </div>
          <div className="dash-hero-deco" aria-hidden="true">
            <div className="deco-shelf">
              {['#8b2e2e','#3a5a8a','#1a3a1a','#5a3a0a','#2a1a3a','#3a2a0a'].map((c, i) => (
                <div key={i} className="deco-book" style={{ '--c': c, '--h': `${90 + (i % 3) * 20}px`, '--i': i }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="dash-features">
        <div className="container">
          <div className="features-row">
            {features.map((f) => (
              <div key={f.num} className="feature-card" onClick={f.action}>
                <span className="feature-num">{f.num}</span>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.description}</p>
                <span className="feature-cta">{f.cta} →</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="dash-how">
        <div className="container">
          <div className="how-inner">
            <h2>How it works</h2>
            <div className="how-steps">
              {[
                { step: '1', text: 'Search and pick five books you genuinely love' },
                { step: '2', text: 'Our engine analyses genres, themes and style' },
                { step: '3', text: 'Receive a curated list of ideal next reads' },
                { step: '4', text: 'Save, share and discover with the community' },
              ].map(({ step, text }) => (
                <div key={step} className="how-step">
                  <div className="how-step-num">{step}</div>
                  <p className="how-step-text">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;

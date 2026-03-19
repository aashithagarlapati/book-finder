import os

base = "/Users/prag/Library/CloudStorage/OneDrive-Personal/Aashitha/Dev/book-app/book-app-frontend/src"

files = {}

files["components/BookCard.css"] = """\
.book-card {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--bg-surface);
  transition: border-color var(--ease), transform var(--ease), box-shadow var(--ease);
}
.book-card:hover {
  border-color: var(--card);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}
.book-cover {
  flex-shrink: 0;
  width: 58px;
  height: 86px;
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--bg-raised);
  box-shadow: 2px 2px 6px rgba(0,0,0,0.4);
}
.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.book-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-raised), #1a2a3a);
}
.book-cover-initials {
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--card);
  opacity: 0.7;
}
.book-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.book-title {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.book-author {
  color: var(--text-muted);
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-year {
  color: var(--text-faint);
  font-size: var(--text-xs);
}
.book-actions {
  margin-top: auto;
  padding-top: var(--sp-2);
}
.book-remove-btn {
  color: var(--btn-hover) !important;
  border-color: var(--btn-hover) !important;
}
.book-remove-btn:hover {
  background: var(--btn) !important;
  color: var(--text) !important;
}
"""

files["pages/RecommendationPage.css"] = """\
/* RecommendationPage */
.reco-page { padding-bottom: var(--sp-16); }

.reco-page .page-header {
  padding: var(--sp-10) 0 var(--sp-8);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--sp-8);
}
.reco-page .page-header h1 {
  font-size: var(--text-3xl);
  font-family: var(--font-serif);
  margin-bottom: var(--sp-2);
}
.reco-page .page-header p {
  color: var(--text-muted);
}

/* Step indicator */
.step-indicator {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: var(--sp-10);
  max-width: 460px;
}
.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  flex: 1;
}
.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-faint);
  transition: all var(--ease);
}
.step-item.active .step-dot {
  border-color: var(--btn);
  background: var(--btn);
  color: var(--text);
}
.step-item.done .step-dot {
  border-color: var(--card);
  background: var(--card);
  color: var(--text);
}
.step-label {
  font-size: var(--text-xs);
  color: var(--text-faint);
  white-space: nowrap;
}
.step-item.active .step-label { color: var(--text-muted); }
.step-line {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin-bottom: 22px;
}
.step-line.done { background: var(--card); }

/* Search area */
.search-section { margin-bottom: var(--sp-8); }
.search-section h2 {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  margin-bottom: var(--sp-4);
}
.search-bar {
  display: flex;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}
.search-bar input {
  flex: 1;
  max-width: 520px;
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(74,111,165,0.15);
  border: 1px solid var(--card);
  border-radius: var(--r-full);
  font-size: var(--text-xs);
  color: var(--text);
}
.chip-remove {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
}
.chip-remove:hover { color: var(--btn-hover); background: none; }

.counter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
}
.counter-text {
  font-size: var(--text-sm);
  color: var(--text-muted);
}
.counter-text strong { color: var(--text); }

.search-results { margin-bottom: var(--sp-8); }
.search-results h3 {
  font-size: var(--text-base);
  color: var(--text-muted);
  font-weight: 400;
  margin-bottom: var(--sp-4);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--sp-3);
}

/* Recommendations output */
.reco-results { margin-top: var(--sp-8); }
.reco-results h2 {
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  margin-bottom: var(--sp-2);
}
.reco-results .reco-subtitle {
  color: var(--text-muted);
  margin-bottom: var(--sp-6);
}
.reco-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--sp-3);
}

@media (max-width: 600px) {
  .step-indicator { max-width: 100%; }
  .search-bar { flex-direction: column; }
  .results-grid, .reco-grid { grid-template-columns: 1fr; }
}
"""

files["pages/ReadingListPage.css"] = """\
/* ReadingListPage */
.reading-list-page { padding-bottom: var(--sp-16); }

.reading-list-page .page-header {
  padding: var(--sp-10) 0 var(--sp-8);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--sp-8);
}
.reading-list-page .page-header h1 {
  font-size: var(--text-3xl);
  font-family: var(--font-serif);
  margin-bottom: var(--sp-2);
}
.reading-list-page .page-header p { color: var(--text-muted); }

/* Stats row */
.stats-row {
  display: flex;
  gap: var(--sp-4);
  margin-bottom: var(--sp-8);
  flex-wrap: wrap;
}
.stat-card {
  flex: 1;
  min-width: 110px;
  padding: var(--sp-5) var(--sp-4);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  text-align: center;
}
.stat-number {
  font-family: var(--font-serif);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--btn-hover);
  line-height: 1;
  margin-bottom: var(--sp-1);
}
.stat-label {
  font-size: var(--text-xs);
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Filter bar */
.filter-bar {
  display: flex;
  gap: var(--sp-2);
  margin-bottom: var(--sp-6);
  flex-wrap: wrap;
}
.filter-btn {
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--border);
  border-radius: var(--r-full);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--ease);
}
.filter-btn:hover {
  border-color: var(--card);
  color: var(--text);
  background: rgba(74,111,165,0.1);
}
.filter-btn.active {
  background: var(--card);
  border-color: var(--card);
  color: var(--text);
}

/* List items */
.list-items { display: flex; flex-direction: column; gap: var(--sp-2); }

.list-item {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  transition: border-color var(--ease);
}
.list-item:hover { border-color: var(--border-hover); }

.list-item-cover {
  flex-shrink: 0;
  width: 44px;
  height: 64px;
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--bg-raised);
}
.list-item-cover img { width: 100%; height: 100%; object-fit: cover; }
.list-item-cover .no-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--card);
  opacity: 0.6;
  background: linear-gradient(135deg, var(--bg-raised), #1a2a3a);
}

.list-item-info { flex: 1; min-width: 0; }
.list-item-title {
  font-family: var(--font-serif);
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list-item-author { font-size: var(--text-xs); color: var(--text-muted); }

.list-item-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
}

.status-badge {
  padding: 3px 10px;
  border-radius: var(--r-full);
  font-size: var(--text-xs);
  font-weight: 500;
  border: 1px solid;
}
.status-badge.want { color: var(--text-muted); border-color: var(--border); }
.status-badge.reading { color: var(--card-light); border-color: var(--card); }
.status-badge.read { color: #4caf50; border-color: #4caf50; }

.status-select {
  padding: 4px 8px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text-muted);
  font-size: var(--text-xs);
  cursor: pointer;
}
.status-select:focus { outline: none; border-color: var(--card); }

.remove-btn {
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  font-size: var(--text-lg);
  line-height: 1;
  padding: 0 4px;
  transition: color var(--ease);
}
.remove-btn:hover { color: var(--btn-hover); background: none; }

.empty-state {
  text-align: center;
  padding: var(--sp-16) 0;
  color: var(--text-muted);
}
.empty-state .empty-icon {
  font-family: var(--font-serif);
  font-size: 4rem;
  color: var(--card);
  opacity: 0.3;
  margin-bottom: var(--sp-4);
}
.empty-state h3 { font-family: var(--font-serif); margin-bottom: var(--sp-2); }

@media (max-width: 600px) {
  .stats-row { gap: var(--sp-2); }
  .list-item { flex-wrap: wrap; }
  .list-item-actions { width: 100%; justify-content: flex-end; }
}
"""

files["pages/PublicListsPage.css"] = """\
/* PublicListsPage */
.public-lists-page { padding-bottom: var(--sp-16); }

.public-lists-page .page-header {
  padding: var(--sp-10) 0 var(--sp-8);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--sp-8);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sp-4);
  flex-wrap: wrap;
}
.public-lists-page .page-header-text h1 {
  font-size: var(--text-3xl);
  font-family: var(--font-serif);
  margin-bottom: var(--sp-2);
}
.public-lists-page .page-header-text p { color: var(--text-muted); }

.lists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--sp-4);
}

.list-card {
  padding: var(--sp-5);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  background: var(--bg-surface);
  transition: border-color var(--ease), transform var(--ease), box-shadow var(--ease);
  cursor: pointer;
}
.list-card:hover {
  border-color: var(--card);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.list-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}
.list-card-title {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--text);
  line-height: 1.3;
}
.list-card-count {
  flex-shrink: 0;
  padding: 3px 10px;
  background: rgba(74,111,165,0.15);
  border: 1px solid var(--card);
  border-radius: var(--r-full);
  font-size: var(--text-xs);
  color: var(--card-light);
  white-space: nowrap;
}

.list-card-desc {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: var(--sp-4);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.list-card-books {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--sp-4);
}
.list-card-book {
  font-size: var(--text-xs);
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list-card-book strong { color: var(--text-muted); font-weight: 500; }

.list-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--sp-3);
  border-top: 1px solid var(--border);
}
.list-card-owner { font-size: var(--text-xs); color: var(--text-faint); }
.list-card-actions { display: flex; gap: var(--sp-2); }

/* Create Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--sp-4);
}
.modal {
  background: var(--bg-raised);
  border: 1px solid var(--border-hover);
  border-radius: var(--r-2xl);
  padding: var(--sp-8);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal h2 {
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  margin-bottom: var(--sp-6);
}
.modal-actions {
  display: flex;
  gap: var(--sp-3);
  justify-content: flex-end;
  margin-top: var(--sp-6);
}

@media (max-width: 600px) {
  .lists-grid { grid-template-columns: 1fr; }
  .public-lists-page .page-header { flex-direction: column; align-items: flex-start; }
}
"""

for rel, content in files.items():
    path = os.path.join(base, rel)
    with open(path, "w") as f:
        f.write(content)
    print(f"✓ {rel}")

print("All CSS files written.")

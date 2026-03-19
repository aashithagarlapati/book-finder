import './BookCard.css';

function BookCard({
  book,
  onAdd,
  onRemove,
  buttonText = 'Add to List',
  buttonVariant = 'primary',
  showRemove = false,
  onViewSummary,
  summaryLoading = false,
}) {
  return (
    <div className="book-card">
      <div className="book-cover">
        {book.cover ? (
          <img src={book.cover} alt={book.title} loading="lazy" />
        ) : (
          <div className="book-cover-placeholder">
            <span className="book-cover-initials">
              {book.title?.charAt(0) ?? '□'}
            </span>
          </div>
        )}
      </div>
      <div className="book-info">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        {book.year && <div className="book-year">{book.year}</div>}
        <div className="book-actions">
          {!showRemove && onAdd && (
            <button
              className={`btn btn-${buttonVariant} btn-sm`}
              onClick={() => onAdd(book)}
            >
              {buttonText}
            </button>
          )}

          {!showRemove && onViewSummary && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onViewSummary(book)}
            >
              {summaryLoading ? <span className="spinner" /> : 'View summary'}
            </button>
          )}

          {showRemove && onRemove && (
            <button
              className="btn btn-ghost btn-sm book-remove-btn"
              onClick={() => onRemove(book.id)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookCard;

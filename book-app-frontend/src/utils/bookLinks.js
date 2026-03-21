export const buildBookPagePath = (book = {}) => {
  const params = new URLSearchParams();

  if (book.id) params.set('bookId', book.id);
  if (book.title) params.set('title', book.title);
  if (book.author) params.set('author', book.author);
  if (book.cover) params.set('cover', book.cover);
  if (book.year) params.set('year', String(book.year));

  const query = params.toString();
  return query ? `/books?${query}` : '/books';
};

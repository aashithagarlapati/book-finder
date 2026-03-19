import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect if needed
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  signup: (email, password, displayName) =>
    client.post('/auth/signup', { email, password, displayName }),
  login: (email, password) => client.post('/auth/login', { email, password }),
  verify: (token) => client.post('/auth/verify', { token }),
};

export const books = {
  search: (query, limit = 20) => client.get('/books/search', { params: { query, limit } }),
  getById: (bookId) => client.get(`/books/${bookId}`),
  getSummary: (book) => client.get('/books/summary', {
    params: {
      bookId: book.id,
      title: book.title,
      author: book.author,
    },
  }),
};

export const recommendations = {
  generate: (books) => client.post('/recommendations', { books }),
  get: () => client.get('/recommendations'),
};

export const lists = {
  add: (book) => client.post('/lists/add', { book }),
  getMyList: () => client.get('/lists'),
  remove: (bookId) => client.delete(`/lists/${bookId}`),
  updateStatus: (bookId, status) => client.patch(`/lists/${bookId}`, { status }),
};

export const publicLists = {
  create: (listName, description, books, isPublic) =>
    client.post('/public-lists/create', { listName, description, books, isPublic }, { withAuth: true }),
  getAll: (page = 1, limit = 10) =>
    client.get('/public-lists', { params: { page, limit } }),
  getById: (listId) => client.get(`/public-lists/${listId}`),
  getUserLists: (userId) => client.get(`/public-lists/user/${userId}`),
  update: (listId, data) =>
    client.patch(`/public-lists/${listId}`, data, { withAuth: true }),
  delete: (listId) =>
    client.delete(`/public-lists/${listId}`, { withAuth: true }),
};

export default client;

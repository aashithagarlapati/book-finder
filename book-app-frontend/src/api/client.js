import axios from 'axios';
import {
  isFirebaseClientConfigured,
  signInWithFirebase,
  signOutFirebase,
  signUpWithFirebase,
} from '../auth/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const DEMO_AUTH_ENABLED = import.meta.env.VITE_ENABLE_DEMO_AUTH !== 'false';
const DEFAULT_AUTH_MODE = import.meta.env.VITE_DEFAULT_AUTH_MODE || null;

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
  isFirebaseConfigured: () => isFirebaseClientConfigured(),
  isDemoEnabled: () => DEMO_AUTH_ENABLED,
  isAccountModeAvailable: () => true,
  getDefaultAuthMode: () => DEFAULT_AUTH_MODE,
  signup: async (email, password, displayName, options = {}) => {
    const mode = options.mode || 'account';

    if (mode === 'account' && isFirebaseClientConfigured()) {
      const session = await signUpWithFirebase({ email, password, displayName });
      const verified = await client.post('/auth/session', { token: session.token, mode: 'firebase' });
      return {
        data: {
          token: session.token,
          user: verified.data.user,
          mode: 'firebase',
        },
      };
    }

    return client.post('/auth/signup', {
      email,
      password,
      displayName,
      mode: mode === 'demo' ? 'demo' : 'local',
    });
  },
  login: async (email, password, options = {}) => {
    const mode = options.mode || 'account';

    if (mode === 'account' && isFirebaseClientConfigured()) {
      const session = await signInWithFirebase({ email, password });
      const verified = await client.post('/auth/session', { token: session.token, mode: 'firebase' });
      return {
        data: {
          token: session.token,
          user: verified.data.user,
          mode: 'firebase',
        },
      };
    }

    return client.post('/auth/login', {
      email,
      password,
      mode: mode === 'demo' ? 'demo' : 'local',
    });
  },
  verify: (token) => client.post('/auth/verify', { token }),
  logout: async () => {
    await signOutFirebase();
  },
};

export const admin = {
  listAccounts: (adminKey) => client.get('/auth/admin/accounts', {
    headers: {
      'x-admin-key': adminKey,
    },
  }),
  deleteAccount: (uid, adminKey) => client.delete(`/auth/admin/accounts/${encodeURIComponent(uid)}`, {
    headers: {
      'x-admin-key': adminKey,
    },
  }),
};

export const books = {
  search: (query, limit = 20) => client.get('/books/search', { params: { query, limit } }),
  getById: (bookId) => client.get(`/books/${encodeURIComponent(bookId)}`),
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
  remove: (bookId) => client.delete(`/lists/${encodeURIComponent(bookId)}`),
  updateStatus: (bookId, status) => client.patch('/lists/status', { bookId, status }),
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

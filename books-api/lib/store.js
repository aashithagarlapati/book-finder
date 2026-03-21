const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const defaultStore = () => ({
  users: [],
  readingLists: {},
  publicLists: {},
  recommendations: {},
  reviews: {},
  follows: {},
  activities: [],
  notifications: {},
  counters: {
    publicList: 1,
    review: 1,
    activity: 1,
    notification: 1,
  },
});

const ensureStoreFile = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore(), null, 2));
  }
};

const readStore = () => {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      ...defaultStore(),
      ...parsed,
      counters: {
        ...defaultStore().counters,
        ...(parsed.counters || {}),
      },
    };
  } catch {
    const freshStore = defaultStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(freshStore, null, 2));
    return freshStore;
  }
};

const writeStore = (store) => {
  ensureStoreFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
};

const updateStore = (updater) => {
  const store = readStore();
  const result = updater(store);
  writeStore(store);
  return result;
};

module.exports = {
  readStore,
  writeStore,
  updateStore,
};
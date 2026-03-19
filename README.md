# 📚 BookFinder - Your Personal Book Discovery Platform

A beautiful, fully-functional web application for discovering book recommendations, managing your reading list, and sharing curated reading lists with a community of book lovers.

## 🌟 Features

### Core Features
- ✨ **Personalized Recommendations** - Enter 5 favorite books, get 15+ recommendations based on similar genres
- 📚 **Personal Reading List** - Track books you want to read, are reading, or have read
- 🔍 **Book Discovery** - Search from millions of books via OpenLibrary
- 🌐 **Public Lists** - Create and share reading lists with the community
- 👥 **Multi-User** - Each user has their own account and private lists
- 🎨 **Beautiful Design** - Dark theme (black, soft blue, dark red) optimized for reading

### Technical Highlights
- **Frontend**: React + Vite (fast, modern build tool)
- **Backend**: Node.js + Express
- **Book Data**: OpenLibrary API (free, millions of books)
- **Authentication**: Email/password with tokens
- **Responsive**: Works on mobile, tablet, and desktop
- **Algorithm**: Tag-based recommendation system

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Two terminal windows

### Installation

```bash
# Clone or download the project
cd book-app

# Terminal 1: Setup Backend
cd books-api
npm install
npm run dev
# Backend runs on http://localhost:5000

# Terminal 2: Setup Frontend
cd book-app-frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### First Time Setup
1. Open http://localhost:5173 in your browser
2. Click **Sign Up**
3. Enter email, password, and display name
4. Start discovering books!

## 📖 How to Use

### Get Recommendations
1. Click **"Recommendations"** in navigation
2. Search for a book (e.g., "The Hunger Games")
3. Click **"Select"** on 5 different books you love
4. Click **"✨ Get Recommendations"**
5. Browse 15+ similar books recommended for you

### Build Your Reading List
1. Go to **"My List"**
2. Click **"Add to My List"** on recommended books
3. Mark books as "Want to Read", "Reading", or "Read"
4. Remove books when done

### Share Lists With Others
1. Click **"Discovery"**
2. Click **"➕ Create Your List"**
3. Name your list and select books from your reading list
4. Check "Make public" and create
5. Share the link! Others can add your books to their lists

## 🎨 Design

### Color Palette
- **Background**: #000000 (Pure Black)
- **Cards**: #4a6fa5 (Soft Blue)
- **Buttons**: #8b2e2e (Dark Red)
- **Text**: #f7fafc (Off-White)

A sophisticated, sober design that's easy on the eyes for extended reading sessions.

## 🏗️ Architecture

### Frontend (`book-app-frontend/`)
```
src/
├── pages/
│   ├── AuthPage.jsx           # Login & Signup
│   ├── Dashboard.jsx          # Home with feature overview
│   ├── RecommendationPage.jsx # Get recommendations
│   ├── ReadingListPage.jsx    # Manage personal list
│   └── PublicListsPage.jsx    # Discover & create lists
├── components/
│   ├── Header.jsx             # Navigation
│   ├── Footer.jsx             # Footer
│   └── BookCard.jsx           # Reusable book display
├── api/
│   └── client.js              # API requests
└── index.css                  # Dark theme styles
```

### Backend (`books-api/`)
```
├── server.js              # Express server
├── config/
│   └── firebase.js        # Firebase setup
├── routes/
│   ├── auth.js            # User authentication
│   ├── books.js           # Book search (OpenLibrary)
│   ├── recommendations.js # Recommendation algorithm
│   ├── lists.js           # Reading list CRUD
│   └── publicLists.js     # Public list management
└── middleware/
    └── authenticate.js    # JWT verification
```

## 🔧 API Documentation

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/verify` - Verify token

### Books
- `GET /api/books/search?query=title` - Search books
- `GET /api/books/{bookId}` - Get book details

### Recommendations  
- `POST /api/recommendations` - Generate recommendations (requires 5 books)
- `GET /api/recommendations` - Get your recommendations

### Reading List
- `POST /api/lists/add` - Add book to list
- `GET /api/lists` - Get your reading list
- `DELETE /api/lists/{bookId}` - Remove book
- `PATCH /api/lists/{bookId}` - Update book status

### Public Lists
- `GET /api/public-lists` - Get all public lists
- `POST /api/public-lists/create` - Create new list
- `GET /api/public-lists/{listId}` - Get specific list
- `PATCH /api/public-lists/{listId}` - Edit your list
- `DELETE /api/public-lists/{listId}` - Delete your list

## 📊 Recommendation Algorithm

The app uses a **tag-based recommendation system**:
1. User submits 5 favorite books
2. System fetches genre/subject tags for each book
3. Collects all unique tags (e.g., "dystopian", "young adult", "sci-fi")
4. Searches OpenLibrary for books matching these tags
5. Ranks results by how many tags they match
6. Returns top 20 matches

This is simple, fast, and effective for personalized recommendations!

## 💾 Data Storage

Currently uses **in-memory storage** (data resets on server restart).

For production, connect to:
- **Firebase Firestore** (recommended, free tier)
- **PostgreSQL** (via Render)
- **MongoDB**

## 🚀 Deployment

### Frontend (Vercel - Free)
```bash
cd book-app-frontend
npm run build
# Deploy dist/ to Vercel
```

### Backend (Firebase Functions - Free)
```bash
cd books-api
# Setup Firebase and deploy Cloud Functions
firebase deploy
```

See deployment docs for full instructions.

## 🎓 Learning Outcomes

This project teaches:
- ✅ Full-stack web development (React + Node.js)
- ✅ API design and REST endpoints
- ✅ User authentication and authorization
- ✅ Working with external APIs
- ✅ Responsive UI design
- ✅ State management
- ✅ Database concepts (in-memory to real DB)
- ✅ Algorithm design (recommendations)
- ✅ Deployment to production

## 🐛 Troubleshooting

**"Cannot connect to backend"**
- Ensure both servers running with `npm run dev`
- Check ports 5000 and 5173 are available

**"Book search returns empty"**
- Try common books like "Harry Potter" or "The Hobbit"
- OpenLibrary might be slow, refresh and try again

**"Can't add books to list"**
- Make sure you're logged in
- Clear browser cache and try again

**"Recommendations seem random"**
- Recommendations are based on genre matching
- Some books have sparse metadata, so matches may vary

## 📚 Resources

- **React Docs**: https://react.dev
- **Express.js**: https://expressjs.com
- **OpenLibrary API**: https://openlibrary.org/developers/api
- **Vite**: https://vitejs.dev
- **Node.js**: https://nodejs.org

## 📝 License

This project is yours to keep, modify, and build upon!

## 🎉 Credits

Built with ❤️ as a learning project for book discovery and sharing.

---

**Happy reading!** 📖✨

For detailed setup and testing instructions, see [QUICKSTART.md](./QUICKSTART.md)

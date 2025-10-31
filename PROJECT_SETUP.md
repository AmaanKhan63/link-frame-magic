# Webpage Archiver - Full Setup Guide

## Overview
This project consists of:
- **Frontend**: React (Lovable) - runs in browser
- **Backend**: Node.js + Express - runs locally on your machine

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Install Playwright Browser
```bash
npx playwright install chromium
```

### 3. Start Backend Server
```bash
npm run dev
```
Server will run on `http://localhost:3001`

## Frontend Setup

The frontend is already configured in Lovable. Just make sure the backend is running before testing.

## How to Use

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Open Frontend
Open the Lovable preview (already running in your browser)

### 3. Test the Three Modes

#### Snapshot Mode
- Enter any public URL (e.g., `https://example.com`)
- Select "Snapshot (Inline HTML)"
- Click "Run"
- Page will load inline with all assets embedded

#### Screenshot Mode
- Enter any URL
- Select "Screenshot (Playwright)"
- Click "Run"
- Full-page screenshot will display

#### Offline Save Mode
- Enter any URL
- Select "Save Offline (Full Download)"
- Click "Run"
- Page saved to `backend/data/{id}/`
- Click the link in "Saved Pages" sidebar to open offline version

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/snapshot?url=<url>` | GET | Returns inline HTML |
| `/api/screenshot?url=<url>` | GET | Returns screenshot |
| `/api/save-page` | POST | Saves page offline |
| `/api/saved-pages` | GET | Lists saved pages |
| `/offline/:id/index.html` | GET | Serves offline page |

## Features

### ✅ Snapshot Mode
- Fetches webpage HTML
- Inlines CSS, images, and scripts as Base64
- Returns single HTML document
- Displays in iframe

### ✅ Screenshot Mode
- Uses Playwright headless browser
- Captures full-page screenshot
- Returns Base64 image
- Displays inline

### ✅ Offline Save Mode
- Downloads HTML + all assets
- Rewrites URLs to local paths
- Stores in organized folder structure
- Serves as static site

## File Structure

```
backend/
├── routes/
│   ├── snapshot.js      # Inline HTML handler
│   ├── screenshot.js    # Playwright screenshot
│   └── savePage.js      # Offline download
├── data/                # Saved offline pages
├── snapshots/           # Screenshot storage
├── server.js            # Main Express server
└── package.json

src/
├── components/
│   ├── UrlInput.tsx        # URL input + mode selector
│   ├── DisplayArea.tsx     # Result display
│   └── SavedPagesList.tsx  # Offline pages list
└── pages/
    └── Index.tsx           # Main page
```

## Troubleshooting

### Backend Won't Start
- Ensure Node.js v16+ installed
- Run `npm install` in backend folder
- Check port 3001 isn't in use

### Playwright Errors
- Run `npx playwright install chromium`
- Ensure sufficient disk space

### CORS Errors
- Backend must be running on `localhost:3001`
- CORS is enabled for all origins in `server.js`

### Screenshots Fail
- Some sites block headless browsers
- Try different URLs
- Check console for errors

## Technologies Used

### Backend
- Express.js - Web server
- Axios - HTTP requests
- Cheerio - HTML parsing
- Playwright - Browser automation
- fs-extra - File operations
- uuid - Unique IDs

### Frontend
- React - UI framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- shadcn/ui - UI components
- Tanstack Query - Data fetching

## Notes

- Snapshot mode works for most sites
- Screenshot mode requires Playwright installation
- Offline save creates local file structure
- All three modes handle errors gracefully
- Backend runs independently of Lovable

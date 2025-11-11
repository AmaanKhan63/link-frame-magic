# Webpage Archiver Backend

Node.js + Express backend for webpage archiving with three modes:
1. **Snapshot** - Inline HTML with embedded resources
2. **Screenshot** - Full-page rendered screenshot using Playwright
3. **Offline Save** - Complete page download with local asset storage

## Setup

```bash
cd backend
npm install
npx playwright install chromium
```

## Run

```bash
npm run dev  # Development with nodemon
npm start    # Production
```

Server runs on `http://localhost:3001`

## API Endpoints

- `GET /api/snapshot?url=<url>` - Returns inline HTML
- `GET /api/screenshot?url=<url>` - Returns screenshot as base64 + file URL
- `POST /api/save-page` - Body: `{ url }` - Saves page offline
- `GET /api/saved-pages` - Lists all saved pages
- `GET /offline/:id/index.html` - Serves saved offline page
- `GET /snapshots/:filename` - Serves screenshot files

## CORS

CORS is enabled for all origins. Configure in `server.js` if needed.

import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import snapshotRouter from './routes/snapshot.js';
import screenshotRouter from './routes/screenshot.js';
import savePageRouter from './routes/savePage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directories exist
await fs.ensureDir(path.join(__dirname, 'data'));
await fs.ensureDir(path.join(__dirname, 'snapshots'));

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving for offline pages and screenshots
app.use('/offline', express.static(path.join(__dirname, 'data')));
app.use('/snapshots', express.static(path.join(__dirname, 'snapshots')));

// Routes
app.use('/api/snapshot', snapshotRouter);
app.use('/api/screenshot', screenshotRouter);
app.use('/api/save-page', savePageRouter);

// List saved pages
app.get('/api/saved-pages', async (req, res) => {
  try {
    const dataDir = path.join(__dirname, 'data');
    const folders = await fs.readdir(dataDir);
    
    const pages = await Promise.all(
      folders.map(async (id) => {
        const metaPath = path.join(dataDir, id, 'meta.json');
        if (await fs.pathExists(metaPath)) {
          const meta = await fs.readJson(metaPath);
          return { id, ...meta };
        }
        return null;
      })
    );
    
    res.json(pages.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

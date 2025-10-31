import express from 'express';
import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  let browser = null;
  
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const screenshotBuffer = await page.screenshot({ 
      fullPage: true,
      type: 'png'
    });
    
    await browser.close();
    browser = null;

    const id = uuidv4();
    const snapshotsDir = path.join(__dirname, '..', 'snapshots');
    await fs.ensureDir(snapshotsDir);
    
    const filename = `${id}.png`;
    const filepath = path.join(snapshotsDir, filename);
    await fs.writeFile(filepath, screenshotBuffer);

    res.json({
      success: true,
      imageUrl: `/snapshots/${filename}`,
      base64: `data:image/png;base64,${screenshotBuffer.toString('base64')}`
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ 
      error: 'Failed to capture screenshot',
      details: error.message 
    });
  }
});

export default router;

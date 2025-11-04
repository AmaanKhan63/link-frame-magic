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
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    
    // Add stealth scripts
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });
    
    const page = await context.newPage();
    
    // Navigate with longer timeout and better wait strategy
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    
    // Wait for page to be interactive
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      console.log('Network not idle, proceeding anyway');
    });
    
    // Additional wait to ensure dynamic content loads
    await page.waitForTimeout(3000);
    
    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
    
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

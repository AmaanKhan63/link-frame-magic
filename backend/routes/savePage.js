import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { chromium as pwChromium } from 'playwright';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'playwright-extra-plugin-stealth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const chromium = addExtra(pwChromium);
chromium.use(StealthPlugin());

const router = express.Router();

async function downloadResource(url, filepath, headers = {}) {
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: {
        'User-Agent': headers['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': headers['Accept'] || '*/*',
        'Accept-Language': headers['Accept-Language'] || 'en-US,en;q=0.9',
        'Referer': headers['Referer'] || new URL(url).origin,
        ...(headers['sec-ch-ua'] ? { 'sec-ch-ua': headers['sec-ch-ua'] } : {}),
        ...(headers['sec-ch-ua-mobile'] ? { 'sec-ch-ua-mobile': headers['sec-ch-ua-mobile'] } : {}),
        ...(headers['sec-ch-ua-platform'] ? { 'sec-ch-ua-platform': headers['sec-ch-ua-platform'] } : {}),
        ...(headers['Cookie'] ? { 'Cookie': headers['Cookie'] } : {})
      },
      maxRedirects: 5
    });
    await fs.ensureDir(path.dirname(filepath));
    await fs.writeFile(filepath, response.data);
    return true;
  } catch (error) {
    console.log(`Failed to download: ${url}`);
    return false;
  }
}

router.post('/', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required in request body' });
  }

  const id = uuidv4();
  const pageDir = path.join(__dirname, '..', 'data', id);
  
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  let cookieHeader = '';
  let html = '';

  try {
    await fs.ensureDir(pageDir);

    // 1) Try direct fetch first
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
          'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", "Not:A-Brand";v="99"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"'
        },
        timeout: 20000,
        maxRedirects: 5
      });
      html = response.data;
    } catch (err) {
      // 2) Fallback to real browser (Playwright) to fetch HTML + cookies
      if (!err.response || [403, 429, 503].includes(err.response.status)) {
        const browser = await chromium.launch({ 
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
          userAgent: ua,
          locale: 'en-US',
          timezoneId: 'America/New_York',
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", "Not:A-Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
          }
        });
        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          // Basic stealth patches
          window.chrome = { runtime: {} };
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
          Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000);

        html = await page.content();
        const cookies = await context.cookies();
        cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        await context.close();
        await browser.close();
      } else {
        throw err;
      }
    }

    const $ = cheerio.load(html);

    const resourceHeaders = {
      'User-Agent': ua,
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': url,
      'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", "Not:A-Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
    };

    // Download and rewrite CSS
    const styleLinks = $('link[rel="stylesheet"]');
    for (let i = 0; i < styleLinks.length; i++) {
      const link = $(styleLinks[i]);
      const href = link.attr('href');
      if (!href || href.startsWith('data:')) continue;
      
      const cssUrl = new URL(href, url).href;
      const localPath = `assets/css/${i}.css`;
      const filepath = path.join(pageDir, localPath);
      
      if (await downloadResource(cssUrl, filepath, resourceHeaders)) {
        link.attr('href', localPath);
      }
    }

    // Download and rewrite images
    const images = $('img[src]');
    for (let i = 0; i < images.length; i++) {
      const img = $(images[i]);
      const src = img.attr('src');
      if (!src || src.startsWith('data:')) continue;
      
      const imgUrl = new URL(src, url).href;
      const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
      const localPath = `assets/images/${i}${ext}`;
      const filepath = path.join(pageDir, localPath);
      
      if (await downloadResource(imgUrl, filepath, resourceHeaders)) {
        img.attr('src', localPath);
      }
    }

    // Download and rewrite scripts
    const scripts = $('script[src]');
    for (let i = 0; i < scripts.length; i++) {
      const script = $(scripts[i]);
      const src = script.attr('src');
      if (!src || src.startsWith('data:')) continue;
      
      const scriptUrl = new URL(src, url).href;
      const localPath = `assets/js/${i}.js`;
      const filepath = path.join(pageDir, localPath);
      
      if (await downloadResource(scriptUrl, filepath, resourceHeaders)) {
        script.attr('src', localPath);
      }
    }

    // Save the modified HTML
    await fs.writeFile(path.join(pageDir, 'index.html'), $.html());

    // Save metadata
    await fs.writeJson(path.join(pageDir, 'meta.json'), {
      originalUrl: url,
      savedAt: new Date().toISOString()
    });

    res.json({ 
      success: true,
      id,
      originalUrl: url,
      offlineUrl: `/offline/${id}/index.html`
    });
  } catch (error) {
    await fs.remove(pageDir).catch(() => {});
    res.status(500).json({ 
      error: 'Failed to save page',
      details: error.message 
    });
  }
});

export default router;

import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium as pwChromium } from 'playwright';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const chromium = addExtra(pwChromium);
chromium.use(StealthPlugin());

const router = express.Router();

async function inlineResources($, baseUrl, headers = {}) {
  // Inline CSS
  const styleLinks = $('link[rel="stylesheet"]');
  for (let i = 0; i < styleLinks.length; i++) {
    const link = $(styleLinks[i]);
    const href = link.attr('href');
    if (!href || href.startsWith('data:')) continue;
    
    try {
      const cssUrl = new URL(href, baseUrl).href;
      const response = await axios.get(cssUrl, { responseType: 'text', timeout: 5000, headers });
      const styleTag = $('<style></style>').text(response.data);
      link.replaceWith(styleTag);
    } catch (error) {
      console.log(`Failed to inline CSS: ${href}`);
    }
  }

  // Inline images as base64
  const images = $('img[src]');
  for (let i = 0; i < images.length; i++) {
    const img = $(images[i]);
    const src = img.attr('src');
    if (!src || src.startsWith('data:')) continue;
    
    try {
      const imgUrl = new URL(src, baseUrl).href;
      const response = await axios.get(imgUrl, { 
        responseType: 'arraybuffer',
        timeout: 5000,
        headers
      });
      
      const contentType = response.headers['content-type'] || 'image/png';
      const base64 = Buffer.from(response.data).toString('base64');
      img.attr('src', `data:${contentType};base64,${base64}`);
    } catch (error) {
      console.log(`Failed to inline image: ${src}`);
    }
  }

  // Inline scripts (optional - can be dangerous)
  const scripts = $('script[src]');
  for (let i = 0; i < scripts.length; i++) {
    const script = $(scripts[i]);
    const src = script.attr('src');
    if (!src || src.startsWith('data:')) continue;
    
    try {
      const scriptUrl = new URL(src, baseUrl).href;
      const response = await axios.get(scriptUrl, { responseType: 'text', timeout: 5000, headers });
      const scriptTag = $('<script></script>').text(response.data);
      script.replaceWith(scriptTag);
    } catch (error) {
      console.log(`Failed to inline script: ${src}`);
    }
  }
}

router.get('/', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    let html = '';
    let cookieHeader = '';

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
        timeout: 15000,
        maxRedirects: 5
      });
      html = response.data;
    } catch (err) {
      // Fallback: fetch via real browser (Playwright) to obtain HTML + cookies
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
        await page.waitForTimeout(2000);

        const bodyText = await page.textContent('body').catch(() => '');
        if (bodyText && bodyText.includes('Verification Required')) {
          // Still blocked; continue but result may be a challenge page
        }

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

    await inlineResources($, url, resourceHeaders);

    res.setHeader('Content-Type', 'text/html');
    res.send($.html());
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch and inline page',
      details: error.message 
    });
  }
});

export default router;
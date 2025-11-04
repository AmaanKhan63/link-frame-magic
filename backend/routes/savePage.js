import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

async function downloadResource(url, filepath) {
  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': new URL(url).origin
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
  
  try {
    await fs.ensureDir(pageDir);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      timeout: 20000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);
    const baseUrl = url;

    // Download and rewrite CSS
    const styleLinks = $('link[rel="stylesheet"]');
    for (let i = 0; i < styleLinks.length; i++) {
      const link = $(styleLinks[i]);
      const href = link.attr('href');
      if (!href || href.startsWith('data:')) continue;
      
      const cssUrl = new URL(href, baseUrl).href;
      const localPath = `assets/css/${i}.css`;
      const filepath = path.join(pageDir, localPath);
      
      if (await downloadResource(cssUrl, filepath)) {
        link.attr('href', localPath);
      }
    }

    // Download and rewrite images
    const images = $('img[src]');
    for (let i = 0; i < images.length; i++) {
      const img = $(images[i]);
      const src = img.attr('src');
      if (!src || src.startsWith('data:')) continue;
      
      const imgUrl = new URL(src, baseUrl).href;
      const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
      const localPath = `assets/images/${i}${ext}`;
      const filepath = path.join(pageDir, localPath);
      
      if (await downloadResource(imgUrl, filepath)) {
        img.attr('src', localPath);
      }
    }

    // Download and rewrite scripts
    const scripts = $('script[src]');
    for (let i = 0; i < scripts.length; i++) {
      const script = $(scripts[i]);
      const src = script.attr('src');
      if (!src || src.startsWith('data:')) continue;
      
      const scriptUrl = new URL(src, baseUrl).href;
      const localPath = `assets/js/${i}.js`;
      const filepath = path.join(pageDir, localPath);
      
      if (await downloadResource(scriptUrl, filepath)) {
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

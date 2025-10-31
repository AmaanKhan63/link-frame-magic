import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

async function inlineResources($, baseUrl) {
  // Inline CSS
  const styleLinks = $('link[rel="stylesheet"]');
  for (let i = 0; i < styleLinks.length; i++) {
    const link = $(styleLinks[i]);
    const href = link.attr('href');
    if (!href || href.startsWith('data:')) continue;
    
    try {
      const cssUrl = new URL(href, baseUrl).href;
      const response = await axios.get(cssUrl, { responseType: 'text', timeout: 5000 });
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
        headers: { 'User-Agent': 'Mozilla/5.0' }
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
      const response = await axios.get(scriptUrl, { responseType: 'text', timeout: 5000 });
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
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebArchiver/1.0)' },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    await inlineResources($, url);

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

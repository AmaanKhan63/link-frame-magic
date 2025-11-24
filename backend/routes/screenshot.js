import express from "express";
import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { chromium as pwChromium } from "playwright";
import { addExtra } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const chromium = addExtra(pwChromium);
chromium.use(StealthPlugin());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get("/", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  let browser = null;

  try {
    const proxyHost = "brd.superproxy.io";
    const proxyPort = 33335; // Note: Your curl command uses 33335, not 22225
    const proxyUsername = "brd-customer-hl_60496ed9-zone-mobile_proxy1";
    const proxyPassword = "lw73xac7wuk7";
    // The final configuration object
    const proxyConfig = {
      server: `http://${proxyHost}:${proxyPort}`,
      username: proxyUsername,
      password: proxyPassword,
    };

    const headed = req.query.headed === "1";
    browser = await chromium.launch({
      headless: !headed,
      proxy: proxyConfig,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    const width = 1280 + Math.floor(Math.random() * 100);
    const height = 720 + Math.floor(Math.random() * 100);

    const context = await browser.newContext({
      viewport: { width, height },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "en-US",
      timezoneId: "America/New_York",
      permissions: ["geolocation"],
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "sec-ch-ua":
          '"Chromium";v="120", "Google Chrome";v="120", "Not:A-Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
      },
      ignoreHTTPSErrors: true,
    });

    // Add stealth scripts
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    const page = await context.newPage();

    // Navigate with longer timeout and better wait strategy
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    // Wait for page to be interactive
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
      console.log("Network not idle, proceeding anyway");
    });

    // If a bot challenge is detected, wait a bit longer
    const bodyText = await page.textContent("body").catch(() => "");
    if (
      bodyText &&
      /verify|checking your browser|just a moment/i.test(bodyText)
    ) {
      await page.waitForTimeout(6000);
    }

    // Additional wait to ensure dynamic content loads
    await page.waitForTimeout(2000);

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
      type: "png",
    });

    await browser.close();
    browser = null;

    const id = uuidv4();
    const snapshotsDir = path.join(__dirname, "..", "snapshots");
    await fs.ensureDir(snapshotsDir);

    const filename = `${id}.png`;
    const filepath = path.join(snapshotsDir, filename);
    await fs.writeFile(filepath, screenshotBuffer);

    res.json({
      success: true,
      imageUrl: `/snapshots/${filename}`,
      base64: `data:image/png;base64,${screenshotBuffer.toString("base64")}`,
    });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({
      error: "Failed to capture screenshot",
      details: error.message,
    });
  }
});

export default router;

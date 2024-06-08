// docker run -it -p 6379:6379 eqalpha/keydb keydb-server /etc/keydb/keydb.conf --appendonly yes
import puppeteer, { Page } from "puppeteer";
import { setTimeout } from "timers/promises";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import "dotenv/config";

const connection = new Redis(process.env.REDIS_PATH, {
  maxRetriesPerRequest: null,
});

const db = new Low(new JSONFile("ecommerce.json"), {});
await db.read();

const saveToDB = async (id, prductData) => {
  db.data[id] = prductData;
  await db.write();
};

const browser = await puppeteer.launch({
  headless: false,
  userDataDir: "/temp/ecommerce-crawler",
});

const page = await browser.newPage();

await page.goto("https://www.studioneat.com", { waitUntil: "networkidle2" });
await page.waitForSelector(".product-title a");
const productLinks = await page.evaluate(() => {
  return [...document.querySelectorAll(".product-title a")].map((e) => e.href);
});

console.log(productLinks);
await page.close();
// await browser.close()

const myQueue = new Queue("product", { connection });

for (let productLink of productLinks) {
  myQueue.add(
    productLink, 
    { url: productLink }, 
    { jobId: productLink }
  );
}

/**
 * @param {Page} page
 * @param {String} selector
 */

const extractText = (page, selector) => {
  return page.evaluate((selector) => {
    return document.querySelector(selector)?.innerHTML;
  }, selector);
};

new Worker(
  "product",
  async (job) => {
    const productLink = job.data.url;
    console.log(productLink);

    const page = await browser.newPage();
    await page.goto(productLink, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForSelector(".ecomm-container h1");

    const title = await extractText(page, ".ecomm-container h1");
    const tagline = await extractText(page, ".product-tagline");
    const price = await extractText(page, "#productPrice");
    const description = await extractText(page, ".product-desc");

    const variants = await page.evaluate(() => {
      return [...document.querySelectorAll(".single-option-selector option")].map((e) => e.value);
    });

    const variantData = [];

    for (const variant of variants) {
      await page.select(".single-option-selector", variant);
      await setTimeout(100);
      // await page.$eval('#productPrice', e=>e.innerHTML)
      variantData.push({
        variant,
        price: await extractText(page, "#productPrice"),
      });
    }
    await saveToDB(productLink, {
      title,
      tagline,
      price,
      description,
      variantData,
    });
    await page.close();
  },
  { connection }
);



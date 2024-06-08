import puppeteer, { Page } from "puppeteer";

const browser = await puppeteer.launch({ headless: false, userDataDir: '/tmp/ecommerce-crawler' });
const page = await browser.newPage();

await page.goto("https://www.studioneat.com", { waitUntil: "networkidle0" });
await page.waitForSelector(".product-title a");
const productLinks = await page.evaluate(() => {
  return [...document.querySelectorAll(".product-title a")].map((e) => e.href);
});

console.log(productLinks);
await page.close();
// await browser.close()

/**
 * @param {Page} page
 * @param {String} selector
 */

const extractText = (page, selector) => {
  return page.evaluate((selector) => {
    return document.querySelector(selector)?.innerHTML;
  },selector);
};

for (let productLink of productLinks) {
  const page = await browser.newPage();
  await page.goto(productLink, { waitUntil: "networkidle0" });
  await page.waitForSelector(".ecomm-container h1");

  const title = await extractText(page, ".ecomm-container h1")
  const tagline = await extractText(page, ".product-tagline")
  const price = await extractText(page, "#productPrice");
  const description = await extractText(page, ".product-desc");

  console.log({productLink, title, tagline, price, description});
  await page.close();
}

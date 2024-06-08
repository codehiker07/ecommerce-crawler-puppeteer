import puppeteer from "puppeteer";

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

await page.goto("https://www.studioneat.com", { waitUntil: "networkidle0" });
await page.waitForSelector(".product-title a");
const productLinks = await page.evaluate(() => {
  return [...document.querySelectorAll(".product-title a")].map((e) => e.href);
});

console.log(productLinks);
await page.close();
// await browser.close()

for (let productLink of productLinks) {
  const page = await browser.newPage();
  await page.goto(productLink, { waitUntil: "networkidle0" });
  await page.waitForSelector(".ecomm-container h1");

  const title = await page.evaluate(() => {
    return document.querySelector(".ecomm-container h1")?.innerHTML;
  });

  const tagline = await page.evaluate(() => {
    return document.querySelector(".product-tagline")?.innerHTML;
  });
  console.log(productLink, title, tagline);
  await page.close();
}

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://google.pl');
  await page.screenshot({ path: 'screenshot.png' });
  console.log('Screenshot saved!');
  await browser.close();
})();


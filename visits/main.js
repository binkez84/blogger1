const { chromium } = require('playwright');
const { getBlogs, closeConnection } = require('./db');
const { scrollToBottom, scrollToTop, moveMouse } = require('./utils');

function getRandomCoordinates(page) {
  return page.evaluate(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
    };
  });
}

(async () => {
  try {
    const blogs = await getBlogs();
    console.log('Pobrano listę blogów:', blogs);

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const blog of blogs) {
      console.log(`Otwieranie URL: ${blog.url}`);
      await page.goto(blog.url);

      await scrollToBottom(page);

      const { x, y } = await getRandomCoordinates(page);
      await moveMouse(page, x, y);

      await scrollToTop(page);

      await page.waitForTimeout(3000);
    }

    await browser.close();
    console.log('Przeglądarka zamknięta.');

  } catch (error) {
    console.error('Wystąpił błąd:', error.message);
  } finally {
    // Zamknij połączenie z bazą danych
    await closeConnection();
    console.log('Skrypt zakończony.');
  }
})();


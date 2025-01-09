// utils.js

async function clickElement(page, selector) {
  await page.click(selector);
  console.log(`Kliknięto element: ${selector}`);
}

async function moveMouse(page, x, y) {
  await page.mouse.move(x, y);
  console.log(`Przesunięto mysz na pozycję: (${x}, ${y})`);
}

async function scrollToBottom(page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  console.log('Przewinięto stronę na dół.');
}

async function scrollToTop(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  console.log('Przewinięto stronę do góry.');
}

// Eksport funkcji
module.exports = {
  clickElement,
  moveMouse,
  scrollToBottom,
  scrollToTop,
};


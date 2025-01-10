/**
 * Funkcja otwierająca stronę przez bezpośrednie wpisanie URL do przeglądarki.
 * @param {string} url - Adres URL strony, którą chcesz otworzyć.
 * @param {Object} [options] - Opcje dla przeglądarki.
 * @returns {Promise<Object>} - Zwraca przeglądarkę i stronę.
 */
async function openPageByUrl(url, options = {}) {
    // Uruchamianie przeglądarki
    const browser = await chromium.launch({ headless: true, ...options });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Otwieranie strony
    console.log(`Otwieranie URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    // Zwracanie instancji przeglądarki i strony
    return { browser, page };
}


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



async function getCurrentContent(page) {
  const content = await page.content();
  console.log('Pobrano treść strony.');
  return content;
}

// Eksport funkcji
module.exports = {
  clickElement,
  moveMouse,
  scrollToBottom,
  scrollToTop,
  getCurrentLocation,
  isDesktop,
  getCurrentContent,
  openPageByUrl,
};



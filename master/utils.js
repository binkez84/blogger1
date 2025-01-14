// Funkcja: Przesuń myszkę na znaleziony link i kliknij
async function moveAndClickOnLink(page, url, bodySelector1, bodySelector2) {
  try {
    const selectors = [bodySelector1, bodySelector2];
    let targetLink = null;

    for (const selector of selectors) {
      // Pobierz wszystkie linki w danej sekcji
      const links = await page.$$(selector + ' a');
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href === url) {
          targetLink = link;
          break;
        }
      }
      if (targetLink) break;
    }

    if (targetLink) {
      // Przesuń myszkę na znaleziony link
      const boundingBox = await targetLink.boundingBox();
      if (boundingBox) {
        await page.mouse.move(
          boundingBox.x + boundingBox.width / 2,
          boundingBox.y + boundingBox.height / 2,
          { steps: 10 } // Płynny ruch myszy
        );
        // Kliknij link
        await targetLink.click();
        console.log(`Kliknięto link: ${url}`);
      } else {
        throw new Error('Nie znaleziono bounding box dla linka.');
      }
    } else {
      throw new Error(`Nie znaleziono linka z URL: ${url} w podanych sekcjach.`);
    }
  } catch (error) {
    console.error(`Błąd podczas przesuwania myszy: ${error.message}`);
  }
}










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
  getCurrentContent,
  openPageByUrl,
  
  moveAndClickOnLink,
};




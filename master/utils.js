async function moveAndClickOnLink(page, url, bodySelector1, bodySelector2) {
  try {
    const selectors = [bodySelector1, bodySelector2];
    let targetLink = null;

    // Szukaj linka w podanych sekcjach
    for (const selector of selectors) {
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
          { steps: 10 }
        );

        // Usuń atrybut target, aby wymusić otwarcie w tej samej karcie
        await page.evaluate((link) => {
          link.removeAttribute('target');
        }, targetLink);

        // Przygotuj monitorowanie różnych scenariuszy
        const previousUrl = page.url();
        const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);
        const urlChangePromise = page.waitForURL((newUrl) => newUrl !== previousUrl, { timeout: 5000 }).catch(() => null);
        const newPagePromise = page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);

        // Kliknij link
        await targetLink.click();
        console.log(`Kliknięto link: ${url}`);

        // Dodaj opóźnienie, aby strona mogła zareagować
        await page.waitForTimeout(4000); // Czekaj 3 sekundy na reakcję strony


        // Sprawdź, co się wydarzyło po kliknięciu
        const [navigation, urlChange, newPage] = await Promise.all([
          navigationPromise,
          urlChangePromise,
          newPagePromise,
        ]);

        if (newPage) {
          // Nowa karta została otwarta
          await newPage.waitForLoadState();
          console.log('Otwarta została nowa karta z URL:', newPage.url());
        } else if (navigation) {
          // Strona została przeładowana w tej samej karcie
          console.log('Strona została przeładowana na:', page.url());
        } else if (urlChange) {
          // URL zmienił się w tej samej karcie
          console.log('URL zmienił się na:', page.url());
        } else {
          // Żadna zmiana nie nastąpiła
          console.log('Żadna zmiana nie nastąpiła po kliknięciu.');
        }
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




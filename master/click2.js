const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 }, // iPhone X
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Mobile Safari/537.36'
    });

    const page = await context.newPage();
    await page.goto('https://ptasiejajo.blogspot.com/?m=1');

    await page.waitForTimeout(4000); // Czeka 4 sekundy

    // Pobiera linki z głównej strony
    const mainLinks = await page.$$eval('a', elements => elements.map(el => el.href));

    // Pobiera wszystkie iframe'y
    const iframes = page.frames();
    let iframeLinks = [];

    for (const frame of iframes) {
        try {
            const links = await frame.$$eval('a', elements => elements.map(el => el.href));
            iframeLinks = iframeLinks.concat(links);
        } catch (error) {
            console.error('Błąd przy pobieraniu linków z iframe:', error);
        }
    }

    // Połączenie linków z głównej strony i iframe'ów
    const allLinks = [...mainLinks, ...iframeLinks];

    console.log('Znalezione linki:', allLinks);

    await page.screenshot({ path: 'screenshot.png', fullPage: true });

    await browser.close();
})();


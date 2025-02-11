const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 }, // iPhone X
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Mobile Safari/537.36',
        hasTouch: true // Włącza symulację dotyku!
    });

    const page = await context.newPage();
    await page.goto('https://ptasiejajo.blogspot.com/?m=1');

    await page.waitForTimeout(4000);

    // Pobiera pierwszy link na stronie
    const firstLink = await page.$('a');
    if (firstLink) {
        console.log('Klikam pierwszy link dotykiem...');
        await firstLink.tap(); // Symuluje dotknięcie ekranu na linku
    } else {
        console.log('Brak linków na stronie.');
    }

    await page.waitForTimeout(3000); // Czeka, by zobaczyć efekt
    await page.screenshot({ path: 'after_tap.png', fullPage: true });

    await browser.close();
})();


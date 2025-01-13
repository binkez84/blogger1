const { chromium, firefox, webkit } = require('playwright');
const { getBlogs,getRandomBlog, closeConnection } = require('./db');
const { restartTor,randomBrowserType, randomUserAgent } = require('./browser');
const { execSync } = require('child_process');
//const aiModule = require('./aiModule'); // Moduł AI odpowiedzialny za decyzje




(async () => {
	
		
	try {
		const randomBlog = await getRandomBlog();
		console.log('Wylosowany blog:', randomBlog.url);
		
		
        let browser, context, page;		
		
		
        try {
			
			await restartTor();
			const browserType = await randomBrowserType();
			const userAgent = await randomUserAgent();
			
			console.log(`Wylosowano: ${browserType.name} i userAgent: ${userAgent}`);
			
			
            // Inicjalizacja przeglądarki
            browser = await browserType.type.launch({
                headless: false,
                proxy: { server: 'socks5://127.0.0.1:9050' }
            });
            context = await browser.newContext({
                userAgent: userAgent,
                viewport: { width: 1920, height: 1080 }
            });
            page = await context.newPage();

            // Otwieranie strony bloga
            await page.goto(randomBlog.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log(`Załadowano stronę bloga ID: ${randomBlog.id} , url: ${randomBlog.url}` );


        } catch (error) {
            console.error(`Błąd podczas przetwarzania bloga ID: ${randomBlog.id}:`, error.message);
        } finally {
            // Zamknięcie zasobów w finally
            if (page) await page.close();
            if (context) await context.close();
            if (browser) await browser.close();

			// Zakończenie przeglądania
			console.log('Zamykamy przeglądarkę...');
        }		
		
		
		
		
		
		
		
		
		
		
	} catch (error) {
		console.error('Błąd:', error.message);
	} finally {
		// Zamknij połączenie z bazą danych
		await closeConnection();
		console.log('Skrypt zakończony.');
  }



   
})();


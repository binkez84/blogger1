const { chromium, firefox, webkit } = require('playwright');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

// Lista User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
];

(async () => {
    // Konfiguracja bazy danych
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    };

    const connection = await mysql.createConnection(dbConfig);
    const [blogs] = await connection.execute('SELECT id, url FROM Blogs');
    console.log(`Znaleziono ${blogs.length} blogów do przetworzenia.`);

    const getRandomBrowser = () => [chromium, firefox, webkit][Math.floor(Math.random() * 3)];
    const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

    for (const blog of blogs) {
        const { id: blogId, url: blogUrl } = blog;
        console.log(`Przetwarzanie bloga ID: ${blogId}, URL: ${blogUrl}`);

        // Restart Tor
        try {
            console.log('Restartowanie Tor...');
            execSync('sudo systemctl restart tor');
            console.log('Tor zrestartowany pomyślnie.');
        } catch (error) {
            console.error('Błąd podczas restartowania Tor:', error.message);
            continue;
        }

        const browserType = getRandomBrowser();
        const userAgent = getRandomUserAgent();
        let browser, context;

        try {
            // Uruchomienie przeglądarki
            console.log(`Uruchamianie przeglądarki (${browserType.name}) z User-Agent: ${userAgent}`);
            browser = await browserType.launch({
                headless: true,
                proxy: { server: 'socks5://127.0.0.1:9050' }
            });

            context = await browser.newContext({
                userAgent: userAgent,
                viewport: { width: 1920, height: 1080 },
                locale: 'pl-PL',
                timezoneId: 'Europe/Warsaw'
            });

            const page = await context.newPage();

            try {
                // Otwórz stronę bloga
                console.log(`Otwieranie strony: ${blogUrl}`);
                await page.goto(blogUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                console.log('Strona załadowana pomyślnie.');

                // Dodatkowy czas na załadowanie dynamicznych treści
                await page.waitForTimeout(3000);

                // Pobierz strony z menu
                console.log('Pobieranie linków z menu...');
                const pages = await page.evaluate(() => {
                    const pageLists = document.querySelectorAll('#PageList1, #PageList2');
                    const allLinks = [];
                    pageLists.forEach(list => {
                        list.querySelectorAll('a').forEach(link => {
                            allLinks.push({
                                title: link.textContent.trim(),
                                url: link.href
                            });
                        });
                    });
                    return allLinks;
                });

                console.log(`Pobrano ${pages.length} stron dla bloga ID: ${blogId}`);

                // Iteracja przez strony
                for (const pageData of pages) {
                    const [existingPage] = await connection.execute(
                        'SELECT id FROM Pages WHERE blog_id = ? AND url = ? LIMIT 1',
                        [blogId, pageData.url]
                    );

                    if (existingPage.length > 0) {
                        console.log(`Strona już istnieje: ${pageData.title}`);
                        continue;
                    }

                    const mobileUrl = pageData.url.includes('?') ? `${pageData.url}&m=1` : `${pageData.url}?m=1`;

                    try {
                        await connection.execute(
                            'INSERT INTO Pages (blog_id, url, title, mobile_url) VALUES (?, ?, ?, ?)',
                            [blogId, pageData.url, pageData.title, mobileUrl]
                        );
                        console.log(`Zapisano nową stronę: ${pageData.title}`);
                    } catch (error) {
                        console.error(`Błąd zapisu strony "${pageData.title}":`, error.message);
                    }
                }
            } catch (error) {
                console.error(`Błąd podczas przetwarzania bloga ID: ${blogId}:`, error.message);
            } finally {
                // Zamknij stronę
                if (page) await page.close();
            }
        } catch (error) {
            console.error(`Błąd z przeglądarką dla bloga ID: ${blogId}:`, error.message);
        } finally {
            // Zamknięcie przeglądarki i kontekstu
            if (context) await context.close();
            if (browser) await browser.close();
            console.log('Przeglądarka zamknięta.');
        }
    }

    await connection.end();
    console.log('Połączenie z bazą danych zakończone.');
})();


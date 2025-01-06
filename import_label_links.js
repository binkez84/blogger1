const { chromium, firefox, webkit } = require('playwright');
const mysql = require('mysql2/promise');

(async () => {
    // Połącz z bazą danych
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    });

    console.log('Połączono z bazą danych.');

    // Pobierz wszystkie blogi z tabeli Blogs
    const [blogs] = await connection.execute('SELECT id, url FROM Blogs');

    if (!blogs.length) {
        console.log('Brak blogów do przetworzenia.');
        await connection.end();
        return;
    }

        // Start Playwright
    //const browser = await chromium.launch();
    const browser = await firefox.launch({ headless: false }); // Dla Firefox
    //const browser = await webkit.launch(); // Dla WebKit
   const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    platform: 'Win32',
    permissions: ['geolocation'], // Jeśli serwis sprawdza lokalizację
    javaScriptEnabled: true,
  });

  // Przedefiniowanie `navigator` w środowisku przeglądarki
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'oscpu', { get: () => 'Windows NT 10.0; Win64; x64' });
    Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0' });
  });

    for (const blog of blogs) {
        console.log(`Przetwarzam blog: ${blog.url}`);

        const page = await browser.newPage();

        try {
            // Otwórz stronę bloga
            await page.goto(blog.url, { waitUntil: 'domcontentloaded' });

            // Pobierz linki z sekcji Label1 lub Label2
            const links = await page.evaluate(() => {
                const containers = [
                    document.getElementById('Label1'),
                    document.getElementById('Label2')
                ].filter(Boolean); // Filtruje null, jeśli element nie istnieje

                const extractedLinks = [];
                containers.forEach(container => {
                    const anchors = container.querySelectorAll('a');
                    anchors.forEach(anchor => {
                        extractedLinks.push({
                            url: anchor.href.trim(),
                            title: anchor.textContent.trim()
                        });
                    });
                });

                return extractedLinks
                    .filter(link =>
                        link.url && // Wyklucz puste URL-e
                        !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(link.url) // Wyklucz obrazki
                    );
            });

            if (!links.length) {
                console.log(`Brak linków w Label1/Label2 na blogu: ${blog.url}`);
                continue;
            }

            // Normalizuj URL-e (usuń fragmenty #...)
            const normalizeUrl = (url) => {
                try {
                    const parsedUrl = new URL(url);
                    parsedUrl.hash = ''; // Usuń fragment
                    return parsedUrl.toString();
                } catch (error) {
                    console.error(`Błąd normalizacji URL: ${url}`, error);
                    return url;
                }
            };

            // Wyodrębnij domenę główną bloga
            const blogBaseUrl = new URL(blog.url).origin;

            // Filtruj duplikaty lokalnie
            const uniqueLinks = links
                .map(link => ({
                    ...link,
                    normalizedUrl: normalizeUrl(link.url) // Dodaj znormalizowany URL
                }))
                .filter((link, index, self) =>
                    index === self.findIndex(l => l.normalizedUrl === link.normalizedUrl)
                );

            // Dodaj typ linku i wstaw do tabeli Label_links
            for (const link of uniqueLinks) {
                const normalizedUrl = link.normalizedUrl;

                let type;
                if (normalizedUrl.startsWith(blogBaseUrl)) {
                    type = 'internal'; // Link wewnętrzny
                } else if (normalizedUrl.includes('blogspot.com')) {
                    type = 'external_inblogger'; // Link do innego bloga Blogger
                } else {
                    type = 'external_outblogger'; // Link spoza Bloggera
                }

                if (normalizedUrl.length > 255) {
                    console.warn(`Pominięto zbyt długi URL: ${normalizedUrl}`);
                    continue;
                }

                try {
                    // Sprawdź, czy wpis już istnieje w bazie danych
                    const [rows] = await connection.execute(
                        'SELECT COUNT(*) as count FROM Label_links WHERE blog_id = ? AND url = ?',
                        [blog.id, normalizedUrl]
                    );

                    if (rows[0].count === 0) {
                        // Jeśli nie istnieje, wstaw nowy rekord
                        await connection.execute(
                            'INSERT INTO Label_links (blog_id, url, title, type) VALUES (?, ?, ?, ?)',
                            [blog.id, normalizedUrl, link.title, type]
                        );
                        console.log(`Dodano link: ${link.title} (${normalizedUrl}) [${type}]`);
                    } else {
                        console.log(`Pominięto duplikat: ${link.title} (${normalizedUrl})`);
                    }
                } catch (error) {
                    console.error(`Nie udało się dodać linku: ${link.title} (${normalizedUrl})`, error);
                }
            }
        } catch (error) {
            console.error(`Błąd podczas przetwarzania bloga: ${blog.url}`, error);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    await connection.end();
    console.log('Przetwarzanie zakończone.');
})();


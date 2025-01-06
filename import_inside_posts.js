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

    // Pobierz wszystkie posty z tabeli Posts
    const [posts] = await connection.execute('SELECT id, blog_id, url FROM Posts');

    if (!posts.length) {
        console.log('Brak postów do przetworzenia.');
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

    for (const post of posts) {
        console.log(`Przetwarzam post: ${post.url}`);

        const page = await browser.newPage();

        try {
            // Otwórz stronę posta
            await page.goto(post.url, { waitUntil: 'domcontentloaded' });

            // Pobierz linki z sekcji class="post-body", wykluczając linki do obrazków i linki z pustym URL-em
            const links = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('.post-body a'));
                return anchors
                    .map(anchor => ({
                        url: anchor.href.trim(),
                        title: anchor.textContent.trim()
                    }))
                    .filter(link => 
                        link.url && // Wyklucz puste URL-e
                        !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(link.url) // Wyklucz linki do obrazków
                    );
            });

            if (!links.length) {
                console.log(`Brak linków w sekcji "post-body" dla posta: ${post.url}`);
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
            const blogBaseUrl = new URL(post.url).origin;

            // Filtruj duplikaty lokalnie
            const uniqueLinks = links
                .map(link => ({
                    ...link,
                    normalizedUrl: normalizeUrl(link.url) // Dodaj znormalizowany URL
                }))
                .filter((link, index, self) =>
                    index === self.findIndex(l => l.normalizedUrl === link.normalizedUrl)
                );

            // Dodaj typ linku i wstaw do tabeli Inside_posts
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

                // Sprawdzanie, czy link już istnieje w tabeli Inside_posts
                const [rows] = await connection.execute(
                    'SELECT COUNT(*) as count FROM Inside_posts WHERE blog_id = ? AND post_id = ? AND url = ?',
                    [post.blog_id, post.id, normalizedUrl]
                );

                // Jeśli count jest 0, to znaczy, że linka jeszcze nie ma w tabeli
                if (rows[0].count === 0) {
                    try {
                        await connection.execute(
                            'INSERT INTO Inside_posts (blog_id, post_id, url, title, type) VALUES (?, ?, ?, ?, ?)',
                            [post.blog_id, post.id, normalizedUrl, link.title, type]
                        );
                        console.log(`Dodano link: ${link.title} (${normalizedUrl}) [${type}]`);
                    } catch (error) {
                        console.error(`Nie udało się dodać linku: ${link.title} (${normalizedUrl})`, error);
                    }
                } else {
                    console.log(`Pominięto duplikat: ${link.title} (${normalizedUrl})`);
                }
            }
        } catch (error) {
            console.error(`Błąd podczas przetwarzania posta: ${post.url}`, error);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    await connection.end();
    console.log('Przetwarzanie zakończone.');
})();


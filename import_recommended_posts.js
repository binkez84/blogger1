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

            // Pobierz linki z id="FeaturedPost1" lub id="FeaturedPost2"
            const recommendedPosts = await page.evaluate(() => {
                const containers = [
                    document.getElementById('FeaturedPost1'),
                    document.getElementById('FeaturedPost2')
                ].filter(Boolean); // Filtruje null, jeśli element nie istnieje

                const links = [];
                containers.forEach(container => {
                    const anchorTags = container.querySelectorAll('a');
                    anchorTags.forEach(anchor => {
                        links.push({
                            url: anchor.href,
                            title: anchor.textContent.trim()
                        });
                    });
                });

                return links;
            });

            if (recommendedPosts.length === 0) {
                console.log(`Brak polecanych postów dla bloga: ${blog.url}`);
                continue;
            }

            // Usuń istniejące wpisy w bazie danych dla tego bloga
            await connection.execute('DELETE FROM Recommended_posts WHERE blog_id = ?', [blog.id]);

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

            // Filtruj duplikaty lokalnie
            const uniquePosts = recommendedPosts
                .map(post => ({
                    ...post,
                    normalizedUrl: normalizeUrl(post.url) // Dodaj znormalizowany URL
                }))
                .filter((post, index, self) =>
                    index === self.findIndex(p => p.normalizedUrl === post.normalizedUrl)
                );

            // Wstaw unikalne polecane posty do bazy danych
            for (const post of uniquePosts) {
                if (post.url.length > 2048) { // Opcjonalne zabezpieczenie przed długimi URL-ami
                    console.warn(`Pominięto zbyt długi URL: ${post.url}`);
                    continue;
                }

                try {
                    await connection.execute(
                        'INSERT INTO Recommended_posts (blog_id, url, title) VALUES (?, ?, ?)',
                        [blog.id, post.url, post.title]
                    );
                    console.log(`Dodano polecany post: ${post.title} (${post.url})`);
                } catch (error) {
                    console.error(`Nie udało się dodać postu: ${post.title} (${post.url})`, error);
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



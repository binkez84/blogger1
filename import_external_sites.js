const { chromium, firefox, webkit } = require('playwright');
const mysql = require('mysql2/promise');
const { exec } = require('child_process');

// Funkcja do restartowania TOR
async function restartTor() {
    return new Promise((resolve, reject) => {
        exec('sudo systemctl restart tor', (error, stdout, stderr) => {
            if (error) {
                console.error('Błąd restartu TOR:', stderr);
                reject(error);
            } else {
                console.log('TOR został zrestartowany.');
                resolve(stdout);
            }
        });
    });
}

// Funkcja do normalizacji URL
function normalizeUrl(url) {
    try {
        const parsedUrl = new URL(url);
        parsedUrl.hash = ''; // Usuń fragment #...
        return parsedUrl.toString();
    } catch (error) {
        console.error(`Błąd normalizacji URL: ${url}`, error);
        return url;
    }
}

// Losowanie przeglądarki
function getRandomBrowser() {
    const browsers = [chromium, firefox, webkit];
    return browsers[Math.floor(Math.random() * browsers.length)];
}

(async () => {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database',
    });

    console.log('Połączono z bazą danych.');

    // Pobierz wszystkie blogi
    const [blogs] = await connection.execute('SELECT id, url FROM Blogs');

    if (!blogs.length) {
        console.log('Brak blogów do przetworzenia.');
        await connection.end();
        return;
    }

    for (const blog of blogs) {
        console.log(`Przetwarzam blog: ${blog.url}`);

        await restartTor(); // Restart TOR

        const browserType = getRandomBrowser();
        const browser = await browserType.launch({
            headless: false,
            proxy: {
                server: 'socks5://127.0.0.1:9050', // TOR proxy
            },
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
        });

        const page = await context.newPage();

        try {
            // Otwórz stronę bloga
            await page.goto(blog.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Pobierz linki z sekcji LinkList1 i LinkList2
            const links = await page.evaluate(() => {
                const containers = [
                    document.getElementById('LinkList1'),
                    document.getElementById('LinkList2'),
                ].filter(Boolean);

                const extractedLinks = [];
                containers.forEach((container) => {
                    const anchors = container.querySelectorAll('a');
                    anchors.forEach((anchor) => {
                        extractedLinks.push({
                            url: anchor.href.trim(),
                            title: anchor.textContent.trim(),
                        });
                    });
                });

                return extractedLinks.filter((link) => link.url && link.title); // Wyklucz puste linki i tytuły
            });

            if (!links.length) {
                console.log(`Brak linków w LinkList1/LinkList2 na blogu: ${blog.url}`);
                continue;
            }

            const blogBaseUrl = new URL(blog.url).origin;

            const uniqueLinks = links
                .map((link) => ({
                    ...link,
                    normalizedUrl: normalizeUrl(link.url),
                    mobileUrl: `${link.url}?m=1`, // Dodanie mobile_url
                }))
                .filter((link, index, self) =>
                    index === self.findIndex((l) => l.normalizedUrl === link.normalizedUrl)
                );

            for (const link of uniqueLinks) {
                const normalizedUrl = link.normalizedUrl;

                let type;
                if (normalizedUrl.startsWith(blogBaseUrl)) {
                    type = 'internal';
                } else if (normalizedUrl.includes('blogspot.com')) {
                    type = 'external_inblogger';
                } else {
                    type = 'external_outblogger';
                }

                if (normalizedUrl.length > 255) {
                    console.warn(`Pominięto zbyt długi URL: ${normalizedUrl}`);
                    continue;
                }

                try {
                    const [rows] = await connection.execute(
                        'SELECT COUNT(*) as count FROM External_sites WHERE blog_id = ? AND url = ?',
                        [blog.id, normalizedUrl]
                    );

                    if (rows[0].count === 0) {
                        await connection.execute(
                            'INSERT INTO External_sites (blog_id, url, mobile_url, title, type) VALUES (?, ?, ?, ?, ?)',
                            [blog.id, normalizedUrl, link.mobileUrl, link.title, type]
                        );
                        console.log(`Dodano link: ${link.title} (${normalizedUrl}) [${type}]`);
                    } else {
                        console.log(`Pominięto duplikat: ${link.title} (${normalizedUrl})`);
                    }
                } catch (error) {
                    console.error(`Błąd podczas zapisywania linku: ${link.title} (${normalizedUrl})`, error);
                }
            }
        } catch (error) {
            console.error(`Błąd podczas przetwarzania bloga: ${blog.url}`, error);
        } finally {
            await page.close();
            await browser.close();
        }
    }

    await connection.end();
    console.log('Przetwarzanie zakończone.');
})();


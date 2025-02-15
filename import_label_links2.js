const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { execSync } = require('child_process');
const fs = require('fs');

// Lista User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
];

// Restart Tora
const lockfile = '/tmp/tor_restart.lock';

const restartTor = () => {
    try {
        if (fs.existsSync(lockfile)) {
            console.log('Tor jest już restartowany.');
            return;
        }

        fs.writeFileSync(lockfile, '');
        console.log("Restartowanie Tora...");
        execSync('sudo systemctl restart tor');
        console.log("Tor został zrestartowany.");
    } catch (error) {
        console.error("Błąd podczas restartowania Tora:", error.message);
    } finally {
        fs.unlinkSync(lockfile);
    }
};

(async () => {
    let connection;
    try {
        // Połącz z bazą danych
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Blogger123!',
            database: 'blog_database'
        });

        console.log('Połączono z bazą danych.');

        // Wpisz start skryptu
        const scriptName = path.basename(__filename);

        // Sprawdzenie, czy rekord już istnieje
        const [rows] = await connection.execute(
            `SELECT 1 FROM Active_scripts WHERE script_name = ?`,
            [scriptName]
        );

        if (rows.length > 0) {
            // Jeśli istnieje, aktualizujemy czas
            await connection.execute(
                `UPDATE Active_scripts SET last_datetime = NOW() WHERE script_name = ? `,
                [scriptName]
            );
            console.log(`Zaktualizowano czas uruchomienia (start) dla skryptu: ${scriptName} - ${new Date().toISOString()}`);
        } else {
            // Jeśli nie istnieje, wstawiamy nowy rekord
            await connection.execute(
                `INSERT INTO Active_scripts (script_name, last_datetime) VALUES (?, NOW())`,
                [scriptName]
            );
            console.log(`Dodano nowy wpis (start) dla skryptu: ${scriptName}`);
        }

        // Pobierz wszystkie blogi z tabeli Blogs
        const [blogs] = await connection.execute('SELECT id, url FROM Blogs');

        if (!blogs.length) {
            console.log('Brak blogów do przetworzenia.');
            await connection.end();
            return;
        }

        for (const blog of blogs) {
            restartTor();

            const { id: blogId, url: blogUrl } = blog;
            console.log(`Przetwarzanie bloga ID: ${blogId}, URL: ${blogUrl}`);

            // Losuj przeglądarkę i User-Agent
            const browserType = [chromium, firefox, webkit][Math.floor(Math.random() * 3)];
            const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

            let browser, context, page;

            try {
                // Inicjalizacja przeglądarki
                browser = await browserType.launch({
                    headless: false,
                    proxy: { server: 'socks5://127.0.0.1:9053' }
                });
                context = await browser.newContext({
                    userAgent: userAgent,
                    viewport: { width: 1920, height: 1080 },
                    locale: 'pl-PL',
                    timezoneId: 'Europe/Warsaw'
                });
                page = await context.newPage();

                // Otwórz stronę bloga
                await page.goto(blogUrl, { waitUntil: 'domcontentloaded' });

                // Pobierz linki z sekcji Label1 lub Label2
                const links = await page.evaluate(() => {
                    const containers = [
                        document.getElementById('Label1'),
                        document.getElementById('Label2')
                    ].filter(Boolean);

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

                    return extractedLinks.filter(link => link.url && link.title); // Filtruj puste URL i tytuły
                });

                console.log(`Liczba znalezionych linków: ${links.length}`);

                if (!links.length) continue;

                const normalizeUrl = (url) => {
                    try {
                        const parsedUrl = new URL(url);
                        parsedUrl.hash = '';
                        return parsedUrl.toString();
                    } catch (error) {
                        console.error(`Błąd normalizacji URL: ${url}`, error);
                        return url;
                    }
                };

                const uniqueLinks = links
                    .map(link => ({
                        ...link,
                        normalizedUrl: normalizeUrl(link.url),
                        mobileUrl: normalizeUrl(link.url) + '?m=1' // Dodaj ?m=1 do wersji mobilnej
                    }))
                    .filter((link, index, self) =>
                        index === self.findIndex(l => l.normalizedUrl === link.normalizedUrl)
                    );

                for (const link of uniqueLinks) {
                    const { normalizedUrl, mobileUrl, title } = link;

                    let type;
                    if (normalizedUrl.startsWith(new URL(blogUrl).origin)) {
                        type = 'internal';
                    } else if (normalizedUrl.includes('blogspot.com')) {
                        type = 'external_inblogger';
                    } else {
                        type = 'external_outblogger';
                    }

                    if (normalizedUrl.length > 255 || title.length > 255) {
                        console.warn(`Pominięto zbyt długi URL lub tytuł: ${normalizedUrl}`);
                        continue;
                    }

                    const [rows] = await connection.execute(
                        'SELECT COUNT(*) as count FROM Label_links WHERE blog_id = ? AND url = ?',
                        [blogId, normalizedUrl]
                    );

                    if (rows[0].count === 0) {
                        await connection.execute(
                            'INSERT INTO Label_links (blog_id, url, mobile_url, title, type) VALUES (?, ?, ?, ?, ?)',
                            [blogId, normalizedUrl, mobileUrl, title, type]
                        );
                        console.log(`Dodano link: ${title} (${normalizedUrl}) [${type}]`);
                    } else {
                        console.log(`Pominięto duplikat: ${title} (${normalizedUrl})`);
                    }
                }
            } catch (error) {
                console.error(`Błąd podczas przetwarzania bloga: ${blogUrl}`, error);
            } finally {
                if (page) await page.close();
                if (context) await context.close();
                if (browser) await browser.close();
            }
        }

        // Zapisz zakończenie skryptu
        const [r] = await connection.execute(
            `SELECT 1 FROM Active_scripts WHERE script_name = ?`,
            [scriptName]
        );

        if (r.length > 0) {
            await connection.execute(
                `UPDATE Active_scripts SET end_datetime = NOW() WHERE script_name = ?`,
                [scriptName]
            );
            console.log(`Zaktualizowano czas uruchomienia (end) dla skryptu: ${scriptName} - ${new Date().toISOString()}`);
        }

        console.log("Skrypt zakończony.");
        console.log("-----------------------------------------------------------------------------------");
    } catch (error) {
        console.error('Błąd podczas działania skryptu:', error);
        
    } finally {
        if (connection) await connection.end();
        process.exit(0); // Wymuszone zakończenie skryptu
    }
})();


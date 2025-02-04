const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { exec } = require('child_process');

// Lista User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
];




(async () => {

    // Połącz z bazą danych
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    });

    console.log('Połączono z bazą danych.');

/////////////wpisz start skryptu
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
      console.log(`Zaktualizowano czas uruchomienia (start) dla skryptu: ${scriptName}`);
    } else {
      // Jeśli nie istnieje, wstawiamy nowy rekord
      await connection.execute(
        `INSERT INTO Active_scripts (script_name, last_datetime) VALUES (?, NOW())`,
        [scriptName]
      );
      console.log(`Dodano nowy wpis (start) dla skryptu: ${scriptName}`);
    }



    // Pobierz wszystkie strony z tabeli Pages
    const [pages] = await connection.execute('SELECT id, blog_id, url FROM Pages');

    if (!pages.length) {
        console.log('Brak stron do przetworzenia.');
        await connection.end();
        return;
    }

    // Losowanie przeglądarki i user agent
    const getRandomBrowser = () => [chromium, firefox, webkit][Math.floor(Math.random() * 3)];
    const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

    for (const pageRecord of pages) {
        console.log(`Przetwarzam stronę: ${pageRecord.url}`);

        // Restart Tor
        try {
            await new Promise((resolve, reject) => {
                exec('sudo systemctl restart tor', (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Błąd restartu Tor: ${stderr}`);
                        return reject(error);
                    }
                    console.log('Tor zrestartowany.');
                    resolve();
                });
            });
        } catch (error) {
            console.error(`Nie udało się zrestartować Tor: ${error.message}`);
            continue;
        }

        // Losuj przeglądarkę i User-Agent
        const browserType = getRandomBrowser();
        const userAgent = getRandomUserAgent();

        let browser;
        try {
            browser = await browserType.launch({
                headless: false,
                proxy: {
                    server: 'socks5://127.0.0.1:9050',
                },
            });

            const context = await browser.newContext({
                userAgent: userAgent,
            });

            const page = await context.newPage();

            try {
                // Otwórz stronę bloga z timeoutem
                await page.goto(pageRecord.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                console.log(`Strona załadowana: ${pageRecord.url}`);

                // Pobierz linki
                const links = await page.evaluate(() => {
                    const anchors = Array.from(document.querySelectorAll('.post-body a'));
                    return anchors
                        .map(anchor => ({
                            url: anchor.href.trim(),
                            title: anchor.textContent.trim()
                        }))
                        .filter(link => link.url && !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(link.url));
                });

                if (!links.length) {
                    console.log(`Brak linków w sekcji "post-body" dla strony: ${pageRecord.url}`);
                    continue;
                }

                // Przetwarzanie i wstawianie linków do bazy danych
                for (const link of links) {
                    // Normalizacja URL
                    const normalizedUrl = new URL(link.url);
                    normalizedUrl.hash = ''; // Usuń fragment
                    const normalizedUrlStr = normalizedUrl.toString();

                    // Sprawdź, czy wpis istnieje
                    const [rows] = await connection.execute(
                        'SELECT COUNT(*) as count FROM Inside_pages WHERE blog_id = ? AND page_id = ? AND url = ?',
                        [pageRecord.blog_id, pageRecord.id, normalizedUrlStr]
                    );

                    if (rows[0].count === 0) {
                        // Dodaj wpis
                        const mobileUrl = normalizedUrlStr.includes('?') ? `${normalizedUrlStr}&m=1` : `${normalizedUrlStr}?m=1`;
                        await connection.execute(
                            'INSERT INTO Inside_pages (blog_id, page_id, url, title, type, mobile_url) VALUES (?, ?, ?, ?, ?, ?)',
                            [pageRecord.blog_id, pageRecord.id, normalizedUrlStr, link.title, 'internal', mobileUrl]
                        );
                        console.log(`Dodano link: ${link.title} (${normalizedUrlStr})`);
                    } else {
                        console.log(`Pominięto duplikat: ${link.title} (${normalizedUrlStr})`);
                    }
                }
            } catch (error) {
                console.error(`Błąd podczas przetwarzania strony: ${pageRecord.url}`, error);
            } finally {
                await page.close();
                await context.close();
            }
        } catch (error) {
            console.error(`Błąd uruchomienia przeglądarki dla strony: ${pageRecord.url}`, error);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    await connection.end();

   ///////////zapisz end
   // Połączenie z bazą danych
    const con = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    });

    console.log('Połączono z bazą danych.');

    // Sprawdzenie, czy rekord już istnieje
    const [r] = await con.execute(
      `SELECT 1 FROM Active_scripts WHERE script_name = ?`,
      [scriptName]
    );

    if (r.length > 0) {
      // Jeśli istnieje, aktualizujemy czas
      await con.execute(
        `UPDATE Active_scripts SET end_datetime = NOW() WHERE script_name = ?`,
        [scriptName]
      );
      console.log(`Zaktualizowano czas uruchomienia (end) dla skryptu: ${scriptName}`);
    } 

    await con.end();

    console.log("Skrypt zakończony.");
    process.exit(0); // Wymuszone zakończenie skryptu
    console.log('Przetwarzanie zakończone.');
})();




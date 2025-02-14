const { chromium } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { execSync } = require('child_process');

// Lista User-Agent
const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Mobile Safari/537.36'
];




const fs = require('fs');
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
    // Konfiguracja bazy danych
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    };

    const connection = await mysql.createConnection(dbConfig);

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

    const [blogs] = await connection.execute('SELECT id, mobile_url FROM Blogs WHERE ads = 1');
    console.log(`Znaleziono ${blogs.length} blogów z ads do przetworzenia.`);

    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 } // iPhone X
    });

    const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

    for (const blog of blogs) {
        const { id: blogId, mobile_url: blogMobileUrl } = blog;
        console.log(`Przetwarzanie bloga ID: ${blogId}, URL: ${blogMobileUrl}`);

        restartTor();

        const userAgent = getRandomUserAgent();

        try {
            console.log(`Uruchamianie przeglądarki z User-Agent: ${userAgent}`);
            const browser = await chromium.launch({
                headless: true,
                proxy: { server: 'socks5://127.0.0.1:9052' }
            });

            const context = await browser.newContext({
                viewport: { width: 375, height: 812 }, // iPhone X
                userAgent: userAgent,
                hasTouch: true // Włącza symulację dotyku
            });

            const page = await context.newPage();
           

            try {
                console.log(`Otwieranie strony: ${blogMobileUrl}`);
                await page.goto(blogMobileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                console.log('Strona załadowana pomyślnie.');
                await page.waitForTimeout(4000);


                /*
                const mainLinks = await page.$$eval('a', elements => elements.map(el => el.href));

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

                const allLinks = [...mainLinks, ...iframeLinks];
                console.log('Znalezione linki:', allLinks);
                */

                const firstLink = await page.$('a');
                if (firstLink) {
                    const linkHref = await firstLink.getProperty('href');
                    console.log(`Klikam pierwszy link dotykiem: ${linkHref}`);
                    await firstLink.tap();
                    await page.waitForTimeout(8000);
                } else {
                    console.log('Brak linków na stronie.');
                }


            } catch (error) {
                console.error(`Błąd podczas przetwarzania bloga ID: ${blogId}:`, error.message);
            } finally {
                if (page) await page.close();
            }
        } catch (error) {
            console.error(`Błąd z przeglądarką dla bloga ID: ${blogId}:`, error.message);
        } finally {
            if (context) await context.close();
            if (browser) await browser.close();
            console.log('Przeglądarka zamknięta.');
        }
    }

    await connection.end();

    // Zapisz end
    const con = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    });

    console.log('Połączono z bazą danych.');

    const [r] = await con.execute(
      `SELECT 1 FROM Active_scripts WHERE script_name = ?`,
      [scriptName]
    );

    if (r.length > 0) {
      await con.execute(
        `UPDATE Active_scripts SET end_datetime = NOW() WHERE script_name = ?`,
        [scriptName]
      );
      console.log(`Zaktualizowano czas zakończenia (end) dla skryptu: ${scriptName} - ${new Date().toISOString()}`);
    }

    await con.end();


    console.log("Skrypt zakończony.");
    console.log("-----------------------------------------------------------------------------------------");
    process.exit(0); // Wymuszone zakończenie skryptu


})();



const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { execSync } = require('child_process');

// Funkcja restartu Tor
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


// Funkcja losująca przeglądarkę
const getRandomBrowser = () => {
    const browsers = [chromium, firefox, webkit];
    return browsers[Math.floor(Math.random() * browsers.length)];
};

// Funkcja normalizacji URL
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





(async () => {

    // Konfiguracja bazy danych
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database',
    };

    const connection = await mysql.createConnection(dbConfig);
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


    await connection.execute('DELETE FROM Recommended_posts');
    await connection.execute('ALTER TABLE Recommended_posts AUTO_INCREMENT = 1');

    for (const blog of blogs) {
        console.log(`Przetwarzam blog: ${blog.url}`);
        
        restartTor(); // Restart Tor przed każdą iteracją

        const browserType = getRandomBrowser(); // Losowanie przeglądarki
        const browser = await browserType.launch({ headless: false, proxy: { server: 'socks5://127.0.0.1:9062' } });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
            viewport: { width: 1920, height: 1080 },
            locale: 'pl-PL',
            timezoneId: 'Europe/Warsaw',
        });

        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            Object.defineProperty(navigator, 'oscpu', { get: () => 'Windows NT 10.0; Win64; x64' });
            Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0' });
        });

        const page = await context.newPage();

        try {
            // Otwórz stronę bloga
            console.log(`Otwieram stronę: ${blog.url}`);
            await page.goto(blog.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Pobierz polecane posty
            const recommendedPosts = await page.evaluate(() => {
                const containers = [
                    document.getElementById('FeaturedPost1'),
                    document.getElementById('FeaturedPost2'),
                ].filter(Boolean);

                const links = [];
                containers.forEach(container => {
                    const anchorTags = container.querySelectorAll('a');
                    anchorTags.forEach(anchor => {
                        links.push({
                            url: anchor.href,
                            title: anchor.textContent.trim(),
                        });
                    });
                });
                return links;
            });

            if (!recommendedPosts.length) {
                console.log(`Brak polecanych postów dla bloga: ${blog.url}`);
                continue;
            }

            console.log(`Znaleziono ${recommendedPosts.length} postów.`);

            // Przetwórz posty
            for (const post of recommendedPosts) {
                const { url, title } = post;

                if (!url || !title) {
                    console.warn(`Pominięto post z pustym tytułem lub URL: ${JSON.stringify(post)}`);
                    continue;
                }

                const normalizedUrl = normalizeUrl(url);
                const mobileUrl = `${normalizedUrl}?m=1`;

                // Sprawdź, czy rekord już istnieje
                const [existingRecord] = await connection.execute(
                    'SELECT COUNT(*) AS count FROM Recommended_posts WHERE blog_id = ? AND url = ?',
                    [blog.id, normalizedUrl]
                );

                if (existingRecord[0].count > 0) {
                    console.log(`Rekord już istnieje w bazie: ${normalizedUrl}`);
                    continue; // Pomijamy zapis
                }

                try {
                    await connection.execute(
                        'INSERT INTO Recommended_posts (blog_id, url, title, mobile_url) VALUES (?, ?, ?, ?)',
                        [blog.id, normalizedUrl, title, mobileUrl]
                    );
                    console.log(`Dodano polecany post: ${title}`);
                } catch (error) {
                    console.error(`Nie udało się dodać postu: ${title}`, error.message);
                }
            }
        } catch (error) {
            console.error(`Błąd podczas przetwarzania bloga: ${blog.url}`, error.message);
        } finally {
            await page.close();
            await browser.close();
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
      console.log(`Zaktualizowano czas uruchomienia (end) dla skryptu: ${scriptName} - ${new Date().toISOString()}`);
    } 

    await con.end();




    console.log("Skrypt zakończony.");
    console.log("-----------------------------------------------------------------------------------");
    
    process.exit(0); // Wymuszone zakończenie skryptu

    
})();







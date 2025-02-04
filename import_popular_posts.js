const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { exec } = require('child_process');

// Funkcja do restartu Tor
const restartTor = () => {
    return new Promise((resolve, reject) => {
        exec('sudo systemctl restart tor', (error, stdout, stderr) => {
            if (error) {
                console.error('Błąd podczas restartu Tor:', error.message);
                return reject(error);
            }
            console.log('Tor został zrestartowany.');
            resolve();
        });
    });
};

// Funkcja losująca przeglądarkę
const getRandomBrowser = () => {
    const browsers = [chromium, firefox, webkit];
    return browsers[Math.floor(Math.random() * browsers.length)];
};






(async () => {

    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database',
    };

    // Połączenie z bazą danych
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
      console.log(`Zaktualizowano czas uruchomienia (start) dla skryptu: ${scriptName}`);
    } else {
      // Jeśli nie istnieje, wstawiamy nowy rekord
      await connection.execute(
        `INSERT INTO Active_scripts (script_name, last_datetime) VALUES (?, NOW())`,
        [scriptName]
      );
      console.log(`Dodano nowy wpis (start) dla skryptu: ${scriptName}`);
    }




    // Pobierz blogi z bazy danych
    const [blogs] = await connection.execute('SELECT id, url FROM Blogs');
    if (!blogs.length) {
        console.log('Brak blogów do przetworzenia.');
        await connection.end();
        return;
    }


    await connection.execute('DELETE FROM Popular_posts');
    await connection.execute('ALTER TABLE Popular_posts AUTO_INCREMENT = 1');



    for (const blog of blogs) {
        console.log(`Przetwarzam blog ID: ${blog.id}, URL: ${blog.url}`);
        await restartTor(); // Restart Tor przed każdą iteracją

        const browserType = getRandomBrowser(); // Losuj przeglądarkę
        const browser = await browserType.launch({
            headless: false,
            proxy: { server: 'socks5://127.0.0.1:9050' }, // Proxy Tor
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: 'pl-PL',
            timezoneId: 'Europe/Warsaw',
        });

        const page = await context.newPage();

        try {
            console.log(`Otwieram stronę: ${blog.url}`);
            await page.goto(blog.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            console.log('Pobieranie popularnych postów...');
            const popularPosts = await page.evaluate(() => {
                const containers = [
                    document.getElementById('PopularPosts1'),
                    document.getElementById('PopularPosts2'),
                ].filter(Boolean);

                const posts = [];
                containers.forEach(container => {
                    const links = container.querySelectorAll('a');
                    links.forEach(link => {
                        posts.push({
                            title: link.textContent.trim(),
                            url: link.href,
                        });
                    });
                });
                return posts;
            });

            if (!popularPosts.length) {
                console.log(`Brak popularnych postów dla bloga: ${blog.url}`);
                continue;
            }

            console.log(`Znaleziono ${popularPosts.length} postów.`);
            

            for (const post of popularPosts) {
                const { title, url } = post;

                // Filtruj puste tytuły lub URL-e
                if (!title || !url) {
                    console.warn(`Pominięto post z pustym tytułem lub URL: ${JSON.stringify(post)}`);
                    continue;
                }

                // Normalizuj URL (usuń fragment #...)
                const normalizedUrl = new URL(url);
                normalizedUrl.hash = '';

                // Dodaj wersję mobilną URL
                const mobileUrl = `${normalizedUrl.toString()}?m=1`;

                try {
                    await connection.execute(
                        'INSERT INTO Popular_posts (blog_id, url, title, mobile_url) VALUES (?, ?, ?, ?)',
                        [blog.id, normalizedUrl.toString(), title, mobileUrl]
                    );
                    console.log(`Dodano post: ${title}`);
                } catch (error) {
                    console.error(`Nie udało się dodać postu: ${title}`, error.message);
                }
            }
        } catch (error) {
            console.error(`Błąd podczas przetwarzania bloga ID: ${blog.id}`, error.message);
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
      console.log(`Zaktualizowano czas uruchomienia (end) dla skryptu: ${scriptName}`);
    } 

    await con.end();



    console.log("Skrypt zakończony.");
    process.exit(0); // Wymuszone zakończenie skryptu
    console.log('Przetwarzanie zakończone.');

    
})();





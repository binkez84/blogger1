const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { exec } = require('child_process');





// Konfiguracja puli połączeń
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Blogger123!",
  database: "blog_database",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function logScriptExecution() {
  let connection;
  try {
    connection = await pool.getConnection();
    const scriptName = path.basename(__filename);

    // Sprawdzenie, czy rekord już istnieje
    const [rows] = await connection.execute(
      `SELECT 1 FROM Active_scripts WHERE script_name = ?`,
      [scriptName]
    );

    if (rows.length > 0) {
      // Jeśli istnieje, aktualizujemy czas
      await connection.execute(
        `UPDATE Active_scripts SET last_datetime = NOW() WHERE script_name = ?`,
        [scriptName]
      );
      console.log(`Zaktualizowano czas uruchomienia dla skryptu: ${scriptName}`);
    } else {
      // Jeśli nie istnieje, wstawiamy nowy rekord
      await connection.execute(
        `INSERT INTO Active_scripts (script_name, last_datetime) VALUES (?, NOW())`,
        [scriptName]
      );
      console.log(`Dodano nowy wpis dla skryptu: ${scriptName}`);
    }
  } catch (error) {
    console.error("Błąd podczas zapisu do Active_scripts:", error.message);
  } finally {
    if (connection) connection.release();
  }
}


(async () => {
    await logScriptExecution();

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

    // Start Playwright z obsługą Tor
    console.log('Restartowanie Tor...');
    const browser = await firefox.launch({ headless: false }); // Dla Firefox
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
        viewport: { width: 1920, height: 1080 },
        isMobile: false,
        javaScriptEnabled: true
    });

    for (const blog of blogs) {
        console.log(`Przetwarzam blog: ${blog.url}`);

        const page = await context.newPage();

        try {
            // Otwórz stronę bloga
            await page.goto(blog.url, { waitUntil: 'domcontentloaded' });

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
                if (normalizedUrl.startsWith(new URL(blog.url).origin)) {
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
                    [blog.id, normalizedUrl]
                );

                if (rows[0].count === 0) {
                    await connection.execute(
                        'INSERT INTO Label_links (blog_id, url, mobile_url, title, type) VALUES (?, ?, ?, ?, ?)',
                        [blog.id, normalizedUrl, mobileUrl, title, type]
                    );
                    console.log(`Dodano link: ${title} (${normalizedUrl}) [${type}]`);
                } else {
                    console.log(`Pominięto duplikat: ${title} (${normalizedUrl})`);
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
    try {
      await pool.end();
      console.log("Pula połączeń do bazy danych zamknięta.");
    } catch (error) {
      console.error("Błąd przy zamykaniu puli połączeń:", error.message);
    }

    console.log("Skrypt zakończony.");
    process.exit(0); // Wymuszone zakończenie skryptu
    console.log('Przetwarzanie zakończone.');
    
})();



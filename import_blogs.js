const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { execSync } = require('child_process');

// User-Agent dla desktopu i mobile
const desktopUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';
const mobileUserAgent = 'Mozilla/5.0 (Linux; Android 10; Pixel 4 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36';




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

    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    });

    // Funkcja do generowania mobilnego URL
    const generateMobileUrl = (desktopUrl) => {
        try {
            const url = new URL(desktopUrl);
            if (!url.searchParams.has('m')) {
                url.searchParams.set('m', '1');
            }
            return url.toString();
        } catch (error) {
            console.error(`Błąd podczas generowania mobilnego URL: ${error.message}`);
            return desktopUrl;
        }
    };

    try {
        // Przeglądarka desktopowa
        const desktopBrowser = await chromium.launch({ headless: true });
        const desktopContext = await desktopBrowser.newContext({
            userAgent: desktopUserAgent,
            viewport: { width: 1920, height: 1080 },
            locale: 'pl-PL',
            timezoneId: 'Europe/Warsaw'
        });

        // Przeglądarka mobilna
        const mobileBrowser = await chromium.launch({ headless: true });
        const mobileContext = await mobileBrowser.newContext({
            userAgent: mobileUserAgent,
            viewport: { width: 375, height: 667 },
            locale: 'pl-PL',
            timezoneId: 'Europe/Warsaw'
        });

        const profileUrl = 'https://www.blogger.com/profile/05439097968825093370';

        // Zbieranie blogów w sesji desktopowej
        const desktopPage = await desktopContext.newPage();
        await desktopPage.goto(profileUrl, { waitUntil: 'domcontentloaded' });

        const blogs = await desktopPage.evaluate(() => {
            const blogElements = document.querySelectorAll('li.sidebar-item');
            return Array.from(blogElements).map(blog => {
                const link = blog.querySelector('a');
                return {
                    url: link ? link.href : null,
                    title: link ? link.textContent.trim() : null,
                    description: null
                };
            }).filter(blog => blog.url && blog.title);
        });

        for (const blog of blogs) {
            try {
                // Sprawdź ostateczny URL dla desktopu
                await desktopPage.goto(blog.url, { waitUntil: 'domcontentloaded' });
                const desktopUrl = desktopPage.url();

                // Generuj URL mobilny w oparciu o desktopowy
                const mobilePage = await mobileContext.newPage();
                const mobileUrl = generateMobileUrl(desktopUrl);

                // Sprawdź, czy blog już istnieje
                const [rows] = await db.execute('SELECT id FROM Blogs WHERE url = ? OR mobile_url = ?', [desktopUrl, mobileUrl]);
                if (rows.length === 0) {
                    await db.execute(
                        'INSERT INTO Blogs (url, mobile_url, title, description) VALUES (?, ?, ?, ?)',
                        [desktopUrl, mobileUrl, blog.title, blog.description]
                    );
                    console.log(`Dodano nowy blog: ${blog.title} (Desktop: ${desktopUrl}, Mobile: ${mobileUrl})`);
                } else {
                    console.log(`Blog już istnieje w bazie: ${blog.title} (Desktop: ${desktopUrl}, Mobile: ${mobileUrl})`);
                }
            } catch (error) {
                console.error(`Błąd podczas obsługi bloga ${blog.title}: ${error.message}`);
            }
        }

        await desktopBrowser.close();
        await mobileBrowser.close();
    } catch (error) {
        console.error(`Błąd: ${error.message}`);
    } finally {
        await db.end();
    }



   try {
      await pool.end();
      console.log("Pula połączeń do bazy danych zamknięta.");
    } catch (error) {
      console.error("Błąd przy zamykaniu puli połączeń:", error.message);
    }

    console.log("Skrypt zakończony.");
    process.exit(0); // Wymuszone zakończenie skryptu


})();



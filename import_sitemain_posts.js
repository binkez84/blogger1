const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { exec } = require('child_process');

// Funkcja restartująca Tor
const restartTor = () => {
    return new Promise((resolve, reject) => {
        exec('sudo systemctl restart tor', (error, stdout, stderr) => {
            if (error) {
                console.error('Błąd podczas restartu Tor:', error.message);
                reject(error);
            } else {
                console.log('Tor został zrestartowany.');
                resolve();
            }
        });
    });
};

// Funkcja losująca przeglądarkę
const getRandomBrowser = () => {
    const browsers = [chromium, firefox, webkit];
    return browsers[Math.floor(Math.random() * browsers.length)];
};




// Konfiguracja puli połączeń
let pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Blogger123!",
  database: "blog_database",
  waitForConnections: true,
  connectionLimit: 0,
  queueLimit: 0,
  multipleStatements: false
});


// Funkcja czyszczenia puli połączeń
async function clearPool() {
  await pool.end();
  await delay(7000); // Opóźnienie 1 sekundy przed ponownym użyciem puli
  
  pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "Blogger123!",
    database: "blog_database",
    waitForConnections: true,
    connectionLimit: 0,
    queueLimit: 0,
    multipleStatements: false
  });
  console.log("Pula połączeń została wyczyszczona i ponownie utworzona.");

}

// Funkcja opóźnienia
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}



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
  } catch (error) {
    console.error("Błąd podczas zapisu (start) do Active_scripts:", error.message);
  } finally {
    if (connection) connection.release();
  }
}




async function logScriptExecutionEndzik() {
  let connection;

    // Wywołanie funkcji czyszczenia puli połączeń
    clearPool();
  
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
        `UPDATE Active_scripts SET end_datetime = NOW() WHERE script_name = ?`,
        [scriptName]
      );
      console.log(`Zaktualizowano czas uruchomienia (end) dla skryptu: ${scriptName}`);
    } 
  } catch (error) {
    console.error("Błąd podczas zapisu (end) do Active_scripts:", error.message);
  } finally {
   
    if (connection) connection.release();

  }
}



(async () => {
    await logScriptExecution();

    // Połączenie z bazą danych
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    });

    console.log('Połączono z bazą danych.');

    // Pobierz wszystkie blogi z tabeli Blogs
    const [blogs] = await connection.execute('SELECT id, url FROM Blogs LIMIT 2');
    //const [blogs] = await connection.execute('SELECT id, url FROM Blogs');

    if (!blogs.length) {
        console.log('Brak blogów do przetworzenia.');
        await connection.end();
        return;
    }


    await connection.execute('DELETE FROM Sitemain_posts');
    await connection.execute('ALTER TABLE Sitemain_posts AUTO_INCREMENT = 1');

    for (const blog of blogs) {
        console.log(`Przetwarzam blog: ${blog.url}`);

        // Restart Tor przed każdą iteracją
        try {
            await restartTor();
        } catch (error) {
            console.error('Nie udało się zrestartować Tor. Przechodzę do następnego bloga.');
            continue;
        }

        // Losowanie przeglądarki
        const browserType = getRandomBrowser();
        const browser = await browserType.launch({ headless: false, proxy: { server: 'socks5://127.0.0.1:9050' } });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
            viewport: { width: 1920, height: 1080 },
            locale: 'pl-PL',
            timezoneId: 'Europe/Warsaw'
        });

        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            Object.defineProperty(navigator, 'oscpu', { get: () => 'Windows NT 10.0; Win64; x64' });
            Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0' });
        });

        const page = await context.newPage();

        try {
            // Otwórz stronę bloga
            await page.goto(blog.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Pobierz posty z bloga
            const posts = await page.evaluate(() => {
                const containers = Array.from(document.getElementsByClassName('post-title'));
                return containers.map(container => {
                    const anchor = container.querySelector('a');
                    return anchor ? { url: anchor.href, title: anchor.textContent.trim() } : null;
                }).filter(Boolean);
            });

            if (!posts.length) {
                console.log(`Brak postów w sekcji "post-title" dla bloga: ${blog.url}`);
                continue;
            }

            

            console.log(`Znaleziono ${posts.length} postów.`);

            // Normalizacja URL
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

            // Filtruj i zapisuj posty
            for (const post of posts) {
                const normalizedUrl = normalizeUrl(post.url);
                const mobileUrl = `${normalizedUrl}?m=1`;

                if (!normalizedUrl || !post.title) {
                    console.warn('Pominięto post z pustym URL lub tytułem:', post);
                    continue;
                }


                // Sprawdź, czy rekord już istnieje
                const [existingRecord] = await connection.execute(
                    'SELECT COUNT(*) AS count FROM Sitemain_posts WHERE blog_id = ? AND url = ?',
                    [blog.id, normalizedUrl]
                );

                if (existingRecord[0].count > 0) {
                    console.log(`Rekord już istnieje w bazie: ${normalizedUrl}`);
                    continue; // Pomijamy zapis
                }


                try {
                    await connection.execute(
                        'INSERT INTO Sitemain_posts (blog_id, url, title, mobile_url) VALUES (?, ?, ?, ?)',
                        [blog.id, normalizedUrl, post.title, mobileUrl]
                    );
                    console.log(`Dodano post: ${post.title}`);
                } catch (error) {
                    console.error('Błąd podczas zapisu do bazy:', error);
                }
            }
        } catch (error) {
            console.error(`Błąd podczas przetwarzania bloga: ${blog.url}`, error);
        } finally {
            await page.close();
            await browser.close();
 
        }
    }


    await logScriptExecutionEndzik();
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





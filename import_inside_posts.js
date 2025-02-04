const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { exec } = require('child_process');

async function restartTor() {
    return new Promise((resolve, reject) => {
        exec('sudo systemctl restart tor', (error, stdout, stderr) => {
            if (error) {
                console.error('Błąd podczas restartu Tor:', stderr);
                reject(error);
            } else {
                console.log('Tor zrestartowany.');
                resolve(stdout);
            }
        });
    });
}

function getRandomBrowser() {
    const browsers = [chromium, firefox, webkit];
    return browsers[Math.floor(Math.random() * browsers.length)];
}





(async () => {



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





    const [posts] = await connection.execute('SELECT id, blog_id, url FROM Posts');

    if (!posts.length) {
        console.log('Brak postów do przetworzenia.');
        await connection.end();
        return;
    }

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0';

    for (const post of posts) {
        console.log(`Przetwarzam post: ${post.url}`);

        await restartTor();

        const browserType = getRandomBrowser();
        const browser = await browserType.launch({
            headless: false,
            proxy: {
                server: 'socks5://127.0.0.1:9050', // Proxy TOR
            },
        });

        const context = await browser.newContext({
            userAgent: userAgent,
        });

        const page = await context.newPage();

        try {
            await page.goto(post.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            const links = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('.post-body a'));
                return anchors.map(anchor => ({
                    url: anchor.href.trim(),
                    title: anchor.textContent.trim()
                })).filter(link => link.url && link.title);
            });

            if (!links.length) {
                console.log(`Brak linków w sekcji "post-body" dla posta: ${post.url}`);
                continue;
            }

            const blogBaseUrl = new URL(post.url).origin;

            const uniqueLinks = links.map(link => ({
                ...link,
                mobile_url: link.url.includes('?m=1') ? link.url : `${link.url}?m=1`,
                type: link.url.startsWith(blogBaseUrl)
                    ? 'internal'
                    : link.url.includes('blogspot.com')
                        ? 'external_inblogger'
                        : 'external_outblogger'
            }));

            for (const link of uniqueLinks) {
                const [rows] = await connection.execute(
                    'SELECT COUNT(*) as count FROM Inside_posts WHERE blog_id = ? AND post_id = ? AND url = ?',
                    [post.blog_id, post.id, link.url]
                );

                if (rows[0].count === 0) {
                    try {
                        await connection.execute(
                            'INSERT INTO Inside_posts (blog_id, post_id, url, mobile_url, title, type) VALUES (?, ?, ?, ?, ?, ?)',
                            [post.blog_id, post.id, link.url, link.mobile_url, link.title, link.type]
                        );
                        console.log(`Dodano link: ${link.title} (${link.url}) [${link.type}]`);
                    } catch (error) {
                        console.error(`Błąd podczas zapisywania linku: ${link.url}`, error);
                    }
                } else {
                    console.log(`Pominięto duplikat: ${link.url}`);
                }
            }
        } catch (error) {
            console.error(`Błąd podczas przetwarzania posta: ${post.url}`, error);
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




const { chromium, firefox, webkit } = require('playwright');
const mysql = require('mysql2/promise');
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

    // Pobierz blogi z bazy danych
    const [blogs] = await connection.execute('SELECT id, url FROM Blogs');
    if (!blogs.length) {
        console.log('Brak blogów do przetworzenia.');
        await connection.end();
        return;
    }

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

            console.log('Pobieranie recommended blogs...');
            const recommendedBlogs = await page.evaluate(() => {
                const containers = [
                    document.getElementById('BlogList1'),
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

            if (!recommendedBlogs.length) {
                console.log(`Brak recommended blogs dla bloga: ${blog.url}`);
                continue;
            }

            console.log(`Znaleziono ${recommendedBlogs.length} blogow.`);
            await connection.execute('DELETE FROM Recommended_blogs WHERE blog_id = ?', [blog.id]);

            for (const post of recommendedBlogs) {
                const { title, url } = post;

                // Filtruj puste tytuły lub URL-e
                if (!title || !url) {
                    console.warn(`Pominięto blog z pustym tytułem lub URL: ${JSON.stringify(post)}`);
                    continue;
                }

                // Normalizuj URL (usuń fragment #...)
                const normalizedUrl = new URL(url);
                normalizedUrl.hash = '';

                // Dodaj wersję mobilną URL
                const mobileUrl = `${normalizedUrl.toString()}?m=1`;

                try {
                    await connection.execute(
                        'INSERT INTO Recommended_blogs (blog_id, url, title, mobile_url) VALUES (?, ?, ?, ?)',
                        [blog.id, normalizedUrl.toString(), title, mobileUrl]
                    );
                    console.log(`Dodano blogs: ${title}`);
                } catch (error) {
                    console.error(`Nie udało się dodać blog: ${title}`, error.message);
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
    console.log('Przetwarzanie zakończone.');
})();



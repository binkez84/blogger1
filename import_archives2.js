const { chromium, firefox, webkit } = require('playwright');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

// Lista User-Agent
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
];

(async () => {
    // Konfiguracja bazy danych
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    };

    const connection = await mysql.createConnection(dbConfig);

    const [blogs] = await connection.execute('SELECT id, url FROM Blogs');
    console.log(`Znaleziono ${blogs.length} blogów do przetworzenia.`);

    const getRandomBrowser = () => [chromium, firefox, webkit][Math.floor(Math.random() * 3)];
    const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

    for (const blog of blogs) {
        const { id: blogId, url: blogUrl } = blog;

        console.log(`Restarting Tor before processing blog ID: ${blogId}`);
        try {
            execSync('sudo systemctl restart tor', { stdio: 'inherit' });
        } catch (error) {
            console.error(`Error restarting Tor: ${error.message}`);
            continue; // Skip to next blog
        }

        console.log(`Processing blog ID: ${blogId}, URL: ${blogUrl}`);

        const browserType = getRandomBrowser();
        const userAgent = getRandomUserAgent();

        let browser;
        let context;

        try {
            browser = await browserType.launch({
                headless: true,
                proxy: { server: 'socks5://127.0.0.1:9050' }
            });

            context = await browser.newContext({
                userAgent,
                viewport: { width: 1920, height: 1080 },
                locale: 'pl-PL',
                timezoneId: 'Europe/Warsaw'
            });

            const page = await context.newPage();

            try {
                console.log(`Navigating to blog URL: ${blogUrl}`);
                await page.goto(blogUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                console.log(`Opening all "zippy" elements on blog ID: ${blogId}`);
                let zippyExists = true;
                while (zippyExists) {
                    zippyExists = await page.evaluate(() => {
                        const zippies = Array.from(document.querySelectorAll('#BlogArchive1 .zippy'))
                            .filter(el => !el.classList.contains('toggle-open'));
                        if (zippies.length > 0) {
                            zippies[0].click();
                            return true;
                        }
                        return false;
                    });
                    if (zippyExists) {
                        await page.waitForTimeout(500);
                    }
                }

                console.log(`Fetching posts from blog ID: ${blogId}`);
                const posts = await page.evaluate(() => {
                    const archive = document.querySelector('#BlogArchive1');
                    if (!archive) return [];
                    const postElements = archive.querySelectorAll('ul.posts li a');
                    return Array.from(postElements).map(post => ({
                        title: post.textContent.trim(),
                        url: post.href
                    }));
                });

                console.log(`Fetched ${posts.length} posts for blog ID: ${blogId}`);

                for (const post of posts) {
                    const [existingPost] = await connection.execute(
                        'SELECT id FROM Posts WHERE blog_id = ? AND url = ? LIMIT 1',
                        [blogId, post.url]
                    );

                    if (existingPost.length > 0) {
                        console.log(`Post already exists: ${post.title}`);
                        continue;
                    }

                    const mobileUrl = post.url.includes('?') ? `${post.url}&m=1` : `${post.url}?m=1`;

                    try {
                        await connection.execute(
                            'INSERT INTO Posts (blog_id, url, title, mobile_url) VALUES (?, ?, ?, ?)',
                            [blogId, post.url, post.title, mobileUrl]
                        );
                        console.log(`Saved new post: ${post.title}`);
                    } catch (error) {
                        console.error(`Error saving post "${post.title}": ${error.message}`);
                    }
                }
            } catch (pageError) {
                console.error(`Error processing blog page for ID: ${blogId}: ${pageError.message}`);
            } finally {
                await page.close();
            }
        } catch (browserError) {
            console.error(`Error launching browser for blog ID: ${blogId}: ${browserError.message}`);
        } finally {
            if (context) await context.close();
            if (browser) await browser.close();
        }
    }

    await connection.end();
    console.log('All blogs processed.');
})();


const { chromium, firefox, webkit } = require('playwright');
const { getBlogs, getRandomBlog, getRandomPopularPost, getRandomRecommendedPost,
    getRandomLabelLink, getRandomSitemainPost, getRandomExternalSite, getRandomPage, getRandomPost,
	getRandomRecommendedBlog,
    closeConnection } = require('./db');
const { moveAndClickOnLink } = require('./utils');
const { restartTor, randomBrowserType, randomUserAgent } = require('./browser');
const { execSync } = require('child_process');
const aiModule = require('./aiModule'); // Moduł AI odpowiedzialny za decyzje

(async () => {
    const maxRetries = 3; // Maksymalna liczba prób przetwarzania bloga
    let retries = 0; // Licznik prób
    let success = false; // Flaga zakończenia operacji sukcesem

    try {
        const randomBlog = await getRandomBlog();
        console.log('Wylosowany blog:', randomBlog.url);

        while (retries < maxRetries && !success) {
            let browser, context, page;

            try {
                await restartTor();
                const browserType = await randomBrowserType();
                const userAgent = await randomUserAgent();

                // Inicjalizacja przeglądarki
                browser = await browserType.type.launch({
                    headless: false,
                    proxy: { server: 'socks5://127.0.0.1:9050' }
                });
                context = await browser.newContext({
                    userAgent: userAgent,
                    viewport: { width: 1920, height: 1080 }
                });
                page = await context.newPage();

                // Otwieranie strony bloga
                await page.goto(randomBlog.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                console.log(`Załadowano stronę bloga ID: ${randomBlog.id}, url: ${randomBlog.url}`);

                // Losowanie czasu spędzonego na stronie
                let time_on_page = aiModule.decideTimeOnPage();
                await page.waitForTimeout(time_on_page);

                // Decyzja o dalszym działaniu
                const action_one = aiModule.decideNextActionOne();
				//let action_one = 'explore_recommended_blog';
 			   console.log('Wylosowano akcję:', action_one);

                if (action_one === 'explore_popular_post') {
                    const randomPopularPost = await getRandomPopularPost(randomBlog.id);
                    await moveAndClickOnLink(page, randomPopularPost.url, '#PopularPosts1', '#PopularPosts2');
                } else if (action_one === 'explore_recommended_post') {
                    const randomRecommendedPost = await getRandomRecommendedPost(randomBlog.id);
                    await moveAndClickOnLink(page, randomRecommendedPost.url, '#FeaturedPost1', '#FeaturedPost2');
                } else if (action_one === 'explore_label_link') {
                    const randomLabelLink = await getRandomLabelLink(randomBlog.id);
                    await moveAndClickOnLink(page, randomLabelLink.url, '#Label1', '#Label2');
                } else if (action_one === 'explore_sitemain_post') {
                    const randomSitemainPost = await getRandomSitemainPost(randomBlog.id);
                    await moveAndClickOnLink(page, randomSitemainPost.url, '.post-title');
                } else if (action_one === 'explore_external_site') {
                    const randomExternalSite = await getRandomExternalSite(randomBlog.id);
                    await moveAndClickOnLink(page, randomExternalSite.url, '#LinkList1', '#LinkList2');
                } else if (action_one === 'explore_newest_post') {
                    const randomPost = await getRandomPost(randomBlog.id);
                    await moveAndClickOnLink(page, randomPost.url, '#BlogArchive1');
                } else if (action_one === 'explore_page') {
                    const randomPage = await getRandomPage(randomBlog.id);
                    await moveAndClickOnLink(page, randomPage.url, '#PageList1', '#PageList2');
                } else if (action_one === 'explore_recommended_blog') {
                    const randomRecommendedBlog = await getRandomRecommendedBlog(randomBlog.id);
                    await moveAndClickOnLink(page, randomRecommendedBlog.url, '#BlogList1');
                }

                // Jeśli wszystko zakończyło się sukcesem
                success = true;
                console.log(`Przetwarzanie bloga ID: ${randomBlog.id} zakończone sukcesem.`);
            } catch (error) {
                retries++;
                console.error(`Błąd podczas przetwarzania bloga ID: ${randomBlog.id}, próba ${retries}:`, error.message);

                if (retries >= maxRetries) {
                    console.error('Osiągnięto maksymalną liczbę prób. Przerywam przetwarzanie tego bloga.');
                }
            } finally {
                // Zamknięcie zasobów
                if (page) await page.close();
                if (context) await context.close();
                if (browser) await browser.close();
                console.log('Zamykamy przeglądarkę...');
            }
        }
    } catch (error) {
        console.error('Błąd główny:', error.message);
    } finally {
        // Zamknięcie połączenia z bazą danych
        await closeConnection();
        console.log('Skrypt zakończony.');
    }
})();



const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const {
  getBlogs,
  getRandomBlog,
  getRandomPopularPost,
  getRandomRecommendedPost,
  getRandomLabelLink,
  getRandomSitemainPost,
  getRandomExternalSite,
  getRandomPage,
  getRandomPost,
  getRandomRecommendedBlog,
  closeConnection,
} = require("./db");
const { moveAndClickOnLink } = require("./utils");
const { restartTor, randomBrowserType, randomUserAgent } = require("./browser");
const aiModule = require("./aiModule");

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

  const maxRetries = 3;
  let retries = 0;
  let success = false;
  let browser, context, page;

  try {
    const randomBlog = await getRandomBlog();
    console.log("Wylosowany blog:", randomBlog.url);

    while (retries < maxRetries && !success) {
      try {
        await restartTor();
        const browserType = await randomBrowserType();
        const userAgent = await randomUserAgent();

        browser = await browserType.type.launch({
          headless: false,
          proxy: { server: "socks5://127.0.0.1:9050" },
        });
        context = await browser.newContext({
          userAgent: userAgent,
          viewport: { width: 1920, height: 1080 },
        });
        page = await context.newPage();

        await page.goto(randomBlog.url, { waitUntil: "domcontentloaded", timeout: 60000 });
        console.log(`Załadowano stronę bloga ID: ${randomBlog.id}, url: ${randomBlog.url}`);

        let time_on_page = aiModule.decideTimeOnPage();
        await page.waitForTimeout(time_on_page);

        const action_one = aiModule.decideNextActionOne();
        console.log("Wylosowano akcję:", action_one);

        if (action_one === "explore_popular_post") {
          const randomPopularPost = await getRandomPopularPost(randomBlog.id);
          await moveAndClickOnLink(page, randomPopularPost.url, "#PopularPosts1", "#PopularPosts2");
        } else if (action_one === "explore_recommended_post") {
          const randomRecommendedPost = await getRandomRecommendedPost(randomBlog.id);
          await moveAndClickOnLink(page, randomRecommendedPost.url, "#FeaturedPost1", "#FeaturedPost2");
        } else if (action_one === "explore_label_link") {
          const randomLabelLink = await getRandomLabelLink(randomBlog.id);
          await moveAndClickOnLink(page, randomLabelLink.url, "#Label1", "#Label2");
        } else if (action_one === "explore_sitemain_post") {
          const randomSitemainPost = await getRandomSitemainPost(randomBlog.id);
          await moveAndClickOnLink(page, randomSitemainPost.url, ".post-title");
        } else if (action_one === "explore_external_site") {
          const randomExternalSite = await getRandomExternalSite(randomBlog.id);
          await moveAndClickOnLink(page, randomExternalSite.url, "#LinkList1", "#LinkList2");
        } else if (action_one === "explore_newest_post") {
          const randomPost = await getRandomPost(randomBlog.id);
          await moveAndClickOnLink(page, randomPost.url, "#BlogArchive1");
        } else if (action_one === "explore_page") {
          const randomPage = await getRandomPage(randomBlog.id);
          await moveAndClickOnLink(page, randomPage.url, "#PageList1", "#PageList2");
        } else if (action_one === "explore_recommended_blog") {
          const randomRecommendedBlog = await getRandomRecommendedBlog(randomBlog.id);
          await moveAndClickOnLink(page, randomRecommendedBlog.url, "#BlogList1");
        }

        success = true;
        console.log(`Przetwarzanie bloga ID: ${randomBlog.id} zakończone sukcesem.`);
      } catch (error) {
        retries++;
        console.error(`Błąd podczas przetwarzania bloga ID: ${randomBlog.id}, próba ${retries}:`, error.message);

        if (retries >= maxRetries) {
          console.error("Osiągnięto maksymalną liczbę prób. Przerywam przetwarzanie tego bloga.");
        }
      } finally {
        // Zamykamy zasoby, jeśli są otwarte
        if (page) {
          await page.close();
          console.log("Zamknięto stronę.");
        }
        if (context) {
          await context.close();
          console.log("Zamknięto kontekst.");
        }
        if (browser) {
          await browser.close();
          console.log("Zamknięto przeglądarkę.");
        }
      }
    }
  } catch (error) {
    console.error("Błąd główny:", error.message);
  } finally {
    try {
      await closeConnection();
      console.log("Połączenie z bazą danych zamknięte.");
    } catch (error) {
      console.error("Błąd przy zamykaniu połączenia z bazą:", error.message);
    }

    try {
      await pool.end();
      console.log("Pula połączeń do bazy danych zamknięta.");
    } catch (error) {
      console.error("Błąd przy zamykaniu puli połączeń:", error.message);
    }

    console.log("Skrypt zakończony.");
    process.exit(0); // Wymuszone zakończenie skryptu
  }
})();



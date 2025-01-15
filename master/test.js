const { chromium, firefox, webkit } = require('playwright');
const { getBlogs,getRandomBlog, getRandomPopularPost, getRandomRecommendedPost,
		getRandomLabelLink, getRandomSitemainPost, getRandomExternalSite, getRandomPage,
		closeConnection } = require('./db');
const { moveAndClickOnLink } = require('./utils');
const { restartTor,randomBrowserType, randomUserAgent } = require('./browser');
const { execSync } = require('child_process');
const aiModule = require('./aiModule'); // Moduł AI odpowiedzialny za decyzje




(async () => {
		
	try {
		const randomBlog = await getRandomBlog();
		console.log('Wylosowany blog:', randomBlog.url);
				
        let browser, context, page;		
				
        try {
			
			await restartTor();
			const browserType = await randomBrowserType();
			const userAgent = await randomUserAgent();
			
			//console.log(`Wylosowano: ${browserType.name} i userAgent: ${userAgent}`);
						
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
            console.log(`Załadowano stronę bloga ID: ${randomBlog.id} , url: ${randomBlog.url}` );
			
			let time_on_page = aiModule.decideTimeOnPage();
			//console.log(`Czekam na stronie ${time_on_page}`);
			await page.waitForTimeout(time_on_page); // Czas oczekiwania na stronie głównej
	
			
			//// Decyzja o dalszym działaniu
			//const action_one = aiModule.decideNextActionOne();
	        
			let action_one = 'explore_page';
			console.log('Wylosowano akcje: '+action_one);
	
			if(action_one == 'explore_popular_post'){
				//pobrać z bazy danych losowego popularnego posta
				const randomPopularPost = await getRandomPopularPost(randomBlog.id);
				
				
				//przesun myszkę na linka w popular post i kliknij
				let url = randomPopularPost.url;
				await moveAndClickOnLink(page, url, '#PopularPosts1', '#PopularPosts2');
				
				
				
			}else if(action_one == 'explore_recommended_post'){
				//pobrać z bazy danych rekomendowanego posta
				const randomRecommendedPost = await getRandomRecommendedPost(randomBlog.id);				
	
				//przesun myszkę na linka w recommended post i kliknij
				let url = randomRecommendedPost.url;
				await moveAndClickOnLink(page, url, '#FeaturedPost1', '#FeaturedPost2');	
				
				
			}else if(action_one == 'explore_label_link'){
				//pobrać z bazy losowe label links
				const randomLabelLink = await getRandomLabelLink(randomBlog.id);

				//przesun myszkę na linka w label link i kliknij
				let url = randomLabelLink.url;
				await moveAndClickOnLink(page, url, '#Label1', '#Label2');
				
				
			}else if(action_one == 'explore_sitemain_post'){
				//pobrać z bazy losowe sitemain post
				const randomSitemainPost = await getRandomSitemainPost(randomBlog.id);		
				
				//przesun myszkę na linka w label link i kliknij
				let url = randomSitemainPost.url;
				await moveAndClickOnLink(page, url, '.post-title');				
				
			}else if(action_one == 'explore_external_site'){
				//pobrać z bazy losowe external site
				const randomExternalSite = await getRandomExternalSite(randomBlog.id);				

				//przesun myszkę na linka w label link i kliknij
				let url = randomExternalSite.url;
				await moveAndClickOnLink(page, url, '#LinkList1','#LinkList2');	
				
				
			}/*else if(action_one == 'explore_newest_post'){
				//pobrać z bazy losowe newest post
				const random_post = await getRandomPost();						
				
				
			}*/	else if(action_one == 'explore_page'){
				//pobrać z bazy losowe page
				const randomPage = await getRandomPage(randomBlog.id);					
				
				//przesun myszkę na linka w label link i kliknij
				let url = randomPage.url;
				await moveAndClickOnLink(page, url, '#PageList1','#PageList2');				
				
			}
			
			//Koniec dalszego działania

        } catch (error) {
            console.error(`Błąd podczas przetwarzania bloga ID: ${randomBlog.id}:`, error.message);
        } finally {
            // Zamknięcie zasobów w finally
            if (page) await page.close();
            if (context) await context.close();
            if (browser) await browser.close();

			// Zakończenie przeglądania
			console.log('Zamykamy przeglądarkę...');
        }		
		

		
	} catch (error) {
		console.error('Błąd:', error.message);
	} finally {
		// Zamknij połączenie z bazą danych
		await closeConnection();
		console.log('Skrypt zakończony.');
  }



   
})();




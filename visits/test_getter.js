const { chromium } = require('playwright');
const { getBlogs,getPosts,getLabels, closeConnection, getInternalSites,getExternalInBloggerSites,getExternalOutBloggerSites,
		getPages,getRecommendedPosts,getPopularPosts

		} = require('./db');
		
const { scrollToBottom, scrollToTop, moveMouse } = require('./utils');


(async () => {
  try {
    const labels = await getLabels();
    console.log('Pobrano listę etykiet dla blog_id =null:', labels);



    //for (const label of labels) {
      //console.log(`Otwieranie URL: ${label.url}`);

    //}



  } catch (error) {
    console.error('Wystąpił błąd:', error.message);
  } finally {
    // Zamknij połączenie z bazą danych
    await closeConnection();
    console.log('Skrypt zakończony.');
  }
})();



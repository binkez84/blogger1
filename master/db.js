const mysql = require('mysql2/promise');

// Konfiguracja połączenia z bazą danych
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Blogger123!',
  database: 'blog_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});







// Walidacja blog_id
function validateBlogId(blogId) {
  if (!Number.isInteger(blogId) || blogId <= 0) {
    throw new Error('Invalid blog_id: It must be a positive integer.');
  }
}

// Funkcja: Pobieranie listy blogów
async function getBlogs() {
  const [rows] = await pool.query('SELECT url FROM Blogs ORDER BY created_at DESC');
  return rows;
}



// Funkcja: Pobieranie popularnych postów dla blog_id
async function getPopularPosts(blogId) {
  validateBlogId(blogId);
  const [rows] = await pool.query(
    'SELECT url, title FROM Popular_posts WHERE blog_id = ?',
    [blogId]
  );
  return rows;
}

// Funkcja: Pobieranie rekomendowanych postów dla blog_id
async function getRecommendedPosts(blogId) {
  validateBlogId(blogId);
  const [rows] = await pool.query(
    'SELECT url, title FROM Recommended_posts WHERE blog_id = ?',
    [blogId]
  );
  return rows;
}

// Funkcja: Pobieranie stron dla blog_id
async function getPages(blogId) {
  validateBlogId(blogId);
  const [rows] = await pool.query(
    'SELECT url, title FROM Pages WHERE blog_id = ?',
    [blogId]
  );
  return rows;
}

// Funkcja: Pobieranie stron zewnętrznych (external_outblogger) spoza blogera dla blog_id
async function getExternalOutBloggerSites(blogId) {
  validateBlogId(blogId);
  const [rows] = await pool.query(
    "SELECT url, title FROM External_sites WHERE blog_id = ? AND type = 'external_outblogger'",
    [blogId]
  );
  return rows;
}

// Funkcja: Pobieranie linków-stron zewnętrznych (external_inblogger) dla blog_id
async function getExternalInBloggerSites(blogId) {
  validateBlogId(blogId);
  const [rows] = await pool.query(
    "SELECT url, title FROM External_sites WHERE blog_id = ? AND type = 'external_inblogger'",
    [blogId]
  );
  return rows;
}

// Funkcja: Pobieranie linków-stron wewnętrznych (internal) blogera dla blog_id
async function getInternalSites(blogId) {
  validateBlogId(blogId);
  const [rows] = await pool.query(
    "SELECT url, title FROM External_sites WHERE blog_id = ? AND type = 'internal'",
    [blogId]
  );
  return rows;
}

// Funkcja: Pobieranie etykiet (labels) dla blog_id
async function getLabels(blogId) {
  validateBlogId(blogId);
  const [rows] = await pool.query(
    'SELECT url, title FROM Label_links WHERE blog_id = ?',
    [blogId]
  );
  return rows;
}

// Funkcja: Pobieranie postów dla blog_id (archiwum)
async function getPosts(blogId) {
  validateBlogId(blogId);
  const [rows] = await pool.query(
    'SELECT url, title FROM Posts WHERE blog_id = ?',
    [blogId]
  );
  return rows;
}

// Funkcja: Zamykanie połączenia z bazą danych
async function closeConnection() {
  await pool.end();
  console.log('Połączenie z bazą danych zamknięte.');
}


/////////////////////////////////////////////////////////////////////////////
///////Funkcje Next action START - pobierz///////////////////////////////////
/////////////////////////////////////////////////////////////////////////////



// Zbiór używanych indeksów, aby unikać powtórzeń
let usedIndexes = new Set();

async function getRandomBlog() {
  try {
    // Pobranie listy blogów bezpośrednio z bazy danych
    const [rows] = await pool.query('SELECT id, url FROM Blogs');
    
    if (rows.length === 0) {
      throw new Error('Brak blogów w bazie danych.');
    }

    // Sprawdź, czy wszystkie indeksy zostały użyte
    if (usedIndexes.size === rows.length) {
      //console.log('Wszystkie blogi zostały wylosowane. Resetuję zbiór.');
      usedIndexes.clear(); // Resetuj zbiór używanych indeksów
    }

    // Losowanie indeksu, który nie został jeszcze użyty
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * rows.length);
    } while (usedIndexes.has(randomIndex));

    // Dodanie wylosowanego indeksu do zbioru używanych
    usedIndexes.add(randomIndex);

    // Zwraca losowy blog
    //console.log(`URL: ${rows[randomIndex].url}`);
    return rows[randomIndex];
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
}



// Funkcja: Losowanie jednego popularnego posta
async function getRandomPopularPost(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie listy blogów bezpośrednio z bazy danych
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Popular_posts WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak popular posts w bazie danych.');
    }

    // Sprawdź, czy wszystkie indeksy zostały użyte
    if (usedIndexes.size === rows.length) {
     // console.log('Wszystkie popularne posty zostały wylosowane. Resetuję zbiór.');
      usedIndexes.clear(); // Resetuj zbiór używanych indeksów
    }

    // Losowanie indeksu, który nie został jeszcze użyty
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * rows.length);
    } while (usedIndexes.has(randomIndex));

    // Dodanie wylosowanego indeksu do zbioru używanych
    usedIndexes.add(randomIndex);

    // Zwraca losowy blog
    //console.log(`URL: ${rows[randomIndex].url}`);
    return rows[randomIndex];
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
}


// Funkcja: Losowanie jednego rekomendowanego posta
async function getRandomRecommendedPost(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie listy blogów bezpośrednio z bazy danych
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Recommended_posts WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak recommended posts w bazie danych.');
    }

    // Sprawdź, czy wszystkie indeksy zostały użyte
    if (usedIndexes.size === rows.length) {
      //console.log('Wszystkie rekomendowane posty zostały wylosowane. Resetuję zbiór.');
      usedIndexes.clear(); // Resetuj zbiór używanych indeksów
    }

    // Losowanie indeksu, który nie został jeszcze użyty
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * rows.length);
    } while (usedIndexes.has(randomIndex));

    // Dodanie wylosowanego indeksu do zbioru używanych
    usedIndexes.add(randomIndex);

    // Zwraca losowy blog
    //console.log(`URL: ${rows[randomIndex].url}`);
    return rows[randomIndex];
  } catch (error) {
    throw new Error(`Błąd podczas pobierania rekomendowanych postow: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego label linksa
async function getRandomLabelLink(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie listy blogów bezpośrednio z bazy danych
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Label_links WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak label linksow w bazie danych.');
    }

    // Sprawdź, czy wszystkie indeksy zostały użyte
    if (usedIndexes.size === rows.length) {
      //console.log('Wszystkie label linksy zostały wylosowane. Resetuję zbiór.');
      usedIndexes.clear(); // Resetuj zbiór używanych indeksów
    }

    // Losowanie indeksu, który nie został jeszcze użyty
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * rows.length);
    } while (usedIndexes.has(randomIndex));

    // Dodanie wylosowanego indeksu do zbioru używanych
    usedIndexes.add(randomIndex);

    // Zwraca losowy blog
   // console.log(`URL: ${rows[randomIndex].url}`);
    return rows[randomIndex];
  } catch (error) {
    throw new Error(`Błąd podczas pobierania label linksow: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego sitemain_posta
async function getRandomSitemainPost(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie listy blogów bezpośrednio z bazy danych
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Sitemain_posts WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak sitemain postow w bazie danych.');
    }

    // Sprawdź, czy wszystkie indeksy zostały użyte
    if (usedIndexes.size === rows.length) {
      //console.log('Wszystkie sitemain posty zostały wylosowane. Resetuję zbiór.');
      usedIndexes.clear(); // Resetuj zbiór używanych indeksów
    }

    // Losowanie indeksu, który nie został jeszcze użyty
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * rows.length);
    } while (usedIndexes.has(randomIndex));

    // Dodanie wylosowanego indeksu do zbioru używanych
    usedIndexes.add(randomIndex);

    // Zwraca losowy blog
    //console.log(`URL: ${rows[randomIndex].url}`);
    return rows[randomIndex];
  } catch (error) {
    throw new Error(`Błąd podczas pobierania sitemain_posts: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego external_site
async function getRandomExternalSite(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie listy External sites bezpośrednio z bazy danych
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM External_sites WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak external sites w bazie danych.');
    }

    // Sprawdź, czy wszystkie indeksy zostały użyte
    if (usedIndexes.size === rows.length) {
     // console.log('Wszystkie external sites zostały wylosowane. Resetuję zbiór.');
      usedIndexes.clear(); // Resetuj zbiór używanych indeksów
    }

    // Losowanie indeksu, który nie został jeszcze użyty
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * rows.length);
    } while (usedIndexes.has(randomIndex));

    // Dodanie wylosowanego indeksu do zbioru używanych
    usedIndexes.add(randomIndex);

    // Zwraca losowy blog
    //console.log(`URL: ${rows[randomIndex].url}`);
    return rows[randomIndex];
  } catch (error) {
    throw new Error(`Błąd podczas pobierania external sites: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego explore_newest_post
async function getRandomPost(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie listy posts bezpośrednio z bazy danych
    const [rows] = await pool.query(`SELECT id, url, mobile_url FROM Posts WHERE blog_id = ${blogId} ORDER BY id ASC LIMIT 5 OFFSET 0;`);
    
    if (rows.length === 0) {
      throw new Error('Brak posts archiwum w bazie danych.');
    }

    // Sprawdź, czy wszystkie indeksy zostały użyte
    if (usedIndexes.size === rows.length) {
      //console.log('Wszystkie sitemain posty zostały wylosowane. Resetuję zbiór.');
      usedIndexes.clear(); // Resetuj zbiór używanych indeksów
    }

    // Losowanie indeksu, który nie został jeszcze użyty
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * rows.length);
    } while (usedIndexes.has(randomIndex));

    // Dodanie wylosowanego indeksu do zbioru używanych
    usedIndexes.add(randomIndex);

    // Zwraca losowy blog
    //console.log(`URL: ${rows[randomIndex].url}`);
    return rows[randomIndex];
  } catch (error) {
    throw new Error(`Błąd podczas pobierania posts archiwum: ${error.message}`);
  }
}


// Funkcja: Losowanie jednego explore_page
async function getRandomPage(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie listy pages bezpośrednio z bazy danych
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Pages WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak pages w bazie danych.');
    }

    // Sprawdź, czy wszystkie indeksy zostały użyte
    if (usedIndexes.size === rows.length) {
      //console.log('Wszystkie pagesy zostały wylosowane. Resetuję zbiór.');
      usedIndexes.clear(); // Resetuj zbiór używanych indeksów
    }

    // Losowanie indeksu, który nie został jeszcze użyty
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * rows.length);
    } while (usedIndexes.has(randomIndex));

    // Dodanie wylosowanego indeksu do zbioru używanych
    usedIndexes.add(randomIndex);

    // Zwraca losowy blog
   // console.log(`URL: ${rows[randomIndex].url}`);
    return rows[randomIndex];
  } catch (error) {
    throw new Error(`Błąd podczas pobierania pages: ${error.message}`);
  }
}



/////////////////////////////////////////////////////////////////////
///////Funkcje Next action STOP /////////////////////////////////////
/////////////////////////////////////////////////////////////////////













// Eksport funkcji
module.exports = {
  getBlogs,
  getRandomBlog,
  getPopularPosts,
  getRecommendedPosts,
  getPages,
  getExternalOutBloggerSites,
  getExternalInBloggerSites,
  getInternalSites,
  getLabels,
  getPosts,
  
  getRandomPopularPost,
  getRandomRecommendedPost,
  getRandomLabelLink,
  getRandomExternalSite,
  getRandomSitemainPost,
  getRandomPage,
  getRandomPost,
  
  closeConnection,
};





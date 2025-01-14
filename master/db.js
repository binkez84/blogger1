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


// Funkcja: Losowanie jednego bloga bez zależności od innych funkcji
async function getRandomBlog() {
  try {
    // Pobranie listy blogów bezpośrednio z bazy danych
    const [rows] = await pool.query('SELECT id,url FROM Blogs ORDER BY created_at DESC');
    
    if (rows.length === 0) {
      throw new Error('Brak blogów w bazie danych.');
    }

    // Losowanie jednego bloga
    const randomIndex = Math.floor(Math.random() * rows.length);
    return rows[randomIndex]; // Zwraca jeden losowy blog
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
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
  console.log('Połączenie z bazą danych zamknięte !!!.');
}


/////////////////////////////////////////////////////////////////////////////
///////Funkcje Next action START - pobierz///////////////////////////////////
/////////////////////////////////////////////////////////////////////////////


// Funkcja: Losowanie jednego popularnego posta
async function getRandomPopularPost(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie listy popularnych bezpośrednio z bazy danych
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Popular_posts WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak postów w bazie danych.');
    }

    // Losowanie jednego bloga
    const randomIndex = Math.floor(Math.random() * rows.length);
    return rows[randomIndex]; // Zwraca jeden losowy blog
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego rekomendowanego posta
async function getRandomRecommendedPost(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie jednego rekomendowanego posta
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Recommended_posts WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak postów w bazie danych.');
    }

    // Losowanie jednego posta
    const randomIndex = Math.floor(Math.random() * rows.length);
    return rows[randomIndex]; // Zwraca jeden losowy blog
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego label linksa
async function getRandomLabelLink(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie jednego label Linka
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Label_links WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak postów w bazie danych.');
    }

    // Losowanie jednego label linka
    const randomIndex = Math.floor(Math.random() * rows.length);
    return rows[randomIndex]; // Zwraca jeden losowy blog
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego sitemain_posta
async function getRandomSitemainPost(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie jednego label Linka
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Sitemain_posts WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak postów w bazie danych.');
    }

    // Losowanie jednego sitemain_post
    const randomIndex = Math.floor(Math.random() * rows.length);
    return rows[randomIndex]; // Zwraca jeden losowy blog
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego external_site
async function getRandomExternalSite(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie jednego label Linka
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM External_sites WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak postów w bazie danych.');
    }

    // Losowanie jednego external_sites
    const randomIndex = Math.floor(Math.random() * rows.length);
    return rows[randomIndex]; 
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
}

// Funkcja: Losowanie jednego explore_newest_post
async function getRandomPost(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie jednego Post
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Posts WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak postów w bazie danych.');
    }

    // Losowanie jednego post
    const randomIndex = Math.floor(Math.random() * rows.length);
    return rows[randomIndex]; 
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
  }
}


// Funkcja: Losowanie jednego explore_page
async function getRandomPage(blogId) {
  validateBlogId(blogId);
  try {
    // Pobranie jednego Page
    const [rows] = await pool.query(`SELECT id,url,mobile_url FROM Pages WHERE blog_id = ${blogId} ORDER BY id DESC`);
    
    if (rows.length === 0) {
      throw new Error('Brak postów w bazie danych.');
    }

    // Losowanie jednego page
    const randomIndex = Math.floor(Math.random() * rows.length);
    return rows[randomIndex]; 
  } catch (error) {
    throw new Error(`Błąd podczas pobierania blogów: ${error.message}`);
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



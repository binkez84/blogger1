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

// Eksport funkcji
module.exports = {
  getBlogs,
  getPopularPosts,
  getRecommendedPosts,
  getPages,
  getExternalOutBloggerSites,
  getExternalInBloggerSites,
  getInternalSites,
  getLabels,
  getPosts,
  closeConnection,
  openPageByUrl,
};

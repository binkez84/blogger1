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

// Funkcja: Pobieranie listy blogów
async function getBlogs() {
  const [rows] = await pool.query('SELECT url FROM Blogs ORDER BY created_at DESC');
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
  closeConnection,
};


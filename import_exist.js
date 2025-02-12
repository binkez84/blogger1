const { chromium, firefox, webkit } = require("playwright");
const mysql = require("mysql2/promise");
const path = require("path");
const { exec } = require('child_process');







(async () => {

    // Połącz z bazą danych
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    });

    console.log('Połączono z bazą danych.');

  /////////////wpisz start skryptu
    const scriptName = path.basename(__filename);

    // Sprawdzenie, czy rekord już istnieje
    const [rows] = await connection.execute(
      `SELECT 1 FROM Active_scripts WHERE script_name = ?`,
      [scriptName]
    );

    if (rows.length > 0) {
      // Jeśli istnieje, aktualizujemy czas
      await connection.execute(
        `UPDATE Active_scripts SET last_datetime = NOW() WHERE script_name = ? `,
        [scriptName]
      );
      console.log(`Zaktualizowano czas uruchomienia (start) dla skryptu: ${scriptName} - ${new Date().toISOString()}`);
    } else {
      // Jeśli nie istnieje, wstawiamy nowy rekord
      await connection.execute(
        `INSERT INTO Active_scripts (script_name, last_datetime) VALUES (?, NOW())`,
        [scriptName]
      );
      console.log(`Dodano nowy wpis (start) dla skryptu: ${scriptName}`);
    }



    // Pobierz wszystkie blogi z tabeli Blogs
    const [blogs] = await connection.execute('SELECT id, url FROM Blogs');

    if (!blogs.length) {
        console.log('Brak blogów do przetworzenia.');
        await connection.end();
        return;
    }


    await connection.execute(`UPDATE Blogs SET exist = NULL `);



    for (const blog of blogs) {
        console.log(`Przetwarzam blog: ${blog.url}`);

        //////////Exist External_ites////////////
        let [externals] = await connection.execute(`SELECT id, url FROM External_sites WHERE blog_id = ${blog.id}`);
        if (!externals.length) {
            console.log('Brak Eksternal_sites.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Eksternal_sites.');

            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'External_sites') WHERE id = ${blog.id}`
            );

        }

        //////////Exist Inside_pages////////////
        let [inside_pages] = await connection.execute(`SELECT id, url FROM Inside_pages WHERE blog_id = ${blog.id}`);
        if (!inside_pages.length) {
            console.log('Brak Inside_pages.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Inside_pages.');
            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Inside_pages') WHERE id = ${blog.id}`
            );
        }


        //////////Exist Inside_posts////////////
        let [inside_posts] = await connection.execute(`SELECT id, url FROM Inside_posts WHERE blog_id = ${blog.id}`);
        if (!inside_posts.length) {
            console.log('Brak Inside_posts.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Inside_posts.');
            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Inside_posts') WHERE id = ${blog.id}`
            );
        }


        //////////Exist Label_links////////////
        let [label_links] = await connection.execute(`SELECT id, url FROM Label_links WHERE blog_id = ${blog.id}`);
        if (!label_links.length) {
            console.log('Brak Label_links.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Label_links.');

            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Label_links') WHERE id = ${blog.id}`
            );
        }


        //////////Exist Pages////////////
        let [pages] = await connection.execute(`SELECT id, url FROM Pages WHERE blog_id = ${blog.id}`);
        if (!pages.length) {
            console.log('Brak Pages.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Pages.');
            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Pages') WHERE id = ${blog.id}`
            );
        }


        //////////Exist Popular_posts////////////
        let [popular_posts] = await connection.execute(`SELECT id, url FROM Popular_posts WHERE blog_id = ${blog.id}`);
        if (!popular_posts.length) {
            console.log('Brak Popular_posts.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Popular_posts.');

            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Popular_posts') WHERE id = ${blog.id}`
            );
        }


        //////////Exist Recommended_posts////////////
        let [recommended_posts] = await connection.execute(`SELECT id, url FROM Recommended_posts WHERE blog_id = ${blog.id}`);
        if (!recommended_posts.length) {
            console.log('Brak Recommended_posts.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Recommended_posts.');

            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Recommended_posts') WHERE id = ${blog.id}`
            );
        }




        //////////Exist Recommended_posts////////////
        let [recommended_blogs] = await connection.execute(`SELECT id, url FROM Recommended_blogs WHERE blog_id = ${blog.id}`);
        if (!recommended_blogs.length) {
            console.log('Brak Recommended_blogs.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Recommended_blogs.');

            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Recommended_blogs') WHERE id = ${blog.id}`
            );

        }



        //////////Exist Sitemain_posts////////////
        let [sitemain_posts] = await connection.execute(`SELECT id, url FROM Sitemain_posts WHERE blog_id = ${blog.id}`);
        if (!sitemain_posts.length) {
            console.log('Brak Sitemain_posts.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Sitemain_posts.');

            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Sitemain_posts') WHERE id = ${blog.id}`
            );


        }


        //////////Exist newestpost -> Posts////////////
        let [posts] = await connection.execute(`SELECT id, url FROM Posts WHERE blog_id = ${blog.id}`);
        if (!posts.length) {
            console.log('Brak Posts.');

        }else{
            //zapisz w Blogs->exist;
            console.log('Jest Posts.');
            
            await connection.execute(
                `UPDATE Blogs SET exist = CONCAT(IFNULL(exist, ''), 
                IF(exist IS NOT NULL AND exist != '', ',', ''), 'Posts') WHERE id = ${blog.id}`
            );



        }




 
    }/*end for*/


    await connection.end();

    ///////////zapisz end
   // Połączenie z bazą danych
   const con = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Blogger123!',
        database: 'blog_database'
    });

    console.log('Połączono z bazą danych.');

    // Sprawdzenie, czy rekord już istnieje
    const [r] = await con.execute(
      `SELECT 1 FROM Active_scripts WHERE script_name = ?`,
      [scriptName]
    );

    if (r.length > 0) {
      // Jeśli istnieje, aktualizujemy czas
      await con.execute(
        `UPDATE Active_scripts SET end_datetime = NOW() WHERE script_name = ?`,
        [scriptName]
      );
      console.log(`Zaktualizowano czas uruchomienia (end) dla skryptu: ${scriptName} - ${new Date().toISOString()}`);
    } 

    await con.end();



    console.log("Skrypt zakończony.");
    process.exit(0); // Wymuszone zakończenie skryptu
    console.log('Przetwarzanie zakończone.');
    
})();






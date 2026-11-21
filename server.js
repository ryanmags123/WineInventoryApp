const express = require('express');
const mariadb = require('mariadb');
const path = require('path');
require('dotenv').config();

// Initialize Express app FIRST before using any app.get or app.use
const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets out of the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection Pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'winerydb',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5
});

// GET Route: Fetch wineries from MariaDB (Maps 'long' column to 'lng' for Leaflet)
app.get('/api/wineries', async (req, res) => {
  let conn;

  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT *, `long` AS lng FROM winery');
    res.json(rows);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Failed to retrieve wineries' });
  } finally {
    if (conn) conn.release();
  }
});

// POST Route: Save a new winery to MariaDB using the `long` column name
app.post('/api/wineries', async (req, res) => {
  const { name, location, ava, grapes, lat, lng, visited } = req.body;
  let conn;

  try {
    conn = await pool.getConnection();

    const sql = `
      INSERT INTO winery (name, location, ava, grapes, lat, \`long\`, visited)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await conn.query(sql, [
      name,
      location,
      ava,
      grapes,
      lat,
      lng,
      visited || 'yes'
    ]);

    res.status(201).json({
      message: 'Winery added successfully',
      id: Number(result.insertId)
    });

  } catch (err) {
    console.error('Database insert error:', err);
    res.status(500).json({ error: 'Failed to save winery' });
  } finally {
    if (conn) conn.release();
  }
});

// PUT Route: Update an existing winery in MariaDB
app.put('/api/wineries/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, ava, grapes, lat, lng, visited } = req.body;
  let conn;

  try {
    conn = await pool.getConnection();

    const sql = `
      UPDATE winery 
      SET name = ?, location = ?, ava = ?, grapes = ?, lat = ?, \`long\` = ?, visited = ?
      WHERE id = ?
    `;

    const result = await conn.query(sql, [
      name,
      location,
      ava,
      grapes,
      lat,
      lng,
      visited,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Winery not found' });
    }

    res.json({ message: 'Winery updated successfully' });

  } catch (err) {
    console.error('Database update error:', err);
    res.status(500).json({ error: 'Failed to update winery' });
  } finally {
    if (conn) conn.release();
  }
});

// DELETE Route: Delete an existing winery from MariaDB
app.delete('/api/wineries/:id', async (req, res) => {
  const { id } = req.params;
  let conn;

  try {
    conn = await pool.getConnection();

    const result = await conn.query(
      'DELETE FROM winery WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Winery not found' });
    }

    res.json({ message: 'Winery deleted successfully' });

  } catch (err) {
    console.error('Database delete error:', err);
    res.status(500).json({ error: 'Failed to delete winery' });
  } finally {
    if (conn) conn.release();
  }
});


// ==========================
// GET ROUTE: LOAD WINES
// ==========================

app.get('/api/wines', async (req, res) => {

    let conn;

    try {
        conn = await pool.getConnection();

        const sql = `
            SELECT
                id,
                producer,
                wine_name AS wineName,
                vintage,
                varietal,
                region,
                quantity,
                price
            FROM wines
            ORDER BY created_at DESC
        `;

        const rows = await conn.query(sql);

        res.json(rows);

    } catch (err) {
        console.error('Wine retrieval error:', err);
        res.status(500).json({
            error: 'Failed to retrieve wines'
        });

    } finally {
        if (conn) conn.release();
    }
});



// ==========================
// POST ROUTE: ADD WINE
// ==========================

app.post('/api/wines', async (req, res) => {

  const {
    producer,
    wineName,
    vintage,
    varietal,
    region,
    quantity,
    price
  } = req.body;

  let conn;

  try {

    // Validate required information
    if (!producer || !wineName ||
        !Number.isFinite(Number(quantity)) ||
        !Number.isFinite(Number(price))) {

      return res.status(400).json({
        error: 'Missing or invalid wine information'
      });
    }

    // Connect to MariaDB
    conn = await pool.getConnection();

    // SQL statement to insert a new wine
    const sql = `
      INSERT INTO wines
      (producer, wine_name, vintage, varietal, region, quantity, price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    // Execute SQL with form information
    const result = await conn.query(sql, [
      producer,
      wineName,
      vintage || null,
      varietal || null,
      region || null,
      quantity,
      price
    ]);

    // Send successful response
    res.status(201).json({
      message: 'Wine added successfully',
      id: Number(result.insertId)
    });

  } catch (err) {

    console.error('Wine insert error:', err);

    res.status(500).json({
      error: 'Failed to save wine'
    });

  } finally {

    if (conn) conn.release();

  }

});


 // ==========================
 // PUT ROUTE: UPDATE WINE
 // ==========================

app.put('/api/wines/:id', async (req, res) => {

    const { id } = req.params;

    const {
        producer,
        wineName,
        vintage,
        varietal,
        region,
        quantity,
        price
    } = req.body;

    let conn;

    try {

        conn = await pool.getConnection();

        const sql = `
            UPDATE wines
            SET
                producer = ?,
                wine_name = ?,
                vintage = ?,
                varietal = ?,
                region = ?,
                quantity = ?,
                price = ?
            WHERE id = ?
        `;

        const result = await conn.query(sql, [
            producer,
            wineName,
            vintage || null,
            varietal || null,
            region || null,
            quantity,
            price,
            id
        ]);

        if (result.affectedRows === 0) {

            return res.status(404).json({
                error: 'Wine not found'
            });

        }

        res.json({
            message: 'Wine updated successfully'
        });

    } catch (err) {

        console.error('Wine update error:', err);

        res.status(500).json({
            error: 'Failed to update wine'
        });

    } finally {

        if (conn) conn.release();

    }

});


 // ==========================
 // DELETE ROUTE: DELETE WINE
 // ==========================

app.delete('/api/wines/:id', async (req, res) => {

    const { id } = req.params;

    let conn;

    try {

        conn = await pool.getConnection();

        const result = await conn.query(
            'DELETE FROM wines WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {

            return res.status(404).json({
                error: 'Wine not found'
            });

        }

        res.json({
            message: 'Wine deleted successfully'
        });

    } catch (err) {

        console.error('Wine delete error:', err);

        res.status(500).json({
            error: 'Failed to delete wine'
        });

    } finally {

        if (conn) conn.release();

    }

});


// Explicit Root Handler: Renders public/index.html on http://localhost:3000
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'wine-dashboard.html'));
});

// Outputs Which Directory app is running on via the terminal
app.listen(PORT, () => {
  console.log('WINE INVENTORY APP');
  console.log('Project location:', __dirname);
  console.log(`Server running on http://localhost:${PORT}`);
});



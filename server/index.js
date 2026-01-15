const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "library.db");

let db = null;

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    // Add image column if it doesn't exist (migration)
    try {
      // Check if columns exist by trying to select them
      db.exec("SELECT image, student_class FROM borrowed_books LIMIT 1");
      console.log("Image and class columns already exist");
      
      // Check if there are records without class and update them
      try {
        const recordsWithoutClass = db.exec("SELECT id FROM borrowed_books WHERE student_class IS NULL OR student_class = ''");
        if (recordsWithoutClass.length > 0 && recordsWithoutClass[0].values.length > 0) {
          console.log(`Found ${recordsWithoutClass[0].values.length} records without class. They will be excluded from the list.`);
          // Optionally, you could set a default class here:
          // db.exec("UPDATE borrowed_books SET student_class = 'Unknown' WHERE student_class IS NULL OR student_class = ''");
          // saveDatabase();
        }
      } catch (updateErr) {
        // Ignore if update fails
      }
    } catch (err) {
      // Columns don't exist, add them
      try {
        db.exec("ALTER TABLE borrowed_books ADD COLUMN image TEXT");
        console.log("Image column added to existing database");
      } catch (alterErr) {
        // Column might already exist, ignore
      }
      try {
        db.exec("ALTER TABLE borrowed_books ADD COLUMN student_class TEXT");
        saveDatabase();
        console.log("Student class column added to existing database");
      } catch (alterErr) {
        console.error("Error adding student_class column:", alterErr);
      }
    }
  } else {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE IF NOT EXISTS borrowed_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        student_class TEXT NOT NULL,
        book_code TEXT NOT NULL,
        borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        return_date DATETIME,
        returned INTEGER DEFAULT 0,
        image TEXT
      );
    `);
    saveDatabase();
    console.log("New database created with image column");
  }
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Helper to convert SQL.js result to object
function rowToObject(row, columns) {
  const obj = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}


app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Middleware to check database is ready
app.use("/api", (req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: "Database not initialized. Please wait a moment and try again." });
  }
  next();
});

// Root route
app.get("/", (_req, res) => {
  res.json({ 
    message: "Library Borrowing System API", 
    version: "1.0.0",
    databaseReady: !!db,
    endpoints: {
      "POST /api/borrow": "Borrow a book",
      "POST /api/return": "Return a book",
      "GET /api/borrowed": "List all borrowed books",
      "POST /api/borrow-record": "Get borrow record for face comparison",
      "GET /api/health": "Check API and database status",
      "DELETE /api/clear-all": "Clear all borrowed books (reset database)"
    }
  });
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  if (!db) {
    return res.status(503).json({ 
      status: "error", 
      database: "not initialized",
      message: "Database is still initializing. Please wait."
    });
  }
  
  try {
    // Test database query
    const testResult = db.exec("SELECT COUNT(*) as count FROM borrowed_books WHERE returned = 0");
    const count = testResult.length > 0 ? testResult[0].values[0][0] : 0;
    
    return res.json({ 
      status: "ok", 
      database: "ready",
      activeBorrows: count
    });
  } catch (err) {
    return res.status(500).json({ 
      status: "error", 
      database: "error",
      error: err.message 
    });
  }
});

app.post("/api/borrow", (req, res) => {
  const { studentId, studentClass, bookCode, image } = req.body || {};
  if (!studentId || !bookCode || !studentClass) {
    return res.status(400).json({ error: "studentId, studentClass, and bookCode are required." });
  }
  if (!image) {
    return res.status(400).json({ error: "Image is required." });
  }

  try {
    // Truncate image if too long (SQLite TEXT can handle large strings, but let's be safe)
    const imageData = String(image).substring(0, 10000000); // 10MB limit
    
    const stmt = db.prepare("INSERT INTO borrowed_books (student_id, student_class, book_code, image) VALUES (?, ?, ?, ?)");
    stmt.bind([String(studentId), String(studentClass), String(bookCode), imageData]);
    stmt.step();
    stmt.free();
    
    const lastIdResult = db.exec("SELECT last_insert_rowid() as id");
    const lastId = lastIdResult[0].values[0][0];
    
    const selectStmt = db.prepare("SELECT * FROM borrowed_books WHERE id = ?");
    selectStmt.bind([lastId]);
    selectStmt.step();
    const result = selectStmt.getAsObject();
    selectStmt.free();
    
    if (!result || !result.id) {
      return res.status(500).json({ error: "Failed to retrieve saved record." });
    }
    
    console.log(`Borrow record saved: ID=${result.id}, Student=${result.student_id}, Class=${result.student_class}, Book=${result.book_code}, HasImage=${!!result.image}`);
    
    saveDatabase();
    return res.status(201).json(result);
  } catch (err) {
    console.error("Error in /api/borrow:", err);
    return res.status(500).json({ error: "Failed to save borrow record: " + err.message });
  }
});

// Get borrow record (for face comparison)
app.post("/api/borrow-record", (req, res) => {
  const { studentId, bookCode } = req.body || {};
  if (!studentId || !bookCode) {
    return res.status(400).json({ error: "studentId and bookCode are required." });
  }

  try {
    const stmt = db.prepare(
      "SELECT * FROM borrowed_books WHERE student_id = ? AND book_code = ? AND returned = 0 ORDER BY borrow_date DESC LIMIT 1"
    );
    stmt.bind([String(studentId), String(bookCode)]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();

    if (!row || !row.id) {
      return res
        .status(404)
        .json({ error: "No active borrow record found for this student and book." });
    }

    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to retrieve borrow record." });
  }
});

app.post("/api/return", (req, res) => {
  const { studentId, bookCode } = req.body || {};
  if (!studentId || !bookCode) {
    return res.status(400).json({ error: "studentId and bookCode are required." });
  }

  try {
    const stmt = db.prepare(
      "SELECT * FROM borrowed_books WHERE student_id = ? AND book_code = ? AND returned = 0 ORDER BY borrow_date DESC LIMIT 1"
    );
    stmt.bind([String(studentId), String(bookCode)]);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();

    if (!row || !row.id) {
      return res
        .status(404)
        .json({ error: "No active borrow record found for this student and book." });
    }

    const updateStmt = db.prepare(
      "UPDATE borrowed_books SET returned = 1, return_date = datetime('now') WHERE id = ?"
    );
    updateStmt.bind([row.id]);
    updateStmt.step();
    updateStmt.free();

    const selectStmt = db.prepare("SELECT * FROM borrowed_books WHERE id = ?");
    selectStmt.bind([row.id]);
    selectStmt.step();
    const updatedRow = selectStmt.getAsObject();
    selectStmt.free();
    
    saveDatabase();
    return res.json(updatedRow);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update borrow record." });
  }
});

app.get("/api/borrowed", (_req, res) => {
  try {
    const result = db.exec(
      "SELECT id, student_id, student_class, book_code, borrow_date, image FROM borrowed_books WHERE returned = 0 ORDER BY student_class, borrow_date DESC"
    );
    
    if (result.length === 0) {
      return res.json([]);
    }
    
    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = rowToObject(row, columns);
      // Ensure image is included even if null
      if (!obj.hasOwnProperty('image')) {
        obj.image = null;
      }
      // Ensure student_class has a default value if null
      if (!obj.student_class) {
        obj.student_class = null;
      }
      return obj;
    });
    
    console.log(`Returning ${rows.length} borrowed books`);
    return res.json(rows);
  } catch (err) {
    console.error("Error in /api/borrowed:", err);
    return res.status(500).json({ error: "Failed to load borrowed books: " + err.message });
  }
});

// Clear all borrowed books (reset database)
app.delete("/api/clear-all", (_req, res) => {
  try {
    // Delete all records from the table
    db.exec("DELETE FROM borrowed_books");
    saveDatabase();
    
    console.log("All borrowed books cleared");
    return res.json({ 
      message: "All borrowed books have been cleared successfully.",
      count: 0
    });
  } catch (err) {
    console.error("Error clearing database:", err);
    return res.status(500).json({ error: "Failed to clear database: " + err.message });
  }
});

// Initialize database and start server
initDatabase().then(() => {
  console.log("Database initialized");
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});


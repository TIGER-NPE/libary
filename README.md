## Library Book Borrowing System (MVP)

This is a simple full-stack MVP for recording book borrowing and returning in a school library.  
Frontend is a React PWA with face recognition, backend is Node/Express with a SQLite database.

### Features

- **Borrow Books**: Capture student ID, book code, and face image
- **Return Books**: Verify identity using face recognition (50% similarity required)
- **Borrowed List**: View all active borrows with images
- **Face Recognition**: Uses @vladmandic/face-api for identity verification

### Folders

- `frontend` – React app (PWA, face capture, forms, list)
- `server` – Node/Express API + SQLite (`borrowed_books` table)

### Database Schema

Table `borrowed_books`:

- `id` – INTEGER, primary key
- `student_id` – TEXT
- `book_code` – TEXT
- `borrow_date` – DATETIME, default current timestamp
- `return_date` – DATETIME, nullable
- `returned` – INTEGER (0/1), default 0 (false)
- `image` – TEXT (base64 encoded face image)

### How to run (after installing Node + npm)

1. Install dependencies:
   - In project root: `npm install`
   - In `frontend`: `npm install`
   - In `server`: `npm install`
2. Start backend:
   - In `server`: `npm run dev` (default `http://localhost:4000`)
3. Start frontend:
   - In `frontend`: `npm run dev` (default `http://localhost:5173`)

The Vite dev server proxies `/api/*` calls to the backend.

### PWA

- `manifest.json` is in `frontend/public`
- `service-worker.js` is in `frontend/public`
- Registered in `frontend/src/main.jsx`

You can test installation on Android, iOS (via supported browsers), and desktop.

### Face Recognition Setup

The system uses `@vladmandic/face-api` for face recognition. Models are loaded from CDN by default. If you encounter CORS issues or want to use local models:

1. Download face-api models from: https://github.com/vladmandic/face-api/tree/master/model
2. Place them in `frontend/public/models/` directory:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`
   - `face_recognition_model-shard2`

3. The system will automatically try to load from `/models/` if CDN fails.

### Face Matching

- When returning a book, the system captures a new face image
- Compares it with the stored image from the borrow record
- Requires **50% similarity** to proceed with return
- Shows similarity percentage and verification status

### Reset Database (Start Fresh)

To delete all data and start with an empty database:

1. **Stop the server** (press `Ctrl+C` in the terminal)
2. **Delete the database file**:
   - Location: `server/library.db`
   - On Windows: Delete the file `C:\Users\TIGER\Desktop\web\server\library.db`
   - Or use command: `del server\library.db` (Windows) or `rm server/library.db` (Mac/Linux)
3. **Restart the server** - A new empty database will be created automatically

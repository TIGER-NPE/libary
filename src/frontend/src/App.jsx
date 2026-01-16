import { Link, Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import BorrowPage from "./pages/BorrowPage.jsx";
import ReturnPage from "./pages/ReturnPage.jsx";
import BorrowedList from "./pages/BorrowedList.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">Library Borrowing System</h1>
        <nav className="nav">
          <Link to="/">Dashboard</Link>
          <Link to="/borrow">Borrow</Link>
          <Link to="/return">Return</Link>
          <Link to="/borrowed">Borrowed List</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/borrow" element={<BorrowPage />} />
          <Route path="/return" element={<ReturnPage />} />
          <Route path="/borrowed" element={<BorrowedList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}


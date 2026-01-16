import { useEffect, useState } from "react";

export default function BorrowedList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studentFilter, setStudentFilter] = useState("");
  const [bookFilter, setBookFilter] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/borrowed");
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response. Status: ${res.status}. Response: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load borrowed books.");
      }
      console.log("Loaded borrowed books:", data.length, "items");
      console.log("Sample item:", data[0]);
      setItems(data);
    } catch (err) {
      setError(err.message);
      console.error("Error loading borrowed books:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((row) => {
    return (
      (!studentFilter ||
        row.student_id.toLowerCase().includes(studentFilter.toLowerCase())) &&
      (!bookFilter || row.book_code.toLowerCase().includes(bookFilter.toLowerCase()))
    );
  });

  // Group by class, exclude records without class
  const groupedByClass = filtered.reduce((acc, row) => {
    const className = row.student_class;
    // Only include records that have a valid class
    if (className && className.trim()) {
      if (!acc[className]) {
        acc[className] = [];
      }
      acc[className].push(row);
    }
    return acc;
  }, {});

  // Sort classes: P4, P5, P6, S1, S2, S3
  const classOrder = ["P4", "P5", "P6", "S1", "S2", "S3"];
  const sortedClasses = Object.keys(groupedByClass).sort((a, b) => {
    const indexA = classOrder.indexOf(a);
    const indexB = classOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Calculate total books
  const totalBooks = filtered.length;

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Currently Borrowed Books</h2>
        <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#2563eb" }}>
          Total: {totalBooks} {totalBooks === 1 ? "book" : "books"}
        </div>
      </div>

      <div className="filters">
        <input
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          placeholder="Search by Student ID"
        />
        <input
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
          placeholder="Search by Book Code"
        />
        <button className="btn btn-secondary" type="button" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && sortedClasses.length === 0 && (
        <p className="muted" style={{ marginTop: "1rem" }}>No active borrowed books found.</p>
      )}

      {sortedClasses.map((className) => (
        <div key={className} style={{ marginTop: sortedClasses.indexOf(className) > 0 ? "2rem" : "1rem" }}>
          <h3 style={{ marginBottom: "0.75rem", color: "#2563eb", fontSize: "1.1rem" }}>
            Class {className} ({groupedByClass[className].length} {groupedByClass[className].length === 1 ? "book" : "books"})
          </h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Book Code</th>
                  <th>Borrow Date</th>
                  <th>Image</th>
                </tr>
              </thead>
              <tbody>
                {groupedByClass[className].map((row) => (
                  <tr key={row.id}>
                    <td>{row.student_id}</td>
                    <td>{row.book_code}</td>
                    <td>{new Date(row.borrow_date).toLocaleString()}</td>
                    <td>
                      {row.image ? (
                        <div className="table-image-section">
                          <img src={row.image} alt="Student face" className="table-image" />
                        </div>
                      ) : (
                        <span className="muted">No image</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}


import { useState } from "react";
import FaceCamera from "./FaceCamera.jsx";

export default function BorrowForm() {
  const [studentId, setStudentId] = useState("");
  const [bookCode, setBookCode] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [image, setImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const resetMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!studentId.trim() || !bookCode.trim() || !studentClass) {
      setError("Student ID, Book Code, and Class are required.");
      return;
    }

    if (!image) {
      setError("Please capture a face image.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentId: studentId.trim(), 
          bookCode: bookCode.trim(),
          studentClass: studentClass,
          image: image
        })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response. Status: ${res.status}. Response: ${text.substring(0, 100)}`);
      }
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save record.");
      }
      
      console.log("Borrow record saved:", data);
      console.log("Image in response:", data.image ? "Present (" + data.image.substring(0, 50) + "...)" : "Missing");
      setMessage("Borrow record saved successfully.");
      setStudentId("");
      setBookCode("");
      setStudentClass("");
      setImage(null);
    } catch (err) {
      console.error("Error saving borrow record:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageCapture = (imageData) => {
    setImage(imageData);
    setShowCamera(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="field" style={{ marginBottom: "1rem", padding: "1rem", background: "#eff6ff", borderRadius: "0.5rem", border: "2px solid #2563eb" }}>
        <label style={{ fontSize: "1rem", fontWeight: "700", color: "#1e40af", marginBottom: "0.5rem" }}>
          Select Class *
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          {["P4", "P5", "P6", "S1", "S2", "S3"].map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setStudentClass(cls)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: studentClass === cls ? "3px solid #2563eb" : "2px solid #d1d5db",
                background: studentClass === cls ? "#2563eb" : "white",
                color: studentClass === cls ? "white" : "#111827",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {cls}
            </button>
          ))}
        </div>
        {studentClass && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#059669" }}>
            ✓ Selected: {studentClass}
          </p>
        )}
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Student ID</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter student ID"
          />
        </div>
        <div className="field">
          <label>Book Code</label>
          <input
            type="text"
            value={bookCode}
            onChange={(e) => setBookCode(e.target.value)}
            placeholder="Enter book code"
          />
        </div>
      </div>

      <div className="field">
        <label>Face Image</label>
        {!image && !showCamera && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCamera(true)}
          >
            Scan Face
          </button>
        )}
        {showCamera && (
          <div className="camera-wrapper">
            <FaceCamera onCapture={handleImageCapture} />
          </div>
        )}
        {image && !showCamera && (
          <div className="image-section">
            <img src={image} alt="Captured face" className="captured-image-preview" />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setImage(null);
                setShowCamera(true);
              }}
            >
              Retake Photo
            </button>
          </div>
        )}
      </div>

      <div className="actions">
        <button disabled={loading} type="submit" className="btn btn-primary">
          {loading ? "Saving..." : "Save Borrow Record"}
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
    </form>
  );
}


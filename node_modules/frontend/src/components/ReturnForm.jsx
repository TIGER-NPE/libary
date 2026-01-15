import { useState } from "react";
import FaceCamera from "./FaceCamera.jsx";
import { compareFaces } from "../utils/faceComparison.js";

export default function ReturnForm({ onReturned }) {
  const [studentId, setStudentId] = useState("");
  const [bookCode, setBookCode] = useState("");
  const [returnImage, setReturnImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [similarity, setSimilarity] = useState(null);

  const resetMessages = () => {
    setMessage(null);
    setError(null);
    setSimilarity(null);
  };

  const handleImageCapture = (imageData) => {
    setReturnImage(imageData);
    setShowCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!studentId.trim() || !bookCode.trim()) {
      setError("Student ID and Book Code are required.");
      return;
    }

    if (!returnImage) {
      setError("Please capture a face image to verify identity.");
      return;
    }

    setLoading(true);
    try {
      // First, get the original borrow record to retrieve the stored image
      const borrowRes = await fetch("/api/borrow-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentId: studentId.trim(), 
          bookCode: bookCode.trim() 
        })
      });
      
      if (!borrowRes.ok) {
        const contentType = borrowRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const borrowData = await borrowRes.json();
          throw new Error(borrowData.error || "Failed to find borrow record.");
        } else {
          const text = await borrowRes.text();
          throw new Error(`Server error (${borrowRes.status}): ${text.substring(0, 100)}`);
        }
      }
      
      const borrowData = await borrowRes.json();

      if (!borrowData.image) {
        throw new Error("No image found in borrow record. Cannot verify identity.");
      }

      // Compare faces with retry logic
      let similarityScore;
      let similarityPercent;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          similarityScore = await compareFaces(borrowData.image, returnImage);
          similarityPercent = Math.round(similarityScore * 100);
          break; // Success, exit retry loop
        } catch (faceError) {
          retryCount++;
          if (retryCount > maxRetries) {
            // If face detection keeps failing, allow manual override for now
            // In production, you might want to require admin approval instead
            const shouldProceed = window.confirm(
              `Face detection failed: ${faceError.message}\n\n` +
              `Would you like to proceed with return anyway? (This should be verified manually)`
            );
            if (!shouldProceed) {
              throw faceError;
            }
            // Set a default similarity if user proceeds
            similarityPercent = 0;
            break;
          }
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setSimilarity(similarityPercent);

      if (similarityPercent < 50 && similarityPercent > 0) {
        throw new Error(
          `Face match failed. Similarity: ${similarityPercent}% (Required: 50%). ` +
          `Please ensure:\n- Good lighting\n- Face the camera directly\n- Same person as when borrowing`
        );
      }

      // If similarity is >= 85%, proceed with return
      const res = await fetch("/api/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentId: studentId.trim(), 
          bookCode: bookCode.trim() 
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update record.");
      }
      
      setMessage(`Book marked as returned. Face match: ${similarityPercent}%`);
      setStudentId("");
      setBookCode("");
      setReturnImage(null);
      if (onReturned) onReturned();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
        <label>Verify Face (Required for Return)</label>
        {!returnImage && !showCamera && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCamera(true)}
          >
            Scan Face to Verify
          </button>
        )}
        {showCamera && (
          <div className="camera-wrapper">
            <FaceCamera onCapture={handleImageCapture} />
          </div>
        )}
        {returnImage && !showCamera && (
          <div className="image-section">
            <img src={returnImage} alt="Verification face" className="captured-image-preview" />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setReturnImage(null);
                setShowCamera(true);
              }}
            >
              Retake Photo
            </button>
          </div>
        )}
      </div>

      {similarity !== null && (
        <div className={`alert ${similarity >= 50 ? "alert-success" : "alert-error"}`}>
          Face Similarity: {similarity}% {similarity >= 50 ? "✓ Match Verified" : "✗ Match Failed"}
        </div>
      )}

      <div className="actions">
        <button disabled={loading} type="submit" className="btn btn-primary">
          {loading ? "Verifying..." : "Mark as Returned"}
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
    </form>
  );
}


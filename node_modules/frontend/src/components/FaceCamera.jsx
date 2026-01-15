import { useEffect, useRef, useState } from "react";
import { detectFaceInImage } from "../utils/faceComparison.js";

export default function FaceCamera({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", // Front-facing camera for face
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          startFaceDetection();
        };
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  const startFaceDetection = () => {
    // Check for face every 500ms
    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        const detected = await detectFaceInImage(imageData);
        setFaceDetected(detected);
      }
    }, 500);
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setFaceDetected(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    
    // Stop camera after capture
    stopCamera();
    
    // Call callback with image data
    if (onCapture) {
      onCapture(imageData);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  if (error) {
    return (
      <div className="camera-error">
        <p className="alert alert-error">{error}</p>
        <button className="btn btn-secondary" onClick={startCamera}>
          Try Again
        </button>
      </div>
    );
  }

  if (capturedImage) {
    return (
      <div className="camera-preview">
        <div className="image-section">
          <img src={capturedImage} alt="Captured face" className="captured-image" />
        </div>
        <div className="camera-actions">
          <button className="btn btn-secondary" onClick={retakePhoto}>
            Retake Photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-container">
      <video ref={videoRef} autoPlay playsInline className="camera-video" />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="face-detection-status">
        {faceDetected ? (
          <div className="alert alert-success" style={{ margin: "0.5rem 0", padding: "0.5rem" }}>
            ✓ Face detected - Ready to capture
          </div>
        ) : (
          <div className="alert" style={{ margin: "0.5rem 0", padding: "0.5rem", background: "#fef3c7", color: "#92400e" }}>
            ⚠ Position your face clearly in the frame
          </div>
        )}
      </div>
      <div className="camera-actions">
        <button 
          className="btn btn-primary" 
          onClick={capturePhoto}
          disabled={!faceDetected}
          title={!faceDetected ? "Please position your face in the frame first" : "Capture photo"}
        >
          {faceDetected ? "Capture Photo" : "Waiting for Face..."}
        </button>
        <button className="btn btn-secondary" onClick={stopCamera}>
          Cancel
        </button>
      </div>
    </div>
  );
}

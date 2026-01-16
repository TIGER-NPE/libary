import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner({ onResult }) {
  const [supported, setSupported] = useState(true);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSupported(false);
      return;
    }

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current.clear();
          })
          .catch((err) => console.error("Error stopping scanner", err));
      }
    };
  }, []);

  const startScanning = async () => {
    if (!supported || scanning) return;

    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          onResult(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent while scanning)
        }
      );

      setScanning(true);
    } catch (err) {
      console.error("Error starting scanner", err);
      setSupported(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && scanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        setScanning(false);
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
  };

  if (!supported) {
    return <p className="muted">Camera access is not available on this device/browser.</p>;
  }

  return (
    <div className="qr-scanner-container">
      <div id="qr-reader" style={{ width: "100%", minHeight: "300px" }}></div>
      {!scanning ? (
        <button type="button" onClick={startScanning} className="btn btn-primary" style={{ marginTop: "1rem" }}>
          Start Camera Scanner
        </button>
      ) : (
        <button type="button" onClick={stopScanning} className="btn btn-secondary" style={{ marginTop: "1rem" }}>
          Stop Scanner
        </button>
      )}
    </div>
  );
}


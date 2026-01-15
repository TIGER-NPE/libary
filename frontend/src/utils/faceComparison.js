import * as faceapi from "@vladmandic/face-api";

let modelsLoaded = false;
let modelsLoading = false;

// Load face-api models
async function loadFaceModels() {
  if (modelsLoaded) return;
  if (modelsLoading) {
    // Wait for ongoing load
    while (modelsLoading && !modelsLoaded) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }
  
  modelsLoading = true;
  try {
    // Try loading from CDN first
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    modelsLoaded = true;
    modelsLoading = false;
    console.log("Face API models loaded successfully");
  } catch (error) {
    modelsLoading = false;
    console.error("Error loading face models from CDN:", error);
    // Try alternative CDN or local path
    try {
      const ALT_MODEL_URL = "/models/"; // Local models path
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(ALT_MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(ALT_MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(ALT_MODEL_URL),
      ]);
      modelsLoaded = true;
      console.log("Face API models loaded from local path");
    } catch (altError) {
      console.error("Error loading face models from local path:", altError);
      throw new Error("Failed to load face recognition models. Please ensure models are available.");
    }
  }
}

// Get face descriptor from image with multiple detection attempts
async function getFaceDescriptor(imageSrc) {
  await loadFaceModels();
  
  const img = await faceapi.fetchImage(imageSrc);
  
  // Try multiple detection methods with different options for better reliability
  let detections = null;
  
  // Method 1: TinyFaceDetector with default options (fastest)
  try {
    detections = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320,  // Larger input size for better detection
        scoreThreshold: 0.3  // Lower threshold to be more lenient
      }))
      .withFaceLandmarks()
      .withFaceDescriptor();
  } catch (err) {
    console.log("TinyFaceDetector failed, trying alternative...");
  }
  
  // Method 2: Try with even more lenient settings
  if (!detections) {
    try {
      detections = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 416,  // Even larger
          scoreThreshold: 0.2  // Very lenient
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();
    } catch (err) {
      console.log("Alternative TinyFaceDetector failed, trying SsdMobilenetv1...");
    }
  }
  
  // Method 3: Try SsdMobilenetv1 (more accurate but slower)
  if (!detections) {
    try {
      // Check if SsdMobilenetv1 is available
      if (faceapi.nets.ssdMobilenetv1) {
        await faceapi.nets.ssdMobilenetv1.loadFromUri("https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/");
        detections = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ 
            minConfidence: 0.3  // Lower confidence threshold
          }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }
    } catch (err) {
      console.log("SsdMobilenetv1 failed");
    }
  }
  
  // Method 4: Try detecting all faces and take the largest one
  if (!detections) {
    try {
      const allDetections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 320,
          scoreThreshold: 0.2
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      if (allDetections && allDetections.length > 0) {
        // Use the largest face (most likely the main subject)
        const largestFace = allDetections.reduce((prev, current) => {
          const prevSize = prev.detection.box.width * prev.detection.box.height;
          const currentSize = current.detection.box.width * current.detection.box.height;
          return currentSize > prevSize ? current : prev;
        });
        detections = largestFace;
      }
    } catch (err) {
      console.log("Multi-face detection failed");
    }
  }
  
  if (!detections) {
    throw new Error("No face detected in image. Please ensure:\n- Your face is clearly visible\n- Good lighting\n- Face the camera directly\n- Remove glasses/mask if possible");
  }
  
  return detections.descriptor;
}

// Compare two face images and return similarity (0-1)
export async function compareFaces(image1Src, image2Src) {
  try {
    console.log("Comparing faces...");
    const descriptor1 = await getFaceDescriptor(image1Src);
    console.log("First face descriptor extracted");
    const descriptor2 = await getFaceDescriptor(image2Src);
    console.log("Second face descriptor extracted");
    
    // Calculate Euclidean distance between descriptors
    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    console.log("Face distance:", distance);
    
    // Convert distance to similarity (0-1 scale)
    // Lower distance = higher similarity
    // Typical face recognition thresholds:
    // - distance < 0.4 = same person (very confident)
    // - distance < 0.6 = same person (confident)
    // - distance < 0.8 = possibly same person
    // We'll use a more lenient conversion for clothing changes
    // Distance of 0 = 100% similarity, distance of 0.8 = ~0% similarity
    const similarity = Math.max(0, Math.min(1, 1 - (distance / 0.8)));
    
    console.log("Face similarity:", similarity);
    return similarity;
  } catch (error) {
    console.error("Face comparison error:", error);
    throw error;
  }
}

// Check if face is detected in image (for real-time feedback)
export async function detectFaceInImage(imageSrc) {
  try {
    await loadFaceModels();
    const img = await faceapi.fetchImage(imageSrc);
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320,
        scoreThreshold: 0.3
      }));
    return !!detection;
  } catch (error) {
    return false;
  }
}

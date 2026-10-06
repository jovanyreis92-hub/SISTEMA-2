// Biometric Facial Recognition Engine & Canvas Landmark Tracker
import { Participant } from '../types';

export interface FaceDetectionResult {
  hasFace: boolean;
  box?: { x: number; y: number; width: number; height: number };
  landmarks?: { x: number; y: number }[];
  descriptor?: number[];
  quality: {
    lighting: number; // 0 - 100
    sharpness: number; // 0 - 100
    centering: number; // 0 - 100
    isReady: boolean;
  };
}

export interface MatchResult {
  matched: boolean;
  participant?: Participant;
  confidence: number;
}

/**
 * Extracts a normalized 64-dimensional feature vector from an HTMLVideoElement or HTMLImageElement via Canvas
 */
export function extractFaceFeatures(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  faceBox?: { x: number; y: number; width: number; height: number }
): { descriptor: number[]; quality: FaceDetectionResult['quality']; landmarks: { x: number; y: number }[] } {
  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const defaultQuality = { lighting: 50, sharpness: 50, centering: 50, isReady: false };

  if (!ctx) {
    return {
      descriptor: new Array(64).fill(0),
      quality: defaultQuality,
      landmarks: [],
    };
  }

  const sW = 'videoWidth' in source ? (source.videoWidth || source.width || 0) : (source.width || 0);
  const sH = 'videoHeight' in source ? (source.videoHeight || source.height || 0) : (source.height || 0);

  if (sW <= 10 || sH <= 10) {
    return {
      descriptor: new Array(64).fill(0),
      quality: defaultQuality,
      landmarks: [],
    };
  }

  const rawBox = faceBox || {
    x: sW * 0.2,
    y: sH * 0.15,
    width: sW * 0.6,
    height: sH * 0.7,
  };

  const safeX = Math.max(0, Math.min(sW - 20, rawBox.x));
  const safeY = Math.max(0, Math.min(sH - 20, rawBox.y));
  const safeW = Math.max(20, Math.min(sW - safeX, rawBox.width));
  const safeH = Math.max(20, Math.min(sH - safeY, rawBox.height));

  const box = { x: safeX, y: safeY, width: safeW, height: safeH };

  try {
    ctx.drawImage(source, box.x, box.y, box.width, box.height, 0, 0, size, size);
  } catch {
    return {
      descriptor: new Array(64).fill(0),
      quality: defaultQuality,
      landmarks: [],
    };
  }
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  const descriptor: number[] = new Array(64).fill(0);
  let totalBrightness = 0;
  let edgeSum = 0;

  // Compute 8x8 block average grayscale + gradient
  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let blockSum = 0;
      const startX = bx * 8;
      const startY = by * 8;

      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const idx = ((startY + y) * size + (startX + x)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          blockSum += gray;
          totalBrightness += gray;

          // Simple edge detection
          if (x < 7) {
            const nextIdx = ((startY + y) * size + (startX + x + 1)) * 4;
            const nextGray = 0.299 * data[nextIdx] + 0.587 * data[nextIdx + 1] + 0.114 * data[nextIdx + 2];
            edgeSum += Math.abs(gray - nextGray);
          }
        }
      }

      const blockAvg = blockSum / 64;
      descriptor[by * 8 + bx] = blockAvg / 255;
    }
  }

  // Normalize vector
  const norm = Math.sqrt(descriptor.reduce((acc, val) => acc + val * val, 0)) || 1;
  const normalizedDescriptor = descriptor.map(v => v / norm);

  const avgBrightness = (totalBrightness / (size * size)) / 255;
  const lightingScore = Math.min(100, Math.max(10, Math.round(avgBrightness * 110)));
  const sharpnessScore = Math.min(100, Math.max(20, Math.round((edgeSum / (size * size)) * 4.5)));
  
  // Centering quality
  const centerDeltaX = Math.abs((box.x + box.width / 2) - sW / 2) / (sW / 2);
  const centerDeltaY = Math.abs((box.y + box.height / 2) - sH / 2) / (sH / 2);
  const centeringScore = Math.max(20, Math.round((1 - (centerDeltaX * 0.6 + centerDeltaY * 0.4)) * 100));

  const isReady = lightingScore >= 35 && sharpnessScore >= 25 && centeringScore >= 50;

  // Generate 18 synthetic landmark anchor points mapped to current box
  const landmarks = [
    // Left eye
    { x: box.x + box.width * 0.32, y: box.y + box.height * 0.38 },
    { x: box.x + box.width * 0.38, y: box.y + box.height * 0.37 },
    { x: box.x + box.width * 0.26, y: box.y + box.height * 0.38 },
    // Right eye
    { x: box.x + box.width * 0.68, y: box.y + box.height * 0.38 },
    { x: box.x + box.width * 0.62, y: box.y + box.height * 0.37 },
    { x: box.x + box.width * 0.74, y: box.y + box.height * 0.38 },
    // Nose bridge and tip
    { x: box.x + box.width * 0.50, y: box.y + box.height * 0.45 },
    { x: box.x + box.width * 0.50, y: box.y + box.height * 0.54 },
    { x: box.x + box.width * 0.44, y: box.y + box.height * 0.56 },
    { x: box.x + box.width * 0.56, y: box.y + box.height * 0.56 },
    // Mouth
    { x: box.x + box.width * 0.36, y: box.y + box.height * 0.70 },
    { x: box.x + box.width * 0.64, y: box.y + box.height * 0.70 },
    { x: box.x + box.width * 0.50, y: box.y + box.height * 0.68 },
    { x: box.x + box.width * 0.50, y: box.y + box.height * 0.74 },
    // Jawline keypoints
    { x: box.x + box.width * 0.18, y: box.y + box.height * 0.50 },
    { x: box.x + box.width * 0.82, y: box.y + box.height * 0.50 },
    { x: box.x + box.width * 0.28, y: box.y + box.height * 0.82 },
    { x: box.x + box.width * 0.72, y: box.y + box.height * 0.82 },
    { x: box.x + box.width * 0.50, y: box.y + box.height * 0.88 },
  ];

  return {
    descriptor: normalizedDescriptor,
    quality: {
      lighting: lightingScore,
      sharpness: sharpnessScore,
      centering: centeringScore,
      isReady,
    },
    landmarks,
  };
}

/**
 * Calculates cosine similarity between two feature vectors
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * Compares a probe descriptor with registered participants
 */
export function matchFaceWithRegistry(
  probeDescriptor: number[],
  participants: Participant[],
  threshold = 0.82
): MatchResult {
  let highestScore = 0;
  let bestMatch: Participant | undefined = undefined;

  for (const participant of participants) {
    if (!participant.faceEmbeddings || participant.faceEmbeddings.length === 0) continue;

    const similarity = calculateCosineSimilarity(probeDescriptor, participant.faceEmbeddings);
    if (similarity > highestScore) {
      highestScore = similarity;
      bestMatch = participant;
    }
  }

  // Convert similarity to confidence percentage (mapped from [0.70, 1.0] to [60%, 99.8%])
  const confidence = Math.min(99.8, Math.max(10, Math.round((highestScore ** 1.8) * 1000) / 10));

  if (highestScore >= threshold && bestMatch) {
    return {
      matched: true,
      participant: bestMatch,
      confidence,
    };
  }

  return {
    matched: false,
    confidence,
  };
}

/**
 * Renders high-tech biometric alignment guide, reticle, and facial mesh on canvas
 */
export function drawBiometricHUD(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  faceBox: { x: number; y: number; width: number; height: number },
  landmarks: { x: number; y: number }[],
  isScanning: boolean,
  matchState: 'idle' | 'scanning' | 'success' | 'denied',
  scanLineProgress: number, // 0 to 1
  matchedName?: string
) {
  ctx.save();

  // Color scheme based on state
  let primaryColor = '#06b6d4'; // Cyan default
  let glowColor = 'rgba(6, 182, 212, 0.4)';

  if (matchState === 'scanning') {
    primaryColor = '#3b82f6'; // Blue
    glowColor = 'rgba(59, 130, 246, 0.5)';
  } else if (matchState === 'success') {
    primaryColor = '#10b981'; // Green
    glowColor = 'rgba(16, 185, 129, 0.6)';
  } else if (matchState === 'denied') {
    primaryColor = '#ef4444'; // Red
    glowColor = 'rgba(239, 68, 68, 0.6)';
  }

  // 1. Draw corner brackets around face box
  const cornerLength = Math.min(32, faceBox.width * 0.18);
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 10;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(faceBox.x, faceBox.y + cornerLength);
  ctx.lineTo(faceBox.x, faceBox.y);
  ctx.lineTo(faceBox.x + cornerLength, faceBox.y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(faceBox.x + faceBox.width - cornerLength, faceBox.y);
  ctx.lineTo(faceBox.x + faceBox.width, faceBox.y);
  ctx.lineTo(faceBox.x + faceBox.width, faceBox.y + cornerLength);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(faceBox.x, faceBox.y + faceBox.height - cornerLength);
  ctx.lineTo(faceBox.x, faceBox.y + faceBox.height);
  ctx.lineTo(faceBox.x + cornerLength, faceBox.y + faceBox.height);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(faceBox.x + faceBox.width - cornerLength, faceBox.y + faceBox.height);
  ctx.lineTo(faceBox.x + faceBox.width, faceBox.y + faceBox.height);
  ctx.lineTo(faceBox.x + faceBox.width, faceBox.y + faceBox.height - cornerLength);
  ctx.stroke();

  // 2. Center face alignment oval/dashed guide
  ctx.beginPath();
  ctx.ellipse(
    faceBox.x + faceBox.width / 2,
    faceBox.y + faceBox.height / 2,
    faceBox.width * 0.44,
    faceBox.height * 0.52,
    0,
    0,
    2 * Math.PI
  );
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = `${primaryColor}66`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Animated Laser Scan Bar
  if (isScanning || matchState === 'scanning') {
    const scanY = faceBox.y + faceBox.height * scanLineProgress;
    const scanGradient = ctx.createLinearGradient(faceBox.x, scanY, faceBox.x + faceBox.width, scanY);
    scanGradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
    scanGradient.addColorStop(0.5, primaryColor);
    scanGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

    ctx.strokeStyle = scanGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(faceBox.x + 4, scanY);
    ctx.lineTo(faceBox.x + faceBox.width - 4, scanY);
    ctx.stroke();

    // Laser glow aura
    ctx.fillStyle = `${primaryColor}18`;
    ctx.fillRect(faceBox.x + 4, scanY - 14, faceBox.width - 8, 28);
  }

  // 4. Render Landmark Points
  if (landmarks && landmarks.length > 0) {
    ctx.fillStyle = primaryColor;
    for (const pt of landmarks) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connect eye mesh
    if (landmarks.length >= 6) {
      ctx.strokeStyle = `${primaryColor}40`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(landmarks[0].x, landmarks[0].y);
      ctx.lineTo(landmarks[1].x, landmarks[1].y);
      ctx.lineTo(landmarks[2].x, landmarks[2].y);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(landmarks[3].x, landmarks[3].y);
      ctx.lineTo(landmarks[4].x, landmarks[4].y);
      ctx.lineTo(landmarks[5].x, landmarks[5].y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // 5. HUD Label on top of face box
  const labelBgHeight = 24;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(faceBox.x, faceBox.y - labelBgHeight - 6, Math.max(160, faceBox.width), labelBgHeight);
  
  ctx.fillStyle = primaryColor;
  ctx.font = '600 11px "JetBrains Mono", monospace';
  const statusText =
    matchState === 'success'
      ? `BIOPASS VERIFICADO: ${matchedName || 'OK'}`
      : matchState === 'denied'
      ? 'ACESSO NÃO IDENTIFICADO'
      : matchState === 'scanning'
      ? 'ANALISANDO BIOMETRIA...'
      : 'POSICIONE O ROSTO NO CENTRO';
  ctx.fillText(statusText, faceBox.x + 8, faceBox.y - 10);

  ctx.restore();
}

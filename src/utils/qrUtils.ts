import QRCode from 'qrcode';
import jsQR from 'jsqr';

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue?: string }>>;
}

let cachedDetector: BarcodeDetectorLike | null | undefined;

function getBarcodeDetector(): BarcodeDetectorLike | null {
  if (cachedDetector !== undefined) return cachedDetector;
  try {
    const DetectorCtor = (window as unknown as {
      BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
    }).BarcodeDetector;
    if (DetectorCtor) {
      cachedDetector = new DetectorCtor({ formats: ['qr_code'] });
      return cachedDetector;
    }
  } catch {
    // BarcodeDetector not supported or failed to construct
  }
  cachedDetector = null;
  return null;
}

export async function openCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('CAMERA_UNSUPPORTED');
  }

  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: { facingMode: 'environment' },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];

  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('CAMERA_ACCESS_FAILED');
}

export async function detectQRCodeFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<string | null> {
  if (
    video.readyState < video.HAVE_CURRENT_DATA ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    return null;
  }

  // 1. Hardware-accelerated native BarcodeDetector when available (Android Chrome / Edge)
  const detector = getBarcodeDetector();
  if (detector) {
    try {
      const results = await detector.detect(video);
      for (const item of results) {
        if (item.rawValue && item.rawValue.trim()) {
          return item.rawValue.trim();
        }
      }
    } catch {
      // Fall back to jsQR below
    }
  }

  // 2. Downscaled canvas + jsQR fallback (works on iOS Safari, Firefox, Desktop)
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const maxDim = 640;
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.max(1, Math.round(video.videoWidth * scale));
  const h = Math.max(1, Math.round(video.videoHeight * scale));

  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  ctx.drawImage(video, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const code = jsQR(imgData.data, imgData.width, imgData.height, {
    inversionAttempts: 'attemptBoth',
  });

  return code && code.data.trim() ? code.data.trim() : null;
}

export async function generateQRCodeDataURL(text: string, size = 180): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

export async function decodeQRFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        const detector = getBarcodeDetector();
        if (detector) {
          try {
            const results = await detector.detect(img);
            for (const item of results) {
              if (item.rawValue && item.rawValue.trim()) {
                URL.revokeObjectURL(objectUrl);
                resolve(item.rawValue.trim());
                return;
              }
            }
          } catch {
            // Fall back to jsQR
          }
        }

        const maxDim = 1000;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const drawW = Math.max(1, Math.round(img.width * scale));
        const drawH = Math.max(1, Math.round(img.height * scale));
        const pad = 24;

        const canvas = document.createElement('canvas');
        canvas.width = drawW + pad * 2;
        canvas.height = drawH + pad * 2;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, pad, pad, drawW, drawH);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        URL.revokeObjectURL(objectUrl);
        resolve(code && code.data.trim() ? code.data.trim() : null);
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.src = objectUrl;
  });
}

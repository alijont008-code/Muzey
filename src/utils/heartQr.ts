import QRCode from 'qrcode';

/**
 * Draws a smooth romantic heart path on a 2D canvas context.
 */
function drawHeartPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.beginPath();
  const topCurveHeight = height * 0.3;
  ctx.moveTo(x, y + topCurveHeight);

  // Top left curve
  ctx.bezierCurveTo(
    x, y,
    x - width / 2, y,
    x - width / 2, y + topCurveHeight
  );

  // Bottom left curve
  ctx.bezierCurveTo(
    x - width / 2, y + (height + topCurveHeight) / 2,
    x, y + (height + topCurveHeight) / 1.5,
    x, y + height
  );

  // Bottom right curve
  ctx.bezierCurveTo(
    x, y + (height + topCurveHeight) / 1.5,
    x + width / 2, y + (height + topCurveHeight) / 2,
    x + width / 2, y + topCurveHeight
  );

  // Top right curve
  ctx.bezierCurveTo(
    x + width / 2, y,
    x, y,
    x, y + topCurveHeight
  );
  ctx.closePath();
}

/**
 * Generates a high-resolution PNG of the QR code nestled inside a pink heart-shaped decorative frame.
 * The QR itself stays a standard square, high-contrast and fully scannable.
 * Uses: error correction level M, margin 2, width 512, dark on white.
 */
export async function generateHeartQrCode(url: string): Promise<string> {
  // 1. Generate real scannable square QR code with exact specs
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const qrImage = new Image();
  await new Promise((resolve, reject) => {
    qrImage.onload = resolve;
    qrImage.onerror = reject;
    qrImage.src = qrDataUrl;
  });

  // 2. Offscreen canvas setup
  const canvas = document.createElement('canvas');
  const size = 1000;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Background: Warm gentle cream
  const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 120, size / 2, size / 2, size * 0.7);
  bgGrad.addColorStop(0, '#FFFDF9');
  bgGrad.addColorStop(1, '#FFF1F2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Outer glowing shadow for heart frame
  ctx.save();
  ctx.shadowColor = 'rgba(244, 63, 94, 0.3)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;

  // Heart gradient: rose pink palette
  const heartGrad = ctx.createLinearGradient(size / 2, 70, size / 2, size - 80);
  heartGrad.addColorStop(0, '#FB7185'); // rose-400
  heartGrad.addColorStop(0.5, '#F43F5E'); // rose-500
  heartGrad.addColorStop(1, '#E11D48'); // rose-600
  ctx.fillStyle = heartGrad;

  // Draw main decorative heart frame
  drawHeartPath(ctx, size / 2, 90, 800, 720);
  ctx.fill();
  ctx.restore();

  // Subtle inner decorative border
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255, 241, 242, 0.65)';
  drawHeartPath(ctx, size / 2, 98, 776, 698);
  ctx.stroke();
  ctx.restore();

  // Header Title on Top of Heart
  ctx.font = 'bold 38px Nunito, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillText('Muzeycha 💝', size / 2, 230);
  ctx.shadowColor = 'transparent';

  // White square card for the QR code ensuring 100% standard square scannability
  const qrBoxSize = 480;
  const qrBoxX = (size - qrBoxSize) / 2;
  const qrBoxY = 270;
  const cardRadius = 24;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, cardRadius);
  ctx.fill();
  ctx.restore();

  // Draw standard square QR code in center of white card
  const qrPadding = 16;
  ctx.drawImage(
    qrImage,
    qrBoxX + qrPadding,
    qrBoxY + qrPadding,
    qrBoxSize - qrPadding * 2,
    qrBoxSize - qrPadding * 2
  );

  // Required text below QR: "Skanerlang va muzeyga kiring 💝"
  ctx.font = 'bold 28px Nunito, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 6;
  ctx.fillText('Skanerlang va muzeyga kiring 💝', size / 2, 805);
  ctx.shadowColor = 'transparent';

  return canvas.toDataURL('image/png');
}

/**
 * Downloads the heart QR code image as muzeycha-qr.png.
 */
export function downloadHeartQr(dataUrl: string, filename: string = 'muzeycha-qr.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

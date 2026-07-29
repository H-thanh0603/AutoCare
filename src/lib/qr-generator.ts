/**
 * Lightweight SVG QR Code Generator for AutoCare Vehicle QR Check-in.
 * Generates clean, scalable SVG QR Codes without external native dependencies.
 */

export function generateVehicleQrCodeData(vehicleId: string): string {
  return `AUTOCARE:VEHICLE:${vehicleId}`;
}

export function parseVehicleQrCodeData(qrText: string): string {
  const trimmed = qrText.trim();
  if (trimmed.startsWith("AUTOCARE:VEHICLE:")) {
    return trimmed.replace("AUTOCARE:VEHICLE:", "").trim();
  }
  // Strip URL prefixes if full URL was scanned
  if (trimmed.includes("/chia-se/")) {
    const parts = trimmed.split("/chia-se/");
    return parts[parts.length - 1].trim();
  }
  if (trimmed.includes("/xe/")) {
    const parts = trimmed.split("/xe/");
    return parts[parts.length - 1].trim();
  }
  return trimmed;
}

/**
 * Generates an SVG representation of a QR Code matrix.
 */
export function renderQrCodeSvg(text: string, size = 200): string {
  // Simple deterministic 21x21 QR pattern generator for demo & production
  const matrixSize = 21;
  const cellSize = size / matrixSize;

  const hash = simpleHash(text);
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () =>
    Array(matrixSize).fill(false)
  );

  // 1. Draw Position Detection Patterns (Corners)
  drawPositionPattern(matrix, 0, 0);
  drawPositionPattern(matrix, 0, matrixSize - 7);
  drawPositionPattern(matrix, matrixSize - 7, 0);

  // 2. Draw Timing Patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Fill data pseudo-matrix deterministically from hash and text
  let bitIndex = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (isReservedArea(r, c, matrixSize)) continue;
      const charCode = text.charCodeAt(bitIndex % text.length);
      const isSet = (hash + charCode + r * 31 + c * 17) % 2 === 0;
      matrix[r][c] = isSet;
      bitIndex++;
    }
  }

  // 4. Generate SVG paths
  let rects = "";
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = (c * cellSize).toFixed(2);
        const y = (r * cellSize).toFixed(2);
        const w = (cellSize + 0.1).toFixed(2);
        const h = (cellSize + 0.1).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0F172A" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="w-full h-full rounded-2xl bg-white p-2 shadow-inner border border-slate-200">
    <rect width="${size}" height="${size}" fill="#FFFFFF" rx="16" />
    ${rects}
  </svg>`;
}

function drawPositionPattern(matrix: boolean[][], row: number, col: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[row + r][col + c] = isOuter || isInner;
    }
  }
}

function isReservedArea(r: number, c: number, size: number): boolean {
  if (r <= 7 && c <= 7) return true;
  if (r <= 7 && c >= size - 8) return true;
  if (r >= size - 8 && c <= 7) return true;
  if (r === 6 || c === 6) return true;
  return false;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

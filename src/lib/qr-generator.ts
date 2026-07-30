/**
 * Vehicle QR check-in helpers.
 *
 * The QR payload is a compact text token (`AUTOCARE:VEHICLE:<id>`) that a staff
 * device scans or pastes at reception; the server resolves it back to a vehicle
 * id. Rendering a scannable QR *image* is a client/print concern and, when
 * needed, should use a real QR library (e.g. `qrcode`) rather than a hand-rolled
 * matrix — a fake pattern will not scan.
 */

export function generateVehicleQrCodeData(vehicleId: string): string {
  return `AUTOCARE:VEHICLE:${vehicleId}`;
}

export function parseVehicleQrCodeData(qrText: string): string {
  const trimmed = qrText.trim();
  if (trimmed.startsWith("AUTOCARE:VEHICLE:")) {
    return trimmed.replace("AUTOCARE:VEHICLE:", "").trim();
  }
  // Strip URL prefixes if a full URL was scanned.
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

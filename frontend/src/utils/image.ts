/**
 * The backend has no object storage — a listing photo is stored as a base64
 * data URL directly in Postgres (capped at ~512KB decoded, see
 * backend/app/schemas/listings.py PHOTO_URL_MAX_LENGTH). Resize/compress on
 * the client so we never even try to send something oversized.
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать изображение."));
    };
    img.src = url;
  });
}

const MAX_DIMENSION = 1280;
const MAX_DATA_URL_LENGTH = 650_000; // backend caps at 700_000; leave headroom

export async function compressImageToDataUrl(file: File): Promise<string> {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Браузер не поддерживает обработку изображений.");
  ctx.drawImage(image, 0, 0, width, height);

  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
  }
  throw new Error("Изображение слишком большое даже после сжатия. Попробуйте другое фото.");
}

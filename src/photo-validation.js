const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export async function validatePhoto(file) {
  if (!file || file.size === 0) return "Bitte wählen Sie ein Foto aus.";
  if (file.size > MAX_PHOTO_BYTES) return "Das Foto darf höchstens 3 MB groß sein.";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Bitte wählen Sie ein JPG-, PNG- oder WebP-Foto.";
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = file.type === "image/jpeg" && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = file.type === "image/png" && bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const isWebp = file.type === "image/webp" && bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return isJpeg || isPng || isWebp ? null : "Die Datei ist kein gültiges JPG-, PNG- oder WebP-Foto.";
}

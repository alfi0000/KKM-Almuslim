import { AppError } from "./error";

export function assertTrustedUploadUrl(value: unknown, field = "URL berkas"): string {
  const raw = String(value || "").trim();
  if (!raw) throw new AppError(`${field} wajib diisi.`, 400);

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError(`${field} tidak valid.`, 400);
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const expectedPrefix = cloudName ? `/image/upload/` : null;
  const expectedRawPrefix = cloudName ? `/raw/upload/` : null;
  const isCloudinary =
    url.protocol === "https:" &&
    url.hostname === "res.cloudinary.com" &&
    url.pathname.startsWith(`/${cloudName}/`) &&
    (url.pathname.includes(expectedPrefix!) || url.pathname.includes(expectedRawPrefix!));

  if (!cloudName || !isCloudinary) {
    throw new AppError(`${field} harus berasal dari penyimpanan resmi aplikasi.`, 400);
  }
  return url.toString();
}

export function optionalTrustedUploadUrl(value: unknown, field?: string): string | undefined {
  return value ? assertTrustedUploadUrl(value, field) : undefined;
}

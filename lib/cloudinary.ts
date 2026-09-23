import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import { log } from "./logger";
import { AppError } from "./error";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Layanan penyimpanan file belum dikonfigurasi. Hubungi administrator.", 503);
    }
    log.warn({}, "Cloudinary belum dikonfigurasi — upload dibatalkan di non-production");
    throw new AppError("Cloudinary belum dikonfigurasi pada environment ini.", 503);
  }

  const safeStem = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
  const publicId = `${safeStem}_${crypto.randomUUID()}`;
  const base64 = `data:${contentType};base64,${buffer.toString("base64")}`;

  try {
    const result = await cloudinary.uploader.upload(base64, {
      public_id: publicId,
      resource_type: "auto",
      folder: "uploads",
      use_filename: false,
      overwrite: false,
    });

    if (!result || !result.secure_url) {
      // include available info but never leak secrets
      const info = { public_id: result?.public_id, bytes: result?.bytes, format: result?.format, error: result?.error };
      throw new Error(`Cloudinary upload failed or returned no URL: ${JSON.stringify(info)}`);
    }

    return result.secure_url;
  } catch (err) {
    log.error({ message: err instanceof Error ? err.message : String(err) }, "Cloudinary upload error");
    throw err;
  }
}

export function getCloudinaryStatus(): { configured: boolean; cloudName?: string } {
  return {
    configured: isCloudinaryConfigured(),
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
}

export default cloudinary;

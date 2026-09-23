import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { AppError, handleError } from "@/lib/error";
import { requireAnyRole } from "@/lib/authorization";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const uploadPurposesByRole = {
  mahasiswa: new Set(["profile_photo", "logbook_photo", "report_document", "requirement_document", "requirement_photo"]),
  dpl: new Set(["profile_photo"]),
  admin: new Set(["admin_media", "admin_document"]),
  lppm: new Set<string>([]),
} as const;

// Validasi ekstensi per purpose agar tidak semua tipe bisa dipakai untuk semua purpose
const allowedExtensionsByPurpose: Record<string, ReadonlySet<string>> = {
  profile_photo: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  logbook_photo: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  report_document: new Set([".pdf", ".docx", ".doc"]),
  requirement_document: new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"]),
  requirement_photo: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  admin_media: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  admin_document: new Set([".pdf", ".docx", ".doc"]),
};

const uploadCounters = new Map<string, { count: number; start: number; active: number }>();
const UPLOAD_WINDOW_MS = 10 * 60_000;
const UPLOAD_MAX_PER_WINDOW = 12; // ~120 MB / 10 menit per akun (ketat dari 16)
const UPLOAD_MAX_CONCURRENT = 2;

function reserveUploadSlot(key: string) {
  const now = Date.now();
  if (uploadCounters.size > 2_000) {
    for (const [storedKey, value] of uploadCounters) {
      if (now - value.start >= UPLOAD_WINDOW_MS && value.active === 0) uploadCounters.delete(storedKey);
    }
  }
  const current = uploadCounters.get(key) || { count: 0, start: now, active: 0 };
  if (now - current.start >= UPLOAD_WINDOW_MS) {
    current.count = 0;
    current.start = now;
  }
  if (current.count >= UPLOAD_MAX_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.start + UPLOAD_WINDOW_MS - now) / 1_000));
    throw new AppError("Batas upload akun tercapai. Silakan tunggu beberapa menit.", 429, true, retryAfterSeconds);
  }
  if (current.active >= UPLOAD_MAX_CONCURRENT) {
    throw new AppError("Masih ada upload yang sedang diproses.", 429, true, 5);
  }
  current.count += 1;
  current.active += 1;
  uploadCounters.set(key, current);
  return () => {
    const latest = uploadCounters.get(key);
    if (latest) latest.active = Math.max(0, latest.active - 1);
  };
}

export async function POST(request: Request) {
  try {
    const session = await requireAnyRole(["mahasiswa", "dpl", "admin"]);

    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = String(formData.get("purpose") || "").trim();

    if (!(file instanceof File)) {
      throw new AppError("Tidak ada berkas file yang diunggah.", 400);
    }
    const allowedPurposes = uploadPurposesByRole[session.role as keyof typeof uploadPurposesByRole];
    if (!allowedPurposes?.has(purpose)) {
      throw new AppError("Tujuan upload tidak valid untuk akun ini.", 403);
    }

    const photoPurpose = purpose.endsWith("_photo") || purpose === "admin_media";
    const MAX_SIZE = purpose === "requirement_photo" ? 800 * 1024 : photoPurpose ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size <= 0 || file.size > MAX_SIZE) {
      const maxLabel = purpose === "requirement_photo" ? "800 KB" : photoPurpose ? "5 MB" : "10 MB";
      throw new AppError(`Ukuran berkas harus antara 1 byte dan ${maxLabel}.`, 413);
    }
    if (purpose === "logbook_photo" && file.size < 800 * 1024) {
      throw new AppError("Setiap foto logbook minimal berukuran 800 KB.", 413);
    }

    // Robust file extension extraction
    const lastDot = file.name.lastIndexOf(".");
    const fileExt = lastDot === -1 ? "" : file.name.substring(lastDot).toLowerCase();

    const allowedTypes: Record<string, string[]> = {
      ".jpg": ["image/jpeg", "image/jpg"],
      ".jpeg": ["image/jpeg", "image/jpg"],
      ".png": ["image/png"],
      ".webp": ["image/webp", "image/x-webp"],
      ".pdf": ["application/pdf"],
      ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
      ".doc": ["application/msword", "application/octet-stream"],
    };

    // Determine content type - fallback ke ekstensi jika kosong
    let contentType = file.type || "application/octet-stream";
    // Jika ekstensi .jpg tapi type kosong, beri image/jpeg
    if (!file.type && allowedTypes[fileExt]) {
      contentType = allowedTypes[fileExt][0];
    }

    if (!allowedTypes[fileExt]) {
      throw new AppError(`Format ${fileExt || "tanpa ekstensi"} tidak didukung. Gunakan JPG, PNG, WEBP, PDF, atau DOCX.`, 415);
    }
    // Validasi ekstensi harus sesuai dengan purpose (mencegah misuse quota)
    const allowedForPurpose = allowedExtensionsByPurpose[purpose];
    if (allowedForPurpose && !allowedForPurpose.has(fileExt)) {
      throw new AppError(`Ekstensi ${fileExt} tidak diperbolehkan untuk tujuan ${purpose}.`, 415);
    }
    // Untuk image/*, izinkan meskipun contentType tidak persis match (browser kadang kirim image/jpg vs image/jpeg)
    const isAllowedType = allowedTypes[fileExt]?.some((t) => contentType === t || (contentType.startsWith("image/") && fileExt.match(/\.(jpg|jpeg|png|webp)$/)));
    if (!isAllowedType) {
      throw new AppError(`Tipe file ${contentType} tidak sesuai ekstensi ${fileExt}.`, 415);
    }

    const identity = session.npm || session.nidn || session.username || session.email || session.nama || session.role;
    const releaseUploadSlot = reserveUploadSlot(`${session.role}:${identity}`);
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

    // Create unique filename
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").substring(0, 50);
    const fileName = `${Date.now()}_${sanitizedOriginalName}`;

    // Basic magic-bytes verification for common file types (best-effort)
    const header = buffer.slice(0, 16);
    const hex = header.toString("hex");
    const isJpeg = hex.startsWith("ffd8");
    const isPng = hex.startsWith("89504e47");
    const isPdf = hex.startsWith("25504446") && buffer.slice(-1024).includes(Buffer.from("%%EOF"));
    const isWebp =
      header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
      const isDocx =
        hex.startsWith("504b0304") &&
        buffer.includes(Buffer.from("[Content_Types].xml")) &&
        buffer.includes(Buffer.from("word/"));
      const isDoc = hex.startsWith("d0cf11e0a1b11ae1");

      const validMagicByExtension: Record<string, boolean> = {
        ".jpg": isJpeg,
        ".jpeg": isJpeg,
        ".png": isPng,
        ".webp": isWebp,
        ".pdf": isPdf,
        ".docx": isDocx,
        ".doc": isDoc,
      };
      if (!validMagicByExtension[fileExt]) {
        throw new AppError("Isi berkas tidak sesuai dengan format file.", 415);
      }

      const fileUrl = await uploadToCloudinary(buffer, fileName, contentType);

      return NextResponse.json({
        success: true,
        message: "Berkas berhasil diunggah ke cloud storage.",
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || fileExt,
      });
    } finally {
      releaseUploadSlot();
    }
  } catch (error: unknown) {
    return handleError(error);
  }
}

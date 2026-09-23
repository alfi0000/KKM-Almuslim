import { NextRequest, NextResponse } from "next/server";
import {
  addAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  setActiveAnnouncement,
  updateAnnouncement,
} from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { optionalString, positiveInteger, readJsonObject, requiredString } from "@/lib/api-validation";

export async function GET() {
  try {
    await requireRole("admin");
    const announcements = await getAllAnnouncements();
    return NextResponse.json({ success: true, announcements });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(req, 64_000);
    const { label, message, deadline, isActive } = body;
    const cleanLabel = requiredString(label, "Label", 1, 50);
    const cleanMessage = requiredString(message, "Pesan", 1, 500);

    const announcement = await addAnnouncement({
      label: cleanLabel,
      message: cleanMessage,
      deadline: optionalString(deadline, "Batas Waktu", 40) || undefined,
      isActive: Boolean(isActive),
    });

    if (announcement.isActive) {
      await setActiveAnnouncement(announcement.id!);
    }

    return NextResponse.json({ success: true, announcement });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(req, 64_000);
    const { id, label, message, deadline, isActive } = body;
    const announcementId = positiveInteger(id, "ID pengumuman");

    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = requiredString(label, "Label", 1, 50);
    if (message !== undefined) updateData.message = requiredString(message, "Pesan", 1, 500);
    if (deadline !== undefined) updateData.deadline = optionalString(deadline, "Batas Waktu", 40) || undefined;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const announcement = await updateAnnouncement(announcementId, updateData);

    if (announcement?.isActive) {
      await setActiveAnnouncement(announcementId);
    }

    return NextResponse.json({ success: true, announcement });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const id = positiveInteger(searchParams.get("id"), "ID pengumuman");

    await deleteAnnouncement(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleError(error);
  }
}
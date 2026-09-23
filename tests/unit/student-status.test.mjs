import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPerBerkasIssue,
  isDocumentRejected,
  isDocumentVerified,
  needsRepair,
  normalizeStudentStatus,
} from "../../features/admin/utils/student-status.ts";

test("normalisasi status mahasiswa konsisten", () => {
  assert.equal(normalizeStudentStatus(" Terverifikasi "), "terverifikasi");
  assert.equal(isDocumentVerified("Terverifikasi / Aktif"), true);
  assert.equal(isDocumentRejected("Perlu Perbaikan"), true);
});

test("status per berkas yang salah membutuhkan perbaikan", () => {
  const profile = {
    status: "Menunggu Verifikasi",
    catatanVerifikasiBerkas: JSON.stringify({
      perBerkas: {
        transkrip: { status: "ok" },
        krs: { status: "x" },
      },
    }),
  };

  assert.equal(hasPerBerkasIssue(profile), true);
  assert.equal(needsRepair(profile), true);
});

test("catatan verifikasi rusak tidak menjatuhkan aplikasi", () => {
  assert.equal(hasPerBerkasIssue({ catatanVerifikasiBerkas: "bukan-json" }), false);
});

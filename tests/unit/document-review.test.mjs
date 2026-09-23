import assert from "node:assert/strict";
import test from "node:test";
import {
  areAllDocumentsVerified,
  getDocumentRepairList,
  hasPendingDocumentReview,
  isDocumentSubmissionRejected,
  parseDocumentReviews,
} from "../../features/mahasiswa/utils/document-review.ts";

test("semua berkas wajib harus berstatus ok agar terverifikasi", () => {
  const reviews = parseDocumentReviews(JSON.stringify({
    perBerkas: {
      slipPembayaran: { status: "ok" },
      slipSpp: { status: "ok" },
      transkrip: { status: "ok" },
      krs: { status: "ok" },
      pasFoto: { status: "ok" },
      asuransiJiwa: { status: "ok" },
    },
  }));

  assert.equal(areAllDocumentsVerified(reviews), true);
  assert.equal(hasPendingDocumentReview(reviews), false);
});

test("daftar perbaikan berisi label dan catatan berkas yang ditolak", () => {
  const reviews = parseDocumentReviews(JSON.stringify({
    perBerkas: {
      krs: { status: "x", note: "Dokumen tidak terbaca" },
      transkrip: { status: "pending" },
    },
  }));

  assert.deepEqual(getDocumentRepairList(reviews), [{
    key: "krs",
    label: "KRS",
    note: "Dokumen tidak terbaca",
  }]);
  assert.equal(hasPendingDocumentReview(reviews), true);
  assert.equal(areAllDocumentsVerified(reviews), false);
});

test("catatan rusak dan variasi status penolakan ditangani dengan aman", () => {
  assert.equal(parseDocumentReviews("bukan-json"), null);
  assert.equal(isDocumentSubmissionRejected(" Perlu Perbaikan "), true);
  assert.equal(isDocumentSubmissionRejected("Terverifikasi"), false);
});

import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { StudentProfileRecord } from "@/lib/types";

const KKM_BATCH = "XXIX";
const ACADEMIC_YEAR = "2025/2026";
const DOCUMENT_CITY = "Matangglumpangdua";
const PDF_FONT_REGULAR = path.join(process.cwd(), "node_modules/@fontsource/noto-serif/files/noto-serif-latin-400-normal.woff");
const PDF_FONT_BOLD = path.join(process.cwd(), "node_modules/@fontsource/noto-serif/files/noto-serif-latin-700-normal.woff");

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

function text(value: unknown, fallback = "-") {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(date);
}

function today() {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
}

function semester(profile: StudentProfileRecord) {
  return text(profile.kkmSemester, "Genap");
}

function registrationCode(profile: StudentProfileRecord, documentNumber?: string) {
  const cleanDocumentNumber = String(documentNumber ?? "").trim();
  if (cleanDocumentNumber) return cleanDocumentNumber;
  const sequence = profile.id != null
    ? String(profile.id).padStart(4, "0")
    : String(profile.npm || "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `${KKM_BATCH}${sequence}`;
}

function bodyParagraph(content: string, options: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; before?: number; after?: number } = {}) {
  return new Paragraph({
    alignment: options.align,
    spacing: { before: options.before ?? 0, after: options.after ?? 80, line: 260 },
    children: [new TextRun({ text: content, bold: options.bold, size: 21, font: "Times New Roman" })],
  });
}

function compactParagraph(content: string, options: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string; after?: number; left?: number } = {}) {
  return new Paragraph({
    alignment: options.align,
    indent: options.left ? { left: options.left } : undefined,
    spacing: { before: 0, after: options.after ?? 15, line: 250 },
    children: [new TextRun({ text: content, bold: options.bold, color: options.color, size: 19, font: "Times New Roman" })],
  });
}

function compactFieldRow(label: string, value: string, number: number) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 500, type: WidthType.DXA },
        borders: noBorders,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [compactParagraph(`${number}.`)],
      }),
      new TableCell({
        width: { size: 3000, type: WidthType.DXA },
        borders: noBorders,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [compactParagraph(label)],
      }),
      new TableCell({
        width: { size: 4050, type: WidthType.DXA },
        borders: noBorders,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [compactParagraph(`: ${value}`)],
      }),
    ],
  });
}

function checkedBox() {
  return new Table({
    width: { size: 260, type: WidthType.DXA },
    columnWidths: [260],
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: 260, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 7, color: "666666" },
          bottom: { style: BorderStyle.SINGLE, size: 7, color: "666666" },
          left: { style: BorderStyle.SINGLE, size: 7, color: "666666" },
          right: { style: BorderStyle.SINGLE, size: 7, color: "666666" },
        },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 180 },
          children: [new TextRun({ text: "✓", color: "2F855A", bold: true, size: 18, font: "Arial" })],
        })],
      })],
    })],
  });
}

function photoCell(photoBytes?: Uint8Array) {
  return new TableCell({
    width: { size: 1700, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    borders: noBorders,
    margins: { top: 0, bottom: 0, left: 80, right: 0 },
    children: [
      new Table({
        width: { size: 1550, type: WidthType.DXA },
        columnWidths: [1550],
        rows: [new TableRow({
          children: [new TableCell({
            width: { size: 1550, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 14, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 14, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 14, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 14, color: "000000" },
            },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: photoBytes
                ? [new ImageRun({ data: photoBytes, type: "png", transformation: { width: 102, height: 136 } })]
                : [new TextRun({ text: "PAS FOTO 3 x 4", bold: true, size: 18, font: "Times New Roman" })],
            })],
          })],
        })],
      }),
    ],
  });
}

function buildRegistrationPage(profile: StudentProfileRecord, photoBytes?: Uint8Array, documentNumber?: string) {
  const identityTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [7550, 1750],
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 7550, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [500, 3000, 4050],
                borders: noBorders,
                rows: [
                  compactFieldRow("Nama", text(profile.nama), 1),
                  compactFieldRow("Tempat / Tanggal Lahir", `${text(profile.tempatLahir)} / ${formatDate(profile.tanggalLahir)}`, 2),
                  compactFieldRow("NIM", text(profile.npm), 3),
                  compactFieldRow("Fakultas", text(profile.fakultas), 4),
                  compactFieldRow("Prodi", text(profile.prodi), 5),
                  compactFieldRow("IPK", text(profile.ipk), 6),
                  compactFieldRow("SKS Lulus", `${text(profile.sksLulus)} SKS`, 7),
                  compactFieldRow("SKS Belum Lulus", `${text(profile.sksBelumLulus)} SKS`, 8),
                  compactFieldRow("Kelas Kuliah", text(profile.kelasKuliah), 9),
                  compactFieldRow("Status Perkawinan", text(profile.statusPerkawinan), 10),
                  compactFieldRow("Alamat Sekarang", text(profile.alamatSekarang || profile.alamat), 11),
                  compactFieldRow("Telp / HP", text(profile.noTelepon || profile.noHpMahasiswa), 12),
                  compactFieldRow("HP Orangtua / Wali", text(profile.hpOrtuWali || profile.noHpOrtu), 13),
                  compactFieldRow("Email", text(profile.email), 14),
                  compactFieldRow("KKM", semester(profile), 15),
                ],
              }),
            ],
          }),
          photoCell(photoBytes),
        ],
      }),
    ],
  });

  const requirementRows: Array<{ number: string; description: string; checked: boolean }> = [
    { number: "1.", description: "Mengisi Formulir Secara Online", checked: true },
    { number: "2.", description: "Mengupload:", checked: false },
    { number: "", description: "a. Slip pembayaran biaya KKM dan Transportasi;", checked: true },
    { number: "", description: `b. Slip SPP Tahap IV Tahun Akademik ${ACADEMIC_YEAR};`, checked: true },
    { number: "", description: "c. Transkrip Nilai Akademik (Legalisir Wakil Dekan I Bidang Akademik);", checked: true },
    { number: "", description: "d. KRS (Kartu Rencana Studi) semester berjalan legalisir Ketua Program Studi;", checked: true },
    { number: "", description: "e. Pas Photo ukuran 3 x 4 cm dengan latar merah dan memakai baju almamater;", checked: true },
    { number: "", description: "f. Asuransi jiwa;", checked: true },
    { number: "3.", description: "Menandatangani surat pernyataan bersedia ditempatkan pada lokasi yang telah ditentukan oleh divisi pengabdian di bawah LPPM.", checked: true },
  ];

  const requirementsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [450, 8300, 550],
    borders: noBorders,
    rows: requirementRows.map((item) => new TableRow({
      children: [
        new TableCell({ width: { size: 450, type: WidthType.DXA }, borders: noBorders, children: [compactParagraph(item.number)] }),
        new TableCell({
          width: { size: 8300, type: WidthType.DXA },
          borders: noBorders,
          children: [compactParagraph(item.description, { left: item.number ? 0 : 120 })],
        }),
        new TableCell({ width: { size: 550, type: WidthType.DXA }, borders: noBorders, children: [item.checked ? checkedBox() : compactParagraph("")] }),
      ],
    })),
  });

  const closingText = `Demikian Formulir Pendaftaran ini saya isi dengan sebenarnya agar dapat dipertimbangkan sebagai peserta KKM pada Angkatan ${KKM_BATCH} Tahun Akademik ${ACADEMIC_YEAR}. Atas perhatian dan pertimbangannya, saya ucapkan terimakasih.`;

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [8100, 1200],
      borders: noBorders,
      rows: [new TableRow({ children: [
        new TableCell({ width: { size: 8100, type: WidthType.DXA }, borders: noBorders, children: [compactParagraph("")] }),
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
          },
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
          children: [compactParagraph(registrationCode(profile, documentNumber), { bold: true, align: AlignmentType.CENTER, after: 0 })],
        }),
      ] })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: "FORMULIR PENDAFTARAN KKM", bold: true, size: 22, font: "Times New Roman" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Angkatan ${KKM_BATCH} Tahun ${ACADEMIC_YEAR}`, bold: true, size: 18, font: "Times New Roman" })],
    }),
    compactParagraph("A. Identitas Mahasiswa :", { bold: true, after: 45 }),
    identityTable,
    compactParagraph("B. Persyaratan KKM : (beri tanda ✓ ya / ✕ tidak)", { bold: true, after: 35 }),
    requirementsTable,
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [9300],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 9300, type: WidthType.DXA },
        shading: { fill: "DCEBF7" },
        borders: noBorders,
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [compactParagraph(closingText, { color: "365F91", after: 0 })],
      })] })],
    }),
  ];
}

function buildStatementPage(profile: StudentProfileRecord) {
  const statementFields = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3200, 6100],
    borders: noBorders,
    rows: [
      ["Nama", text(profile.nama)],
      ["Tempat / Tgl. Lahir", `${text(profile.tempatLahir)} / ${formatDate(profile.tanggalLahir)}`],
      ["NIM", text(profile.npm)],
      ["Fakultas", text(profile.fakultas)],
      ["Prodi", text(profile.prodi)],
      ["Alamat", text(profile.alamatSekarang || profile.alamat)],
      ["HP", text(profile.noTelepon || profile.noHpMahasiswa)],
    ].map(([label, value]) => new TableRow({
      children: [
        new TableCell({ borders: noBorders, children: [bodyParagraph(label, { after: 30 })] }),
        new TableCell({ borders: noBorders, children: [bodyParagraph(`: ${value}`, { after: 30 })] }),
      ],
    })),
  });

  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: "SURAT PERNYATAAN", bold: true, underline: {}, size: 30, font: "Times New Roman" })],
    }),
    bodyParagraph("Yang bertanda tangan di bawah ini :", { after: 100 }),
    statementFields,
    bodyParagraph(
      `Dengan ini menyatakan bahwa saya akan melaksanakan Kuliah Kerja Mahasiswa (KKM) Angkatan ${KKM_BATCH} Semester ${semester(profile)} Tahun Akademik ${ACADEMIC_YEAR}, sesuai dengan peraturan, prosedur dan mekanisme yang ditetapkan, serta bersedia mematuhi segala hal yang ditetapkan oleh Universitas Almuslim termasuk lokasi desa penempatan KKM. Akomodasi, konsumsi dan transportasi selama masa pelaksanaan KKM ditanggung oleh masing-masing peserta. Bagi mahasiswi yang sedang hamil tidak dibenarkan mengikuti KKM. Apabila saya melanggar pernyataan ini, saya bersedia dibatalkan sebagai peserta KKM.`,
      { before: 180, after: 180 },
    ),
    bodyParagraph(
      "Demikian surat pernyataan ini saya buat dengan penuh rasa tanggung jawab dan atas kesadaran sendiri tanpa ada paksaan dari pihak manapun serta untuk dapat dipergunakan seperlunya.",
      { after: 260 },
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [4650, 4650],
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorders,
              verticalAlign: VerticalAlign.TOP,
              children: [
                bodyParagraph("Persetujuan Orang Tua/Wali,", { bold: true, after: 520 }),
                bodyParagraph("(...............................................)", { bold: true }),
              ],
            }),
            new TableCell({
              borders: noBorders,
              verticalAlign: VerticalAlign.TOP,
              children: [
                bodyParagraph(`${DOCUMENT_CITY}, ${today()}`, { after: 20 }),
                bodyParagraph("Yang membuat pernyataan,", { bold: true, after: 160 }),
                bodyParagraph("Materai Rp. 10.000", { after: 180 }),
                bodyParagraph(`( ${text(profile.nama)} )`, { bold: true }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

export async function generateVerifiedStudentDocx(profile: StudentProfileRecord, photoBytes?: Uint8Array, documentNumber?: string) {
  const document = new Document({
    creator: "SIKKMA Universitas Almuslim",
    title: `Dokumen Administrasi KKM - ${profile.nama}`,
    description: "Formulir pendaftaran dan surat pernyataan peserta KKM yang telah diverifikasi.",
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, right: 850, bottom: 720, left: 850 },
        },
      },
      children: [...buildRegistrationPage(profile, photoBytes, documentNumber), ...buildStatementPage(profile)],
    }],
  });
  return Packer.toBuffer(document);
}

function drawWrappedText(page: PDFPage, content: string, options: { x: number; y: number; maxWidth: number; font: PDFFont; size: number; lineHeight?: number; color?: ReturnType<typeof rgb> }) {
  const words = content.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (options.font.widthOfTextAtSize(candidate, options.size) <= options.maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const lineHeight = options.lineHeight ?? options.size * 1.35;
  lines.forEach((value, index) => page.drawText(value, { x: options.x, y: options.y - index * lineHeight, size: options.size, font: options.font, color: options.color ?? rgb(0, 0, 0) }));
  return options.y - lines.length * lineHeight;
}

function drawCentered(page: PDFPage, content: string, y: number, font: PDFFont, size: number) {
  const width = font.widthOfTextAtSize(content, size);
  page.drawText(content, { x: (page.getWidth() - width) / 2, y, size, font });
}

function drawPdfField(page: PDFPage, label: string, value: string, y: number, fonts: { regular: PDFFont }, options: { size?: number; labelX?: number; colonX?: number; valueX?: number; maxWidth?: number; lineHeight?: number } = {}) {
  const size = options.size ?? 10.5;
  const labelX = options.labelX ?? 60;
  const colonX = options.colonX ?? 215;
  const valueX = options.valueX ?? 228;
  page.drawText(label, { x: labelX, y, size, font: fonts.regular });
  page.drawText(":", { x: colonX, y, size, font: fonts.regular });
  return drawWrappedText(page, value, { x: valueX, y, maxWidth: options.maxWidth ?? 285, font: fonts.regular, size, lineHeight: options.lineHeight ?? 13 });
}

function drawPdfCheck(page: PDFPage, y: number) {
  const green = rgb(0.22, 0.48, 0.29);
  page.drawRectangle({ x: 518, y: y - 2, width: 10, height: 10, borderColor: rgb(0.35, 0.35, 0.35), borderWidth: 0.7 });
  page.drawLine({ start: { x: 520, y: y + 2 }, end: { x: 522.5, y: y }, thickness: 1.2, color: green });
  page.drawLine({ start: { x: 522.5, y: y }, end: { x: 526, y: y + 5.5 }, thickness: 1.2, color: green });
}

export async function generateVerifiedStudentPdf(profile: StudentProfileRecord, photoBytes?: Uint8Array, documentNumber?: string) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Dokumen Administrasi KKM - ${profile.nama}`);
  pdf.setAuthor("SIKKMA Universitas Almuslim");
  pdf.setSubject("Formulir pendaftaran dan surat pernyataan peserta KKM terverifikasi");
  const [regularBytes, boldBytes] = await Promise.all([readFile(PDF_FONT_REGULAR), readFile(PDF_FONT_BOLD)]);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const page1 = pdf.addPage([595.28, 841.89]);

  page1.drawRectangle({ x: 492, y: 801, width: 55, height: 18, borderColor: rgb(0, 0, 0), borderWidth: 0.8 });
  page1.drawText(registrationCode(profile, documentNumber), { x: 497, y: 807, size: 8.5, font: bold });
  drawCentered(page1, "FORMULIR PENDAFTARAN KKM", 788, bold, 12);
  drawCentered(page1, `Angkatan ${KKM_BATCH} Tahun ${ACADEMIC_YEAR}`, 772, bold, 9.5);
  page1.drawText("A. Identitas Mahasiswa :", { x: 55, y: 748, size: 10.5, font: bold });

  if (photoBytes) {
    const image = await pdf.embedPng(photoBytes);
    page1.drawRectangle({ x: 467, y: 624, width: 78, height: 104, borderColor: rgb(0, 0, 0), borderWidth: 1 });
    page1.drawImage(image, { x: 470, y: 627, width: 72, height: 98 });
  } else {
    page1.drawRectangle({ x: 467, y: 624, width: 78, height: 104, borderColor: rgb(0, 0, 0), borderWidth: 1 });
    page1.drawText("PAS FOTO 3 x 4", { x: 475, y: 673, size: 8, font: bold });
  }

  let y = 728;
  const registrationFields: Array<[string, string]> = [
    ["1. Nama", text(profile.nama)],
    ["2. Tempat / Tanggal Lahir", `${text(profile.tempatLahir)} / ${formatDate(profile.tanggalLahir)}`],
    ["3. NIM", text(profile.npm)],
    ["4. Fakultas", text(profile.fakultas)],
    ["5. Prodi", text(profile.prodi)],
    ["6. IPK", text(profile.ipk)],
    ["7. SKS Lulus", `${text(profile.sksLulus)} SKS`],
    ["8. SKS Belum Lulus", `${text(profile.sksBelumLulus)} SKS`],
    ["9. Kelas Kuliah", text(profile.kelasKuliah)],
    ["10. Status Perkawinan", text(profile.statusPerkawinan)],
    ["11. Alamat Sekarang", text(profile.alamatSekarang || profile.alamat)],
    ["12. Telp / HP", text(profile.noTelepon || profile.noHpMahasiswa)],
    ["13. HP Orangtua / Wali", text(profile.hpOrtuWali || profile.noHpOrtu)],
    ["14. Email", text(profile.email)],
    ["15. KKM", semester(profile)],
  ];
  for (const [label, value] of registrationFields) {
    y = drawPdfField(page1, label, value, y, { regular }, { size: 8.6, labelX: 62, colonX: 193, valueX: 202, maxWidth: 250, lineHeight: 10.5 }) - 4.5;
  }

  page1.drawText("B. Persyaratan KKM : (beri tanda ✓ ya / ✕ tidak)", { x: 55, y: y - 1, size: 9.8, font: bold });
  y -= 18;
  const requirementRows: Array<{ number: string; description: string; checked: boolean; indent?: number }> = [
    { number: "1.", description: "Mengisi Formulir Secara Online", checked: true },
    { number: "2.", description: "Mengupload:", checked: false },
    { number: "", description: "a. Slip pembayaran biaya KKM dan Transportasi;", checked: true, indent: 12 },
    { number: "", description: `b. Slip SPP Tahap IV Tahun Akademik ${ACADEMIC_YEAR};`, checked: true, indent: 12 },
    { number: "", description: "c. Transkrip Nilai Akademik (Legalisir Wakil Dekan I Bidang Akademik);", checked: true, indent: 12 },
    { number: "", description: "d. KRS semester berjalan legalisir Ketua Program Studi;", checked: true, indent: 12 },
    { number: "", description: "e. Pas Photo ukuran 3 x 4 cm dengan latar merah dan memakai baju almamater;", checked: true, indent: 12 },
    { number: "", description: "f. Asuransi jiwa;", checked: true, indent: 12 },
    { number: "3.", description: "Menandatangani surat pernyataan bersedia ditempatkan pada lokasi yang telah ditentukan oleh divisi pengabdian di bawah LPPM.", checked: true },
  ];
  for (const item of requirementRows) {
    if (item.number) page1.drawText(item.number, { x: 62, y, size: 8.2, font: regular });
    const rowY = y;
    y = drawWrappedText(page1, item.description, { x: 77 + (item.indent || 0), y, maxWidth: 420 - (item.indent || 0), font: regular, size: 8.2, lineHeight: 10.5 }) - 2.5;
    if (item.checked) drawPdfCheck(page1, rowY);
  }

  const closingText = `Demikian Formulir Pendaftaran ini saya isi dengan sebenarnya agar dapat dipertimbangkan sebagai peserta KKM pada Angkatan ${KKM_BATCH} Tahun Akademik ${ACADEMIC_YEAR}. Atas perhatian dan pertimbangannya, saya ucapkan terimakasih.`;
  const calloutY = Math.max(42, y - 65);
  page1.drawRectangle({ x: 55, y: calloutY, width: 485, height: 54, color: rgb(0.86, 0.92, 0.97) });
  drawWrappedText(page1, closingText, { x: 67, y: calloutY + 37, maxWidth: 461, font: regular, size: 8.4, lineHeight: 11, color: rgb(0.2, 0.36, 0.57) });

  const page2 = pdf.addPage([595.28, 841.89]);
  drawCentered(page2, "SURAT PERNYATAAN", 785, bold, 16);
  page2.drawLine({ start: { x: 220, y: 782 }, end: { x: 375, y: 782 }, thickness: 0.8 });
  page2.drawText("Yang bertanda tangan di bawah ini :", { x: 65, y: 750, size: 11, font: regular });
  y = 722;
  const statementFields: Array<[string, string]> = [
    ["Nama", text(profile.nama)],
    ["Tempat / Tgl. Lahir", `${text(profile.tempatLahir)} / ${formatDate(profile.tanggalLahir)}`],
    ["NIM", text(profile.npm)],
    ["Fakultas", text(profile.fakultas)],
    ["Prodi", text(profile.prodi)],
    ["Alamat", text(profile.alamatSekarang || profile.alamat)],
    ["HP", text(profile.noTelepon || profile.noHpMahasiswa)],
  ];
  for (const [label, value] of statementFields) {
    page2.drawText(label, { x: 75, y, size: 11, font: regular });
    page2.drawText(":", { x: 210, y, size: 11, font: regular });
    y = drawWrappedText(page2, value, { x: 225, y, maxWidth: 310, font: regular, size: 11, lineHeight: 14 }) - 7;
  }
  y = drawWrappedText(page2, `Dengan ini menyatakan bahwa saya akan melaksanakan Kuliah Kerja Mahasiswa (KKM) Angkatan ${KKM_BATCH} Semester ${semester(profile)} Tahun Akademik ${ACADEMIC_YEAR}, sesuai dengan peraturan, prosedur dan mekanisme yang ditetapkan, serta bersedia mematuhi segala hal yang ditetapkan oleh Universitas Almuslim termasuk lokasi desa penempatan KKM. Akomodasi, konsumsi dan transportasi selama masa pelaksanaan KKM ditanggung oleh masing-masing peserta. Bagi mahasiswi yang sedang hamil tidak dibenarkan mengikuti KKM. Apabila saya melanggar pernyataan ini, saya bersedia dibatalkan sebagai peserta KKM.`, { x: 65, y: y - 15, maxWidth: 465, font: regular, size: 11, lineHeight: 17 });
  y = drawWrappedText(page2, "Demikian surat pernyataan ini saya buat dengan penuh rasa tanggung jawab dan atas kesadaran sendiri tanpa ada paksaan dari pihak manapun serta untuk dapat dipergunakan seperlunya.", { x: 65, y: y - 15, maxWidth: 465, font: regular, size: 11, lineHeight: 17 });
  page2.drawText(`${DOCUMENT_CITY}, ${today()}`, { x: 340, y: y - 35, size: 11, font: regular });
  page2.drawText("Yang membuat pernyataan,", { x: 340, y: y - 53, size: 11, font: bold });
  page2.drawRectangle({ x: 350, y: y - 105, width: 60, height: 38, borderColor: rgb(0, 0, 0), borderWidth: 0.8 });
  page2.drawText("Materai", { x: 363, y: y - 82, size: 9, font: regular });
  page2.drawText("Rp. 10.000", { x: 357, y: y - 95, size: 9, font: regular });
  page2.drawText(`( ${text(profile.nama)} )`, { x: 415, y: y - 115, size: 10, font: bold });
  page2.drawText("Persetujuan Orang Tua/Wali,", { x: 65, y: y - 53, size: 11, font: bold });
  page2.drawText("(...............................................)", { x: 65, y: y - 115, size: 11, font: bold });

  return pdf.save();
}

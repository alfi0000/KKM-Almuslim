import QRCode from "qrcode";

export interface StudentProfileForPrint {
  nama: string;
  npm: string;
  fakultas: string;
  prodi: string;
  program: string;
  gampong: string;
  dpl: string;
  foto?: string;
}

export interface DplProfileForPrint {
  nama: string;
  nidn: string;
  fakultas: string;
  skema: string;
  kecamatan?: string;
  email?: string;
  noHp?: string;
  alamat?: string;
  foto?: string;
}

export type PrintableProfile = StudentProfileForPrint | DplProfileForPrint;

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

export async function handlePrintCard(profile: PrintableProfile) {
  if (typeof window === "undefined") return;

  const isDpl = !("npm" in profile);
  const identifier = isDpl ? profile.nidn : profile.npm;
  const qrPayload = isDpl
    ? `${window.location.origin}/dpl/login?ref=${encodeURIComponent(identifier)}`
    : identifier;
  const qrCodeUrl = await QRCode.toDataURL(qrPayload, { width: 300, margin: 1, errorCorrectionLevel: "M" });

  const logoUrl = `${window.location.origin}/images/logo.png`;
  const fotoUrl = profile.foto
    ? profile.foto.startsWith("http")
      ? profile.foto
      : `${window.location.origin}${profile.foto}`
    : null;

  const printWindow = window.open("", "_blank", "width=800,height=650");
  if (!printWindow) {
    alert("Gagal membuka jendela cetak. Pastikan pop-up blocker Anda dinonaktifkan.");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Cetak Kartu KKM - ${escapeHtml(profile.nama)}</title>
        <style>
          @page {
            size: A5 landscape;
            margin: 0;
          }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background-color: #f8f9fa;
            color: #1a202c;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          .card-container {
            width: 100%;
            max-width: 650px;
            background: #ffffff;
            border: 2px solid #0f5132;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
          }
          /* Top background decorative elements */
          .card-container::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background-color: #0f5132;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            border-bottom: 3px double #0f5132;
            padding-bottom: 14px;
            margin-bottom: 20px;
            text-align: center;
          }
          .logo {
            width: 55px;
            height: 55px;
            object-fit: contain;
          }
          .header-text {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .univ-name {
            font-size: 18px;
            font-weight: 800;
            color: #1a202c;
            margin: 0;
            letter-spacing: 0.5px;
            line-height: 1.2;
          }
          .card-title {
            font-size: 12px;
            font-weight: 700;
            color: #0f5132;
            margin: 4px 0 2px 0;
            text-transform: uppercase;
            letter-spacing: 0.2px;
          }
          .card-subtitle {
            font-size: 10px;
            color: #718096;
            font-weight: 600;
            margin: 0;
          }
          .content-grid {
            display: grid;
            grid-template-columns: 125px 1fr 125px;
            gap: 20px;
            align-items: center;
          }
          .photo-box {
            width: 125px;
            height: 166px; /* 3:4 ratio approx */
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f8f9fa;
            overflow: hidden;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
          }
          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .no-photo {
            font-size: 9px;
            color: #718096;
            font-weight: 800;
            text-align: center;
            text-transform: uppercase;
            padding: 8px;
          }
          .info-box {
            font-size: 11.5px;
            line-height: 1.6;
          }
          .info-row {
            display: flex;
            margin-bottom: 6px;
            align-items: flex-start;
          }
          .info-label {
            width: 95px;
            color: #718096;
            font-weight: 600;
            flex-shrink: 0;
          }
          .info-colon {
            width: 10px;
            color: #718096;
            flex-shrink: 0;
          }
          .info-value {
            color: #2d3748;
            font-weight: 500;
          }
          .info-value strong {
            color: #1a202c;
            font-weight: 700;
          }
          .qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-left: 1px dashed #cbd5e1;
            padding-left: 18px;
            height: 100%;
          }
          .qr-image-container {
            width: 105px;
            height: 105px;
            border: 1px solid #cbd5e1;
            padding: 4px;
            border-radius: 6px;
            background-color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          }
          .qr-image-container img {
            width: 95px;
            height: 95px;
            object-fit: contain;
          }
          .qr-label {
            font-size: 8px;
            font-weight: 800;
            color: #0f5132;
            text-transform: uppercase;
            margin-top: 8px;
            text-align: center;
            letter-spacing: 0.5px;
            line-height: 1.2;
          }
          .footer {
            border-top: 1px solid #e2e8f0;
            margin-top: 20px;
            padding-top: 10px;
            font-size: 9px;
            color: #718096;
            font-weight: 500;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer-watermark {
            color: #0f5132;
            font-weight: 700;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media print {
            body {
              background: transparent;
              padding: 0;
              margin: 0;
            }
            .card-container {
              border: 2px solid #0f5132 !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <div class="header">
            <img src="${escapeHtml(logoUrl)}" alt="Logo UMuslim" class="logo" />
            <div class="header-text">
              <h2 class="univ-name">UNIVERSITAS ALMUSLIM</h2>
              <div class="card-title">KARTU TANDA PESERTA KULIAH KERJA MASYARAKAT (KKM)</div>
              <div class="card-subtitle">ANGKATAN XXXV TAHUN AKADEMIK 2026/2027</div>
            </div>
          </div>
          <div class="content-grid">
            <div class="photo-box">
              ${
                fotoUrl
                  ? `<img src="${escapeHtml(fotoUrl)}" alt="Foto ${escapeHtml(profile.nama)}" />`
                  : `<div class="no-photo">FOTO 3x4<br>MAHASISWA</div>`
              }
            </div>
            <div class="info-box">
              <div class="info-row">
                <div class="info-label">Nama Lengkap</div>
                <div class="info-colon">:</div>
                <div class="info-value"><strong>${escapeHtml(profile.nama)}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">${isDpl ? "NIDN" : "NPM"}</div>
                <div class="info-colon">:</div>
                <div class="info-value"><strong>${escapeHtml(identifier)}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Fakultas</div>
                <div class="info-colon">:</div>
                <div class="info-value">${escapeHtml(profile.fakultas)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">${isDpl ? "Skema KKM" : "Program Studi"}</div>
                <div class="info-colon">:</div>
                <div class="info-value">${escapeHtml(isDpl ? profile.skema : profile.prodi)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">${isDpl ? "Kecamatan" : "Lokasi Posko"}</div>
                <div class="info-colon">:</div>
                <div class="info-value">${escapeHtml(isDpl ? profile.kecamatan || "-" : profile.gampong)}</div>
              </div>
              ${isDpl ? `
              <div class="info-row">
                <div class="info-label">Email</div>
                <div class="info-colon">:</div>
                <div class="info-value">${escapeHtml(profile.email || "-")}</div>
              </div>
              <div class="info-row">
                <div class="info-label">No. HP</div>
                <div class="info-colon">:</div>
                <div class="info-value">${escapeHtml(profile.noHp || "-")}</div>
              </div>
              ` : ""}
            </div>
            <div class="qr-box">
              <div class="qr-image-container">
                <img src="${escapeHtml(qrCodeUrl)}" alt="QR Code" />
              </div>
              <div class="qr-label">Scan Verifikasi Kartu</div>
            </div>
          </div>
          <div class="footer">
            <div>Dicetak secara digital melalui SIKKMA Almuslim — LPPM UMuslim</div>
            <div class="footer-watermark">SIKKMA Almuslim</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            // Give images some time to load, then print and close window
            setTimeout(function() {
              window.print();
              window.close();
            }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

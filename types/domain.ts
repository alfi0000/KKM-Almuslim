export interface UserRecord {
  id?: number;
  nama: string;
  npm: string;
  password?: string;
  createdAt?: string;
  diverifikasi?: boolean;
}

export interface StudentProfileRecord {
  id?: number;
  nama: string;
  npm: string;
  ipk: string;
  fakultas: string;
  prodi: string;
  program: string;
  kabupaten?: string;
  kecamatan: string;
  gampong: string;
  dpl: string;
  posko: string;
  tanggalDaftar: string;
  status: string;
  transkrip?: string;
  krs?: string;
  khs?: string;
  paspor?: string;
  buktiPembayaran?: string;
  golonganDarah?: string;
  riwayatPenyakit?: string;
  noHpMahasiswa?: string;
  noHpOrtu?: string;
  alamat?: string;
  angkatan?: string;
  lokasi?: string;
  foto?: string;
  isKetuaKelompok?: number;
  // Biodata lengkap unggah-berkas (baru)
  tempatLahir?: string;
  tanggalLahir?: string;
  sksLulus?: number;
  sksBelumLulus?: number;
  kelasKuliah?: string;
  statusPerkawinan?: string;
  alamatSekarang?: string;
  noTelepon?: string;
  hpOrtuWali?: string;
  email?: string;
  kkmSemester?: string;
  slipSpp?: string;
  asuransiJiwa?: string;
  slipPembayaran?: string;
  catatanVerifikasiBerkas?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface LogbookRecord {
  id?: number;
  npm: string;
  tanggal: string;
  judul: string;
  lokasi: string;
  deskripsi: string;
  foto: string;
  foto2?: string;
  capaianAkhir?: string;
  status: string;
  catatanDpl?: string;
  kategori?: string;
  minggu?: number;
  createdAt?: string;
}

export interface LaporanRecord {
  id?: number;
  npm: string;
  jenis: string;
  namaFile: string;
  fileUrl: string;
  fileType?: string;
  fileSize: number;
  tanggalUpload: string;
  status: string;
  catatanDpl?: string;
  createdAt?: string;
}

export interface GampongRecord {
  id?: number;
  nama: string;
  skema: string;
  kabupaten?: string;
  kecamatan: string;
  dpl?: string;
  keuchik?: string;
  kontakKeuchik?: string;
  posko: string;
  kuota?: number;
}

export interface DplRecord {
  id?: number;
  nama: string;
  nidn: string;
  password?: string;
  fakultas: string;
  skema: string;
  kecamatan?: string;
  email?: string;
  noHp?: string;
  alamat?: string;
  foto?: string;
}

export interface BeritaRecord {
  id?: number;
  judul: string;
  kategori: string;
  tanggal: string;
  penulis: string;
  gambar: string;
  konten: string;
  createdAt?: string;
}

export interface PengaduanRecord {
  id?: number;
  namaPengadu?: string;
  email?: string;
  telepon?: string;
  kategori?: string;
  judul: string;
  pesan: string;
  lampiran?: string;
  status?: string;
  tanggapan?: string;
  assignedAdmin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LppmStrukturRecord {
  id?: number;
  label: string;
  value: string;
  urutan?: number;
  createdAt?: string;
}

export interface DokumenRecord {
  id?: number;
  judul: string;
  kategori: string;
  deskripsi: string;
  fileUrl: string;
  format: string;
  ukuran: number;
  createdAt?: string;
}

export interface TimelineRecord {
  id?: number;
  judul: string;
  tanggal: string;
  deskripsi: string;
  status: string;
  urutan: number;
  createdAt?: string;
}

export interface AnnouncementRecord {
  id?: number;
  label: string;
  message: string;
  deadline?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

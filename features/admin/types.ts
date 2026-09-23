export type {
  AnnouncementRecord,
  BeritaRecord,
  DokumenRecord,
  DplRecord,
  GampongRecord,
  LaporanRecord,
  LogbookRecord,
  StudentProfileRecord,
  TimelineRecord,
  LppmStrukturRecord as StrukturRecord,
} from "@/types/domain";

export type AdminTab =
  | "overview"
  | "verify"
  | "mahasiswaKKM"
  | "logbook"
  | "laporan"
  | "gampong"
  | "dpl"
  | "berita"
  | "dokumen"
  | "jadwal"
  | "pengumuman";

export interface NewGampongForm {
  nama: string;
  skema: string;
  kecamatan: string;
  lokasi: string;
  angkatan: string;
  dpl: string;
  keuchik: string;
  kontakKeuchik: string;
  posko: string;
  kuota: number;
}

export interface NewDplForm {
  nama: string;
  nidn: string;
  password: string;
  fakultas: string;
  skema: string;
  kecamatan: string;
}

export interface NewStudentForm {
  nama: string;
  npm: string;
  password: string;
  fakultas: string;
  prodi: string;
  program: string;
  kecamatan: string;
  gampong: string;
  angkatan: string;
  lokasi: string;
  dpl: string;
  ipk: string;
}

export interface EditStudentForm {
  npm: string;
  nama: string;
  fakultas: string;
  prodi: string;
  program: string;
  kecamatan: string;
  gampong: string;
  angkatan: string;
  lokasi: string;
  dpl: string;
  ipk: string;
}

export interface NewBeritaForm {
  judul: string;
  kategori: string;
  tanggal: string;
  penulis: string;
  gambar: string;
  konten: string;
}

export interface NewDokumenForm {
  judul: string;
  kategori: string;
  deskripsi: string;
  fileUrl: string;
  format: string;
  ukuran: number;
  fileName: string;
}

export interface NewJadwalForm {
  judul: string;
  tanggal: string;
  deskripsi: string;
  status: string;
}

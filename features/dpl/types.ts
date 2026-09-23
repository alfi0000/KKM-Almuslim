import type {
  DplRecord,
  LaporanRecord,
  LogbookRecord,
  StudentProfileRecord,
} from "@/types/domain";

export type DplProfileRecord = DplRecord;
export type DplLogbookRecord = LogbookRecord;
export type DplLaporanRecord = LaporanRecord & { fileType: string };
export type DplStudentProfileRecord = Pick<
  StudentProfileRecord,
  | "id"
  | "nama"
  | "npm"
  | "ipk"
  | "fakultas"
  | "prodi"
  | "program"
  | "kecamatan"
  | "gampong"
  | "dpl"
  | "posko"
  | "tanggalDaftar"
  | "status"
  | "isKetuaKelompok"
>;

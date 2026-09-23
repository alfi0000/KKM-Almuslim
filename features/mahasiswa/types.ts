import type {
  LaporanRecord,
  LogbookRecord,
  StudentProfileRecord,
} from "@/types/domain";

export type StudentProfile = Omit<StudentProfileRecord, "kecamatan"> & {
  kecamatan?: string;
};

export type LogbookEntry = Omit<LogbookRecord, "id" | "npm"> & {
  id: number;
  npm?: string;
  penulis?: string;
};

export type LaporanBerkas = Omit<LaporanRecord, "id" | "npm" | "fileSize"> & {
  id: number;
  npm?: string;
  fileSize?: number;
  penulis?: string;
};

import type {
  DplRecord,
  GampongRecord,
  LaporanRecord,
  StudentProfileRecord,
} from "@/types/domain";

export type LppmGampongRecord = GampongRecord & { id: number };
export type LppmDplRecord = DplRecord & { id: number };
export type LppmStudentProfileRecord = Omit<StudentProfileRecord, "ipk"> & {
  ipk?: string;
};
export type LppmLaporanRecord = LaporanRecord & { id: number };

export interface GampongDetail {
  gampong: LppmGampongRecord;
  dpl: LppmDplRecord | null;
  dplNama: string;
  mahasiswas: LppmStudentProfileRecord[];
  laporans: LppmLaporanRecord[];
  totalMahasiswa: number;
  totalLaporan: number;
}

import { isAuthenticationFailure, requestJson } from "@/features/shared/api/http";
import type {
  GampongDetail,
  LppmDplRecord,
  LppmLaporanRecord,
  LppmStudentProfileRecord,
} from "../types";

export interface LppmStats {
  totalGampong: number;
  totalMahasiswa: number;
  totalDpl: number;
  totalLaporan: number;
  totalLogbook: number;
}

export interface LppmData {
  gampongDetails: GampongDetail[];
  dpls: LppmDplRecord[];
  profiles: LppmStudentProfileRecord[];
  laporans: LppmLaporanRecord[];
  stats: LppmStats;
}

interface LppmDataResponse {
  success?: boolean;
  data?: Partial<LppmData>;
}

export async function fetchLppmData(): Promise<{
  authenticationFailed: boolean;
  data: Partial<LppmData> | null;
}> {
  const result = await requestJson<LppmDataResponse>("/api/lppm/data");
  return {
    authenticationFailed: isAuthenticationFailure(result.response),
    data: result.data?.success && result.data.data ? result.data.data : null,
  };
}

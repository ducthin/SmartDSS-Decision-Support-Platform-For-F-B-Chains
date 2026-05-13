export interface ProvinceItem {
  code: number;
  name: string;
}

export interface DistrictItem {
  code: number;
  name: string;
}

export interface WardItem {
  code: number;
  name: string;
}

const PROVINCES_BASE_URL = 'https://provinces.open-api.vn/api/v2';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không thể tải dữ liệu địa chỉ (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const provincesApi = {
  getProvinces: async (): Promise<ProvinceItem[]> => {
    return fetchJson<ProvinceItem[]>(`${PROVINCES_BASE_URL}/p/`);
  },
  // API v2 (2025) exposes wards directly by province, no district endpoint.
  getWardsByProvince: async (provinceCode: number): Promise<WardItem[]> => {
    return fetchJson<WardItem[]>(`${PROVINCES_BASE_URL}/w/?province=${provinceCode}`);
  },
};

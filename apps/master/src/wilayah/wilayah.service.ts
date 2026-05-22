import type { IWilayahRepository } from '@sipera/data-access';

export interface WilayahDto {
  dis_id: number;
  dis_name: string;
  city_id: number;
}

export interface KelurahanDto {
  subdis_id: number;
  subdis_name: string;
  dis_id: number;
}

export class WilayahService {
  constructor(private readonly repo: IWilayahRepository) {}

  async listKecamatan(cityId: number): Promise<{ data: WilayahDto[] }> {
    const rows = await this.repo.listKecamatan(cityId);
    return {
      data: rows.map((r) => ({ dis_id: r.id, dis_name: r.nama, city_id: r.cityId })),
    };
  }

  async listKelurahan(kecamatanId: number): Promise<{ data: KelurahanDto[] }> {
    const rows = await this.repo.listKelurahan(kecamatanId);
    return {
      data: rows.map((r) => ({ subdis_id: r.id, subdis_name: r.nama, dis_id: r.wilayahId })),
    };
  }
}

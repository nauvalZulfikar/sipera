export { getPrisma, setPrismaForTest, resetPrismaForTest } from './client.js';

export type {
  IUserRepository,
  UserRecord,
  UserCreateInput,
  UserUpdateInput,
} from './repositories/user.repository.js';
export { UserRepository } from './repositories/user.repository.js';

export type { IWilayahRepository } from './repositories/wilayah.repository.js';
export { WilayahRepository } from './repositories/wilayah.repository.js';

export type { IKbliRepository } from './repositories/kbli.repository.js';
export { KbliRepository } from './repositories/kbli.repository.js';

export type {
  Prisma,
  PrismaClient,
  User,
  Wilayah,
  Kelurahan,
  Kbli,
  KategoriZona,
  Pemohon,
  Kuasa,
  Perusahaan,
  Lahan,
  Penguasaan,
  DokumenPendukung,
} from '@prisma/client';

export {
  PemohonRepository,
  KuasaRepository,
  PerusahaanRepository,
  LahanRepository,
  PenguasaanRepository,
} from './repositories/sub-entity.repository.js';
export type { SubEntityRepository } from './repositories/sub-entity.repository.js';

export {
  DokumenPendukungRepository,
  DOKUMEN_SLOTS,
} from './repositories/dokumen-pendukung.repository.js';
export type {
  IDokumenPendukungRepository,
  DokumenSlot,
} from './repositories/dokumen-pendukung.repository.js';

export { MetricsRegistry, getMetrics, Counter, Histogram } from './observability/metrics.js';
export { registerObservability } from './observability/fastify-plugin.js';
export { registerActivityLog } from './observability/activity-log-plugin.js';
export type { ActivityLogConfig } from './observability/activity-log-plugin.js';

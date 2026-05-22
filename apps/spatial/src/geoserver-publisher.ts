/**
 * GeoServer REST API publisher.
 * Auto-publish PostGIS table sebagai WMS/WFS layer di workspace `portal`.
 * Production: dipanggil sekali setelah import shapefile RDTR.
 */

export interface GeoServerConfig {
  baseUrl: string;
  username: string;
  password: string;
  workspace: string;
  datastore: string;
}

const DEFAULT_CONFIG: GeoServerConfig = {
  baseUrl: process.env.GEOSERVER_URL ?? 'http://localhost:8080/geoserver',
  username: process.env.GEOSERVER_USER ?? 'admin',
  password: process.env.GEOSERVER_PASS ?? 'geoserver',
  workspace: process.env.GEOSERVER_WORKSPACE ?? 'portal',
  datastore: process.env.GEOSERVER_DATASTORE ?? 'sipera_postgis',
};

export class GeoServerPublisher {
  constructor(private readonly cfg: GeoServerConfig = DEFAULT_CONFIG) {}

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.cfg.username}:${this.cfg.password}`).toString('base64');
  }

  /** Pastikan workspace ada. Idempotent: gak error kalau sudah ada. */
  async ensureWorkspace(): Promise<void> {
    const url = `${this.cfg.baseUrl}/rest/workspaces`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: this.authHeader() },
      body: JSON.stringify({ workspace: { name: this.cfg.workspace } }),
    });
    if (res.status === 201) return;
    if (res.status === 409) return; // already exists
    throw new Error(`workspace create failed: ${res.status} ${await res.text()}`);
  }

  /** Pastikan datastore (Postgres connection) ada. */
  async ensureDatastore(
    pgHost: string,
    pgPort: number,
    db: string,
    user: string,
    pass: string,
  ): Promise<void> {
    const url = `${this.cfg.baseUrl}/rest/workspaces/${this.cfg.workspace}/datastores`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: this.authHeader() },
      body: JSON.stringify({
        dataStore: {
          name: this.cfg.datastore,
          connectionParameters: {
            entry: [
              { '@key': 'host', $: pgHost },
              { '@key': 'port', $: String(pgPort) },
              { '@key': 'database', $: db },
              { '@key': 'user', $: user },
              { '@key': 'passwd', $: pass },
              { '@key': 'dbtype', $: 'postgis' },
            ],
          },
        },
      }),
    });
    if (res.status === 201) return;
    if (res.status === 409) return;
    throw new Error(`datastore create failed: ${res.status} ${await res.text()}`);
  }

  /** Publish table sebagai feature type. Auto-detect geometry column + bbox. */
  async publishLayer(tableName: string, title: string): Promise<void> {
    const url = `${this.cfg.baseUrl}/rest/workspaces/${this.cfg.workspace}/datastores/${this.cfg.datastore}/featuretypes`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: this.authHeader() },
      body: JSON.stringify({
        featureType: {
          name: tableName,
          title,
          srs: 'EPSG:4326',
          enabled: true,
        },
      }),
    });
    if (res.status === 201) return;
    if (res.status === 409) return;
    throw new Error(`layer publish failed: ${res.status} ${await res.text()}`);
  }

  /** All-in-one: setup workspace + datastore + publish semua layer RDTR. */
  async bootstrap(pgConfig: {
    host: string;
    port: number;
    db: string;
    user: string;
    pass: string;
  }): Promise<void> {
    await this.ensureWorkspace();
    await this.ensureDatastore(
      pgConfig.host,
      pgConfig.port,
      pgConfig.db,
      pgConfig.user,
      pgConfig.pass,
    );
    for (const layer of ['rdtr_poly', 'rtrw', 'permohonan_validated']) {
      try {
        await this.publishLayer(layer, layer.replace('_', ' ').toUpperCase());
      } catch (err) {
        console.warn(`[geoserver] skip ${layer}:`, err);
      }
    }
  }
}

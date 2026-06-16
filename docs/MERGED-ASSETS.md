# Merged Assets — Provenance & Manifest

Aset eksternal yang di-merge ke repo ini pada **2026-06-16**, sumber dari drive **"New Volume"** (`/Volumes/New Volume/pc/coding project/`).

Keduanya **git-ignored** (binari besar, total ~555 MB) — repo cuma menyimpan manifest ini + file teks ringan. Lihat `.gitignore` bagian "Merged external assets".

---

## 1. `data/zonasi-pola-ruang/` — Data GIS RDTR Kab. Bandung (30 MB)

Sumber: `Zonasi (Pola Ruang)_SIPERA/`. Data spasial legal-formal untuk mesin `apps/spatial` (saat ini masih pakai mock — lihat `apps/spatial/src/mock-zona.ts`).

| File                                                   | Geom            | Fitur | Isi                                                                                                                                           |
| ------------------------------------------------------ | --------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Pola_Ruang_sipera.json` (2.3M)                        | MultiPolygon    | 15    | Zona pola ruang (Badan Air, Cagar Alam, Hutan Lindung, Permukiman, Industri, dst). Props: `OBJECTID, NAMOBJ, KODKWS, JNSRPR, WADMKC, SHAPE_*` |
| `Batas Administrasi_Kec_sipera.json` (4.1M)            | Polygon         | 31    | Batas 31 kecamatan Kab. Bandung. Props: `OBJECTID, WADMKC, SHAPE_*`                                                                           |
| `Jaringan Jalan_sipera.json` (15M)                     | LineString      | 841   | Jaringan jalan. Props: `OBJECTID, NAMOBJ, WADMKK, REMARK, SHAPE_Length`                                                                       |
| `Utilitas_energi_sipera.json` (77K)                    | MultiLineString | 30    | Utilitas energi/listrik                                                                                                                       |
| `Utilitas_SDA_sipera.json` (215K)                      | —               | —     | Utilitas sumber daya air                                                                                                                      |
| `Peta Zonasi (Pola Ruang)_Kab. Bandung.pdf`            | —               | —     | Peta cetak referensi                                                                                                                          |
| `Kab.Bandung.mxd`                                      | —               | —     | ArcGIS map document (sumber asli)                                                                                                             |
| `Catatan Warna Simbology Polygon & Line.txt` ✅tracked | —               | —     | Kode warna RGB per zona, standar **Permen ATR/BPN No. 11 Tahun 2023**                                                                         |

> **Pemakaian:** geojson Pola Ruang = kandidat impor ke tabel `rdtr_poly` (PostGIS) menggantikan `MOCK_ZONA`. CRS asumsi WGS84 (EPSG:4326). Verifikasi sebelum impor produksi.

---

## 2. `reference/legacy-vendor-obfuscated/` — Source Vendor Lama (525 MB, 5.254 file)

Sumber: `sipera-source-obfuscated-20260512-144055/`. Paket source **sistem vendor lama** ("geoportal" by _getsurvey_, repo `gitlab.com/getsurvey/geoportal`) — yaitu `legacy-vendor` yang di-strangler oleh rebuild ini.

- **Stack:** NestJS 10 + Prisma 5 + TypeORM + PostgreSQL/PostGIS + GeoServer + socket.io.
- **3 sub-app:** `backend/` (API), `front/` (portal Dinas), `sipera/` (portal Warga — keduanya template Metronic).
- **⚠️ DI-OBFUSCATE:** seluruh `.ts/.js` diproteksi `javascript-obfuscator` (nama `_0x...`, string-array rotation, base64). **Tidak bisa dibaca/di-maintain** — hanya untuk referensi/deploy `dist`.
- **Artefak yang masih kebaca:** `backend/prisma/schema.prisma` (29 model — sumber data model rebuild), migrations (Agt 2024→Jul 2025), docs GeoServer/layer, `.env.example`.

> Screenshot 1.022 file obfuscated (backend + app-code) ada di tablet `my-personal-tab`: `~/sipera-obfuscated-screenshots/` & `/sdcard/Download/sipera-obfuscated-screenshots/`.

# Phase 14 — Cutover & Decommission Vendor

## Prerequisite

- Semua endpoint vendor (112) sudah dimirror oleh modul baru
- Contract test 100% lulus untuk semua modul
- Shadow mode 1 minggu zero mismatch per modul

## Cutover Sequence

1. **Day 1:** flip `ROUTE_AUTH=new` di gateway, monitor 24 jam
2. **Day 2:** flip `ROUTE_USERS=new`
3. **Day 3:** flip `ROUTE_WILAYAH=new`, `ROUTE_KBLI=new`, `ROUTE_KATEGORI_ZONA=new`
4. **Day 4:** flip `ROUTE_RDTR=new`, `ROUTE_RTRW=new`
5. **Day 5:** flip `ROUTE_PERMOHONAN=new` (yang paling besar, monitor extra ketat)
6. **Day 6-7:** observasi, kalau zero P1+ bug → lanjut decommission
7. **Day 8:** `docker stop sipera-be && docker rm sipera-be` (vendor container)
8. **Day 9:** archive image `docker tag sipera-be:legacy archive/sipera-vendor-final && docker push`
9. **Day 10:** clean DB — drop kolom/tabel yang cuma vendor pakai (audit + dengan backup pgdump dulu)

## Rollback Plan

- Setiap flag bisa di-flip balik ke `legacy` dalam <30 detik (cuma update env + restart gateway)
- Vendor container tetap di-image registry sampai Day 30 (window aman)
- DB snapshot harian retention 30 hari

## Definition of Done

- Container `sipera-be` mati selama 7 hari tanpa rollback
- Semua user-facing fitur tetap jalan (E2E test green)
- Hapus folder `legacy-vendor/` dari repo (archive di branch `legacy/v1`)

#!/usr/bin/env bash
# Smoke-test semua endpoint utama via gateway + direct service ports.
# Asumsi: scripts/local-bootstrap.sh sudah jalan (semua service up).
set -e
GW=http://localhost:5200
PASS=Masuk123@
ok=0; fail=0

check() {
  local label=$1 expected=$2 actual=$3
  if [[ "$actual" == *"$expected"* ]]; then
    echo "  ✅ $label"
    ok=$((ok+1))
  else
    echo "  ❌ $label  (got: ${actual:0:120})"
    fail=$((fail+1))
  fi
}

echo "=== IDENTITY ==="
check "warga login"    '"role":"warga"'    "$(curl -s -X POST $GW/auth/login -H 'Content-Type: application/json' -d '{"no_telp":"081234567890","password":"'$PASS'"}')"
check "admin login"    '"role":"admin"'    "$(curl -s -X POST $GW/auth/login -H 'Content-Type: application/json' -d '{"no_telp":"081111111111","password":"'$PASS'"}')"
check "operator login" '"role":"operator"' "$(curl -s -X POST $GW/auth/login -H 'Content-Type: application/json' -d '{"no_telp":"082222222222","password":"'$PASS'"}')"
check "reviewer login" '"role":"reviewer"' "$(curl -s -X POST $GW/auth/login -H 'Content-Type: application/json' -d '{"no_telp":"083333333333","password":"'$PASS'"}')"
check "kabid login"    '"role":"kabid"'    "$(curl -s -X POST $GW/auth/login -H 'Content-Type: application/json' -d '{"no_telp":"084444444444","password":"'$PASS'"}')"
check "otp generate"   'sent":true'        "$(curl -s -X POST $GW/auth/otp/generate -H 'Content-Type: application/json' -d '{"no_telp":"081234567890","purpose":"Register"}')"
check "otp invalid"    'invalid_otp'       "$(curl -s -X POST $GW/auth/otp/validate -H 'Content-Type: application/json' -d '{"no_telp":"081234567890","purpose":"Register","code":"000000"}')"

TOK=$(curl -s -X POST $GW/auth/login -H 'Content-Type: application/json' -d '{"no_telp":"081234567890","password":"'$PASS'"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).api_token))")

echo ""
echo "=== MASTER ==="
check "wilayah list"      '"data"'  "$(curl -s $GW/wilayah/kecamatan -H "Authorization: Bearer $TOK")"
check "kbli list"         '"data"'  "$(curl -s $GW/kbli -H "Authorization: Bearer $TOK")"
check "kbli bulk-import"  'inserted' "$(curl -s -X POST $GW/kbli/bulk-import -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"csv":"kode,nama\n01111,Pertanian\n41011,Konstruksi"}')"

echo ""
echo "=== PERMOHONAN ==="
P=$(curl -s -X POST $GW/permohonan -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"pemohonId":1,"namaPemohon":"Smoke Test","jenisIzin":"KKPR"}')
PID=$(echo "$P" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")
check "create"        '"status":"Baru"'        "$P"
check "list"          '"data":[' "$(curl -s $GW/permohonan -H "Authorization: Bearer $TOK")"
check "verifikasi"    '"status":"Verifikasi"'  "$(curl -s -X POST $GW/permohonan/$PID/action -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"action":"mulai-verifikasi"}')"
check "setujui"       '"status":"Disetujui"'   "$(curl -s -X POST $GW/permohonan/$PID/action -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"action":"setujui","catatan":"ok"}')"
check "selesaikan"    '"status":"Selesai"'     "$(curl -s -X POST $GW/permohonan/$PID/action -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"action":"selesaikan"}')"

echo ""
echo "=== SPATIAL ==="
check "zona list"     '"data":['     "$(curl -s http://localhost:4008/zona)"
check "itbx labels"   '"Diizinkan"'  "$(curl -s http://localhost:4008/itbx-labels)"
check "itbx seed"     'inserted'     "$(curl -s -X POST http://localhost:4008/itbx/seed)"

echo ""
echo "=== DOCUMENT ==="
TMP=$(mktemp); echo "dummy" > "$TMP"
check "file upload"   '"key"'        "$(curl -s -X POST http://localhost:4006/files -F file=@$TMP)"
rm -f "$TMP"

echo ""
echo "=== NOTIFICATION ==="
check "templates"     '"data":['  "$(curl -s http://localhost:4007/templates)"
check "dispatch"      'enqueued'  "$(curl -s -X POST http://localhost:4007/dispatch -H 'Content-Type: application/json' -d '{"event":"auth.otp","channels":["sms"],"to":"08123","data":{"code":"123456"}}')"

echo ""
echo "=== ADMIN ==="
check "settings"      '"data":['  "$(curl -s http://localhost:4013/settings)"
check "audit"         '"data":['  "$(curl -s http://localhost:4013/audit)"

echo ""
echo "=== REPORTING ==="
check "summary"       'byStatus'  "$(curl -s http://localhost:4012/reports/summary)"
check "csv export"    'nomor,'    "$(curl -s http://localhost:4012/reports/export.csv)"

echo ""
echo "=== PUBLIC-API ==="
C=$(curl -s -X POST http://localhost:4018/v1/admin/clients -H 'Content-Type: application/json' -d '{"name":"smoke","scopes":["permohonan:read"]}')
CID=$(echo "$C" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).clientId))")
CSEC=$(echo "$C" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).clientSecret))")
check "oauth client create" 'clientId'    "$C"
TKR=$(curl -s -X POST http://localhost:4018/v1/oauth/token -H 'Content-Type: application/json' -d "{\"grant_type\":\"client_credentials\",\"client_id\":\"$CID\",\"client_secret\":\"$CSEC\",\"scope\":\"permohonan:read\"}")
check "oauth token"   'access_token'  "$TKR"
ACT=$(echo "$TKR" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).access_token)}catch{console.log('')}})")
check "v1/permohonan" '"data":['     "$(curl -s -H "Authorization: Bearer $ACT" http://localhost:4018/v1/permohonan)"

echo ""
echo "=== FRONTENDS ==="
check "warga 5173" '<title>Sipera — warga</title>' "$(curl -s http://localhost:5173/)"
check "dinas 5174" '<title>Sipera — dinas</title>' "$(curl -s http://localhost:5174/)"

echo ""
echo "================================================================"
echo "  PASSED: $ok   FAILED: $fail"
echo "================================================================"
[ $fail -eq 0 ]

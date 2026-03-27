#!/bin/bash
# kudeb_is_turleri collection oluşturur ve başlangıç listesini ekler
set -e

DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8055}"
TOKEN="kudeb_directus_static_token_2026"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

echo "Directus hazır olana kadar bekleniyor..."
for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DIRECTUS_URL/server/health")
  [ "$STATUS" = "200" ] && break
  sleep 3
done

echo "[1/3] kudeb_is_turleri collection oluşturuluyor..."
EXIST=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$DIRECTUS_URL/collections/kudeb_is_turleri")
if [ "$EXIST" = "200" ]; then
  echo "  ✓ collection zaten var"
else
  curl -s -o /dev/null -X POST "$DIRECTUS_URL/collections" \
    -H "$AUTH" -H "$CT" \
    -d '{"collection":"kudeb_is_turleri","meta":{"icon":"label","note":"İş türleri listesi"},"schema":{},"fields":[{"field":"id","type":"integer","schema":{"is_primary_key":true,"has_auto_increment":true},"meta":{"hidden":true}},{"field":"ad","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş türü adı"}},{"field":"sira","type":"integer","schema":{"is_nullable":true},"meta":{"note":"Sıralama"}}]}'
  echo "  ✓ collection oluşturuldu"
fi

echo "[2/3] Mevcut kayıtlar kontrol ediliyor..."
COUNT=$(curl -s -H "$AUTH" "$DIRECTUS_URL/items/kudeb_is_turleri?aggregate[count]=id" | grep -o '"count":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
if [ "$COUNT" != "0" ] && [ ! -z "$COUNT" ]; then
  echo "  ✓ $COUNT kayıt zaten var, seed atlandı"
  exit 0
fi

echo "[3/3] İş türleri ekleniyor..."
TURLER=(
  "Basit Bakım Onarım"
  "Restorasyon Proje Kontrol"
  "Mimari Proje Kontrol"
  "İzinsiz Uygulama"
  "Güvenlik Önlemi"
  "Diğer"
)

for i in "${!TURLER[@]}"; do
  ISIM="${TURLER[$i]}"
  SIRA=$((i + 1))
  ESCAPED=$(printf '%s' "$ISIM" | sed 's/"/\\"/g')
  curl -s -o /dev/null -X POST "$DIRECTUS_URL/items/kudeb_is_turleri" \
    -H "$AUTH" -H "$CT" \
    -d "{\"ad\":\"$ESCAPED\",\"sira\":$SIRA}"
  echo "  + $ISIM"
done

echo ""
echo "Tamamlandı — ${#TURLER[@]} iş türü eklendi."

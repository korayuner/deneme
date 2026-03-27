#!/bin/bash
# kudeb_personel collection oluşturur ve başlangıç listesini ekler
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

# ─── Collection oluştur ────────────────────────────────────────────────────
echo "[1/3] kudeb_personel collection oluşturuluyor..."
EXIST=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$DIRECTUS_URL/collections/kudeb_personel")
if [ "$EXIST" = "200" ]; then
  echo "  ✓ collection zaten var"
else
  curl -s -o /dev/null -X POST "$DIRECTUS_URL/collections" \
    -H "$AUTH" -H "$CT" \
    -d '{"collection":"kudeb_personel","meta":{"icon":"person","note":"Görevli kişi listesi"},"schema":{},"fields":[{"field":"id","type":"integer","schema":{"is_primary_key":true,"has_auto_increment":true},"meta":{"hidden":true}},{"field":"ad","type":"string","schema":{"is_nullable":false},"meta":{"note":"Ad Soyad"}}]}'
  echo "  ✓ collection oluşturuldu"
fi

# ─── Mevcut kayıtları kontrol et ──────────────────────────────────────────
echo "[2/3] Mevcut kayıtlar kontrol ediliyor..."
COUNT=$(curl -s -H "$AUTH" "$DIRECTUS_URL/items/kudeb_personel?aggregate[count]=id" | grep -o '"count":"[0-9]*"' | grep -o '[0-9]*' || echo "0")
if [ "$COUNT" != "0" ] && [ ! -z "$COUNT" ]; then
  echo "  ✓ $COUNT kayıt zaten var, seed atlandı"
  exit 0
fi

# ─── Başlangıç listesi ────────────────────────────────────────────────────
echo "[3/3] Görevli kişiler ekleniyor..."
PERSONELLER=(
  "Alev Adıgüzel"
  "Bahar İnan"
  "Barış Aylaz"
  "Begüm Uzal"
  "Berkan Acarlar"
  "Ceylan Engüzel"
  "Çağrı Erbay"
  "Deniz Badalı"
  "Duygu Türkmen"
  "Ece Ceren Doğan"
  "Emine Aslıhan Yılmaz"
  "Emre Günday"
  "Fazilet Zerrin Ayazoğlu"
  "Gizem Yılmaz"
  "Gökçe Başol"
  "Gökçen Orunlu"
  "Gürkan Helvacı"
  "Kadir Öztürk"
  "Koray Üner"
  "Maksut Nami Bozkurt"
  "Meryem Koç Kaya"
  "Metin Aydın"
  "Murat Mazeci"
  "Müge Aydın"
  "Özge Akbulut"
  "Özgür Yurttaş Erda"
  "Özlem Taşkın Erten"
  "Pelin Raşit"
  "Pınar Bozkurt"
  "Pınar Osmanoğlu"
  "Serdar Ona"
  "Sevgi Girginer"
  "Tuba Gülamber"
  "Tuna Sinan Derbentoğulları"
)

for ISIM in "${PERSONELLER[@]}"; do
  ESCAPED=$(printf '%s' "$ISIM" | sed 's/"/\\"/g')
  curl -s -o /dev/null -X POST "$DIRECTUS_URL/items/kudeb_personel" \
    -H "$AUTH" -H "$CT" \
    -d "{\"ad\":\"$ESCAPED\"}"
  echo "  + $ISIM"
done

echo ""
echo "Tamamlandı — ${#PERSONELLER[@]} kişi eklendi."

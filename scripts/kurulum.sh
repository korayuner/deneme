#!/bin/bash
# KUDEB tam kurulum scripti — tüm collection'ları ve başlangıç verilerini oluşturur
set -e

DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8055}"
TOKEN="kudeb_directus_static_token_2026"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

echo "================================================"
echo " KUDEB Kurulum Scripti"
echo "================================================"
echo ""

# ─── Directus hazır olana kadar bekle ─────────────────────────────────────
echo "Directus bekleniyor..."
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DIRECTUS_URL/server/health" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "✓ Directus hazır"
    break
  fi
  echo "  ($i/30) bekleniyor..."
  sleep 3
done

# ─── Yardımcı fonksiyonlar ─────────────────────────────────────────────────
collection_var_mi() {
  local STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$DIRECTUS_URL/collections/$1" 2>/dev/null)
  [ "$STATUS" = "200" ]
}

alan_var_mi() {
  local STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$DIRECTUS_URL/fields/$1/$2" 2>/dev/null)
  [ "$STATUS" = "200" ]
}

kayit_sayisi() {
  curl -s -H "$AUTH" "$DIRECTUS_URL/items/$1?aggregate[count]=id" 2>/dev/null | \
    grep -o '"count":"[0-9]*"' | grep -o '[0-9]*' || echo "0"
}

# ─── 1. kudeb_personel ─────────────────────────────────────────────────────
echo ""
echo "[1/4] Görevli Kişiler (kudeb_personel)..."

if collection_var_mi "kudeb_personel"; then
  echo "  ✓ collection zaten var"
else
  curl -s -o /dev/null -X POST "$DIRECTUS_URL/collections" \
    -H "$AUTH" -H "$CT" \
    -d '{"collection":"kudeb_personel","meta":{"icon":"person","note":"Görevli kişi listesi"},"schema":{},"fields":[
      {"field":"id","type":"integer","schema":{"is_primary_key":true,"has_auto_increment":true},"meta":{"hidden":true}},
      {"field":"ad","type":"string","schema":{"is_nullable":false},"meta":{"note":"Ad Soyad"}}
    ]}'
  echo "  ✓ collection oluşturuldu"
fi

COUNT=$(kayit_sayisi "kudeb_personel")
if [ "$COUNT" != "0" ] && [ -n "$COUNT" ]; then
  echo "  ✓ $COUNT kişi zaten var, seed atlandı"
else
  PERSONELLER=(
    "Alev Adıgüzel" "Bahar İnan" "Barış Aylaz" "Begüm Uzal" "Berkan Acarlar"
    "Ceylan Engüzel" "Çağrı Erbay" "Deniz Badalı" "Duygu Türkmen" "Ece Ceren Doğan"
    "Emine Aslıhan Yılmaz" "Emre Günday" "Fazilet Zerrin Ayazoğlu" "Gizem Yılmaz"
    "Gökçe Başol" "Gökçen Orunlu" "Gürkan Helvacı" "Kadir Öztürk" "Koray Üner"
    "Maksut Nami Bozkurt" "Meryem Koç Kaya" "Metin Aydın" "Murat Mazeci" "Müge Aydın"
    "Özge Akbulut" "Özgür Yurttaş Erda" "Özlem Taşkın Erten" "Pelin Raşit"
    "Pınar Bozkurt" "Pınar Osmanoğlu" "Serdar Ona" "Sevgi Girginer"
    "Tuba Gülamber" "Tuna Sinan Derbentoğulları"
  )
  for ISIM in "${PERSONELLER[@]}"; do
    ESCAPED=$(printf '%s' "$ISIM" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || printf '%s' "$ISIM" | sed 's/"/\\"/g')
    curl -s -o /dev/null -X POST "$DIRECTUS_URL/items/kudeb_personel" \
      -H "$AUTH" -H "$CT" -d "{\"ad\":\"$ISIM\"}"
  done
  echo "  ✓ ${#PERSONELLER[@]} kişi eklendi"
fi

# ─── 2. kudeb_is_turleri ───────────────────────────────────────────────────
echo ""
echo "[2/4] İş Türleri (kudeb_is_turleri)..."

if collection_var_mi "kudeb_is_turleri"; then
  echo "  ✓ collection zaten var"
else
  curl -s -o /dev/null -X POST "$DIRECTUS_URL/collections" \
    -H "$AUTH" -H "$CT" \
    -d '{"collection":"kudeb_is_turleri","meta":{"icon":"label","note":"İş türleri listesi"},"schema":{},"fields":[
      {"field":"id","type":"integer","schema":{"is_primary_key":true,"has_auto_increment":true},"meta":{"hidden":true}},
      {"field":"ad","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş türü adı"}},
      {"field":"sira","type":"integer","schema":{"is_nullable":true},"meta":{"note":"Sıralama"}}
    ]}'
  echo "  ✓ collection oluşturuldu"
fi

COUNT=$(kayit_sayisi "kudeb_is_turleri")
if [ "$COUNT" != "0" ] && [ -n "$COUNT" ]; then
  echo "  ✓ $COUNT iş türü zaten var, seed atlandı"
else
  TURLER=("Basit Bakım Onarım" "Restorasyon Proje Kontrol" "Mimari Proje Kontrol" "İzinsiz Uygulama" "Güvenlik Önlemi" "Diğer")
  for i in "${!TURLER[@]}"; do
    curl -s -o /dev/null -X POST "$DIRECTUS_URL/items/kudeb_is_turleri" \
      -H "$AUTH" -H "$CT" -d "{\"ad\":\"${TURLER[$i]}\",\"sira\":$((i+1))}"
  done
  echo "  ✓ ${#TURLER[@]} iş türü eklendi"
fi

# ─── 3. koordinat_lat / koordinat_lon alanları ─────────────────────────────
echo ""
echo "[3/4] Koordinat alanları (kudeb_isler)..."

for ALAN in "koordinat_lat" "koordinat_lon"; do
  if alan_var_mi "kudeb_isler" "$ALAN"; then
    echo "  ✓ $ALAN zaten var"
  else
    NOT="Enlem (WGS84)"
    [ "$ALAN" = "koordinat_lon" ] && NOT="Boylam (WGS84)"
    RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$DIRECTUS_URL/fields/kudeb_isler" \
      -H "$AUTH" -H "$CT" \
      -d "{\"field\":\"$ALAN\",\"type\":\"float\",\"meta\":{\"note\":\"$NOT\"}}")
    if [ "$RESULT" = "200" ] || [ "$RESULT" = "201" ]; then
      echo "  ✓ $ALAN eklendi"
    else
      echo "  ✗ $ALAN eklenemedi (HTTP $RESULT)"
    fi
  fi
done

# ─── 4. Özet ──────────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo " Kurulum tamamlandı!"
echo "================================================"
echo ""
echo "Erişim:"
echo "  Panel    : http://localhost:3001"
echo "  Directus : http://localhost:8055"
echo "             admin@example.com / kudeb2026"
echo ""

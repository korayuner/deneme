#!/bin/sh
# Directus ilk kurulum scripti
# - Admin kullanıcısına static token atar
# - kudeb_fotograflar koleksiyonunu oluşturur

DIRECTUS_URL="${DIRECTUS_URL:-http://directus:8055}"
ADMIN_EMAIL="${DIRECTUS_ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${DIRECTUS_ADMIN_PASSWORD:-kudeb2026}"
STATIC_TOKEN="${DIRECTUS_STATIC_TOKEN:-kudeb_directus_static_token_2026}"

echo "Directus hazır olana kadar bekleniyor..."
until curl -sf "$DIRECTUS_URL/server/health" > /dev/null 2>&1; do
  sleep 3
done
echo "Directus sağlık kontrolü geçti, tam başlaması bekleniyor..."
sleep 10

# 1. Admin ile giriş yap — en fazla 15 deneme, 8'er saniye aralıkla
echo "Admin token alınıyor..."
ACCESS_TOKEN=""
DENEME=0
while [ -z "$ACCESS_TOKEN" ] && [ "$DENEME" -lt 15 ]; do
  DENEME=$((DENEME + 1))
  echo "  Giriş denemesi $DENEME/15..."
  LOGIN=$(curl -sf -X POST "$DIRECTUS_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null)
  ACCESS_TOKEN=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)
  [ -z "$ACCESS_TOKEN" ] && sleep 8
done

if [ -z "$ACCESS_TOKEN" ]; then
  echo "HATA: Directus 2 dakikada yanıt vermedi. Loglara bak:"
  echo "  docker compose -f docker-compose.local.yml logs directus"
  exit 1
fi

echo "Giriş başarılı."

# 2. Admin kullanıcı ID'sini al
ADMIN_ID=$(curl -sf "$DIRECTUS_URL/users/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Admin ID: $ADMIN_ID"

# 3. Static token ata
echo "Static token atanıyor..."
curl -sf -X PATCH "$DIRECTUS_URL/users/$ADMIN_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$STATIC_TOKEN\"}" > /dev/null

echo "Static token atandı: $STATIC_TOKEN"

# 4. kudeb_fotograflar koleksiyonu var mı kontrol et
echo "kudeb_fotograflar koleksiyonu kontrol ediliyor..."
COLLECTION_CHECK=$(curl -sf "$DIRECTUS_URL/collections/kudeb_fotograflar" \
  -H "Authorization: Bearer $STATIC_TOKEN" 2>/dev/null)

if echo "$COLLECTION_CHECK" | grep -q '"collection"'; then
  echo "kudeb_fotograflar koleksiyonu zaten mevcut, atlanıyor."
else
  echo "kudeb_fotograflar koleksiyonu oluşturuluyor..."

  # Koleksiyonu oluştur
  curl -sf -X POST "$DIRECTUS_URL/collections" \
    -H "Authorization: Bearer $STATIC_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "collection": "kudeb_fotograflar",
      "meta": {
        "icon": "photo_camera",
        "note": "İşlere ait Google Drive fotoğraf kayıtları"
      },
      "schema": {},
      "fields": [
        {"field":"is_no","type":"string","meta":{"required":true,"note":"İş numarası (örn: 2025-001)"},"schema":{"is_nullable":false}},
        {"field":"drive_file_id","type":"string","meta":{"note":"Google Drive dosya ID"}},
        {"field":"drive_klasor_id","type":"string","meta":{"note":"Google Drive klasör ID"}},
        {"field":"dosya_adi","type":"string","meta":{"note":"Orijinal dosya adı"}},
        {"field":"web_view_link","type":"string","meta":{"note":"Drive paylaşım linki"}},
        {"field":"thumbnail_link","type":"string","meta":{"note":"Küçük resim URL"}},
        {"field":"boyut","type":"string","meta":{"note":"Dosya boyutu"}},
        {"field":"inceleme_tarihi","type":"date","meta":{"note":"İnceleme tarihi"}},
        {"field":"inceleme_aciklama","type":"string","meta":{"note":"Klasör açıklaması (örn: Saha İncelemesi)"}}
      ]
    }' > /dev/null

  echo "kudeb_fotograflar koleksiyonu oluşturuldu."
fi

echo ""
echo "============================================"
echo "  Directus başarıyla yapılandırıldı!"
echo "  Panel:   http://localhost:3000"
echo "  Directus: http://localhost:8055"
echo "  Kullanıcı: $ADMIN_EMAIL"
echo "  Şifre:    $ADMIN_PASSWORD"
echo "============================================"

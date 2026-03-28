#!/bin/bash
# KUDEB Panel — Tam Kurulum & Başlatma Scripti
# Kullanım: bash start.sh

set -e

COMPOSE_FILE="docker-compose.local.yml"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║     KUDEB Panel — Kurulum Başlıyor         ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# ── .env yoksa sor ────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "┌─────────────────────────────────────────────────────┐"
  echo "│  Gemini API anahtarı gerekli                        │"
  echo "│  https://aistudio.google.com/apikey  (ücretsiz)    │"
  echo "└─────────────────────────────────────────────────────┘"
  echo ""
  read -p "  Gemini API key gir (boş geçmek için Enter): " GEMINI_KEY
  if [ -n "$GEMINI_KEY" ]; then
    echo "GEMINI_API_KEYS=$GEMINI_KEY" > .env
    echo "  ✓ .env oluşturuldu"
  else
    echo "  ⚠  Gemini key girilmedi — PDF analiz özelliği çalışmaz"
    echo "GEMINI_API_KEYS=GIRILMEDI" > .env
  fi
fi

# ── google-service-account.json yoksa boş oluştur ─────────────────────────────
if [ ! -f "google-service-account.json" ]; then
  echo "{}" > google-service-account.json
  echo "  ✓ Boş google-service-account.json oluşturuldu"
fi

# ── Eski containerları temizle ─────────────────────────────────────────────────
echo ""
echo "→ Eski containerlar durduruluyor..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

# ── Build + başlat ─────────────────────────────────────────────────────────────
echo ""
echo "→ İmajlar build ediliyor (ilk seferde 3-5 dakika sürer)..."
docker compose -f "$COMPOSE_FILE" --env-file .env build

echo ""
echo "→ Tüm servisler başlatılıyor..."
docker compose -f "$COMPOSE_FILE" --env-file .env up -d

# ── Directus hazır olana kadar bekle ──────────────────────────────────────────
echo ""
echo "→ Directus bekleniyor (en fazla 3 dakika)..."
for i in $(seq 1 40); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8055/server/health" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "  ✓ Directus hazır"
    break
  fi
  printf "  (%d/40) bekleniyor...\r" "$i"
  sleep 5
done

# ── Static token ata ──────────────────────────────────────────────────────────
echo ""
echo "→ Directus admin token ayarlanıyor..."
ACCESS_TOKEN=""
for i in $(seq 1 10); do
  LOGIN=$(curl -s -X POST "http://localhost:8055/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"kudeb2026"}' 2>/dev/null)
  ACCESS_TOKEN=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)
  [ -n "$ACCESS_TOKEN" ] && break
  echo "  ($i/10) Giriş bekleniyor..."
  sleep 5
done

if [ -n "$ACCESS_TOKEN" ]; then
  ADMIN_ID=$(curl -s "http://localhost:8055/users/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  curl -s -X PATCH "http://localhost:8055/users/$ADMIN_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"token":"kudeb_directus_static_token_2026"}' > /dev/null
  echo "  ✓ Token atandı"
else
  echo ""
  echo "  HATA: Directus'a giriş yapılamadı!"
  echo "  Logları kontrol et: docker compose -f docker-compose.local.yml logs directus"
  exit 1
fi

# ── Koleksiyonları kur ────────────────────────────────────────────────────────
echo ""
echo "→ Veritabanı koleksiyonları kuruluyor..."
DIRECTUS_URL=http://localhost:8055 bash scripts/kurulum.sh

# ── Sonuç ─────────────────────────────────────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                                                      ║"
echo "║    ✓  KUDEB Panel HAZIR!                             ║"
echo "║                                                      ║"
printf "║    Uygulama:  http://%-32s║\n" "$IP:3001"
echo "║    Directus:  http://localhost:8055                  ║"
echo "║    Paperless: http://localhost:8001                  ║"
echo "║                                                      ║"
echo "║    Kullanıcı: admin@example.com                      ║"
echo "║    Şifre:     kudeb2026                              ║"
echo "║                                                      ║"
echo "║    Durdurmak için:                                   ║"
echo "║    docker compose -f docker-compose.local.yml down  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

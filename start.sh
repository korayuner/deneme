#!/bin/bash
# KUDEB Panel — Lokal Başlatma Scripti
# WSL2 Ubuntu terminalinde çalıştır: bash start.sh

set -e

COMPOSE_FILE="docker-compose.local.yml"
ENV_FILE=".env.local"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     KUDEB Panel — Lokal Kurulum        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# .env.local yoksa oluştur
if [ ! -f "$ENV_FILE" ]; then
  echo "⚠  .env.local bulunamadı, .env.example'dan kopyalanıyor..."
  cp .env.example "$ENV_FILE"
fi

# Eski çalışan containerları durdur
echo "→ Eski containerlar durduruluyor..."
docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true

# İmajları build et
echo "→ İmajlar build ediliyor (ilk seferde birkaç dakika sürer)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build kudeb-panel pdf-service

# Tüm servisleri başlat
echo "→ Servisler başlatılıyor..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ""
echo "→ Directus başlaması bekleniyor (init script kendi bekleyecek)..."

# Init container'ı çalıştır (token + koleksiyon)
echo "→ Directus yapılandırılıyor..."
docker compose -f "$COMPOSE_FILE" run --rm directus-init

echo ""
echo "╔════════════════════════════════════════╗"
echo "║         HAZIR!                         ║"
echo "║                                        ║"
echo "║  Panel:    http://localhost:3000       ║"
echo "║  Directus: http://localhost:8055       ║"
echo "║  Paperless:http://localhost:8000       ║"
echo "║                                        ║"
echo "║  Kullanıcı: admin@example.com          ║"
echo "║  Şifre:     kudeb2026                  ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Durdurmak için: docker compose -f docker-compose.local.yml down"
echo ""

#!/bin/bash
# KUDEB Panel — Oracle VPS Sıfırdan Kurulum Scripti
# Ubuntu 24.04 LTS · kudeb.urla.online
# Kullanım: bash vps-kurulum.sh
#
# SSL: Cloudflare Tunnel üzerinden sağlanır (nginx/certbot gerekmez)
# UYARI: Mevcut tüm Docker container, volume ve veritabanlarını siler!

set -e

DOMAIN="kudeb.urla.online"
GITHUB_REPO="https://github.com/korayuner/kudeb-panel.git"
UYGULAMA_DIZINI="$HOME/kudeb-panel"
COMPOSE_FILE="docker-compose.local.yml"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       KUDEB Panel — VPS Kurulum Scripti                   ║"
echo "║       Ubuntu 24.04 LTS · kudeb.urla.online                ║"
echo "║       SSL: Cloudflare Tunnel                              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  UYARI: Mevcut tüm Docker container, volume ve veritabanları"
echo "  silinecek. KUDEB paneli sıfırdan kurulacak."
echo ""
read -p "  Devam etmek istiyor musunuz? (evet yazın): " ONAY
if [ "$ONAY" != "evet" ]; then
  echo "  İptal edildi."
  exit 0
fi

# ─── Gemini API anahtarını sor ────────────────────────────────────────────────
echo ""
read -p "  Gemini API anahtarı (boş geçmek için Enter): " GEMINI_KEY
if [ -z "$GEMINI_KEY" ]; then
  echo "  ⚠  Gemini key girilmedi — PDF analiz ayarlardan eklenebilir"
  GEMINI_KEY="GIRILMEDI"
fi

# ─── Google Drive Klasör ID sor ───────────────────────────────────────────────
echo ""
echo "  Google Drive Klasör ID (opsiyonel — fotoğraf yükleme için)"
read -p "  Drive Klasör ID (boş geçmek için Enter): " DRIVE_FOLDER_ID

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Domain : $DOMAIN"
echo "  Gemini : ${GEMINI_KEY:0:8}..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── 1. Sistem bağımlılıkları ─────────────────────────────────────────────────
echo "→ [1/7] Sistem güncelleniyor..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl git ca-certificates gnupg lsb-release
echo "  ✓ Bağımlılıklar kuruldu"

# ─── 2. Docker kurulumu ──────────────────────────────────────────────────────
echo ""
if ! command -v docker &> /dev/null; then
  echo "→ [2/7] Docker kuruluyor..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "  ✓ Docker kuruldu"
else
  echo "→ [2/7] Docker zaten mevcut ✓"
fi

# ─── 3. Mevcut Docker kaynaklarını temizle (container + veritabanları dahil) ──
echo ""
echo "→ [3/7] Mevcut tüm Docker kaynakları siliniyor..."
echo "  (container'lar, veritabanları, volume'lar, imajlar — tümü)"

# Tüm compose stack'leri durdur
docker compose down --remove-orphans 2>/dev/null || true
for f in $(find /root /home -name "docker-compose*.yml" -maxdepth 4 2>/dev/null); do
  docker compose -f "$f" down --remove-orphans 2>/dev/null || true
done

# Tüm container'ları zorla sil
CONTAINERS=$(docker ps -aq 2>/dev/null || true)
if [ -n "$CONTAINERS" ]; then
  docker stop $CONTAINERS 2>/dev/null || true
  docker rm -f $CONTAINERS 2>/dev/null || true
  echo "  ✓ Containerlar silindi"
fi

# Tüm volume'ları sil (PostgreSQL, Redis, Paperless veritabanları dahil)
VOLUMES=$(docker volume ls -q 2>/dev/null || true)
if [ -n "$VOLUMES" ]; then
  docker volume rm $VOLUMES 2>/dev/null || true
  echo "  ✓ Volume'lar silindi (tüm veritabanları dahil)"
fi

# İmajlar, ağlar, build cache
docker system prune -af --volumes 2>/dev/null || true
echo "  ✓ Docker tamamen temizlendi"

# ─── 4. Repo klonla ──────────────────────────────────────────────────────────
echo ""
echo "→ [4/7] GitHub'dan repo klonlanıyor..."
if [ -d "$UYGULAMA_DIZINI" ]; then
  rm -rf "$UYGULAMA_DIZINI"
fi
git clone --branch master "$GITHUB_REPO" "$UYGULAMA_DIZINI"
cd "$UYGULAMA_DIZINI"
echo "  ✓ Repo klonlandı: $UYGULAMA_DIZINI"

# ─── 5. .env ve yapılandırma dosyaları ───────────────────────────────────────
echo ""
echo "→ [5/7] Yapılandırma dosyaları oluşturuluyor..."
cat > .env <<EOF
GEMINI_API_KEYS=$GEMINI_KEY
GOOGLE_DRIVE_ROOT_FOLDER_ID=$DRIVE_FOLDER_ID
EOF
echo "  ✓ .env oluşturuldu"

if [ ! -f "google-service-account.json" ]; then
  echo "{}" > google-service-account.json
  echo "  ✓ Boş google-service-account.json oluşturuldu"
fi

# docker-compose → VPS domain ayarları (CORS, ALLOWED_ORIGIN)
sed -i "s|ALLOWED_ORIGIN: http://localhost:3000|ALLOWED_ORIGIN: https://$DOMAIN|g" "$COMPOSE_FILE"
sed -i "s|PUBLIC_URL: http://localhost:8055|PUBLIC_URL: https://$DOMAIN/api/directus|g" "$COMPOSE_FILE"
sed -i "s|CORS_ORIGIN: \"http://localhost:3000,http://localhost:8055\"|CORS_ORIGIN: \"https://$DOMAIN\"|g" "$COMPOSE_FILE"
sed -i "s|VITE_PAPERLESS_EXTERNAL_URL: \"http://localhost:8001\"|VITE_PAPERLESS_EXTERNAL_URL: \"https://paperless.urla.online\"|g" "$COMPOSE_FILE"
echo "  ✓ docker-compose domain ayarları güncellendi"

# ─── 6. Docker Compose build + up ────────────────────────────────────────────
echo ""
echo "→ [6/7] İmajlar build ediliyor (5-10 dakika sürebilir)..."
docker compose -f "$COMPOSE_FILE" --env-file .env build

echo ""
echo "→ Servisler başlatılıyor..."
docker compose -f "$COMPOSE_FILE" --env-file .env up -d

# ─── Directus hazır olana kadar bekle ─────────────────────────────────────────
echo ""
echo "→ Directus bekleniyor (en fazla 5 dakika)..."
for i in $(seq 1 60); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8055/server/health" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    echo "  ✓ Directus hazır"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "  ✗ Directus başlamadı!"
    echo "    docker compose -f $COMPOSE_FILE logs directus"
    exit 1
  fi
  printf "  (%d/60) bekleniyor...\r" "$i"
  sleep 5
done

# ─── Static token ata ────────────────────────────────────────────────────────
echo ""
echo "→ Admin token ayarlanıyor..."
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
  echo "  ✗ Directus girişi başarısız!"
  echo "  docker compose -f $COMPOSE_FILE logs directus"
  exit 1
fi

# ─── 7. Veritabanı koleksiyonları ────────────────────────────────────────────
echo ""
echo "→ [7/7] Veritabanı koleksiyonları kuruluyor..."
DIRECTUS_URL=http://localhost:8055 bash scripts/kurulum.sh

# ─── Sonuç ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    ✓  KUDEB Panel HAZIR!                                     ║"
echo "║                                                              ║"
echo "║    Panel port 3001'de çalışıyor.                             ║"
echo "║                                                              ║"
echo "║    Cloudflare Tunnel ayarı yapıldıysa:                       ║"
echo "║    https://kudeb.urla.online                                 ║"
echo "║                                                              ║"
echo "║    Kullanıcı: admin@example.com                              ║"
echo "║    Şifre:     kudeb2026                                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  SONRAKİ ADIM — Cloudflare Tunnel ayarı:"
echo "  Zero Trust → Networks → Tunnels → kudeb-tunnel → Edit"
echo "  → Public Hostnames → Add a public hostname:"
echo "    Subdomain : kudeb"
echo "    Domain    : urla.online"
echo "    Type      : HTTP"
echo "    URL       : localhost:3001"
echo ""
echo "  Yönetim (SSH üzerinden):"
echo "    Directus : http://localhost:8055"
echo "    Paperless: http://localhost:8001"
echo ""
echo "  Durdurmak için:"
echo "    cd $UYGULAMA_DIZINI"
echo "    docker compose -f $COMPOSE_FILE down"
echo ""

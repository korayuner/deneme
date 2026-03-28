#!/bin/bash
# KUDEB Panel — Oracle VPS Sıfırdan Kurulum Scripti
# Kullanım: bash vps-kurulum.sh
# Ubuntu 24.04 LTS için tasarlanmıştır.
# UYARI: Sunucudaki mevcut tüm Docker container, volume ve imajları siler!

set -e

GITHUB_REPO="https://github.com/korayuner/kudeb-panel.git"
UYGULAMA_DIZINI="$HOME/kudeb-panel"
COMPOSE_FILE="docker-compose.kudeb-panel.yml"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       KUDEB Panel — VPS Kurulum Scripti                   ║"
echo "║       Ubuntu 24.04 LTS                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  UYARI: Bu script mevcut tüm Docker container ve volume'larını"
echo "  silecek ve KUDEB paneli sıfırdan kuracak."
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
  echo "  ⚠  Gemini key girilmedi — PDF analiz özelliği çalışmaz (ayarlardan ekleyebilirsiniz)"
  GEMINI_KEY="GIRILMEDI"
fi

# ─── Google Drive Klasör ID sor ───────────────────────────────────────────────
echo ""
echo "  Google Drive Klasör ID (opsiyonel — fotoğraf yükleme için)"
echo "  Drive'da bir klasör oluşturun → paylaşım linkinden ID'yi kopyalayın"
read -p "  Drive Klasör ID (boş geçmek için Enter): " DRIVE_FOLDER_ID
if [ -z "$DRIVE_FOLDER_ID" ]; then
  DRIVE_FOLDER_ID="GIRILMEDI"
fi

# ─── 1. Sistem bağımlılıkları ─────────────────────────────────────────────────
echo ""
echo "→ [1/7] Sistem güncelleniyor ve bağımlılıklar kuruluyor..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl git ca-certificates gnupg lsb-release

# ─── 2. Docker kurulumu ──────────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo ""
  echo "→ [2/7] Docker kuruluyor..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  echo "  ✓ Docker kuruldu"
else
  echo ""
  echo "→ [2/7] Docker zaten kurulu, atlanıyor..."
fi

# ─── 3. Mevcut Docker kaynaklarını temizle ────────────────────────────────────
echo ""
echo "→ [3/7] Mevcut Docker container ve volume'ları temizleniyor..."
# Tüm container'ları durdur ve sil
CONTAINERS=$(docker ps -aq 2>/dev/null)
if [ -n "$CONTAINERS" ]; then
  docker stop $CONTAINERS 2>/dev/null || true
  docker rm -f $CONTAINERS 2>/dev/null || true
  echo "  ✓ Container'lar silindi"
fi
# Tüm volume'ları sil
VOLUMES=$(docker volume ls -q 2>/dev/null)
if [ -n "$VOLUMES" ]; then
  docker volume rm $VOLUMES 2>/dev/null || true
  echo "  ✓ Volume'lar silindi"
fi
# Kullanılmayan imajları temizle
docker image prune -af 2>/dev/null || true
docker network prune -f 2>/dev/null || true
echo "  ✓ Docker temizlendi"

# ─── 4. Repo klonla ──────────────────────────────────────────────────────────
echo ""
echo "→ [4/7] GitHub'dan repo klonlanıyor..."
if [ -d "$UYGULAMA_DIZINI" ]; then
  echo "  Mevcut dizin siliniyor: $UYGULAMA_DIZINI"
  rm -rf "$UYGULAMA_DIZINI"
fi
git clone --branch master "$GITHUB_REPO" "$UYGULAMA_DIZINI"
cd "$UYGULAMA_DIZINI"
echo "  ✓ Repo klonlandı: $UYGULAMA_DIZINI"

# ─── 5. .env ve google-service-account.json ──────────────────────────────────
echo ""
echo "→ [5/7] Yapılandırma dosyaları oluşturuluyor..."

# VPS'e özgü .env
cat > .env <<EOF
GEMINI_API_KEYS=$GEMINI_KEY
GOOGLE_DRIVE_ROOT_FOLDER_ID=$DRIVE_FOLDER_ID
EOF
echo "  ✓ .env oluşturuldu"

if [ ! -f "google-service-account.json" ]; then
  echo "{}" > google-service-account.json
  echo "  ✓ Boş google-service-account.json oluşturuldu"
  echo "    (Drive entegrasyonu için Google Cloud Console'dan service account JSON'ı buraya kopyalayın)"
fi

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
    echo "  ✗ Directus başlamadı! Logları kontrol edin:"
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
  echo "  ✗ HATA: Directus'a giriş yapılamadı!"
  echo "  Logları kontrol edin: docker compose -f $COMPOSE_FILE logs directus"
  exit 1
fi

# ─── 7. Koleksiyonları kur ────────────────────────────────────────────────────
echo ""
echo "→ [7/7] Veritabanı koleksiyonları kuruluyor..."
DIRECTUS_URL=http://localhost:8055 bash scripts/kurulum.sh

# ─── VPS IP / Domain bilgisi ─────────────────────────────────────────────────
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "BILINMIYOR")

# ─── Sonuç ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    ✓  KUDEB Panel HAZIR!                                     ║"
echo "║                                                              ║"
echo "║    Sunucu IP: $VPS_IP"
echo "║                                                              ║"
echo "║    Panel:     http://$VPS_IP:3001                            ║"
echo "║    Directus:  http://$VPS_IP:8055                            ║"
echo "║    Paperless: http://$VPS_IP:8001                            ║"
echo "║                                                              ║"
echo "║    Kullanıcı: admin@example.com                              ║"
echo "║    Şifre:     kudeb2026                                      ║"
echo "║                                                              ║"
echo "║    Durdurmak için:                                           ║"
echo "║    cd $UYGULAMA_DIZINI                                       ║"
echo "║    docker compose -f $COMPOSE_FILE down                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  NOT: Oracle Cloud Firewall'dan 3001, 8055, 8001 portlarını"
echo "  açmayı unutmayın (Security List → Ingress Rules)."
echo ""

# ─── Opsiyonel: sudo olmadan docker kullanabilmek için yeniden giriş ────────
if ! groups "$USER" | grep -q docker; then
  echo "  Önemli: Docker grubuna eklendi, değişikliğin etkili olması için"
  echo "  oturumu kapatıp yeniden açın veya şunu çalıştırın:"
  echo "  newgrp docker"
fi

#!/bin/bash
# KUDEB Panel — Oracle VPS Sıfırdan Kurulum Scripti
# Ubuntu 24.04 LTS · kudeb.urla.online
# Kullanım: bash vps-kurulum.sh
#
# UYARI: Sunucudaki mevcut tüm Docker container, volume ve imajları siler!

set -e

DOMAIN="kudeb.urla.online"
GITHUB_REPO="https://github.com/korayuner/kudeb-panel.git"
UYGULAMA_DIZINI="$HOME/kudeb-panel"
COMPOSE_FILE="docker-compose.local.yml"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       KUDEB Panel — VPS Kurulum Scripti                   ║"
echo "║       Ubuntu 24.04 LTS · kudeb.urla.online                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  UYARI: Bu script mevcut tüm Docker container ve volume'larını"
echo "  silecek ve KUDEB paneli sıfırdan kuracaktır."
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
  echo "  ⚠  Gemini key girilmedi — PDF analiz özelliği çalışmaz (ayarlardan eklenebilir)"
  GEMINI_KEY="GIRILMEDI"
fi

# ─── Google Drive Klasör ID sor ───────────────────────────────────────────────
echo ""
echo "  Google Drive Klasör ID (opsiyonel — fotoğraf yükleme için)"
read -p "  Drive Klasör ID (boş geçmek için Enter): " DRIVE_FOLDER_ID
if [ -z "$DRIVE_FOLDER_ID" ]; then
  DRIVE_FOLDER_ID=""
fi

# ─── SSL e-posta sor ─────────────────────────────────────────────────────────
echo ""
read -p "  SSL sertifikası için e-posta adresi: " SSL_EMAIL
if [ -z "$SSL_EMAIL" ]; then
  SSL_EMAIL="admin@urla.online"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Domain  : $DOMAIN"
echo "  E-posta : $SSL_EMAIL"
echo "  Gemini  : ${GEMINI_KEY:0:8}..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── 1. Sistem bağımlılıkları ─────────────────────────────────────────────────
echo "→ [1/9] Sistem güncelleniyor..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  curl git ca-certificates gnupg lsb-release \
  nginx certbot python3-certbot-nginx \
  ufw
echo "  ✓ Bağımlılıklar kuruldu"

# ─── 2. Firewall (UFW) ───────────────────────────────────────────────────────
echo ""
echo "→ [2/9] Firewall ayarlanıyor..."
sudo ufw allow 22/tcp   comment 'SSH'    > /dev/null 2>&1 || true
sudo ufw allow 80/tcp   comment 'HTTP'   > /dev/null 2>&1 || true
sudo ufw allow 443/tcp  comment 'HTTPS'  > /dev/null 2>&1 || true
sudo ufw --force enable > /dev/null 2>&1 || true
echo "  ✓ UFW: 22 (SSH), 80 (HTTP), 443 (HTTPS) açık"
echo "  ! Oracle Cloud Security List'te 80 ve 443 portlarını açmayı unutmayın!"

# ─── 3. Docker kurulumu ──────────────────────────────────────────────────────
echo ""
if ! command -v docker &> /dev/null; then
  echo "→ [3/9] Docker kuruluyor..."
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
  echo "→ [3/9] Docker zaten mevcut ✓"
fi

# ─── 4. Mevcut Docker kaynaklarını temizle (container + veritabanları dahil) ──
echo ""
echo "→ [4/9] Mevcut tüm Docker kaynakları siliniyor..."
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

# ─── 5. Repo klonla ──────────────────────────────────────────────────────────
echo ""
echo "→ [5/9] GitHub'dan repo klonlanıyor..."
if [ -d "$UYGULAMA_DIZINI" ]; then
  rm -rf "$UYGULAMA_DIZINI"
fi
git clone --branch master "$GITHUB_REPO" "$UYGULAMA_DIZINI"
cd "$UYGULAMA_DIZINI"
echo "  ✓ Repo klonlandı: $UYGULAMA_DIZINI"

# ─── 6. .env dosyası ─────────────────────────────────────────────────────────
echo ""
echo "→ [6/9] Yapılandırma dosyaları oluşturuluyor..."
cat > .env <<EOF
GEMINI_API_KEYS=$GEMINI_KEY
GOOGLE_DRIVE_ROOT_FOLDER_ID=$DRIVE_FOLDER_ID
EOF
echo "  ✓ .env oluşturuldu"

if [ ! -f "google-service-account.json" ]; then
  echo "{}" > google-service-account.json
  echo "  ✓ Boş google-service-account.json oluşturuldu"
fi

# ─── docker-compose.local.yml → VPS için ALLOWED_ORIGIN ve PUBLIC_URL güncelle
sed -i "s|ALLOWED_ORIGIN: http://localhost:3000|ALLOWED_ORIGIN: https://$DOMAIN|g" "$COMPOSE_FILE"
sed -i "s|PUBLIC_URL: http://localhost:8055|PUBLIC_URL: https://$DOMAIN/api/directus|g" "$COMPOSE_FILE"
sed -i "s|CORS_ORIGIN: \"http://localhost:3000,http://localhost:8055\"|CORS_ORIGIN: \"https://$DOMAIN\"|g" "$COMPOSE_FILE"
sed -i "s|VITE_PAPERLESS_EXTERNAL_URL: \"http://localhost:8001\"|VITE_PAPERLESS_EXTERNAL_URL: \"https://$DOMAIN/paperless\"|g" "$COMPOSE_FILE"
echo "  ✓ docker-compose domain ayarları güncellendi"

# ─── 7. Docker Compose build + up ────────────────────────────────────────────
echo ""
echo "→ [7/9] İmajlar build ediliyor (5-10 dakika sürebilir)..."
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

# ─── Veritabanı koleksiyonlarını kur ─────────────────────────────────────────
echo ""
echo "→ Veritabanı koleksiyonları kuruluyor..."
DIRECTUS_URL=http://localhost:8055 bash scripts/kurulum.sh

# ─── 8. Nginx yapılandırması ─────────────────────────────────────────────────
echo ""
echo "→ [8/9] Nginx yapılandırılıyor..."

# Geçici HTTP-only config (certbot için)
sudo tee /etc/nginx/sites-available/"$DOMAIN" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }
}
EOF

# Varsayılan siteyi devre dışı bırak
sudo rm -f /etc/nginx/sites-enabled/default

# Yeni siteyi etkinleştir
sudo ln -sf /etc/nginx/sites-available/"$DOMAIN" /etc/nginx/sites-enabled/"$DOMAIN"

sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
echo "  ✓ Nginx yapılandırıldı"

# ─── 9. SSL sertifikası (Let's Encrypt) ──────────────────────────────────────
echo ""
echo "→ [9/9] SSL sertifikası alınıyor ($DOMAIN)..."
echo "  NOT: $DOMAIN'in DNS'i bu sunucunun IP'sine ($(curl -s ifconfig.me 2>/dev/null)) işaret etmelidir!"
echo ""

sudo certbot --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$SSL_EMAIL" \
  --redirect

echo "  ✓ SSL sertifikası kuruldu"

# Certbot otomatik yenileme
sudo systemctl enable certbot.timer 2>/dev/null || true
(sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | sudo crontab - 2>/dev/null || true
echo "  ✓ Otomatik SSL yenileme ayarlandı"

# ─── Sonuç ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    ✓  KUDEB Panel HAZIR!                                     ║"
echo "║                                                              ║"
echo "║    Panel:    https://$DOMAIN             ║"
echo "║                                                              ║"
echo "║    Kullanıcı: admin@example.com                              ║"
echo "║    Şifre:     kudeb2026                                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Yönetim (yalnızca SSH üzerinden):"
echo "    Directus : http://localhost:8055"
echo "    Paperless: http://localhost:8001"
echo ""
echo "  Durdurmak için:"
echo "    cd $UYGULAMA_DIZINI"
echo "    docker compose -f $COMPOSE_FILE down"
echo ""
echo "  ÖNEMLİ KONTROLLER:"
echo "  1. Oracle Cloud Security List'te 80 ve 443 portları açık mı?"
echo "  2. $DOMAIN DNS'i bu sunucuya işaret ediyor mu?"
echo "     A kaydı → $(curl -s ifconfig.me 2>/dev/null)"
echo ""

# KUDEB İş Yönetim Paneli — Kurulum Kılavuzu

## Geliştirme Ortamı

```bash
cd kudeb-panel
npm install
npm run dev
# http://localhost:3000 adresinde açılır
```

Geliştirme sırasında vite proxy devrededir — Directus, Paperless ve n8n'e
`/api/*` üzerinden erişilir.

## Production Build (Docker)

```bash
# Sadece kudeb-panel'i derleyip başlat
docker build -t kudeb-panel ./kudeb-panel
docker run -p 3000:80 kudeb-panel

# Veya docker-compose ile
docker compose -f docker-compose.yml -f docker-compose.kudeb-panel.yml up -d kudeb-panel
```

## Mevcut docker-compose.yml'e Ekleme

`docker-compose.kudeb-panel.yml` dosyasındaki `kudeb-panel:` servis bloğunu
mevcut `docker-compose.yml` dosyasının `services:` bölümüne ekleyin.

## Nginx Konfigürasyonu

1. `nginx-kudeb.conf` dosyasını `/etc/nginx/sites-available/kudeb.urla.online` olarak kopyalayın:
   ```bash
   cp nginx-kudeb.conf /etc/nginx/sites-available/kudeb.urla.online
   ln -s /etc/nginx/sites-available/kudeb.urla.online /etc/nginx/sites-enabled/
   ```

2. SSL sertifikası oluşturun:
   ```bash
   certbot --nginx -d kudeb.urla.online
   ```

3. Nginx'i yeniden yükleyin:
   ```bash
   nginx -t && systemctl reload nginx
   ```

## Servis Yapısı

```
kudeb.urla.online
  └── nginx (reverse proxy)
        └── kudeb-panel (Docker container, port 80)
              ├── /api/directus → directus:8055
              ├── /api/paperless → paperless-ngx:8000
              └── /api/n8n → n8n:5678
```

## Özellikler

- **Sol panel**: Tüm işler listesi, arama, ilçe/tür/vade filtresi
- **Özet sekmesi**: İş detayları, inline düzenleme (personel, vade, durum, öneri, kronoloji)
- **Belgeler sekmesi**: Paperless'tan belgeler, sürükle-bırak PDF yükleme, sıralama
- **Harita sekmesi**: OpenStreetMap + Leaflet, koordinat manuel giriş
- **Fotoğraf sekmesi**: Grid görünüm, lightbox büyütme
- **Koyu/açık tema**, toast bildirimleri

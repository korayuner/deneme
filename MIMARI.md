# KUDEB Panel — Sistem Mimarisi

## Genel Görünüm

```
İnternet (HTTPS)
      ↓
  Traefik  ←── SSL sertifikaları (Let's Encrypt)
      ↓
┌─────────────────────────────────────────────────────────────────┐
│  Docker Ağı                                                     │
│                                                                 │
│  ┌──────────────┐   PDF yükle    ┌───────────────────────────┐ │
│  │ kudeb-panel  │ ─────────────> │  pdf-service  (YENİ)      │ │
│  │ React/Nginx  │ <───────────── │  Node.js · Port 4000      │ │
│  │ Port 80      │  analiz sonucu │  OpenDataLoader PDF       │ │
│  └──────┬───────┘                │  Gemini API entegrasyonu  │ │
│         │                        └──────────┬────────────────┘ │
│         │ CRUD                              │ belge kaydet      │
│         ↓                                  ↓                   │
│  ┌──────────────┐                ┌───────────────────────────┐ │
│  │  Directus    │                │     Paperless-ngx         │ │
│  │  Port 8055   │                │     Port 8000             │ │
│  │  (Veritabanı)│                │  (PDF arşiv deposu)       │ │
│  └──────────────┘                └───────────────────────────┘ │
│                                                                 │
│  ┌──────────────┐                                              │
│  │     n8n      │  ← İleride: bildirim, zamanlama             │
│  │  Port 5678   │                                              │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                     Google Gemini API
                     (Dış servis, HTTPS)
```

---

## Servisler

| Servis | Teknoloji | Alan adı | Görev |
|---|---|---|---|
| kudeb-panel | React 18 + Nginx | kudeb.urla.online | Kullanıcı arayüzü |
| pdf-service | Node.js 20 + Express | kudeb.urla.online/api/pdf | PDF işleme + AI analiz |
| Directus | Node.js + PostgreSQL | directus.urla.online | Veritabanı + API |
| Paperless-ngx | Python + Django | paperless.urla.online | PDF arşiv deposu |
| n8n | Node.js | n8n.urla.online | İş akışı otomasyonu |

---

## Veri Modeli

### Directus: `kudeb_isler` (İşler)

```
id              uuid        PK
is_no           string      2025-001  (benzersiz, otomatik)
ilce_adi        string      Konak
mahalle_adi     string      Alsancak
ada             string      123
parsel          string      45
is_turu_adi     string      BBO / İzinsiz Uygulama / ...
gorevli_personel string     Ahmet Yılmaz, Mehmet Kaya
vade_tarihi     date
son_durum       string      Beklemede / Devam Ediyor / ...
oncelik         int         1=Acil, 2=Normal, 3=Düşük
ozet            text        (Gemini tarafından üretilir)
notlar          text
belge_sayisi    int         (otomatik güncellenir)
aktif           boolean     true
date_created    datetime
date_updated    datetime
```

### Directus: `kudeb_belgeler` (Belgeler) ← YENİ

```
id              uuid        PK
is_no           string      FK → kudeb_isler.is_no
paperless_id    int         Paperless-ngx doküman ID
dosya_adi       string      001-Gelen-İBB KUDEB ... yazı.pdf
tur             string      Gelen / Giden / Ek
kimden          string
kime            string
tarih           date
konu            string
ozet            text        (Gemini özeti)
tam_metin       text        (OCR metni, max 32000 karakter)
date_created    datetime
```

**İlişki:** Bir iş (`kudeb_isler`) → Çok belge (`kudeb_belgeler`)
**İzolasyon:** Her belge `is_no` ile bir işe bağlıdır. Farklı işlerin belgeleri karışmaz.

---

## PDF İzolasyon Stratejisi

### Problem
Excel sisteminde dosyalar klasöre göre ayrılıyordu:
```
C:\KUDEB Arşivi\2025-001_Konak İlçesi, Alsancak Mahallesi, 123 Ada, 45 Parsel\
    001-Gelen-....pdf
    002-Giden-....pdf
```

### Web Çözümü
Aynı taşınmaza (ada/parsel) birden fazla iş açılabilir.
Bu nedenle **ada+parsel değil, is_no ile izole edilir**:

```
Directus kudeb_belgeler tablosu:
┌──────────┬──────────────┬──────────────┬─────────────────┐
│ id       │ is_no        │ paperless_id │ dosya_adi       │
├──────────┼──────────────┼──────────────┼─────────────────┤
│ uuid-1   │ 2025-001     │ 42           │ 001-Gelen-...   │
│ uuid-2   │ 2025-001     │ 43           │ 002-Giden-...   │
│ uuid-3   │ 2025-002     │ 44           │ 001-Gelen-...   │  ← Aynı parsel, farklı iş
└──────────┴──────────────┴──────────────┴─────────────────┘

"2025-001 işinin belgeleri" → WHERE is_no = '2025-001' → [42, 43]
"2025-002 işinin belgeleri" → WHERE is_no = '2025-002' → [44]
```

Paperless-ngx'te belgeler `is_no` etiketiyle de işaretlenir
(ek güvenlik katmanı + Paperless arayüzünden arama kolaylığı).

---

## pdf-service — İşlem Akışı

```
Kullanıcı PDF seçer (drag-drop veya tıkla)
        ↓
React → POST /api/pdf/upload
        { file: [binary], is_no: "2025-001", is_id: "uuid..." }
        ↓
pdf-service alır
        ↓
1. Dosyayı geçici diske yazar (/tmp/uuid.pdf)
        ↓
2. OpenDataLoader PDF çalıştırır
   opendataloader-pdf /tmp/uuid.pdf --format markdown
        ↓
3. Markdown metin → Gemini API'ye gönderilir
   (Excel VBA'daki OlusturAkilliPrompt mantığıyla aynı prompt)
        ↓
4. Gemini yanıtı parse edilir:
   { sayi, ilce, mahalle, ada, parsel, kimden, kime,
     tarih, konu, ozet, ekler, vade_tarihi }
        ↓
5a. Directus kudeb_belgeler → yeni satır eklenir
5b. Paperless-ngx → PDF yüklenir, is_no etiketi eklenir
        ↓
6. Geçici dosya silinir
        ↓
React → analiz sonucunu gösterir
Kullanıcı → onaylar / düzenler
        ↓
React → PATCH /api/directus/items/kudeb_isler/:id
        (form alanları Directus'a kaydedilir)
```

---

## URL Yapısı (Nginx Routing)

```
kudeb.urla.online/              → kudeb-panel (React)
kudeb.urla.online/api/directus/ → directus:8055
kudeb.urla.online/api/paperless/→ paperless-ngx:8000
kudeb.urla.online/api/n8n/      → n8n:5678
kudeb.urla.online/api/pdf/      → pdf-service:4000  ← YENİ
```

---

## Dosya ve Klasör Yapısı

```
deneme/
├── kudeb-panel/          React frontend
├── pdf-service/          YENİ Node.js servisi
│   ├── src/
│   │   ├── index.js      Express sunucusu
│   │   ├── routes/
│   │   │   └── upload.js POST /upload endpoint
│   │   └── services/
│   │       ├── extractor.js  OpenDataLoader PDF
│   │       ├── gemini.js     Gemini API
│   │       └── storage.js    Directus + Paperless kayıt
│   ├── package.json
│   └── Dockerfile
├── docker-compose.kudeb-panel.yml  (pdf-service eklendi)
└── nginx-kudeb.conf                (pdf proxy eklendi)
```

---

## Geliştirme Sırası

1. ✅ Directus'ta `kudeb_belgeler` koleksiyonu oluştur
2. ✅ pdf-service servisini yaz ve Docker'a ekle
3. ✅ Nginx routing güncelle
4. ✅ React'ta UploadTab bileşeni ekle
5. ⏳ Gemini API anahtarını Directus Ayarlar'a ekle
6. ⏳ Test: Tek PDF yükle → analiz görüntüle
7. ⏳ Test: Aynı parsel için iki farklı iş → belgelerin karışmadığını doğrula

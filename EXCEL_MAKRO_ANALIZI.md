# IS TAKIP.xlsm — VBA Makro Analizi

## Genel Bakış

Bu Excel dosyası, **İzmir Büyükşehir Belediyesi KUDEB** (Koruma Uygulama ve Denetim Bürosu) için geliştirilmiş bir **iş takip ve yazışma yönetim sistemi**dir. Yapay zeka (Google Gemini) entegrasyonu sayesinde gelen yazıları otomatik analiz edebilmektedir.

---

## Mimari Yapı

### Excel Sayfaları

| Sayfa | Açıklama |
|---|---|
| `Veri` | Ana iş kayıtları (A–P sütunları) |
| `Yazismalar` | Her işe ait yazışma geçmişi (A–L sütunları) |
| `Ayarlar` | API anahtarları, klasör yolları, listeler, şablonlar |

### Veri Sayfası Sütun Yapısı

| Sütun | Alan | Açıklama |
|---|---|---|
| A | İş No | Otomatik üretilen numara (YYYY-NNN formatı) |
| B | Sayı No | Gelen/giden evrak sayısı |
| C | Evrak Tarihi | Belgenin tarihi |
| D | İlçe | Taşınmazın bulunduğu ilçe |
| E | Mahalle | Taşınmazın bulunduğu mahalle |
| F | Ada | Kadastral ada numarası |
| G | Parsel | Kadastral parsel numarası |
| H | Kimden | Gönderen kurum/kişi |
| I | Görevli | Atanan personel(ler) |
| J | İş Türü | BBO / İzinsiz Uygulama / Restorasyon / Mimari / Güvenlik / Kurum Görüş / Diğer |
| K | Durum | İşin mevcut durumu |
| L | Öncelik | 1 (Yüksek) / 2 (Orta) / 3 (Düşük) |
| M | Vade Tarihi | Son teslim / cevap tarihi |
| N | Özet | Gemini tarafından üretilen teknik özet |
| O | Klasör Linki | Dosyaların saklandığı Windows klasörüne hyperlink |
| P | Notlar | Serbest not alanı |

### Yazismalar Sayfası Sütun Yapısı

| Sütun | Alan |
|---|---|
| A | İş No (ilişki anahtarı) |
| B | Tarih |
| C | Tür (Gelen / Giden / Ek) |
| D | Kimden |
| E | Kime |
| F | Konu |
| G | Dosya Yolu (hyperlink) |
| H | Sayı No |
| I | İş Türü |
| J | Özet |
| K | Ekler |
| L | Tam OCR Metni (32.000 karakter max) |

### Ayarlar Sayfası Kritik Hücreler

| Hücre | İçerik |
|---|---|
| B1 | Birincil Gemini API anahtarı |
| B2 | pdftotext.exe yolu |
| B3 | Ana arşiv klasörü yolu |
| B4 | Varsayılan başlangıç klasörü |
| B5+ | Görevli personel listesi (`**` ile biter) |
| C5+ | Durum listesi (`**` ile biter) |
| D5+ | Öncelik listesi (`**` ile biter) |
| F2+, G2+ | Cevap şablonları (F=Ad, G=İçerik) |
| H1+, I1+ | Yedek API anahtarları ve model adları |
| B44 | Görev kağıdı Word şablon yolu |
| B45 | İşe başlama yazısı Word şablon yolu |

---

## Form ve Modül Açıklamaları

### UserForm_IsListesi — İş Listesi Formu

**Amaç:** Tüm iş kayıtlarını filtrelenebilir bir liste olarak gösterir.

**Özellikler:**
- `Veri` sayfasındaki tüm kayıtları okur
- İş No'ya göre **yeniden eskiye** bubble sort ile sıralar
- Arama kutusuna yazıldıkça anlık filtreler (İlçe, Mahalle, Ada, Parsel, Görevli, Tür alanlarında)
- Türkçe karakter duyarlı arama (i→İ, ı→I dönüşümü)
- 11 sütunlu liste: İş No, İlçe, Mahalle, Ada, Parsel, Görevli, Tür, Durum, Vade, Öncelik, Notlar

**Akıllı Öncelik Gösterimi (Vade tarihine göre):**

| Durum | Gösterim |
|---|---|
| Geçmiş tarih | `GECİKTİ (X gün)` |
| Bugün son gün | `BUGÜN SON` |
| 1–5 gün kaldı | `X gün kaldı` |
| 6–15 gün kaldı | `X gün var` |
| 15+ gün / tamamlandı | Normal öncelik etiketi |

**Çift tıklama:** Seçilen kaydı `UserForm_PdfIsle`'de açar.

---

### UserForm_PdfIsle — İşlem Merkezi (Ana Form)

Bu formun en kapsamlı formdur. 6 ana işlev bloğundan oluşur:

#### Blok 1: Dosya Seçimi
- PDF, Word (.doc/.docx), görsel (.jpg/.jpeg/.png) destekler
- Çoklu dosya seçimi mümkündür
- Seçim yapılınca otomatik İş No üretilir (GetNextIsNumarasi)
- Tek dosya seçildiyse "Ek dosya var mı?" seçeneği açılır
- Birden fazla dosya seçildiyse "Grup analizi mi?" seçeneği açılır

#### Blok 2: Metin Çıkarma (btnAnalizBaslat)
- **PDF:** Harici `pdftotext.exe` aracı çalıştırılır → UTF-8 çıktı → ADODB.Stream ile okunur
- **Word:** `Word.Application` COM nesnesi açılır, `Content.Text` alınır
- **Görsel:** `[RESİM DOSYASI - METİN İÇERİĞİ ÇIKARILAMADI]` notu eklenir
- Birden fazla dosya varsa metinler `========= DOSYA N =========` başlıkları ile birleştirilir
- Çıkarılan metin `txtAnalizMetni` kutusuna yazılır

#### Blok 3: Gemini AI Analizi (btnGeminiAnaliz)
- `OlusturAkilliPrompt()` ile KUDEB uzmanı rolü tanımlı bir prompt oluşturulur
- Mevcut özet varsa yeni belgeyle **harmanlanmış özet** istenir
- Gemini'den dönen yanıt parse edilir ve form alanları doldurulur:
  - SAYI → txtSayiNo
  - İLÇE → txtSonucIlce
  - MAHALLE → txtSonucMahalle
  - ADA → txtSonucAda
  - PARSEL → txtSonucParsel
  - KİMDEN → txtSonucKimden, vs.
- Markdown karakterleri (`**`, `##`) temizlenir
- Hangi Gemini modelinin kullanıldığı `lblAktifModel` etiketinde gösterilir

#### Blok 4: Kayıt İşlemleri

**Yeni Kaydet (btnYeniOlarakKaydet):**
1. İş No tekrar kontrolü
2. `Veri` sayfasına yeni satır ekler (A–P)
3. `DosyayiKaydet()` ile dosyaları arşive kopyalar
4. `YazismaKaydet()` ile `Yazismalar` sayfasına işler
5. Ek dosyalar varsa `PredictAttachmentName()` ile Gemini'ye isim tahmin ettirir

**Güncelle (btnGuncelle):**
- Mevcut kaydı bulup günceller
- Klasör adı değiştiyse yeniden adlandırır
- `UpdateAllFileLinks()` ile tüm yazışma linklerini günceller

**Birleştir (btnSeciliIsleBirlestir):**
- Mevcut dosyaları daha önce açılmış bir işe bağlar

**Sil (btnSil):**
- Tekil yazışma silme veya işin tüm klasörü ile komple silinmesi

#### Blok 5: Benzer İş Arama
- İlçe, Mahalle, Ada, Parsel değerlerine göre aynı taşınmazın önceki kayıtlarını bulur
- Türkçe karakter normalize + boşluk/nokta temizleme ile esnek eşleştirme
- `*` joker karakter desteği var

#### Blok 6: Cevap Taslağı (btnTaslakCevap)
- `Ayarlar` sayfası F/G sütunlarından şablonlar yüklenir
- Kullanıcı şablon seçer → Gemini şablonu OCR bağlamıyla doldurur
- `Module_TaslakCevap.OzelCevapUret()` XML tabanlı prompt kullanır

#### Ek: Özel Yazılar
- **Görev Kağıdı (btnGorevKagidi):** Word şablonunu personel ve iş bilgileriyle doldurur
- **İşe Başlama Yazısı (btnIseBaslama):** Kurul kararından veri çekerek resmi yazı üretir

---

### Module_Gemini — Yapay Zeka API Katmanı

**Çalışma Mantığı:**
1. `Ayarlar` sayfası H ve I sütunlarında saklanan API anahtarı + model çiftlerini sırayla dener
2. HTTP 200 alana kadar bir sonraki anahtara geçer (çoklu yedekleme sistemi)
3. Başarılı olunca `AktifCalisanModel` global değişkenine model adını yazar

**Teknik Detaylar:**
- `MSXML2.XMLHTTP.6.0` ile senkron POST isteği
- `temperature: 0.1`, `maxOutputTokens: 8192`
- JSON escape: `\`, `"`, CRLF, Tab karakterleri kaçırılır
- Yanıt parse: VBScript Regex ile `"text": "..."` yakalanır
- Güvenlik filtresi tespiti: `blockReason` anahtar kelimesi aranır

**Desteklenen Modeller:** `gemini-2.5-flash` (varsayılan) + Ayarlar'da tanımlı diğerleri

---

### Module_Yardimci — Dosya ve Veri Yönetimi

**Klasör Adı Formatı:**
```
YYYY-NNN_İLÇE İlçesi, MAHALLE Mahallesi, ADA Ada, PARSEL Parsel
```
Örnek: `2024-015_Konak İlçesi, Alsancak Mahallesi, 123 Ada, 45 Parsel`

**Dosya Adı Formatı:**
```
NNN-Tür-Kimden TARIH tarihli SAYI sayılı yazı/karar
```
Örnek: `001-Gelen-İBB KUDEB 15.03.2024 tarihli E-123 sayılı yazı`

**İş No Formatı:** `YYYY-NNN` (yıl + 3 haneli sıra, örn: `2024-001`)

**Önemli Fonksiyonlar:**

| Fonksiyon | Açıklama |
|---|---|
| `GetNextIsNumarasi` | O yıl için bir sonraki boş iş numarasını bulur |
| `BenzerIsBul` | Lokasyon bazlı benzer kayıt arar (normalize + joker) |
| `DosyayiKaydet` | Dosyayı klasöre kopyalar, isim onayı alır |
| `YazismaKaydet` | Yazışmalar sayfasına satır ekler |
| `IsiKompleSil` | İş + klasör + yazışmalar tamamen silinir |
| `NormalizeForSearch` | Türkçe karakter + noktalama temizliği |
| `TemizMetin` | Windows dosya adı yasak karakter temizliği |

---

### Module_GorevKagidi — Görev Kağıdı Üreticisi

Word şablonundaki yer tutucuları doldurur:

| Yer Tutucu | Değer |
|---|---|
| `[TARIH_BUGUN]` | Bugünün tarihi |
| `[IS_DETAYI]` | Konu (İlçe, Ada/Parsel) İş Türü yerinde inceleme |
| `[ILCE]` | İlçe adı |
| `[IS_OZETI]` | İş özeti |
| `[PERSONEL_LISTESI]` | Görevli personel adları (her biri ayrı etiket) |

Şablon yolu: `Ayarlar!B44`

---

### Module_IseBaslama — İşe Başlama Yazısı Üreticisi

Kurul Kararı PDF'inden Gemini ile veri çıkarır, Word şablonunu doldurur:

| Yer Tutucu | Kaynak |
|---|---|
| `[SAYI]` | Evrak sayısı |
| `[ILCE]`, `[MAHALLE]`, `[ADA]`, `[PARSEL]` | Taşınmaz bilgileri |
| `[KURUL_ADI]` | Gemini → `<KURUL_ADI>` etiketi |
| `[KURUL_TARIH]` | Gemini → `<KURUL_TARIH>` etiketi |
| `[KURUL_NO]` | Gemini → `<KURUL_NO>` etiketi |
| `[TASINMAZ_OZETI]` | Gemini → `<TASINMAZ_OZETI>` etiketi |
| `[KARAR_ALINTISI]` | Gemini → `<KARAR_ALINTISI>` etiketi (tırnak içinde) |
| `[IS_TURU]` | Gemini → `<IS_TURU>` etiketi |
| `[IMZA_AD_SOYAD]` | Sabit: `Dr. Hakan UZUN` |

Şablon yolu: `Ayarlar!B45`

---

### Module_TaslakCevap — Cevap Taslağı Üreticisi

XML tabanlı prompt ile Gemini'ye şablon doldurma yaptırır:
- `<SABLON>` etiketi: Kullanıcının seçtiği Word şablonu metni
- `<VERI>` etiketi: Form alanlarından toplanan bağlam bilgileri
- Kural: Şablonun T.C. başlığı ve imza kısmı değiştirilmez

---

## İş Akışı (Tam Süreç)

```
1. PDF/Word/Resim dosyaları seçilir
        ↓
2. Metin çıkarılır (pdftotext / Word COM / not)
        ↓
3. Gemini AI metni analiz eder → form alanları dolar
        ↓
4. Kullanıcı verileri kontrol eder / düzenler
        ↓
5a. YENİ KAYIT → İş No üretilir → Veri sayfasına eklenir → Dosya arşive kopyalanır → Yazismalar sayfasına eklenir
5b. MEVCUT İŞE EKLE → Benzer işler listesinden seçilir → Yazışma eklenir
        ↓
6. (İsteğe bağlı) Cevap taslağı / Görev kağıdı / İşe başlama yazısı üretilir
```

---

## Web Uygulamasına Port Planı

### Mevcut KUDEB Panel ile Karşılaştırma

| Excel Özelliği | Web Karşılığı (Mevcut/Planlanan) |
|---|---|
| İş listesi + filtreleme | ✅ JobList bileşeni (mevcut) |
| İş detayı görüntüleme | ✅ JobDetail bileşeni (mevcut) |
| PDF yükleme | ✅ react-dropzone (mevcut) |
| Directus entegrasyonu | ✅ api/directus.js (mevcut) |
| Gemini AI analizi | ❌ Yok — eklenmesi gerekiyor |
| pdftotext metin çıkarma | ❌ Yok — sunucu tarafı gerekiyor |
| Vade/öncelik uyarıları | ❌ Kısmen — geliştirilmeli |
| Word şablon doldurma | ❌ Yok — alternatif gerekiyor |
| Çoklu API key yedekleme | ❌ Yok — eklenmesi gerekiyor |
| Dosya arşiv yönetimi | ❌ Paperless-ngx ile karşılanabilir |

### Önerilen Ek Geliştirmeler

1. **AI Analiz Servisi:** n8n workflow ile Gemini API entegrasyonu (mevcut `api/n8n.js` üzerinden)
2. **PDF Metin Çıkarma:** Sunucu tarafında `pdf-parse` npm paketi veya n8n HTTP node
3. **Öncelik/Vade Göstergesi:** JobList'e renk kodlu badge sistemi
4. **Yazışma Geçmişi:** JobDetail'e yazışmalar sekmesi (Paperless entegrasyonu)
5. **Görev Kağıdı:** Tarayıcıda HTML→PDF dönüşümü (jsPDF veya Puppeteer)

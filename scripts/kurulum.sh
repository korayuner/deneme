#!/bin/bash
# KUDEB tam kurulum scripti — tüm collection'ları ve başlangıç verilerini oluşturur
# İdempotent: mevcut collection/alanları atlar, eksikleri oluşturur
set -e

DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8055}"
TOKEN="kudeb_directus_static_token_2026"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

echo "================================================"
echo " KUDEB Kurulum Scripti v2"
echo "================================================"
echo ""

# ─── Directus hazır olana kadar bekle ─────────────────────────────────────────
echo "Directus bekleniyor..."
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DIRECTUS_URL/server/health" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then echo "✓ Directus hazır"; break; fi
  echo "  ($i/30) bekleniyor..."; sleep 3
done

# ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────
collection_var_mi() {
  local S=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$DIRECTUS_URL/collections/$1")
  [ "$S" = "200" ]
}
alan_var_mi() {
  local S=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" "$DIRECTUS_URL/fields/$1/$2")
  [ "$S" = "200" ]
}
kayit_sayisi() {
  curl -s -H "$AUTH" "$DIRECTUS_URL/items/$1?aggregate[count]=id" | \
    grep -o '"count":"[0-9]*"' | grep -o '[0-9]*' || echo "0"
}
alan_ekle() {
  local col="$1" field="$2" type="$3" note="$4" extra="$5"
  if alan_var_mi "$col" "$field"; then
    echo "    ✓ $field zaten var"
  else
    local body="{\"field\":\"$field\",\"type\":\"$type\",\"meta\":{\"note\":\"$note\"}$extra}"
    local R=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DIRECTUS_URL/fields/$col" \
      -H "$AUTH" -H "$CT" -d "$body")
    [ "$R" = "200" ] || [ "$R" = "201" ] && echo "    ✓ $field eklendi" || echo "    ✗ $field ($R)"
  fi
}
koleksiyon_olustur() {
  local col="$1" icon="$2" note="$3" fields_json="$4"
  if collection_var_mi "$col"; then
    echo "  ✓ $col zaten var"
  else
    curl -s -o /dev/null -X POST "$DIRECTUS_URL/collections" -H "$AUTH" -H "$CT" \
      -d "{\"collection\":\"$col\",\"meta\":{\"icon\":\"$icon\",\"note\":\"$note\"},\"schema\":{},\"fields\":$fields_json}"
    echo "  ✓ $col oluşturuldu"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[1] Görevli Kişiler (kudeb_personel)..."
koleksiyon_olustur "kudeb_personel" "person" "Görevli kişi listesi" '[
  {"field":"id","type":"integer","schema":{"is_primary_key":true,"has_auto_increment":true},"meta":{"hidden":true}},
  {"field":"ad","type":"string","schema":{"is_nullable":false},"meta":{"note":"Ad Soyad"}}
]'
COUNT=$(kayit_sayisi "kudeb_personel")
if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
  PERSONELLER=("Alev Adıgüzel" "Bahar İnan" "Barış Aylaz" "Begüm Uzal" "Berkan Acarlar"
    "Ceylan Engüzel" "Çağrı Erbay" "Deniz Badalı" "Duygu Türkmen" "Ece Ceren Doğan"
    "Emine Aslıhan Yılmaz" "Emre Günday" "Fazilet Zerrin Ayazoğlu" "Gizem Yılmaz"
    "Gökçe Başol" "Gökçen Orunlu" "Gürkan Helvacı" "Kadir Öztürk" "Koray Üner"
    "Maksut Nami Bozkurt" "Meryem Koç Kaya" "Metin Aydın" "Murat Mazeci" "Müge Aydın"
    "Özge Akbulut" "Özgür Yurttaş Erda" "Özlem Taşkın Erten" "Pelin Raşit"
    "Pınar Bozkurt" "Pınar Osmanoğlu" "Serdar Ona" "Sevgi Girginer"
    "Tuba Gülamber" "Tuna Sinan Derbentoğulları")
  for P in "${PERSONELLER[@]}"; do
    curl -s -o /dev/null -X POST "$DIRECTUS_URL/items/kudeb_personel" \
      -H "$AUTH" -H "$CT" -d "{\"ad\":\"$P\"}"
  done
  echo "  ✓ ${#PERSONELLER[@]} kişi eklendi"
else
  echo "  ✓ $COUNT kişi zaten var"
fi

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[2] İş Türleri (kudeb_is_turleri)..."
koleksiyon_olustur "kudeb_is_turleri" "label" "İş türleri listesi" '[
  {"field":"id","type":"integer","schema":{"is_primary_key":true,"has_auto_increment":true},"meta":{"hidden":true}},
  {"field":"ad","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş türü adı"}},
  {"field":"sira","type":"integer","schema":{"is_nullable":true},"meta":{"note":"Sıralama"}}
]'
COUNT=$(kayit_sayisi "kudeb_is_turleri")
if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
  TURLER=("Basit Bakım Onarım" "Restorasyon Proje Kontrol" "Mimari Proje Kontrol" "İzinsiz Uygulama" "Güvenlik Önlemi" "Diğer")
  for i in "${!TURLER[@]}"; do
    curl -s -o /dev/null -X POST "$DIRECTUS_URL/items/kudeb_is_turleri" \
      -H "$AUTH" -H "$CT" -d "{\"ad\":\"${TURLER[$i]}\",\"sira\":$((i+1))}"
  done
  echo "  ✓ ${#TURLER[@]} iş türü eklendi"
else
  echo "  ✓ $COUNT iş türü zaten var"
fi

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[3] kudeb_isler — yeni alanlar..."
alan_ekle "kudeb_isler" "koordinat_lat"    "float"   "Enlem (WGS84)"
alan_ekle "kudeb_isler" "koordinat_lon"    "float"   "Boylam (WGS84)"
alan_ekle "kudeb_isler" "parent_id"        "string"  "Ana iş ID (alt işler için)"
alan_ekle "kudeb_isler" "eski_ada"         "string"  "Eski ada no (tapu değişikliği)"
alan_ekle "kudeb_isler" "eski_parsel"      "string"  "Eski parsel no (tapu değişikliği)"
alan_ekle "kudeb_isler" "asama_tamamlanan" "integer" "Tamamlanan aşama sayısı" ',\"schema\":{\"default_value\":0}'
alan_ekle "kudeb_isler" "asama_toplam"     "integer" "Toplam aşama sayısı" ',\"schema\":{\"default_value\":0}'

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[4] kudeb_is_asamalari..."
koleksiyon_olustur "kudeb_is_asamalari" "checklist" "İş aşama adımları" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"is_id","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş ID"}},
  {"field":"asama_adi","type":"string","schema":{"is_nullable":false},"meta":{"note":"Adım adı"}},
  {"field":"sira","type":"integer","schema":{"is_nullable":false,"default_value":1},"meta":{"note":"Sıra"}},
  {"field":"tamamlandi","type":"boolean","schema":{"is_nullable":false,"default_value":false},"meta":{"note":"Tamamlandı mı?"}},
  {"field":"tamamlanma_tarihi","type":"dateTime","schema":{"is_nullable":true},"meta":{"note":"Tamamlanma zamanı"}},
  {"field":"aciklama","type":"text","schema":{"is_nullable":true},"meta":{"note":"Not"}},
  {"field":"date_created","type":"timestamp","meta":{"special":["date-created"],"hidden":true}}
]'

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[5] kudeb_belgeler — yeni alanlar..."
# kudeb_belgeler zaten var, yeni alanlar ekle
alan_ekle "kudeb_belgeler" "beklemede" "boolean" "Henüz bir işe bağlanmadı" ',\"schema\":{\"default_value\":false}'
alan_ekle "kudeb_belgeler" "sayi"      "string"  "Evrak sayısı/numarası"

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[6] kudeb_belge_isler (junction)..."
koleksiyon_olustur "kudeb_belge_isler" "link" "Yazışma ↔ İş bağlantısı" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"belge_id","type":"string","schema":{"is_nullable":false},"meta":{"note":"Belge ID"}},
  {"field":"is_id","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş ID"}},
  {"field":"uyari","type":"text","schema":{"is_nullable":true},"meta":{"note":"Ada/parsel uyuşmazlık uyarısı"}},
  {"field":"date_created","type":"timestamp","meta":{"special":["date-created"],"hidden":true}}
]'

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[7] kudeb_belge_ekleri..."
koleksiyon_olustur "kudeb_belge_ekleri" "attach_file" "Yazışma ek dosyaları" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"belge_id","type":"string","schema":{"is_nullable":false},"meta":{"note":"Belge ID"}},
  {"field":"dosya_adi","type":"string","schema":{"is_nullable":false},"meta":{"note":"Dosya adı"}},
  {"field":"paperless_id","type":"string","schema":{"is_nullable":true},"meta":{"note":"Paperless ID"}},
  {"field":"analiz_edildi","type":"boolean","schema":{"is_nullable":false,"default_value":false},"meta":{"note":"Analiz yapıldı mı?"}},
  {"field":"date_created","type":"timestamp","meta":{"special":["date-created"],"hidden":true}}
]'

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[8] kudeb_is_loglari..."
koleksiyon_olustur "kudeb_is_loglari" "history" "İş değişiklik geçmişi" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"is_id","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş ID"}},
  {"field":"eylem","type":"string","schema":{"is_nullable":false},"meta":{"note":"Eylem tipi"}},
  {"field":"aciklama","type":"text","schema":{"is_nullable":true},"meta":{"note":"Açıklama"}},
  {"field":"eski_deger","type":"text","schema":{"is_nullable":true},"meta":{"note":"Eski değer"}},
  {"field":"yeni_deger","type":"text","schema":{"is_nullable":true},"meta":{"note":"Yeni değer"}},
  {"field":"date_created","type":"timestamp","meta":{"special":["date-created"],"hidden":true}}
]'

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[9] kudeb_ayarlar..."
koleksiyon_olustur "kudeb_ayarlar" "settings" "Sistem ayarları" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"anahtar","type":"string","schema":{"is_nullable":false},"meta":{"note":"Ayar anahtarı"}},
  {"field":"deger","type":"text","schema":{"is_nullable":true},"meta":{"note":"Değer"}},
  {"field":"aciklama","type":"text","schema":{"is_nullable":true},"meta":{"note":"Açıklama"}}
]'

# Ayarları seed et
ayar_ekle() {
  local KEY="$1" VAL="$2" ACIK="$3"
  # Zaten varsa atla
  local MEVCUT=$(curl -s -H "$AUTH" \
    "$DIRECTUS_URL/items/kudeb_ayarlar?filter[anahtar][_eq]=$KEY&fields=id" | \
    grep -o '"id"' | head -1)
  if [ -n "$MEVCUT" ]; then
    echo "    ✓ $KEY zaten var"
  else
    # JSON-safe value gönder
    curl -s -o /dev/null -X POST "$DIRECTUS_URL/items/kudeb_ayarlar" \
      -H "$AUTH" -H "$CT" \
      -d "{\"anahtar\":\"$KEY\",\"deger\":$(echo "$VAL" | python3 -c 'import sys,json;print(json.dumps(sys.stdin.read().rstrip()))'),\"aciklama\":\"$ACIK\"}"
    echo "    ✓ $KEY eklendi"
  fi
}

VARSAYILAN_PROMPT='ROL: İzmir Büyükşehir Belediyesi KUDEB biriminde çalışan, eski eserler uzmanısın.

GÖREV: Belgeyi analiz et, verileri istenen formatta döndür.

{HARMANLAMA_TALIMATI}

KURALLAR:
1. Markdown kullanma.
2. Bilgi bulamazsan boş bırak.
3. Ada/parsel parantez içi eski bilgileri ayır: "111 ada (e:542)" → ada=111, eski_ada=542.

FORMAT:
SAYI: [evrak sayısı]
İLÇE: [ilçe]
MAHALLE: [mahalle]
ADA: [ada no]
PARSEL: [parsel no]
ESKİ ADA: [eski ada, varsa]
ESKİ PARSEL: [eski parsel, varsa]
KİMDEN: [gönderen]
KİME: [alıcı]
TARİH: [GG.AA.YYYY]
KONU: [konu]
VADE TARİHİ: [son tarih]
EKLER: [ek listesi]
ÖZET: [teknik özet]

BELGE:
---
{BELGE_METNI}
---'

ayar_ekle "gemini_prompt"        "$VARSAYILAN_PROMPT"           "Gemini analiz promptu"
ayar_ekle "gemini_api_keys"      ""                             "Gemini API anahtarları (virgülle)"
ayar_ekle "gemini_models"        "gemini-2.5-flash,gemini-1.5-pro" "Gemini modelleri (öncelik sırası)"
ayar_ekle "gemini_temperature"   "0.1"                          "Analiz sıcaklığı (0.0-1.0)"
ayar_ekle "paperless_url"        "http://paperless-ngx:8000"    "Paperless-ngx adresi"
ayar_ekle "paperless_token"      ""                             "Paperless API token"
ayar_ekle "paperless_cf_ada"     "5"                            "Paperless ada custom field ID"
ayar_ekle "paperless_cf_parsel"  "6"                            "Paperless parsel custom field ID"
ayar_ekle "paperless_cf_ilce"    "3"                            "Paperless ilçe custom field ID"
ayar_ekle "paperless_cf_mahalle" "4"                            "Paperless mahalle custom field ID"
ayar_ekle "tkgm_api_url"         "https://cbsapi.tkgm.gov.tr/megsiswebapi.v3.1/api" "TKGM API adresi"
ayar_ekle "tkgm_il_id"           "57"                           "TKGM İzmir il kodu (plaka değil)"
ayar_ekle "google_drive_folder_id" ""                           "Google Drive kök klasör ID"
ayar_ekle "kurum_adi"            "İzmir Büyükşehir Belediyesi"  "Kurum adı (raporlarda kullanılır)"
ayar_ekle "birim_adi"            "KUDEB"                        "Birim adı"
ayar_ekle "vade_uyari_gun"       "7"                            "Yaklaşan vade uyarı süresi (gün)"
ayar_ekle "is_no_hane"           "3"                            "İş numarası hane sayısı (3 veya 4)"
ayar_ekle "fuzzy_tolerans"       "normal"                       "Eşleşme toleransı: kapali/normal/genis"

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[10] kudeb_asama_sablonlari..."
koleksiyon_olustur "kudeb_asama_sablonlari" "list_alt" "İş türüne göre aşama şablonları" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"is_turu","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş türü adı"}},
  {"field":"sira","type":"integer","schema":{"is_nullable":false},"meta":{"note":"Sıra"}},
  {"field":"asama_adi","type":"string","schema":{"is_nullable":false},"meta":{"note":"Aşama adı"}}
]'

COUNT=$(kayit_sayisi "kudeb_asama_sablonlari")
if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
  sablon_ekle() {
    local TUR="$1" SIRA="$2" ADI="$3"
    curl -s -o /dev/null -X POST "$DIRECTUS_URL/items/kudeb_asama_sablonlari" \
      -H "$AUTH" -H "$CT" \
      -d "{\"is_turu\":$(echo "$TUR" | python3 -c 'import sys,json;print(json.dumps(sys.stdin.read().rstrip()))'),\"sira\":$SIRA,\"asama_adi\":$(echo "$ADI" | python3 -c 'import sys,json;print(json.dumps(sys.stdin.read().rstrip()))')}"
  }
  # Basit Bakım Onarım
  sablon_ekle "Basit Bakım Onarım" 1 "Dilekçe/Gelen Yazı Alındı"
  sablon_ekle "Basit Bakım Onarım" 2 "Yerinde İnceleme"
  sablon_ekle "Basit Bakım Onarım" 3 "Teknik Rapor Hazırlandı"
  sablon_ekle "Basit Bakım Onarım" 4 "Onarım Ön İzin Belgesi Hazırlandı"
  sablon_ekle "Basit Bakım Onarım" 5 "Uygulama Denetimi"
  sablon_ekle "Basit Bakım Onarım" 6 "Onarım Uygunluk Belgesi Gönderildi"
  # Mimari Proje Kontrol
  sablon_ekle "Mimari Proje Kontrol" 1 "Dilekçe/Gelen Yazı Alındı"
  sablon_ekle "Mimari Proje Kontrol" 2 "Yerinde İnceleme"
  sablon_ekle "Mimari Proje Kontrol" 3 '"Ne Zaman Başlayacaksınız" Yazısı Gönderildi'
  sablon_ekle "Mimari Proje Kontrol" 4 "Proje Esaslı Denetim"
  sablon_ekle "Mimari Proje Kontrol" 5 "Teknik Rapor Hazırlandı"
  sablon_ekle "Mimari Proje Kontrol" 6 "Kullanım Uygunluk Belgesi Gönderildi"
  # Restorasyon Proje Kontrol
  sablon_ekle "Restorasyon Proje Kontrol" 1 "Dilekçe/Gelen Yazı Alındı"
  sablon_ekle "Restorasyon Proje Kontrol" 2 "Yerinde İnceleme"
  sablon_ekle "Restorasyon Proje Kontrol" 3 '"Ne Zaman Başlayacaksınız" Yazısı Gönderildi'
  sablon_ekle "Restorasyon Proje Kontrol" 4 "Proje Esaslı Denetim"
  sablon_ekle "Restorasyon Proje Kontrol" 5 "Teknik Rapor Hazırlandı"
  sablon_ekle "Restorasyon Proje Kontrol" 6 "Kullanım Uygunluk Belgesi Gönderildi"
  # İzinsiz Uygulama
  sablon_ekle "İzinsiz Uygulama" 1 "Gelen Yazı/Şikâyet/İhbar Alındı"
  sablon_ekle "İzinsiz Uygulama" 2 "Yerinde İnceleme"
  sablon_ekle "İzinsiz Uygulama" 3 "Aykırılık Tespiti"
  sablon_ekle "İzinsiz Uygulama" 4 '"Ne Zaman Başlayacaksınız" Yazısı Gönderildi'
  sablon_ekle "İzinsiz Uygulama" 5 "Teknik Rapor Hazırlandı"
  sablon_ekle "İzinsiz Uygulama" 6 "Kurul ve Belediye Bildirimi Yapıldı"
  # Güvenlik Önlemi
  sablon_ekle "Güvenlik Önlemi" 1 "Dilekçe/Gelen Yazı Alındı"
  sablon_ekle "Güvenlik Önlemi" 2 "Yerinde İnceleme"
  sablon_ekle "Güvenlik Önlemi" 3 '"Ne Zaman Başlayacaksınız" Yazısı Gönderildi'
  sablon_ekle "Güvenlik Önlemi" 4 "Teknik Rapor Hazırlandı"
  sablon_ekle "Güvenlik Önlemi" 5 "Kurula/Belediyeye Yazı Gönderildi"
  # Diğer
  sablon_ekle "Diğer" 1 "Gelen Yazı/Dilekçe Alındı"
  sablon_ekle "Diğer" 2 "Belge Kontrol"
  sablon_ekle "Diğer" 3 "Yerinde İnceleme"
  sablon_ekle "Diğer" 4 "Teknik Rapor Hazırlandı"
  sablon_ekle "Diğer" 5 "İlgili Kurumlara Yazı Gönderildi"
  echo "  ✓ Aşama şablonları eklendi"
else
  echo "  ✓ $COUNT şablon adımı zaten var"
fi

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[11] kudeb_arazi_ziyaretleri..."
koleksiyon_olustur "kudeb_arazi_ziyaretleri" "map" "Saha arazi ziyaretleri" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"is_id","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş ID"}},
  {"field":"tarih","type":"date","schema":{"is_nullable":false},"meta":{"note":"Ziyaret tarihi"}},
  {"field":"gorevli","type":"string","schema":{"is_nullable":true},"meta":{"note":"Ziyaret eden personel"}},
  {"field":"notlar","type":"text","schema":{"is_nullable":true},"meta":{"note":"Saha notları"}},
  {"field":"date_created","type":"timestamp","meta":{"special":["date-created"],"hidden":true}}
]'

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[12] kudeb_arazi_fotograflari..."
koleksiyon_olustur "kudeb_arazi_fotograflari" "photo_camera" "Arazi ziyaret fotoğrafları" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"ziyaret_id","type":"string","schema":{"is_nullable":false},"meta":{"note":"Ziyaret ID"}},
  {"field":"dosya_adi","type":"string","schema":{"is_nullable":true},"meta":{"note":"Dosya adı"}},
  {"field":"google_drive_id","type":"string","schema":{"is_nullable":true},"meta":{"note":"Google Drive dosya ID"}},
  {"field":"aciklama","type":"text","schema":{"is_nullable":true},"meta":{"note":"Fotoğraf notu"}},
  {"field":"date_created","type":"timestamp","meta":{"special":["date-created"],"hidden":true}}
]'

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "[13] kudeb_fotograflar..."
koleksiyon_olustur "kudeb_fotograflar" "photo_library" "Google Drive fotoğraf kayıtları" '[
  {"field":"id","type":"uuid","schema":{"is_primary_key":true},"meta":{"hidden":true}},
  {"field":"is_no","type":"string","schema":{"is_nullable":false},"meta":{"note":"İş numarası (filtre için)"}},
  {"field":"drive_file_id","type":"string","schema":{"is_nullable":false},"meta":{"note":"Google Drive dosya ID"}},
  {"field":"drive_klasor_id","type":"string","schema":{"is_nullable":true},"meta":{"note":"İnceleme klasör ID"}},
  {"field":"dosya_adi","type":"string","schema":{"is_nullable":true},"meta":{"note":"Orijinal dosya adı"}},
  {"field":"web_view_link","type":"string","schema":{"is_nullable":true},"meta":{"note":"Drive görüntüleme linki"}},
  {"field":"thumbnail_link","type":"string","schema":{"is_nullable":true},"meta":{"note":"Küçük resim URL"}},
  {"field":"boyut","type":"string","schema":{"is_nullable":true},"meta":{"note":"Dosya boyutu (byte)"}},
  {"field":"inceleme_tarihi","type":"date","schema":{"is_nullable":true},"meta":{"note":"İnceleme tarihi"}},
  {"field":"inceleme_aciklama","type":"string","schema":{"is_nullable":true},"meta":{"note":"Klasör açıklaması"}},
  {"field":"date_created","type":"timestamp","meta":{"special":["date-created"],"hidden":true}}
]'

# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "================================================"
echo " Kurulum tamamlandı!"
echo "================================================"
echo ""
echo "  Panel    : http://localhost:3001"
echo "  Directus : http://localhost:8055  (admin@example.com / kudeb2026)"
echo ""
echo "SONRAKİ ADIM: Gemini API anahtarını ayarlar paneline girin."
echo ""

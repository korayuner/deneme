#!/bin/sh
# Directus koleksiyon kurulum scripti
# kudeb_isler ve kudeb_yazilar tablolarını oluşturur

DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8055}"
TOKEN="${DIRECTUS_TOKEN:-kudeb_directus_static_token_2026}"

koleksiyon_olustur() {
  NAME=$1
  PAYLOAD=$2
  CHECK=$(curl -sf "$DIRECTUS_URL/collections/$NAME" -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  if echo "$CHECK" | grep -q '"collection"'; then
    echo "  ✓ $NAME zaten mevcut, atlanıyor."
  else
    echo "  → $NAME oluşturuluyor..."
    curl -sf -X POST "$DIRECTUS_URL/collections" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" > /dev/null && echo "  ✓ $NAME oluşturuldu."
  fi
}

echo ""
echo "=== Directus Koleksiyonları Kurulumu ==="
echo "URL: $DIRECTUS_URL"
echo ""

# ─── 1. kudeb_isler ──────────────────────────────────────────────────────────
echo "[1/2] kudeb_isler..."
koleksiyon_olustur "kudeb_isler" '{
  "collection": "kudeb_isler",
  "meta": { "icon": "work", "note": "İş kartları" },
  "schema": {},
  "fields": [
    {"field":"is_no",            "type":"string",   "meta":{"required":true,"note":"İş numarası (örn: 2025-001)"}},
    {"field":"ilce_adi",         "type":"string",   "meta":{"note":"İlçe adı"}},
    {"field":"mahalle_adi",      "type":"string",   "meta":{"note":"Mahalle adı"}},
    {"field":"sokak",            "type":"string",   "meta":{"note":"Sokak adı"}},
    {"field":"ada",              "type":"string",   "meta":{"note":"Ada numarası"}},
    {"field":"parsel",           "type":"string",   "meta":{"note":"Parsel numarası"}},
    {"field":"yapi_konumu",      "type":"string",   "meta":{"note":"Yapı konumu (köşe, ara, müstakil vb.)"}},
    {"field":"tescil_grubu",     "type":"string",   "meta":{"note":"Tescil grubu (1.Grup, 2.Grup vb.)"}},
    {"field":"is_turu_adi",      "type":"string",   "meta":{"note":"İş türü (BBO, Restorasyon vb.)"}},
    {"field":"vade_tarihi",      "type":"date",     "meta":{"note":"İşin bitiş/vade tarihi"}},
    {"field":"gorevli_personel", "type":"string",   "meta":{"note":"Sorumlu personel adı"}},
    {"field":"son_durum",        "type":"text",     "meta":{"note":"Son durum notu"}},
    {"field":"kronolojik_ozet",  "type":"text",     "meta":{"note":"Kronolojik özet (her satır bir madde)"}},
    {"field":"tescil_aciklamasi","type":"text",     "meta":{"note":"Tescil açıklaması"}},
    {"field":"oneri",            "type":"text",     "meta":{"note":"Öneri"}},
    {"field":"notlar",           "type":"text",     "meta":{"note":"Serbest notlar"}},
    {"field":"osm_link",         "type":"string",   "meta":{"note":"OpenStreetMap linki"}},
    {"field":"ozet_guncelleme",  "type":"dateTime", "meta":{"note":"Özet güncelleme tarihi"}},
    {"field":"koordinat",        "type":"string",   "meta":{"note":"Parsel koordinatı (WKT POINT)"}}
  ]
}'

# ─── 2. kudeb_yazilar ────────────────────────────────────────────────────────
echo "[2/2] kudeb_yazilar..."
koleksiyon_olustur "kudeb_yazilar" '{
  "collection": "kudeb_yazilar",
  "meta": { "icon": "description", "note": "Yazı/evrak kayıtları" },
  "schema": {},
  "fields": [
    {"field":"is_no",          "type":"string", "meta":{"required":true,"note":"Bağlı iş numarası"}},
    {"field":"evrak_no",       "type":"string", "meta":{"note":"Evrak/yazı sayı numarası"}},
    {"field":"yazi_tarihi",    "type":"date",   "meta":{"note":"Yazı tarihi"}},
    {"field":"tur",            "type":"string", "meta":{"note":"Gelen / Giden"}},
    {"field":"kimden",         "type":"string", "meta":{"note":"Gönderen kurum/kişi"}},
    {"field":"kime",           "type":"string", "meta":{"note":"Alıcı kurum/kişi"}},
    {"field":"ilgili_kurumlar","type":"string", "meta":{"note":"İlgili diğer kurumlar"}},
    {"field":"gemini_ozeti",   "type":"text",   "meta":{"note":"Gemini AI özeti"}},
    {"field":"full_ocr",       "type":"text",   "meta":{"note":"PDF tam OCR metni"}},
    {"field":"drive_link",     "type":"string", "meta":{"note":"Google Drive dosya linki"}},
    {"field":"dosya_adi",      "type":"string", "meta":{"note":"Dosya adı"}}
  ]
}'

echo ""
echo "=== Kurulum tamamlandı! ==="
echo ""
echo "Directus Admin: $DIRECTUS_URL"
echo "Token: $TOKEN"
echo ""

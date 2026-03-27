#!/bin/bash
# koordinat_lat ve koordinat_lon alanlarını kudeb_isler'e ekler
set -e

DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8055}"
TOKEN="kudeb_directus_static_token_2026"

AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

echo "Directus hazır olana kadar bekleniyor..."
for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DIRECTUS_URL/server/health")
  [ "$STATUS" = "200" ] && break
  echo "  ($i) bekleniyor..."
  sleep 3
done

add_field() {
  local FIELD=$1
  local TYPE=$2
  local NOTE=$3

  # Alan zaten var mı?
  EXISTING=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "$AUTH" \
    "$DIRECTUS_URL/fields/kudeb_isler/$FIELD")

  if [ "$EXISTING" = "200" ]; then
    echo "  ✓ $FIELD zaten var, atlandı"
    return
  fi

  RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$DIRECTUS_URL/fields/kudeb_isler" \
    -H "$AUTH" -H "$CT" \
    -d "{\"field\":\"$FIELD\",\"type\":\"$TYPE\",\"meta\":{\"note\":\"$NOTE\"}}")

  if [ "$RESULT" = "200" ] || [ "$RESULT" = "201" ]; then
    echo "  ✓ $FIELD eklendi"
  else
    echo "  ✗ $FIELD eklenemedi (HTTP $RESULT)"
  fi
}

echo "[1/2] koordinat_lat ekleniyor..."
add_field "koordinat_lat" "float" "Enlem (WGS84)"

echo "[2/2] koordinat_lon ekleniyor..."
add_field "koordinat_lon" "float" "Boylam (WGS84)"

echo "Tamamlandı."

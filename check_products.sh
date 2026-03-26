#!/bin/bash
# Check footer product URLs for 404s

DOMAIN="https://patchkraze.com"

PRODUCTS=(
  # Our Products
  "embroidered-patches"
  "metallic-flex-patches"
  "full-color-printed-patches"
  "pvc-patches"
  "genuine-leather-patches"
  "faux-leather-patches"
  "woven-patches"
  "3d-embroidered-patches"
  "chenille-patches"
  "custom-stickers"
  "rhinestone-transfers"
  "blank-hats"
  "patch-samples"
  # Custom Patches
  "backpack-patches"
  "patches-for-beanies"
  "patches-for-jackets"
  "patches-for-jeans"
  "patches-for-hats"
  "patches-for-clothes"
  "patches-for-shirts"
  "patches-for-hoodies"
  "patches-for-vests"
  "patches-for-pants"
  "letterman-jacket-patches"
  # Custom Patch Styles
  "iron-on-patches"
  "morale-patches"
  "army-patches"
  "motorcycle-patches"
  "military-patches"
  "tactical-patches"
  "police-patches"
  "girl-scout-patches"
  "funny-patches"
  "name-patches"
  "custom-velcro-patches"
)

echo "Checking product URLs..."
echo ""
echo "=== 404 NOT FOUND ==="
for p in "${PRODUCTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/products/$p" --max-time 5)
  if [ "$STATUS" = "404" ]; then
    echo "$p -> 404"
  fi
done

echo ""
echo "=== OK (200) ==="
for p in "${PRODUCTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/products/$p" --max-time 5)
  if [ "$STATUS" = "200" ]; then
    echo "$p -> OK"
  fi
done

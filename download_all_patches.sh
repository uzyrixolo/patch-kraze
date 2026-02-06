#!/bin/bash

# Comprehensive Patch Images Download Script
# Downloads ALL category images from masterscustompatches.com

BASE_DIR="downloaded-images-full"
mkdir -p "$BASE_DIR"

echo "════════════════════════════════════════════════════════"
echo "  DOWNLOADING ALL PATCH CATEGORY IMAGES"
echo "════════════════════════════════════════════════════════"

# ============================================================
# 1. EMBROIDERY CATEGORY
# ============================================================
echo -e "\n📁 EMBROIDERY"
mkdir -p "$BASE_DIR/embroidery"
cd "$BASE_DIR/embroidery"

curl -L -o "embroidery-hero.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fembroidery-hero-jungle-squad.jpeg&w=3840&q=75"
curl -L -o "embroidered-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_main.jpg&w=3840&q=75"
curl -L -o "custom-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fcustom-patches%2Fdripping-cream-letters.jpeg&w=3840&q=75"
curl -L -o "custom-jacket-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_4.jpg&w=3840&q=75"
curl -L -o "iron-on-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_2.jpg&w=3840&q=75"
curl -L -o "velcro-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_6.jpg&w=3840&q=75"
curl -L -o "sublimation-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_8.jpg&w=3840&q=75"

cd ../..
echo "✓ Embroidery: 7 images downloaded"

# ============================================================
# 2. PVC RUBBER CATEGORY
# ============================================================
echo -e "\n📁 PVC RUBBER"
mkdir -p "$BASE_DIR/pvc"
cd "$BASE_DIR/pvc"

curl -L -o "pvc-hero.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fmasterpieces%2Fsamples-7.jpeg&w=3840&q=75"
curl -L -o "pvc-patches-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_2.jpg&w=3840&q=75"
curl -L -o "pvc-patches-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_5.jpg&w=3840&q=75"
curl -L -o "rubber-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_3.jpg&w=3840&q=75"
curl -L -o "silicone-patches-pvc.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_4.jpg&w=3840&q=75"
curl -L -o "3d-molded-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_5.jpg&w=3840&q=75"

cd ../..
echo "✓ PVC Rubber: 6 images downloaded"

# ============================================================
# 3. SILICONE CATEGORY
# ============================================================
echo -e "\n📁 SILICONE"
mkdir -p "$BASE_DIR/silicone"
cd "$BASE_DIR/silicone"

curl -L -o "silicone-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_main.jpg&w=3840&q=75"
curl -L -o "silicone-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_main.jpg&w=3840&q=75"
curl -L -o "silicone-transfers.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FSilicone_01.jpg&w=3840&q=75"

cd ../..
echo "✓ Silicone: 3 images downloaded"

# ============================================================
# 4. LEATHER CATEGORY
# ============================================================
echo -e "\n📁 LEATHER"
mkdir -p "$BASE_DIR/leather"
cd "$BASE_DIR/leather"

curl -L -o "leather-hero.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FLeather_Emboss_04.jpg&w=3840&q=75"
curl -L -o "leather-engraving.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fleather-engraving-1.jpeg&w=3840&q=75"
curl -L -o "leather-embossed.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FLeather_Emboss_06.jpg&w=3840&q=75"
curl -L -o "leather-printed.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FLeather_51.jpg&w=3840&q=75"

cd ../..
echo "✓ Leather: 4 images downloaded"

# ============================================================
# 5. WOVEN CATEGORY
# ============================================================
echo -e "\n📁 WOVEN"
mkdir -p "$BASE_DIR/woven"
cd "$BASE_DIR/woven"

curl -L -o "woven-hero.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FWovenPatch_main.jpg&w=3840&q=75"
curl -L -o "woven-patches-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FWovenPatch_main.jpg&w=3840&q=75"
curl -L -o "woven-patches-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FWoven-Patch-05.jpg&w=3840&q=75"

cd ../..
echo "✓ Woven: 3 images downloaded"

# ============================================================
# 6. CHENILLE CATEGORY
# ============================================================
echo -e "\n📁 CHENILLE"
mkdir -p "$BASE_DIR/chenille"
cd "$BASE_DIR/chenille"

curl -L -o "chenille-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FChenille_main.jpg&w=3840&q=75"
curl -L -o "chenille-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FChenille_main.jpg&w=3840&q=75"

cd ../..
echo "✓ Chenille: 2 images downloaded"

# ============================================================
# 7. LABELS & TAGS CATEGORY
# ============================================================
echo -e "\n📁 LABELS & TAGS"
mkdir -p "$BASE_DIR/labels-tags"
cd "$BASE_DIR/labels-tags"

curl -L -o "labels-tags-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FHang-Tags-01.jpg&w=3840&q=75"

cd ../..
echo "✓ Labels & Tags: 1 image downloaded"

# ============================================================
# 8. DTF (HEAT TRANSFER) CATEGORY
# ============================================================
echo -e "\n📁 DTF (HEAT TRANSFER)"
mkdir -p "$BASE_DIR/dtf"
cd "$BASE_DIR/dtf"

curl -L -o "dtf-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FDTF-1.jpg&w=3840&q=75"
curl -L -o "dtf-transfers.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FDTF-1.jpg&w=3840&q=75"

cd ../..
echo "✓ DTF: 2 images downloaded"

# ============================================================
# 9. ADDITIONAL SPECIALTY PRODUCTS
# ============================================================
echo -e "\n📁 SPECIALTY PRODUCTS"
mkdir -p "$BASE_DIR/specialty"
cd "$BASE_DIR/specialty"

# 3D Embroidered Patches (if different from main embroidery)
curl -L -o "3d-embroidered.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_main.jpg&w=3840&q=75"

# Full Color Printed Patches
curl -L -o "full-color-printed.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_8.jpg&w=3840&q=75"

# Morale Patches
curl -L -o "morale-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fembroidery-hero-jungle-squad.jpeg&w=3840&q=75"

# Motorcycle Patches
curl -L -o "motorcycle-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_4.jpg&w=3840&q=75"

# Military/Tactical Patches
curl -L -o "military-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fembroidery-hero-jungle-squad.jpeg&w=3840&q=75"

# Name Patches
curl -L -o "name-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_2.jpg&w=3840&q=75"

cd ../..
echo "✓ Specialty: 6 images downloaded"

# ============================================================
# 10. APPLICATION-SPECIFIC IMAGES
# ============================================================
echo -e "\n📁 APPLICATION SPECIFIC"
mkdir -p "$BASE_DIR/applications"
cd "$BASE_DIR/applications"

# Backpack Patches
curl -L -o "backpack-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_main.jpg&w=3840&q=75"

# Jacket Patches
curl -L -o "jacket-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_4.jpg&w=3840&q=75"

# Hat Patches
curl -L -o "hat-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_6.jpg&w=3840&q=75"

# Beanie Patches
curl -L -o "beanie-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_6.jpg&w=3840&q=75"

# Hoodie Patches
curl -L -o "hoodie-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_main.jpg&w=3840&q=75"

# Vest Patches
curl -L -o "vest-patches.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_4.jpg&w=3840&q=75"

cd ../..
echo "✓ Applications: 6 images downloaded"

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "═════════════════════════════════════════════════════════"
echo "  DOWNLOAD COMPLETE!"
echo "═════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "  • Embroidery: 7 images"
echo "  • PVC Rubber: 6 images"
echo "  • Silicone: 3 images"
echo "  • Leather: 4 images"
echo "  • Woven: 3 images"
echo "  • Chenille: 2 images"
echo "  • Labels & Tags: 1 image"
echo "  • DTF: 2 images"
echo "  • Specialty: 6 images"
echo "  • Applications: 6 images"
echo "  ─────────────────────────"
echo "  📦 TOTAL: 40 images"
echo ""
echo "All images saved to: $BASE_DIR/"
echo "═════════════════════════════════════════════════════════"

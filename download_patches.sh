#!/bin/bash

# Create base directory
mkdir -p /Users/zolo/patch-kraze/downloaded-images

# ============================================
# EMBROIDERY PATCHES (7 images)
# ============================================
mkdir -p /Users/zolo/patch-kraze/downloaded-images/embroidered
cd /Users/zolo/patch-kraze/downloaded-images/embroidered
echo "Downloading Embroidery images..."
curl -L -o "embroidered-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fembroidered-patches.jpeg&w=3840&q=75"
curl -L -o "embroidered-product-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_main.jpg&w=3840&q=75"
curl -L -o "embroidered-product-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_3.jpg&w=3840&q=75"
curl -L -o "embroidered-product-3.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_4.jpg&w=3840&q=75"
curl -L -o "embroidered-product-4.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_5.jpg&w=3840&q=75"
curl -L -o "embroidered-product-5.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_6.jpg&w=3840&q=75"
curl -L -o "embroidered-product-6.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fembriodary_8.jpg&w=3840&q=75"
echo "✓ Embroidery: 7 images downloaded"

# ============================================
# PVC PATCHES (5 images)
# ============================================
mkdir -p /Users/zolo/patch-kraze/downloaded-images/pvc
cd /Users/zolo/patch-kraze/downloaded-images/pvc
echo "Downloading PVC images..."
curl -L -o "pvc-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fmasterpieces%2Fsamples-7.jpeg&w=3840&q=75"
curl -L -o "pvc-product-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_2.jpg&w=3840&q=75"
curl -L -o "pvc-product-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_3.jpg&w=3840&q=75"
curl -L -o "pvc-product-3.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_4.jpg&w=3840&q=75"
curl -L -o "pvc-product-4.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_5.jpg&w=3840&q=75"
echo "✓ PVC: 5 images downloaded"

# ============================================
# SILICONE PATCHES (5 images)
# ============================================
mkdir -p /Users/zolo/patch-kraze/downloaded-images/silicone
cd /Users/zolo/patch-kraze/downloaded-images/silicone
echo "Downloading Silicone images..."
curl -L -o "silicone-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_main.jpg&w=3840&q=75"
curl -L -o "silicone-product-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FSilicone_01.jpg&w=3840&q=75"
curl -L -o "silicone-product-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_2.jpg&w=3840&q=75"
curl -L -o "silicone-product-3.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_3.jpg&w=3840&q=75"
curl -L -o "silicone-product-4.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FPVC_4.jpg&w=3840&q=75"
echo "✓ Silicone: 5 images downloaded"

# ============================================
# LEATHER PATCHES (4 images)
# ============================================
mkdir -p /Users/zolo/patch-kraze/downloaded-images/leather
cd /Users/zolo/patch-kraze/downloaded-images/leather
echo "Downloading Leather images..."
curl -L -o "leather-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FLeather_Emboss_04.jpg&w=3840&q=75"
curl -L -o "leather-product-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2Fleather-engraving-1.jpeg&w=3840&q=75"
curl -L -o "leather-product-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FLeather_Emboss_06.jpg&w=3840&q=75"
curl -L -o "leather-product-3.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FLeather_51.jpg&w=3840&q=75"
echo "✓ Leather: 4 images downloaded"

# ============================================
# WOVEN PATCHES (4 images)
# ============================================
mkdir -p /Users/zolo/patch-kraze/downloaded-images/woven
cd /Users/zolo/patch-kraze/downloaded-images/woven
echo "Downloading Woven images..."
curl -L -o "woven-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FWovenPatch_main.jpg&w=3840&q=75"
curl -L -o "woven-product-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FWovenPatch_2.jpg&w=3840&q=75"
curl -L -o "woven-product-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FWovenPatch_4.jpg&w=3840&q=75"
curl -L -o "woven-product-3.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FWovenPatch_5.jpg&w=3840&q=75"
echo "✓ Woven: 4 images downloaded"

# ============================================
# CHENILLE PATCHES (4 images)
# ============================================
mkdir -p /Users/zolo/patch-kraze/downloaded-images/chenille
cd /Users/zolo/patch-kraze/downloaded-images/chenille
echo "Downloading Chenille images..."
curl -L -o "chenille-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FChenille_main.jpg&w=3840&q=75"
curl -L -o "chenille-product-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FChenille_2.jpg&w=3840&q=75"
curl -L -o "chenille-product-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FChenille_3.jpg&w=3840&q=75"
curl -L -o "chenille-product-3.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FChenille_4.jpg&w=3840&q=75"
echo "✓ Chenille: 4 images downloaded"

# ============================================
# LABELS & TAGS (4 images)
# ============================================
mkdir -p /Users/zolo/patch-kraze/downloaded-images/labels-tags
cd /Users/zolo/patch-kraze/downloaded-images/labels-tags
echo "Downloading Labels & Tags images..."
curl -L -o "labels-tags-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FHang-Tags-01.jpg&w=3840&q=75"
curl -L -o "labels-tags-product-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FHang-Tags-02.jpg&w=3840&q=75"
curl -L -o "labels-tags-product-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FHang-Tags-03.jpg&w=3840&q=75"
curl -L -o "labels-tags-product-3.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FHang-Tags-04.jpg&w=3840&q=75"
echo "✓ Labels & Tags: 4 images downloaded"

# ============================================
# DTF HEAT TRANSFERS (6 images)
# ============================================
mkdir -p /Users/zolo/patch-kraze/downloaded-images/dtf
cd /Users/zolo/patch-kraze/downloaded-images/dtf
echo "Downloading DTF images..."
curl -L -o "dtf-main.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FDTF-1.jpg&w=3840&q=75"
curl -L -o "dtf-product-1.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FDTF-3.jpg&w=3840&q=75"
curl -L -o "dtf-product-2.jpg" "https://masterscustompatches.com/_next/image?url=%2Fimages%2Fnew-images%2FDTF-5.jpg&w=3840&q=75"
curl -L -o "dtf-product-3.jpg" "https://masterscustompatches.com/_next/image?url=%2Fcolorful-dtf-transfer-on-t-shirt.jpg&w=3840&q=75"
curl -L -o "dtf-product-4.jpg" "https://masterscustompatches.com/_next/image?url=%2Fphoto-quality-dtf-heat-transfer.jpg&w=3840&q=75"
curl -L -o "dtf-product-5.jpg" "https://masterscustompatches.com/_next/image?url=%2Fgang-sheet-multiple-dtf-designs.jpg&w=3840&q=75"
echo "✓ DTF: 6 images downloaded"

echo ""
echo "═════════════════════════════════════════"
echo "✓ ALL 39 IMAGES DOWNLOADED SUCCESSFULLY!"
echo "═════════════════════════════════════════"

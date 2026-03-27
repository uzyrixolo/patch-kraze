import json
import urllib.request
import urllib.error
import os
import time

API_KEY = os.environ.get("OPENAI_API_KEY")
if not API_KEY:
    print("Error: Please set your OPENAI_API_KEY environment variable. Example:")
    print("export OPENAI_API_KEY='sk-...'")
    exit(1)

JSON_PATH = "products-for-images.json"
OUTPUT_DIR = "product-images"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

with open(JSON_PATH, 'r') as f:
    data = json.load(f)

products = data.get("products", [])
print(f"Found {len(products)} total products to process.")

def generate_image(prompt, filename):
    url = "https://api.openai.com/v1/images/generations"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    body = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024"
    }
    
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            image_url = res_data["data"][0]["url"]
            
            # Download the actual image file
            urllib.request.urlretrieve(image_url, filename)
            print(f"  ✓ Saved: {filename}")
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        print(f"  ❌ Error generating {filename}: {error_msg}")
        # Stop script if we hit rate limits so user doesn't waste calls failing repeatedly
        if "rate_limit" in error_msg.lower():
            print("Hitting OpenAI rate limits. Pausing for 60 seconds...")
            time.sleep(60)

for product in products:
    handle = product["handle"]
    title = product["title"]
    
    main_filename = os.path.join(OUTPUT_DIR, f"{handle}_main.png")
    info_filename = os.path.join(OUTPUT_DIR, f"{handle}_info.png")
    
    main_prompt = f"Professional commercial product photography, close-up angled photograph of exactly 4 custom {title} resting scattered on a bright white background. Shot from a low diagonal 45-degree angle to emphasize thickness, depth and 3D feel. Very large and prominent in the frame. Highly detailed texture and crisp borders. Soft beautiful studio lighting with realistic soft shadows, clean and vibrant. Authentic catalog photography style, indistinguishable from a real macro DSLR photo."
    
    info_prompt = f"A commercial infographic layout featuring a single large custom {title} positioned on the right side over a light gray and white split background. On the left side, professional typography lists product features with pointer lines pointing to the patch. The patch shows hyper-realistic detailed texture. Authentic professional graphic design style, crisp typography, clean studio lighting on the patch."
    
    print(f"\nProcessing '{title}'...")
    
    # Check if files already exist so we don't regenerate the ones we just successfully made
    if not os.path.exists(main_filename):
        print(f"  Generating Main image...")
        generate_image(main_prompt, main_filename)
        time.sleep(2) # Give OpenAI's API a short breath between calls
    else:
        print(f"  ⏭️ Skipping Main image (already exists)")
        
    if not os.path.exists(info_filename):
        print(f"  Generating Info image...")
        generate_image(info_prompt, info_filename)
        time.sleep(2)
    else:
        print(f"  ⏭️ Skipping Info image (already exists)")

print("\n🎉 All product images generated successfully!")

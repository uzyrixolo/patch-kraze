class S3Uploader extends HTMLElement {
    constructor() {
        super();
        this.fileInput = this.querySelector('input[type="file"]');
        this.hiddenInput = this.querySelector('input[type="hidden"]');
        this.progressBar = this.querySelector('.upload-progress');
        this.statusText = this.querySelector('.upload-status');
        this.addToCartButton = this.closest('form')?.querySelector('[name="add"]');

        if (this.fileInput) {
            this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
    }

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Disable Add to Cart
        if (this.addToCartButton) {
            this.addToCartButton.disabled = true;
            this.addToCartButton.classList.add('loading');
        }

        this.showProgress(0);
        this.statusText.textContent = 'Preparing upload...';
        this.statusText.style.color = '#4b5563'; // Reset color

        try {
            // 2. Get Presigned URL
            // Updated to use the 'live' stage as per user configuration
            const API_ENDPOINT = 'https://aw0lo5u4ge.execute-api.us-east-1.amazonaws.com/live/GetPresignedURL';

            const presignRes = await fetch(`${API_ENDPOINT}?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`);

            if (!presignRes.ok) throw new Error(`API Error: ${presignRes.status}`);

            const { uploadUrl, publicUrl } = await presignRes.json();

            // 3. Upload to S3
            this.statusText.textContent = 'Uploading...';
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            if (uploadRes.ok) {
                this.completeUpload(publicUrl);
            } else {
                if (uploadRes.status === 403) {
                    throw new Error('S3 Forbidden (403). Check Bucket "Block Public Access" settings');
                }
                throw new Error(`S3 Upload failed (${uploadRes.status})`);
            }

        } catch (error) {
            console.error(error);
            this.statusText.textContent = 'Error: ' + error.message + '. Check AWS CORS setup.';
            this.statusText.style.color = '#ef4444'; // Red
            if (this.addToCartButton) {
                this.addToCartButton.disabled = false;
                this.addToCartButton.classList.remove('loading');
            }
        }
    }

    completeUpload(url) {
        console.log('Upload complete:', url);
        // 4. Set hidden input value
        if (this.hiddenInput) this.hiddenInput.value = url;

        // 5. Update UI
        this.statusText.textContent = '✅ Attached!';
        this.statusText.style.color = '#22c55e'; // Green
        this.showProgress(100);

        // 6. Enable Add to Cart
        if (this.addToCartButton) {
            this.addToCartButton.disabled = false;
            this.addToCartButton.classList.remove('loading');

            // Optional: Auto submit or focus? No, let user click Add to Cart.
        }
    }

    showProgress(percent) {
        if (this.progressBar) {
            this.progressBar.style.width = `${percent}%`;
        }
    }
}

customElements.define('s3-uploader', S3Uploader);

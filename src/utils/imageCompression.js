/**
 * Compress image to reduce file size
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Maximum width (default: 1200)
 * @param {number} maxHeight - Maximum height (default: 1200)
 * @param {number} quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<string>} - Compressed image as data URL
 */
export const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Use better image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        // Use JPEG for better compression (except for PNG with transparency)
        const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(outputFormat, quality);
        
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Get file size in MB
 * @param {File|string} fileOrDataUrl - File object or data URL string
 * @returns {number} - Size in MB
 */
export const getFileSizeMB = (fileOrDataUrl) => {
  if (fileOrDataUrl instanceof File) {
    return fileOrDataUrl.size / (1024 * 1024);
  }
  // For data URLs, estimate size (base64 is ~33% larger than binary)
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    const base64 = fileOrDataUrl.split(',')[1];
    return (base64.length * 3) / 4 / (1024 * 1024);
  }
  return 0;
};

/**
 * Format file size for display
 * @param {number} sizeMB - Size in MB
 * @returns {string} - Formatted size string
 */
export const formatFileSize = (sizeMB) => {
  if (sizeMB < 1) {
    return `${(sizeMB * 1024).toFixed(0)} KB`;
  }
  return `${sizeMB.toFixed(2)} MB`;
};





/**
 * Crops an image to a circular shape and exports as PNG
 * @param imageSrc - Source image URL (data URL or file URL)
 * @param pixelCrop - Crop area from react-easy-crop (in pixels relative to displayed image)
 * @param mediaSize - Size of the displayed media in the cropper
 * @param outputSize - Output size (default: 200x200)
 * @returns Promise<Blob> - Cropped circular image as PNG blob
 */
export async function cropImageToCircle(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  mediaSize: { width: number; height: number },
  outputSize: number = 200
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      console.log('Image loaded for cropping:', {
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        mediaSize,
        pixelCrop
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas size to output size
      canvas.width = outputSize;
      canvas.height = outputSize;

      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();

      // Calculate scale factor between displayed image (mediaSize) and natural image
      // react-easy-crop's pixelCrop is in pixels of the displayed image (mediaSize)
      // We need to convert to natural image coordinates
      const scaleX = image.naturalWidth / mediaSize.width;
      const scaleY = image.naturalHeight / mediaSize.height;

      // Convert pixelCrop coordinates from displayed image to natural image
      const sourceX = pixelCrop.x * scaleX;
      const sourceY = pixelCrop.y * scaleY;
      const sourceWidth = pixelCrop.width * scaleX;
      const sourceHeight = pixelCrop.height * scaleY;

      // Ensure coordinates are within image bounds
      const clampedX = Math.max(0, Math.min(sourceX, image.naturalWidth - 1));
      const clampedY = Math.max(0, Math.min(sourceY, image.naturalHeight - 1));
      const clampedWidth = Math.min(sourceWidth, image.naturalWidth - clampedX);
      const clampedHeight = Math.min(sourceHeight, image.naturalHeight - clampedY);

      console.log('Cropping with coordinates:', {
        scaleX,
        scaleY,
        pixelCrop,
        sourceX: clampedX,
        sourceY: clampedY,
        sourceWidth: clampedWidth,
        sourceHeight: clampedHeight,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      });

      // Draw the cropped portion of the image to fill the circle
      ctx.drawImage(
        image,
        clampedX,
        clampedY,
        clampedWidth,
        clampedHeight,
        0,
        0,
        outputSize,
        outputSize
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Cropped blob created, size:', blob.size);
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        0.95 // Quality (0-1)
      );
    };

    image.onerror = (error) => {
      console.error('Image load error:', error);
      reject(new Error('Failed to load image'));
    };

    // imageSrc should be a data URL string
    image.src = imageSrc;
  });
}


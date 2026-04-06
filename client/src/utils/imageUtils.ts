/**
 * Compress an image file using a canvas element.
 * Resizes to fit within maxDimension×maxDimension and encodes as JPEG at the given quality.
 *
 * @param file        The image File to compress
 * @param maxDimension Max width or height in pixels (default 1024)
 * @param quality     JPEG quality 0–1 (default 0.8)
 * @returns           A Base64 data URI of the compressed image (image/jpeg)
 */
export function compressImageFile(
  file: File,
  maxDimension = 1024,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`));

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Maintain aspect ratio within maxDimension
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context unavailable"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress a raw Base64 data URI string using a canvas element.
 * Useful when you already have a data URI (e.g. from camera capture).
 *
 * @param dataUri     A Base64 data URI (e.g. "data:image/jpeg;base64,...")
 * @param maxDimension Max width or height in pixels (default 1024)
 * @param quality     JPEG quality 0–1 (default 0.8)
 * @returns           A compressed Base64 data URI (image/jpeg)
 */
export function compressImageDataUri(
  dataUri: string,
  maxDimension = 1024,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = () => reject(new Error("Failed to decode image data URI"));

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.src = dataUri;
  });
}


/**
 * Universal File and Image Upload Helper
 * Sends file to /api/upload and returns the permanent accessible URL (/uploads/...).
 * Includes image compression, safe fallbacks, and progress reporting.
 */

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function isAllowedDocument(fileName: string): boolean {
  if (!fileName) return false;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const allowed = [
    'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 
    'txt', 'rtf', 'odt', 'ods', 'odp', 'csv', 
    'zip', 'rar', '7z', 'tar', 'gz',
    'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'
  ];
  return allowed.includes(ext);
}

export function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const safeName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
              resolve(new File([blob], safeName, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Uploads a file or image to the server via /api/upload.
 * If server fails and file is an image, falls back to compressed Base64 data URL.
 */
export async function uploadFileToServer(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> {
  if (onProgress) onProgress(10);

  // Compress if image
  const processedFile = file.type.startsWith('image/') 
    ? await compressImage(file) 
    : file;

  if (onProgress) onProgress(30);

  const base64 = await fileToBase64(processedFile);

  if (onProgress) onProgress(60);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: processedFile.type || file.type || 'application/octet-stream',
        base64: base64
      })
    });

    if (onProgress) onProgress(90);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server xatosi: ${response.status}`);
    }

    const data = await response.json();
    if (onProgress) onProgress(100);

    if (data.url) {
      return data.url;
    }
    throw new Error("Serverdan URL olinmadi");
  } catch (error: any) {
    console.warn("Upload via /api/upload failed:", error);

    // If it is an image, we can safely fallback to data URL
    if (file.type.startsWith('image/')) {
      if (onProgress) onProgress(100);
      return base64;
    }

    throw new Error(error.message || "Faylni yuklashda xatolik yuz berdi");
  }
}

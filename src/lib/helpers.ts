export function makeDirectImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?id=${match[1]}`;
    }
  } else if (url.includes('drive.google.com/open?id=')) {
    const match = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?id=${match[1]}`;
    }
  }
  return url;
}

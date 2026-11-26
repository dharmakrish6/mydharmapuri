import { auth } from './firebase';

const MAX_SIDE = 1600;

/** Shrinks a photo to at most 1600px on its longest side and re-encodes it (WebP, or JPEG where WebP isn't supported). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
  const webp = await encode('image/webp');
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await encode('image/jpeg');
  if (!jpeg) throw new Error('Could not read this image.');
  return jpeg;
}

/** Uploads an image to mydharmapuri.com/media (admins only) and returns its public URL. */
export async function uploadImage(file: File, placeName: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG, PNG or WebP).');
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in again.');
  const blob = await shrink(file);
  const form = new FormData();
  form.append('token', await user.getIdToken());
  form.append('name', placeName);
  form.append('file', blob, blob.type === 'image/webp' ? 'image.webp' : 'image.jpg');
  // The upload script runs on Hostinger, so it only exists on admin.mydharmapuri.com (not the local dev server).
  const res = await fetch('/upload.php', { method: 'POST', body: form });
  const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !json?.url) {
    throw new Error(json?.error ?? (json ? `Upload failed (${res.status}).` : 'Upload failed: uploads only work on admin.mydharmapuri.com.'));
  }
  return json.url;
}

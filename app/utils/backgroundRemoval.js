import * as FileSystem from 'expo-file-system';

// Get a free API key (50 images/month) at https://www.remove.bg/api
// Then paste it here and rebuild the app.
const REMOVE_BG_API_KEY = 'YsAUy96zWeErMRcpnc8CRkwU';

const CACHE_DIR = `${FileSystem.cacheDirectory}bg-removed/`;

const urlToKey = (url) => url.replace(/[^a-zA-Z0-9]/g, '_').slice(-160);

// Converts an ArrayBuffer to a base64 string in chunks to avoid call-stack limits
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  const parts = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
  }
  return btoa(parts.join(''));
};

export const removeBackground = async (imageUrl) => {
  if (!imageUrl || REMOVE_BG_API_KEY === 'YOUR_REMOVE_BG_API_KEY') return null;

  try {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});

    const cachePath = `${CACHE_DIR}${urlToKey(imageUrl)}.png`;
    const cached = await FileSystem.getInfoAsync(cachePath);
    if (cached.exists) return cachePath;

    // Step 1: download the product image as binary (handles private/signed URLs)
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`Image fetch failed: ${imgResp.status}`);
    const imgBuffer = await imgResp.arrayBuffer();
    const imgBase64 = bufferToBase64(imgBuffer);

    // Step 2: send to remove.bg as base64 (avoids URL-access issues)
    const formData = new FormData();
    formData.append('image_file_b64', imgBase64);
    formData.append('size', 'auto');

    const bgResp = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
      body: formData,
    });

    if (!bgResp.ok) {
      const errText = await bgResp.text().catch(() => bgResp.status);
      throw new Error(`remove.bg ${bgResp.status}: ${errText}`);
    }

    // Step 3: save the transparent PNG to cache
    const resultBuffer = await bgResp.arrayBuffer();
    const resultBase64 = bufferToBase64(resultBuffer);
    await FileSystem.writeAsStringAsync(cachePath, resultBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return cachePath;
  } catch (err) {
    console.warn('[removeBackground]', err.message);
    return null;
  }
};

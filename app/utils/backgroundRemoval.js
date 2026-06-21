import * as FileSystem from 'expo-file-system';

// Free tier: 50 images/month — get your key at https://www.remove.bg/api
const REMOVE_BG_API_KEY = 'YOUR_REMOVE_BG_API_KEY';

const CACHE_DIR = `${FileSystem.cacheDirectory}bg-removed/`;

const urlToKey = (url) => url.replace(/[^a-zA-Z0-9]/g, '_').slice(-160);

export const removeBackground = async (imageUrl) => {
  if (!imageUrl || REMOVE_BG_API_KEY === 'YOUR_REMOVE_BG_API_KEY') return null;

  try {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});

    const cachePath = `${CACHE_DIR}${urlToKey(imageUrl)}.png`;
    const info = await FileSystem.getInfoAsync(cachePath);
    if (info.exists) return cachePath;

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: imageUrl, size: 'auto' }),
    });

    if (!response.ok) {
      console.warn('[removeBackground] API error:', response.status);
      return null;
    }

    const blob = await response.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    await FileSystem.writeAsStringAsync(cachePath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return cachePath;
  } catch (err) {
    console.warn('[removeBackground]', err.message);
    return null;
  }
};

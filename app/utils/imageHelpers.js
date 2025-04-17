import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

// Constants for image optimization
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const COMPRESSION_QUALITY = 0.7;

export const compressImage = async (uri) => {
  try {
    // First get the image dimensions
    const { width, height } = await new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => {
        resolve({ width, height });
      }, reject);
    });

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;

    if (width > MAX_WIDTH) {
      newWidth = MAX_WIDTH;
      newHeight = (height * MAX_WIDTH) / width;
    }

    if (newHeight > MAX_HEIGHT) {
      newHeight = MAX_HEIGHT;
      newWidth = (width * MAX_HEIGHT) / height;
    }

    // Compress and resize the image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: newWidth,
            height: newHeight,
          },
        },
      ],
      {
        compress: COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

// Function to compress PDF files
export const compressPDF = async (uri) => {
  try {
    // For PDFs, we'll just return the original URI
    // as PDF compression is more complex and typically
    // requires server-side processing
    return uri;
  } catch (error) {
    console.error('Error handling PDF:', error);
    throw error;
  }
}; 
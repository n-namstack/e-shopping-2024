import axios from 'axios';
import { Platform } from 'react-native';

// Match API configuration
const ipAddress = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// If using a physical device, uncomment and use your computer's IP address
// const ipAddress = '192.168.1.X'; // Replace X with your actual IP
const port = '3000';

export const SERVER_URL = `http://${ipAddress}:${port}`;

/**
 * Check if the server is running and accessible
 * @returns {Promise<boolean>} True if server is accessible, false otherwise
 */
export const checkServerConnection = async () => {
  try {
    // Attempt to connect to server health check endpoint
    // If your server doesn't have a health check endpoint, try to use any lightweight endpoint
    const response = await axios.get(`${SERVER_URL}/api/health`, { 
      timeout: 5000 
    });
    
    return response.status === 200;
  } catch (error) {
    console.log('Server connection check failed:', error.message);
    
    // For debugging purposes, try to identify the specific error
    if (error.code === 'ECONNABORTED') {
      console.log('Connection timed out - server might be down or unreachable');
    } else if (error.code === 'ENOTFOUND') {
      console.log('Network error - DNS lookup failed');
    } else if (error.response) {
      console.log(`Server responded with status ${error.response.status}`);
    } else if (error.request) {
      console.log('No response received from server - check server is running');
    }
    
    return false;
  }
};

/**
 * Check if device has internet connection
 * @returns {Promise<boolean>} True if internet is available, false otherwise
 */
export const checkInternetConnection = async () => {
  try {
    // Try to reach a reliable external service
    await axios.get('https://www.google.com', { timeout: 5000 });
    return true;
  } catch (error) {
    console.log('Internet connection check failed:', error.message);
    return false;
  }
};

/**
 * Determines if connection error is due to server or internet issues
 * @returns {Promise<string>} 'server', 'internet', or 'unknown'
 */
export const diagnoseConnectionIssue = async () => {
  const hasInternet = await checkInternetConnection();
  
  if (!hasInternet) {
    return 'internet';
  }
  
  const serverReachable = await checkServerConnection();
  
  if (!serverReachable) {
    return 'server';
  }
  
  return 'unknown';
};

export default {
  checkServerConnection,
  checkInternetConnection,
  diagnoseConnectionIssue,
  SERVER_URL
}; 
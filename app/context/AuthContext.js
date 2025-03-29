import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

// Replace with your actual server IP or use the Expo development server URL
// For Android emulator, use 10.0.2.2 to access your computer's localhost
axios.defaults.baseURL = 'http://10.0.2.2:3000/api';
// Add common headers
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

// Disable mock mode
const USE_MOCK_API = false;

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set token for authenticated requests
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Helper function to normalize user data from server
  const normalizeUserData = (userData) => {
    console.log('Raw user data from server:', userData);
    
    // For debugging: Log all keys from server response
    const keys = Object.keys(userData);
    console.log('Available keys in user data:', keys);
    
    // Extract user info from any nested objects
    let extractedData = { ...userData };
    
    // Check if user data is nested inside a 'user' field
    if (userData.user && typeof userData.user === 'object') {
      console.log('Found nested user object:', userData.user);
      extractedData = { ...extractedData, ...userData.user };
    }
    
    // Check if data is nested inside a 'data' field
    if (userData.data && typeof userData.data === 'object') {
      console.log('Found nested data object:', userData.data);
      extractedData = { ...extractedData, ...userData.data };
    }
    
    // Check if user info is in some deeply nested structure
    if (userData.data && userData.data.user && typeof userData.data.user === 'object') {
      console.log('Found deeply nested user object:', userData.data.user);
      extractedData = { ...extractedData, ...userData.data.user };
    }
    
    // Map server fields to the expected fields in our app
    const normalizedData = {
      ...extractedData,
      // Preserve the token
      token: userData.token || extractedData.token,
      // Make sure these fields exist even if the server doesn't provide them
      id: extractedData.id || extractedData._id || extractedData.userId || extractedData.user_id || '',
      name: extractedData.name || extractedData.fullName || extractedData.username || extractedData.full_name || extractedData.userName || 'User',
      email: extractedData.email || extractedData.userEmail || extractedData.user_email || '',
      role: extractedData.role || extractedData.userRole || extractedData.user_role || 'buyer',
      approved: extractedData.approved !== undefined ? extractedData.approved : true,
      phone: extractedData.phone || extractedData.phoneNumber || extractedData.phone_number || '',
    };
    
    console.log('Normalized user data:', normalizedData);
    return normalizedData;
  };

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('user');
      console.log('Retrieved user data from storage:', jsonValue);
      
      if (jsonValue != null) {
        const userData = JSON.parse(jsonValue);
        console.log('Parsed user data from storage:', userData);
        
        const normalizedUser = normalizeUserData(userData);
        console.log('Setting normalized user in state:', normalizedUser);
        
        setUser(normalizedUser);
        
        if (normalizedUser.token) {
          console.log('Setting auth token from storage');
          setAuthToken(normalizedUser.token);
        } else {
          console.warn('No token found in stored user data');
        }
      } else {
        console.log('No user data found in storage');
      }
    } catch (e) {
      console.error('Error reading user data from storage:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      if (USE_MOCK_API) {
        // Mock code remains the same but won't be used
      } else {
        // Real API call
        console.log('Attempting login with:', { email });
        const response = await axios.post('/auth/login', {
          email,
          password,
        });

        console.log('Login response status:', response.status);
        console.log('Login response data:', response.data);
        
        // Attempt to extract user data and token from various response formats
        let userData = response.data;
        let token = null;
        
        // Try to find token in response
        if (response.data.token) {
          token = response.data.token;
        } else if (response.data.accessToken) {
          token = response.data.accessToken;
        } else if (response.data.access_token) {
          token = response.data.access_token;
        } else if (response.data.data && response.data.data.token) {
          token = response.data.data.token;
        } else if (response.data.user && response.data.user.token) {
          token = response.data.user.token;
        }
        
        // If we found a token but it's not in userData, add it
        if (token && !userData.token) {
          userData.token = token;
        }
        
        if (userData) {
          // Normalize user data to ensure it has expected fields
          const normalizedUser = normalizeUserData(userData);
          
          if (normalizedUser.token) {
            setAuthToken(normalizedUser.token);
            setUser(normalizedUser);
            await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
            return normalizedUser;
          } else {
            console.error('No token found in response');
            throw new Error('Authentication token not found in response');
          }
        } else {
          throw new Error('Invalid response from server');
        }
      }
    } catch (e) {
      console.error('Login error:', e);
      let errorMsg = 'An error occurred during login';
      
      if (e.response) {
        console.log('Error response status:', e.response.status);
        console.log('Error response data:', e.response.data);
        errorMsg = e.response.data.message || e.response.data.error || errorMsg;
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      setError(errorMsg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (USE_MOCK_API) {
        // Mock code remains the same but won't be used
      } else {
        // Real API call
        console.log('Registering with data:', userData);
        
        // Use the same endpoint for all registrations
        const endpoint = '/auth/register';
        
        const response = await axios.post(endpoint, userData);
        console.log('Registration response status:', response.status);
        console.log('Registration response data:', response.data);
        
        // Attempt to extract user data and token from various response formats
        let newUser = response.data;
        let token = null;
        
        // Try to find token in response
        if (response.data.token) {
          token = response.data.token;
        } else if (response.data.accessToken) {
          token = response.data.accessToken;
        } else if (response.data.access_token) {
          token = response.data.access_token;
        } else if (response.data.data && response.data.data.token) {
          token = response.data.data.token;
        } else if (response.data.user && response.data.user.token) {
          token = response.data.user.token;
        }
        
        // If we found a token but it's not in newUser, add it
        if (token && !newUser.token) {
          newUser.token = token;
        }
        
        if (newUser) {
          // Add user inputs to ensure we have the basic data
          newUser = {
            ...newUser,
            fullName: userData.fullName,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
          };
          
          // Add seller-specific data if applicable
          if (userData.role === 'seller') {
            newUser.shopName = userData.shopName;
            newUser.shopAddress = userData.shopAddress;
          }
          
          // Normalize user data to ensure it has expected fields
          const normalizedUser = normalizeUserData(newUser);
          
          if (normalizedUser.token) {
            setAuthToken(normalizedUser.token);
            setUser(normalizedUser);
            await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
            return normalizedUser;
          } else {
            console.error('No token found in response');
            throw new Error('Authentication token not found in response');
          }
        } else {
          throw new Error('Invalid response from server');
        }
      }
    } catch (e) {
      console.error('Registration error:', e);
      let errorMsg = 'An error occurred during registration';
      
      if (e.response) {
        console.log('Error response status:', e.response.status);
        console.log('Error response data:', e.response.data);
        errorMsg = e.response.data.message || e.response.data.error || errorMsg;
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      setError(errorMsg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      if (!USE_MOCK_API) {
        // Call logout endpoint if needed
        try {
          await axios.post('/auth/logout');
        } catch (e) {
          console.log('Logout API error (non-critical):', e);
        }
      }
      
      // Clean up local storage and state regardless of API result
      await AsyncStorage.removeItem('user');
      setUser(null);
      setAuthToken(null);
    } catch (e) {
      console.log('Error during logout:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkApprovalStatus = async () => {
    if (!user || !user.id) return null;
    
    try {
      if (USE_MOCK_API) {
        // Mock code remains the same but won't be used
      } else {
        // Real API call
        const response = await axios.get(`/users/${user.id}/approval-status`);
        const { approved } = response.data;
        
        // Update user state with new approval status
        const updatedUser = { ...user, approved };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        return approved;
      }
    } catch (e) {
      console.error('Error checking approval status:', e);
      return null;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    checkApprovalStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 
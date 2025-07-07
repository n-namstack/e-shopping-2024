import React, { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';
import useAuthStore from '../store/authStore';

const TrackingPermissionManager = ({ children }) => {
  const { requestTrackingPermission } = useAuthStore();

  useEffect(() => {
    const initializeTracking = async () => {
      // Only request on iOS since Android doesn't require ATT
      if (Platform.OS === 'ios') {
        try {
          // Wait a moment after app launch for better UX
          setTimeout(async () => {
            const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
            
            // Only request if permission hasn't been determined yet
            if (status === TrackingTransparency.PermissionStatus.UNDETERMINED) {
              const granted = await requestTrackingPermission();
              
              if (!granted) {
                // User denied tracking - you can show a message explaining the benefits
                console.log('User denied tracking permission');
                // Optionally show an alert explaining what this means
                Alert.alert(
                  "Privacy Notice",
                  "You've chosen to limit tracking. You'll still get a great shopping experience, but recommendations may be less personalized.",
                  [{ text: "OK" }],
                  { cancelable: true }
                );
              }
            }
          }, 1000); // Wait 1 second after app launch
        } catch (error) {
          console.error('Error initializing tracking permissions:', error);
        }
      }
    };

    initializeTracking();
  }, [requestTrackingPermission]);

  // This component doesn't render anything, it just manages permissions
  return children;
};

export default TrackingPermissionManager; 
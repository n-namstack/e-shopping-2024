import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { verifyDPOPayment, DPO_REDIRECT_URL, DPO_BACK_URL } from '../../services/DPOService';

const DPOWebView = ({ navigation, route }) => {
  const { paymentUrl, transToken, orderId, totalAmount, isDeposit } = route.params || {};
  const { colors } = useTheme();
  const webViewRef = useRef(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const handledRef = useRef(false);

  const handleResult = async (url) => {
    if (handledRef.current) return;
    handledRef.current = true;
    webViewRef.current?.stopLoading();

    // User tapped "Back" / cancelled
    if (url.startsWith(DPO_BACK_URL)) {
      navigation.goBack();
      return;
    }

    // Successful redirect — verify with DPO API
    setVerifying(true);
    try {
      const result = await verifyDPOPayment(transToken);

      if (result.status === 'success') {
        navigation.replace('PaymentProcessing', {
          orderId,
          totalAmount,
          isDeposit,
          paymentStatus: 'success',
          transactionId: result.transRef,
        });
      } else if (result.status === 'pending') {
        navigation.replace('PaymentProcessing', {
          orderId,
          totalAmount,
          isDeposit,
          paymentStatus: 'pending',
          transactionId: result.transRef,
        });
      } else {
        Alert.alert(
          'Payment Declined',
          result.description || 'Your payment was not successful. Please try a different card.',
          [
            { text: 'Try Again', onPress: () => { handledRef.current = false; navigation.goBack(); } },
          ]
        );
      }
    } catch (error) {
      console.error('DPO verification error:', error);
      Alert.alert(
        'Verification Error',
        'We could not confirm your payment. If your card was charged, contact support with reference: ' + transToken,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    if (!url) return;
    if (url.startsWith(DPO_REDIRECT_URL) || url.startsWith(DPO_BACK_URL)) {
      handleResult(url);
    }
  };

  const confirmCancel = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.closeButton} onPress={confirmCancel}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="lock-closed" size={13} color="#4CAF50" />
          <Text style={[styles.headerTitle, { color: colors.text }]}> Secure Payment</Text>
        </View>
        <Text style={[styles.amountBadge, { color: colors.text }]}>N${Number(totalAmount).toFixed(2)}</Text>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: paymentUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onError={() =>
          Alert.alert('Connection Error', 'Failed to load the payment page. Please try again.', [
            { text: 'Go Back', onPress: () => navigation.goBack() },
          ])
        }
        onLoadStart={() => setPageLoading(true)}
        onLoadEnd={() => setPageLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading payment page...</Text>
          </View>
        )}
      />

      {verifying && (
        <View style={styles.verifyOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.verifyText}>Confirming your payment...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: { padding: 5, width: 36 },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '600' },
  amountBadge: { fontSize: 14, fontWeight: '600', minWidth: 70, textAlign: 'right' },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  loadingText: { fontSize: 14, marginTop: 8 },
  verifyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  verifyText: { fontSize: 16, fontWeight: '500', color: '#333', marginTop: 8 },
});

export default DPOWebView;

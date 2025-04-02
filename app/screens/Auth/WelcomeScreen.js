import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/ui/Button';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Image 
          source={require('../../../assets/logo-placeholder.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>E-Shopping Namibia</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to E-Shopping!</Text>
        <Text style={styles.subtitle}>
          Your one-stop destination for online shopping in Namibia
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Login" 
          variant="primary"
          size="lg"
          isFullWidth
          onPress={() => navigation.navigate('Login')}
          style={styles.loginButton}
        />
        
        <Button 
          title="Register" 
          variant="outline"
          size="lg"
          isFullWidth
          onPress={() => navigation.navigate('Register')}
          style={styles.registerButton}
        />
        
        <Button 
          title="Browse Products" 
          variant="link"
          onPress={() => navigation.navigate('BrowseProducts')}
          style={styles.browseButton}
          textStyle={styles.browseText}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  loginButton: {
    marginBottom: 12,
  },
  registerButton: {
    marginBottom: 20,
  },
  browseButton: {
    marginTop: 10,
  },
  browseText: {
    fontSize: 16,
  },
});

export default WelcomeScreen; 
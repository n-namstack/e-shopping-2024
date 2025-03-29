import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const FAQs = [
  {
    question: 'How do I create a shop?',
    answer: 'To create a shop, go to your profile and tap on "Create Shop". Fill in the required information about your shop, including name, description, and contact details. Your shop will be reviewed and verified before you can start selling.',
  },
  {
    question: 'How do I track my order?',
    answer: 'You can track your order by going to "My Orders" in your profile. Select the order you want to track, and you\'ll see its current status and location. You\'ll also receive notifications when your order status changes.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept various payment methods including credit/debit cards, bank transfers, and digital wallets. You can manage your payment methods in the "Payment Methods" section of your profile.',
  },
  {
    question: 'How do I return an item?',
    answer: 'To return an item, go to "My Orders", select the order containing the item, and tap "Return Item". Follow the instructions to print the return label and ship the item back. Refunds are processed within 5-7 business days after we receive the item.',
  },
  {
    question: 'How do I become a seller?',
    answer: 'To become a seller, you need to verify your account and create a shop. Go to your profile, tap "Create Shop", and follow the verification process. You\'ll need to provide valid identification and business documents.',
  },
];

const ContactMethods = [
  {
    icon: 'mail',
    title: 'Email Support',
    description: 'Get help via email',
    action: 'support@eshop.com',
    type: 'email',
  },
  {
    icon: 'call',
    title: 'Phone Support',
    description: 'Talk to our support team',
    action: '+1-800-123-4567',
    type: 'phone',
  },
  {
    icon: 'chatbubbles',
    title: 'Live Chat',
    description: 'Chat with us instantly',
    action: 'Start Chat',
    type: 'chat',
  },
];

const HelpCenterScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const handleContact = (method) => {
    switch (method.type) {
      case 'email':
        Linking.openURL(`mailto:${method.action}`);
        break;
      case 'phone':
        Linking.openURL(`tel:${method.action}`);
        break;
      case 'chat':
        // Implement chat functionality
        console.log('Open chat');
        break;
    }
  };

  const filteredFAQs = searchQuery
    ? FAQs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQs;

  const renderFAQItem = (faq, index) => {
    const isExpanded = expandedFAQ === index;

    return (
      <TouchableOpacity
        key={index}
        style={styles.faqItem}
        onPress={() => setExpandedFAQ(isExpanded ? null : index)}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{faq.question}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#64748b"
          />
        </View>
        {isExpanded && (
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <View style={styles.contactMethods}>
            {ContactMethods.map((method, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactMethod}
                onPress={() => handleContact(method)}
              >
                <View style={styles.contactIcon}>
                  <Ionicons name={method.icon} size={24} color="#0f172a" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>{method.title}</Text>
                  <Text style={styles.contactDescription}>
                    {method.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqList}>
            {filteredFAQs.map((faq, index) => renderFAQItem(faq, index))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>
          <TouchableOpacity
            style={styles.resourceButton}
            onPress={() => navigation.navigate('TermsPrivacy')}
          >
            <Ionicons name="document-text" size={20} color="#0f172a" />
            <Text style={styles.resourceButtonText}>
              Terms & Privacy Policy
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.resourceButton}
            onPress={() => Linking.openURL('https://eshop.com/shipping-policy')}
          >
            <Ionicons name="car" size={20} color="#0f172a" />
            <Text style={styles.resourceButtonText}>
              Shipping Policy
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceButton}
            onPress={() => Linking.openURL('https://eshop.com/return-policy')}
          >
            <Ionicons name="return-down-back" size={20} color="#0f172a" />
            <Text style={styles.resourceButtonText}>
              Return Policy
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#0f172a',
  },
  clearButton: {
    padding: 4,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  contactMethods: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  contactDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  faqList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  faqItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 20,
  },
  resourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  resourceButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
    marginLeft: 12,
  },
});

export default HelpCenterScreen; 
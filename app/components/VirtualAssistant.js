import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Animated,
  Keyboard,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import supabase from '../lib/supabase';
import useAuthStore from '../store/authStore';
import useOrderStore from '../store/orderStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Predefined responses for common questions
const PREDEFINED_RESPONSES = {
  greeting: [
    "👋 Hello! I'm your AI shopping assistant. How can I help you today?",
    "🛍️ Welcome! I can help with products, orders, shops and more. What would you like to know?",
    "✨ Hi there! Ready to enhance your shopping experience. How may I assist you?"
  ],
  size_guide: [
    "Our size guide can help you find the perfect fit. What type of clothing are you interested in?",
    "For accurate sizing, please measure yourself and refer to our size chart. Would you like me to show you how to take measurements?",
    "Different brands may have slightly different sizing. Would you like me to explain how to choose the right size for specific products?"
  ],
  product_recommendation: [
    "I'd be happy to recommend products tailored to your preferences. What are you looking for?",
    "Let me find some items you might love. Could you tell me more about what you're interested in?",
    "I can suggest products based on your style, budget, or occasion. What matters most to you?"
  ],
  product_info: [
    "I can provide detailed information about any product in our catalog. What would you like to know?",
    "I know everything about our products - from materials and dimensions to compatibility and features. Just ask!",
    "Need specific product details? I can tell you about pricing, availability, specifications, and more."
  ],
  order_info: [
    "I can help you track your order, check its status, or answer any order-related questions.",
    "Need information about your order? I can help with tracking, returns, or any concerns you might have."
  ],
  shop_info: [
    "I can tell you about our sellers, their ratings, products, and specialties. Which shop are you interested in?",
    "Our marketplace hosts various sellers with unique offerings. What would you like to know about a specific shop?"
  ],
  app_help: [
    "I can guide you through any feature of our app. What would you like help with?",
    "Having trouble with something in the app? I'm here to help you navigate and use all our features."
  ],
  not_understood: [
    "I'm sorry, I didn't quite understand that. Could you rephrase your question?",
    "I'm still learning. Could you try asking in a different way?",
    "I want to help, but I'm not sure what you're asking. Could you provide more details?"
  ]
};

// Product categories for recommendations
const PRODUCT_CATEGORIES = [
  "Electronics", "Clothing", "Home & Kitchen", "Beauty", "Sports", "Toys", "Jewelry", 
  "Books", "Automotive", "Garden", "Health", "Baby", "Pets", "Office", "Art", "Food"
];

// Product knowledge base for detailed product questions
const PRODUCT_KNOWLEDGE = {
  electronics: {
    warranty: "Most electronics come with a standard 1-year manufacturer warranty. Extended warranties are available at checkout.",
    compatibility: "Product compatibility information is listed in the specifications section of each product page.",
    returns: "Electronics can be returned within 30 days if unopened, 15 days if opened but in original packaging.",
    care: "Keep electronics away from water and extreme temperatures. Clean screens with microfiber cloths only.",
    troubleshooting: "Many common issues can be resolved by restarting the device or checking for software updates."
  },
  clothing: {
    materials: "We provide detailed material information for all clothing items on their respective product pages.",
    care: "Care instructions are included on product tags and listed in the product details.",
    sizing: "Our clothing typically follows standard sizing. Please refer to the size chart on each product page for exact measurements.",
    returns: "Clothing items can be returned within 30 days if unworn and with original tags attached.",
    fit: "We offer regular, slim, and relaxed fits in most clothing categories. See product descriptions for specific fit details."
  },
  beauty: {
    ingredients: "Full ingredient lists are provided for all beauty products. All products are cruelty-free.",
    allergies: "If you have known allergies, please review the ingredients list carefully before purchasing.",
    shelf_life: "Product shelf life is indicated on the packaging. Most products remain effective for 6-12 months after opening.",
    returns: "Beauty products can only be returned if unopened and in original packaging."
  },
  home: {
    dimensions: "Product dimensions are listed in the specifications section. Please measure your space before ordering large items.",
    materials: "Material information is provided for all home goods to help you match your existing decor.",
    care: "Care and cleaning instructions are included with each product and in the product details online.",
    assembly: "Assembly requirements and estimated assembly time are noted in product descriptions where applicable."
  },
  shipping: {
    domestic: "Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available for an additional fee.",
    international: "International shipping takes 7-14 business days depending on the destination country.",
    tracking: "Tracking information is provided via email once your order ships.",
    fees: "Free shipping is available for orders over $50. Additional fees may apply for oversized items or remote locations.",
    delivery: "You can schedule delivery for a specific date for most large items. We'll contact you to confirm the delivery window."
  },
  returns: {
    policy: "Most items can be returned within 30 days of delivery for a full refund.",
    process: "To return an item, go to your order history, select the item, and follow the return instructions.",
    exceptions: "Some items like personalized goods and certain intimate products cannot be returned for hygiene reasons.",
    refunds: "Refunds are processed within 5-7 business days after we receive your return.",
    exchanges: "You can request an exchange instead of a refund for items that don't fit or aren't what you expected."
  },
  orders: {
    tracking: "You can track your order status in real-time through your account dashboard.",
    history: "Your complete order history is available in your account, including past purchases and recurring orders.",
    cancellation: "Orders can be cancelled within 1 hour of placement. After that, contact customer service for assistance.",
    modification: "You can modify your order details before it ships by contacting customer service."
  },
  account: {
    profile: "Update your profile information anytime through the account settings page.",
    payment: "We securely store your payment methods for faster checkout. You can add or remove methods anytime.",
    addresses: "Save multiple shipping addresses to quickly select during checkout.",
    preferences: "Set your communication preferences to receive personalized recommendations and offers."
  },
  shops: {
    ratings: "All shops have customer ratings and reviews to help you choose reliable sellers.",
    policies: "Each shop may have specific policies regarding shipping, returns, and customer service.",
    communication: "You can message shop owners directly with questions about their products.",
    verification: "Verified shops have undergone additional verification steps to confirm their identity and reliability."
  }
};

const VirtualAssistant = ({ isVisible, onClose, navigation }) => {
  const { user } = useAuthStore();
  const { fetchMyOrders } = useOrderStore();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "📦 Track my orders",
    "💳 View my account",
    "🏪 Find shops nearby",
    "📱 App help"
  ]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [orderResults, setOrderResults] = useState([]);
  const [showOrderResults, setShowOrderResults] = useState(false);
  const [shopResults, setShopResults] = useState([]);
  const [showShopResults, setShowShopResults] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const messageScaleAnim = useRef(new Animated.Value(0)).current;
  
  // Initialize with a greeting message
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      const randomGreeting = PREDEFINED_RESPONSES.greeting[
        Math.floor(Math.random() * PREDEFINED_RESPONSES.greeting.length)
      ];
      
      setMessages([
        {
          id: Date.now().toString(),
          text: randomGreeting,
          sender: 'assistant',
          timestamp: new Date()
        }
      ]);
    }
  }, [isVisible]);
  
  // Animation for modal
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 120,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.spring(headerAnimation, {
          toValue: 1,
          delay: 200,
          damping: 20,
          stiffness: 90,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(headerAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [isVisible]);

  // Typing animation with more natural movement
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnimation.setValue(0);
    }
  }, [isTyping]);
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      // Animate new message appearance
      messageScaleAnim.setValue(0);
      Animated.spring(messageScaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);
  
  // Handle send message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    Keyboard.dismiss();
    
    // Process the message
    await processUserMessage(userMessage.text);
  };
  
  // Process user message with enhanced AI
  const processUserMessage = async (text) => {
    // Simulate typing delay for more natural interaction
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowercaseText = text.toLowerCase();
    
    // Check for order-related queries
    if (
      lowercaseText.includes('order') ||
      lowercaseText.includes('delivery') ||
      lowercaseText.includes('track') ||
      lowercaseText.includes('purchase') ||
      lowercaseText.includes('bought')
    ) {
      await handleOrderQuery(text);
      return;
    }
    
    // Check for shop-related queries
    if (
      lowercaseText.includes('shop') ||
      lowercaseText.includes('store') ||
      lowercaseText.includes('seller') ||
      lowercaseText.includes('vendor')
    ) {
      await handleShopQuery(text);
      return;
    }
    
    // Check for account-related queries
    if (
      lowercaseText.includes('account') ||
      lowercaseText.includes('profile') ||
      lowercaseText.includes('settings') ||
      lowercaseText.includes('my info') ||
      lowercaseText.includes('personal')
    ) {
      await handleAccountQuery(text);
      return;
    }

    // Check for app help queries
    if (
      lowercaseText.includes('how to') ||
      lowercaseText.includes('help') ||
      lowercaseText.includes('guide') ||
      lowercaseText.includes('tutorial') ||
      lowercaseText.includes('use the app')
    ) {
      await handleAppHelpQuery(text);
      return;
    }
    
    // Check if it's a product search query
    if (
      lowercaseText.includes('find') || 
      lowercaseText.includes('search') || 
      lowercaseText.includes('looking for') ||
      lowercaseText.includes('show me')
    ) {
      await handleProductSearch(text);
      return;
    }
    
    // Check if it's a detailed product information query
    if (
      lowercaseText.includes('how does') ||
      lowercaseText.includes('what is') ||
      lowercaseText.includes('explain') ||
      lowercaseText.includes('tell me about') ||
      lowercaseText.includes('features') ||
      lowercaseText.includes('specifications') ||
      lowercaseText.includes('specs')
    ) {
      await handleProductInfoQuery(text);
      return;
    }
    
    // Check if it's a product comparison query
    if (
      lowercaseText.includes('compare') ||
      lowercaseText.includes('difference between') ||
      lowercaseText.includes('versus') ||
      lowercaseText.includes('vs') ||
      lowercaseText.includes('better than')
    ) {
      await handleProductComparisonQuery(text);
      return;
    }
    
    // Check if it's a size guide question
    if (
      lowercaseText.includes('size') || 
      lowercaseText.includes('fit') || 
      lowercaseText.includes('measurement')
    ) {
      const response = PREDEFINED_RESPONSES.size_guide[
        Math.floor(Math.random() * PREDEFINED_RESPONSES.size_guide.length)
      ];
      
      addAssistantMessage(response);
      setSuggestedQuestions([
        "How do I measure myself?",
        "Size chart for shirts",
        "Do your products run small or large?",
        "What's my shoe size in EU/US/UK?"
      ]);
      return;
    }
    
    // Check for shipping/delivery questions
    if (
      lowercaseText.includes('shipping') ||
      lowercaseText.includes('delivery') ||
      lowercaseText.includes('when will') ||
      lowercaseText.includes('how long') ||
      lowercaseText.includes('track')
    ) {
      if (lowercaseText.includes('international') || lowercaseText.includes('overseas')) {
        addAssistantMessage(PRODUCT_KNOWLEDGE.shipping.international);
      } else if (lowercaseText.includes('track')) {
        addAssistantMessage(PRODUCT_KNOWLEDGE.shipping.tracking);
      } else {
        addAssistantMessage(PRODUCT_KNOWLEDGE.shipping.domestic);
      }
      setSuggestedQuestions([
        "How to track my order?",
        "International shipping options",
        "Express delivery available?"
      ]);
      return;
    }
    
    // Check for return policy questions
    if (
      lowercaseText.includes('return') ||
      lowercaseText.includes('refund') ||
      lowercaseText.includes('exchange') ||
      lowercaseText.includes('send back')
    ) {
      if (lowercaseText.includes('how') || lowercaseText.includes('process')) {
        addAssistantMessage(PRODUCT_KNOWLEDGE.returns.process);
      } else if (lowercaseText.includes('exception') || lowercaseText.includes('can') || lowercaseText.includes('cannot')) {
        addAssistantMessage(PRODUCT_KNOWLEDGE.returns.exceptions);
      } else {
        addAssistantMessage(PRODUCT_KNOWLEDGE.returns.policy);
      }
      setSuggestedQuestions([
        "How to return an item?",
        "Refund timeline",
        "Return policy exceptions"
      ]);
      return;
    }
    
    // Check if it's a recommendation request
    if (
      lowercaseText.includes('recommend') || 
      lowercaseText.includes('suggestion') || 
      lowercaseText.includes('what should i') ||
      lowercaseText.includes('best product')
    ) {
      await handleRecommendationRequest(text);
      return;
    }
    
    // Handle greetings
    if (
      lowercaseText.includes('hello') || 
      lowercaseText.includes('hi') || 
      lowercaseText.includes('hey') ||
      lowercaseText === 'help'
    ) {
      const response = PREDEFINED_RESPONSES.greeting[
        Math.floor(Math.random() * PREDEFINED_RESPONSES.greeting.length)
      ];
      
      addAssistantMessage(response);
      setSuggestedQuestions([
        "Tell me about bestsellers",
        "How do returns work?",
        "Compare similar products",
        "Shipping options"
      ]);
      return;
    }
    
    // Try to handle as general product query
    await handleGeneralProductQuery(text);
  };

  // Handle order-related queries
  const handleOrderQuery = async (text) => {
    try {
      const lowercaseText = text.toLowerCase();
      setIsTyping(true);
      
      if (!user) {
        addAssistantMessage("Please sign in to view your orders. Would you like me to guide you to the login page?");
        setSuggestedQuestions([
          "Take me to login",
          "How do I create an account?",
          "What are the benefits of signing up?",
          "Browse as guest"
        ]);
        setIsTyping(false);
        return;
      }
      
      // Fetch user's orders
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(
              name,
              images,
              price
            )
          ),
          shops(
            name,
            logo_url
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        let responseText = "";
        
        if (lowercaseText.includes('track') || lowercaseText.includes('status')) {
          // Show order tracking information
          responseText = "📦 Here's the status of your recent orders:\n\n";
          
          data.forEach((order, index) => {
            const orderDate = new Date(order.created_at).toLocaleDateString();
            const statusEmoji = {
              'pending': '⏳',
              'processing': '🔄',
              'shipped': '🚚',
              'delivered': '✅',
              'cancelled': '❌'
            }[order.status] || '📦';
            
            responseText += `${statusEmoji} Order #${order.id.slice(0, 8)}\n`;
            responseText += `Status: ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}\n`;
            responseText += `Date: ${orderDate}\n`;
            responseText += `Total: $${parseFloat(order.total_amount).toFixed(2)}\n`;
            
            if (order.tracking_number) {
              responseText += `Tracking: ${order.tracking_number}\n`;
            }
            
            if (index < data.length - 1) responseText += "\n";
          });
          
          addAssistantMessage(responseText);
          setOrderResults(data);
          setShowOrderResults(true);
        } else if (lowercaseText.includes('recent') || lowercaseText.includes('last') || lowercaseText.includes('latest')) {
          // Show recent orders
          const recentOrder = data[0];
          responseText = `Your most recent order (#${recentOrder.id.slice(0, 8)}) was placed on ${new Date(recentOrder.created_at).toLocaleDateString()}.\n\n`;
          responseText += `Status: ${recentOrder.status.charAt(0).toUpperCase() + recentOrder.status.slice(1)}\n`;
          responseText += `Total: $${parseFloat(recentOrder.total_amount).toFixed(2)}\n`;
          
          if (recentOrder.order_items && recentOrder.order_items.length > 0) {
            responseText += `\nItems:\n`;
            recentOrder.order_items.forEach(item => {
              responseText += `• ${item.product.name} (${item.quantity}x)\n`;
            });
          }
          
          addAssistantMessage(responseText);
          setOrderResults([recentOrder]);
          setShowOrderResults(true);
        } else {
          // General order query
          responseText = `You have ${data.length} order${data.length > 1 ? 's' : ''} in your history. Here's a summary:\n\n`;
          
          const statusCounts = {};
          data.forEach(order => {
            statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
          });
          
          Object.entries(statusCounts).forEach(([status, count]) => {
            responseText += `• ${count} ${status} order${count > 1 ? 's' : ''}\n`;
          });
          
          addAssistantMessage(responseText);
          setOrderResults(data);
          setShowOrderResults(true);
        }
        
        setSuggestedQuestions([
          "Track specific order",
          "Return an item",
          "Contact seller",
          "Order history"
        ]);
      } else {
        addAssistantMessage("You don't have any orders yet. Would you like to start shopping? I can help you find great products!");
        setSuggestedQuestions([
          "Show me trending products",
          "Find deals",
          "Browse categories",
          "Search for specific item"
        ]);
      }
    } catch (error) {
      console.error('Error handling order query:', error);
      addAssistantMessage("I'm having trouble accessing your orders right now. Please try again later or contact support.");
    } finally {
      setIsTyping(false);
    }
  };

  // Handle shop-related queries
  const handleShopQuery = async (text) => {
    try {
      const lowercaseText = text.toLowerCase();
      setIsTyping(true);
      
      // Search for shops
      let query = supabase
        .from('shops')
        .select(`
          *,
          products(count)
        `);
        
      // Add search filters based on query
      if (lowercaseText.includes('verified')) {
        query = query.eq('is_verified', true);
      }
      
      if (lowercaseText.includes('popular') || lowercaseText.includes('best')) {
        query = query.order('total_sales', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error } = await query.limit(5);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        let responseText = "🏪 Here are some shops you might be interested in:\n\n";
        
        data.forEach((shop, index) => {
          responseText += `${shop.is_verified ? '✅' : '🏪'} ${shop.name}\n`;
          responseText += `📍 ${shop.location || 'Online'}\n`;
          
          if (shop.description) {
            responseText += `📝 ${shop.description.slice(0, 50)}${shop.description.length > 50 ? '...' : ''}\n`;
          }
          
          if (shop.products && shop.products[0]) {
            responseText += `📦 ${shop.products[0].count} products\n`;
          }
          
          if (index < data.length - 1) responseText += "\n";
        });
        
        addAssistantMessage(responseText);
        setShopResults(data);
        setShowShopResults(true);
        
        setSuggestedQuestions([
          "Show verified shops",
          "Find shops near me",
          "Shop categories",
          "Contact shop owner"
        ]);
      } else {
        addAssistantMessage("I couldn't find any shops at the moment. Try searching for specific products instead!");
      }
    } catch (error) {
      console.error('Error handling shop query:', error);
      addAssistantMessage("I'm having trouble finding shops right now. Please try again later.");
    } finally {
      setIsTyping(false);
    }
  };

  // Handle account-related queries
  const handleAccountQuery = async (text) => {
    try {
      const lowercaseText = text.toLowerCase();
      setIsTyping(true);
      
      if (!user) {
        addAssistantMessage("You need to sign in to access account features. Would you like me to guide you to the login page?");
        setSuggestedQuestions([
          "Take me to login",
          "Create new account",
          "Forgot password help",
          "Continue as guest"
        ]);
        setIsTyping(false);
        return;
      }
      
      let responseText = "👤 Account Information:\n\n";
      
      if (lowercaseText.includes('email') || lowercaseText.includes('info') || lowercaseText.includes('details')) {
        responseText += `📧 Email: ${user.email}\n`;
        responseText += `🆔 User ID: ${user.id.slice(0, 8)}...\n`;
        responseText += `📅 Member since: ${new Date(user.created_at).toLocaleDateString()}\n`;
        
        if (user.user_metadata?.name) {
          responseText += `👤 Name: ${user.user_metadata.name}\n`;
        }
        
        if (user.user_metadata?.role) {
          responseText += `🏷️ Account type: ${user.user_metadata.role}\n`;
        }
      } else if (lowercaseText.includes('settings') || lowercaseText.includes('update') || lowercaseText.includes('change')) {
        responseText = "⚙️ To update your account settings:\n\n";
        responseText += "1. Go to Profile tab\n";
        responseText += "2. Tap on Settings icon\n";
        responseText += "3. Update your information\n";
        responseText += "4. Save changes\n\n";
        responseText += "You can update: name, email, password, addresses, and payment methods.";
      } else if (lowercaseText.includes('delete') || lowercaseText.includes('remove')) {
        responseText = "⚠️ Account deletion is permanent. To delete your account:\n\n";
        responseText += "1. Go to Settings\n";
        responseText += "2. Scroll to 'Delete Account'\n";
        responseText += "3. Confirm your decision\n\n";
        responseText += "Note: This will remove all your data including orders and saved items.";
      } else {
        // General account info
        responseText += `Welcome, ${user.user_metadata?.name || user.email}!\n\n`;
        responseText += "What would you like to do with your account?";
      }
      
      addAssistantMessage(responseText);
      
      setSuggestedQuestions([
        "View my orders",
        "Update profile",
        "Saved addresses",
        "Payment methods"
      ]);
    } catch (error) {
      console.error('Error handling account query:', error);
      addAssistantMessage("I'm having trouble accessing account information. Please try again later.");
    } finally {
      setIsTyping(false);
    }
  };

  // Handle app help queries
  const handleAppHelpQuery = async (text) => {
    const lowercaseText = text.toLowerCase();
    setIsTyping(true);
    
    let responseText = "📱 App Help Guide:\n\n";
    
    if (lowercaseText.includes('navigate') || lowercaseText.includes('use')) {
      responseText += "Here's how to use the app:\n\n";
      responseText += "🏠 **Home**: Browse featured products and deals\n";
      responseText += "🔍 **Search**: Find specific products or shops\n";
      responseText += "🛒 **Cart**: View and manage your shopping cart\n";
      responseText += "📦 **Orders**: Track your purchases\n";
      responseText += "👤 **Profile**: Manage account settings\n";
    } else if (lowercaseText.includes('buy') || lowercaseText.includes('purchase')) {
      responseText += "How to make a purchase:\n\n";
      responseText += "1. Find the product you want\n";
      responseText += "2. Select size/color if applicable\n";
      responseText += "3. Tap 'Add to Cart'\n";
      responseText += "4. Go to Cart and tap 'Checkout'\n";
      responseText += "5. Enter shipping and payment info\n";
      responseText += "6. Confirm your order\n";
    } else if (lowercaseText.includes('sell') || lowercaseText.includes('list')) {
      responseText += "How to sell on our platform:\n\n";
      responseText += "1. Create a seller account\n";
      responseText += "2. Set up your shop profile\n";
      responseText += "3. Add product listings\n";
      responseText += "4. Manage inventory\n";
      responseText += "5. Process orders\n";
      responseText += "6. Handle customer inquiries\n";
    } else {
      responseText += "What would you like help with?\n\n";
      responseText += "• Making purchases\n";
      responseText += "• Managing orders\n";
      responseText += "• Account settings\n";
      responseText += "• Finding products\n";
      responseText += "• Contacting sellers\n";
    }
    
    addAssistantMessage(responseText);
    
    setSuggestedQuestions([
      "How to buy",
      "Track orders",
      "Return policy",
      "Contact support"
    ]);
    
    setIsTyping(false);
  };
  
  // Handle product search
  const handleProductSearch = async (text) => {
    try {
      // Extract search terms from the message
      const searchTerms = text
        .toLowerCase()
        .replace(/find|search|looking for|show me|products|items/g, '')
        .trim();
      
      if (!searchTerms) {
        addAssistantMessage("What kind of products are you looking for?");
        return;
      }
      
      addAssistantMessage(`Searching for "${searchTerms}"...`);
      
      // Search for products in the database
      const { data, error } = await supabase
        .from('products')
        .select('*, shops(name, logo_url)')
        .textSearch('name', searchTerms, { 
          config: 'english',
          type: 'websearch'
        })
        .limit(5);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Process products to handle stock status correctly
        const processedProducts = data.map(product => ({
          ...product,
          in_stock:
            product.is_on_order !== undefined
              ? !product.is_on_order
              : product.stock_quantity > 0,
        }));
        
        setSearchResults(processedProducts);
        setShowSearchResults(true);
        
        addAssistantMessage(`I found ${data.length} products that match "${searchTerms}". Here are some options:`);
      } else {
        addAssistantMessage(`I couldn't find any products matching "${searchTerms}". Would you like to try a different search term?`);
        setSuggestedQuestions([
          "Search for electronics",
          "Find clothing items",
          "Show me kitchen products",
          "Look for bestsellers"
        ]);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      addAssistantMessage("I'm having trouble searching for products right now. Please try again later.");
    } finally {
      setIsTyping(false);
    }
  };
  
  // Handle product information query
  const handleProductInfoQuery = async (text) => {
    try {
      const lowercaseText = text.toLowerCase();
      setIsTyping(true);
      
      // Extract potential product name or category from query
      let productKeywords = lowercaseText
        .replace(/what is|how does|tell me about|features|specifications|specs|explain/g, '')
        .trim();
        
      if (!productKeywords) {
        // If no specific product was mentioned
        const response = PREDEFINED_RESPONSES.product_info[
          Math.floor(Math.random() * PREDEFINED_RESPONSES.product_info.length)
        ];
        addAssistantMessage(response);
        setIsTyping(false);
        return;
      }
      
      // Check if query is about a specific category
      let matchedCategory = null;
      for (const category of Object.keys(PRODUCT_KNOWLEDGE)) {
        if (productKeywords.includes(category)) {
          matchedCategory = category;
          break;
        }
      }
      
      if (matchedCategory) {
        // If it's a category-specific query
        if (lowercaseText.includes('warranty') && PRODUCT_KNOWLEDGE[matchedCategory].warranty) {
          addAssistantMessage(PRODUCT_KNOWLEDGE[matchedCategory].warranty);
        } else if (
          (lowercaseText.includes('compatibility') || lowercaseText.includes('compatible')) && 
          PRODUCT_KNOWLEDGE[matchedCategory].compatibility
        ) {
          addAssistantMessage(PRODUCT_KNOWLEDGE[matchedCategory].compatibility);
        } else if (lowercaseText.includes('material') && PRODUCT_KNOWLEDGE[matchedCategory].materials) {
          addAssistantMessage(PRODUCT_KNOWLEDGE[matchedCategory].materials);
        } else if (
          (lowercaseText.includes('care') || lowercaseText.includes('wash') || lowercaseText.includes('clean')) && 
          PRODUCT_KNOWLEDGE[matchedCategory].care
        ) {
          addAssistantMessage(PRODUCT_KNOWLEDGE[matchedCategory].care);
        } else {
          // Provide general category information
          let categoryResponse = `Here's what I know about our ${matchedCategory} products:\n`;
          
          Object.entries(PRODUCT_KNOWLEDGE[matchedCategory]).forEach(([key, value]) => {
            categoryResponse += `• ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}\n`;
          });
          
          addAssistantMessage(categoryResponse);
        }
      } else {
        // Try to search for a specific product
        const { data, error } = await supabase
          .from('products')
          .select('*, shops(name, logo_url)')
          .textSearch('name', productKeywords, {
            config: 'english',
            type: 'websearch'
          })
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          const product = data[0];
          
          // Generate a detailed response about the product
          let detailedResponse = `Here's information about ${product.name}:\n\n`;
          
          if (lowercaseText.includes('price') || lowercaseText.includes('cost')) {
            detailedResponse = `${product.name} is priced at $${parseFloat(product.price).toFixed(2)}.`;
            
            if (product.discount_percentage) {
              detailedResponse += ` It's currently on sale with a ${product.discount_percentage}% discount!`;
            }
          } else if (lowercaseText.includes('stock') || lowercaseText.includes('available')) {
            const inStock = product.is_on_order !== undefined ? !product.is_on_order : product.stock_quantity > 0;
            detailedResponse = inStock 
              ? `${product.name} is currently in stock. There are ${product.stock_quantity} units available.` 
              : `${product.name} is currently on order and will be back in stock soon.`;
          } else if (lowercaseText.includes('description') || lowercaseText.includes('about')) {
            detailedResponse = product.description || `${product.name} by ${product.shops.name}`;
          } else {
            // General product information
            detailedResponse = `${product.name} - $${parseFloat(product.price).toFixed(2)}\n`;
            detailedResponse += `From: ${product.shops.name}\n`;
            detailedResponse += `Category: ${product.category}\n`;
            
            if (product.description) {
              detailedResponse += `\nDescription: ${product.description}\n`;
            }
            
            const inStock = product.is_on_order !== undefined ? !product.is_on_order : product.stock_quantity > 0;
            detailedResponse += `\nStatus: ${inStock ? 'In Stock' : 'On Order'}`;
            
            if (inStock && product.stock_quantity) {
              detailedResponse += ` (${product.stock_quantity} available)`;
            }
          }
          
          addAssistantMessage(detailedResponse);
          
          // Set this product as a search result so the user can tap to view details
          setSearchResults([{
            ...product,
            in_stock: product.is_on_order !== undefined ? !product.is_on_order : product.stock_quantity > 0,
          }]);
          setShowSearchResults(true);
        } else {
          // Fallback to general product information
          addAssistantMessage("I couldn't find specific information about that product. Could you try asking about a different product or browse our categories?");
        }
      }
    } catch (error) {
      console.error('Error handling product info query:', error);
      addAssistantMessage("I'm having trouble retrieving product information right now. Please try again later.");
    } finally {
      setIsTyping(false);
    }
  };
  
  // Handle product comparison query
  const handleProductComparisonQuery = async (text) => {
    try {
      const lowercaseText = text.toLowerCase();
      setIsTyping(true);
      
      // Extract products to compare
      let productsToCompare = [];
      
      if (lowercaseText.includes('versus') || lowercaseText.includes('vs')) {
        // Extract products from "X vs Y" format
        const regex = /(\w+(?:\s+\w+)*?)\s+(?:versus|vs)\s+(\w+(?:\s+\w+)*)/i;
        const matches = lowercaseText.match(regex);
        
        if (matches && matches.length >= 3) {
          productsToCompare = [matches[1].trim(), matches[2].trim()];
        }
      } else if (lowercaseText.includes('difference between')) {
        // Extract products from "difference between X and Y" format
        const regex = /difference\s+between\s+(\w+(?:\s+\w+)*?)\s+and\s+(\w+(?:\s+\w+)*)/i;
        const matches = lowercaseText.match(regex);
        
        if (matches && matches.length >= 3) {
          productsToCompare = [matches[1].trim(), matches[2].trim()];
        }
      } else if (lowercaseText.includes('compare')) {
        // Extract products from "compare X and Y" format
        const regex = /compare\s+(\w+(?:\s+\w+)*?)\s+(?:and|with|to)\s+(\w+(?:\s+\w+)*)/i;
        const matches = lowercaseText.match(regex);
        
        if (matches && matches.length >= 3) {
          productsToCompare = [matches[1].trim(), matches[2].trim()];
        }
      }
      
      if (productsToCompare.length < 2) {
        addAssistantMessage("I'd be happy to compare products for you. Could you specify which products you'd like to compare? For example, 'Compare Product A and Product B'.");
        setIsTyping(false);
        return;
      }
      
      // Search for both products
      let comparisonProducts = [];
      
      for (const productName of productsToCompare) {
        const { data, error } = await supabase
          .from('products')
          .select('*, shops(name, logo_url)')
          .textSearch('name', productName, {
            config: 'english',
            type: 'websearch'
          })
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          comparisonProducts.push({
            ...data[0],
            in_stock: data[0].is_on_order !== undefined ? !data[0].is_on_order : data[0].stock_quantity > 0,
          });
        }
      }
      
      if (comparisonProducts.length === 2) {
        // Both products found, generate comparison
        const [product1, product2] = comparisonProducts;
        
        let comparisonResponse = `Here's a comparison between ${product1.name} and ${product2.name}:\n\n`;
        
        // Price comparison
        comparisonResponse += `💰 Price:\n`;
        comparisonResponse += `- ${product1.name}: $${parseFloat(product1.price).toFixed(2)}\n`;
        comparisonResponse += `- ${product2.name}: $${parseFloat(product2.price).toFixed(2)}\n\n`;
        
        // Availability comparison
        comparisonResponse += `📦 Availability:\n`;
        comparisonResponse += `- ${product1.name}: ${product1.in_stock ? 'In Stock' : 'On Order'}\n`;
        comparisonResponse += `- ${product2.name}: ${product2.in_stock ? 'In Stock' : 'On Order'}\n\n`;
        
        // Shop comparison
        comparisonResponse += `🏪 Seller:\n`;
        comparisonResponse += `- ${product1.name}: ${product1.shops.name}\n`;
        comparisonResponse += `- ${product2.name}: ${product2.shops.name}\n\n`;
        
        // Rating comparison if available
        if (product1.average_rating && product2.average_rating) {
          comparisonResponse += `⭐ Rating:\n`;
          comparisonResponse += `- ${product1.name}: ${product1.average_rating.toFixed(1)}/5.0\n`;
          comparisonResponse += `- ${product2.name}: ${product2.average_rating.toFixed(1)}/5.0\n\n`;
        }
        
        // Add conclusion based on price, availability and rating
        comparisonResponse += `💡 Summary:\n`;
        
        // Price conclusion
        const priceDiff = parseFloat(product1.price) - parseFloat(product2.price);
        if (Math.abs(priceDiff) < 1) {
          comparisonResponse += "- Both products are similarly priced.\n";
        } else if (priceDiff > 0) {
          comparisonResponse += `- ${product2.name} is ${Math.abs(priceDiff).toFixed(2)} dollars cheaper.\n`;
        } else {
          comparisonResponse += `- ${product1.name} is ${Math.abs(priceDiff).toFixed(2)} dollars cheaper.\n`;
        }
        
        // Availability conclusion
        if (product1.in_stock && !product2.in_stock) {
          comparisonResponse += `- ${product1.name} is currently in stock, while ${product2.name} is on order.\n`;
        } else if (!product1.in_stock && product2.in_stock) {
          comparisonResponse += `- ${product2.name} is currently in stock, while ${product1.name} is on order.\n`;
        }
        
        addAssistantMessage(comparisonResponse);
        
        // Set both products as search results
        setSearchResults(comparisonProducts);
        setShowSearchResults(true);
      } else if (comparisonProducts.length === 1) {
        // Only one product found
        addAssistantMessage(`I could only find information about ${comparisonProducts[0].name}. Please check if the other product name is correct or try a different comparison.`);
        
        setSearchResults(comparisonProducts);
        setShowSearchResults(true);
      } else {
        // No products found
        addAssistantMessage("I couldn't find information about these products. Please check if the product names are correct or try comparing different products.");
      }
    } catch (error) {
      console.error('Error handling product comparison:', error);
      addAssistantMessage("I'm having trouble comparing these products right now. Please try again later.");
    } finally {
      setIsTyping(false);
    }
  };
  
  // Handle recommendation request
  const handleRecommendationRequest = async (text) => {
    try {
      // Try to identify product category from the message
      let category = null;
      
      for (const cat of PRODUCT_CATEGORIES) {
        if (text.toLowerCase().includes(cat.toLowerCase())) {
          category = cat;
          break;
        }
      }
      
      if (category) {
        addAssistantMessage(`Let me find some great ${category} products for you...`);
        
        // Fetch products from the specified category
        const { data, error } = await supabase
          .from('products')
          .select('*, shops(name, logo_url)')
          .eq('category', category)
          .order('views_count', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Process products to handle stock status correctly
          const processedProducts = data.map(product => ({
            ...product,
            in_stock:
              product.is_on_order !== undefined
                ? !product.is_on_order
                : product.stock_quantity > 0,
          }));
          
          setSearchResults(processedProducts);
          setShowSearchResults(true);
          
          addAssistantMessage(`Here are some popular ${category} products I recommend:`);
        } else {
          addAssistantMessage(`I couldn't find any ${category} products at the moment. Would you like recommendations for something else?`);
        }
      } else {
        // If no specific category was mentioned, recommend trending products
        addAssistantMessage("I'd be happy to recommend some products. Here are some trending items right now:");
        
        const { data, error } = await supabase
          .from('products')
          .select('*, shops(name, logo_url)')
          .order('views_count', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Process products to handle stock status correctly
          const processedProducts = data.map(product => ({
            ...product,
            in_stock:
              product.is_on_order !== undefined
                ? !product.is_on_order
                : product.stock_quantity > 0,
          }));
          
          setSearchResults(processedProducts);
          setShowSearchResults(true);
        } else {
          addAssistantMessage("I'm having trouble finding trending products right now. Could you specify what type of products you're interested in?");
        }
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      addAssistantMessage("I'm having trouble generating recommendations right now. Please try again later.");
    } finally {
      setIsTyping(false);
    }
  };
  
  // Handle general product query
  const handleGeneralProductQuery = async (text) => {
    try {
      setIsTyping(true);
      const lowercaseText = text.toLowerCase();
      
      // Try to identify if the query contains a product name or keyword
      const { data: allProducts, error: allProductsError } = await supabase
        .from('products')
        .select('name')
        .order('views_count', { ascending: false })
        .limit(100);
        
      if (allProductsError) throw allProductsError;
      
      // Check if query contains any product name
      let matchedProductName = null;
      if (allProducts && allProducts.length > 0) {
        for (const product of allProducts) {
          if (lowercaseText.includes(product.name.toLowerCase())) {
            matchedProductName = product.name;
            break;
          }
        }
      }
      
      if (matchedProductName) {
        // Handle query about a specific product
        await handleProductInfoQuery(`tell me about ${matchedProductName}`);
      } else {
        // Try to determine what kind of product query this might be
        if (lowercaseText.includes('trending') || lowercaseText.includes('popular') || lowercaseText.includes('bestseller')) {
          // Query about trending products
          await handleRecommendationRequest(text);
        } else if (lowercaseText.includes('new') || lowercaseText.includes('recent') || lowercaseText.includes('latest')) {
          // Query about new arrivals
          addAssistantMessage("Here are our newest products that just arrived:");
          
          const { data, error } = await supabase
            .from('products')
            .select('*, shops(name, logo_url)')
            .order('created_at', { ascending: false })
            .limit(5);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            const processedProducts = data.map(product => ({
              ...product,
              in_stock: product.is_on_order !== undefined ? !product.is_on_order : product.stock_quantity > 0,
            }));
            
            setSearchResults(processedProducts);
            setShowSearchResults(true);
          } else {
            addAssistantMessage("I couldn't find any new arrivals at the moment. Would you like to see our popular products instead?");
          }
        } else if (lowercaseText.includes('discount') || lowercaseText.includes('sale') || lowercaseText.includes('deal')) {
          // Query about discounted products
          addAssistantMessage("Here are some products currently on sale:");
          
          const { data, error } = await supabase
            .from('products')
            .select('*, shops(name, logo_url)')
            .not('discount_percentage', 'is', null)
            .gt('discount_percentage', 0)
            .order('discount_percentage', { ascending: false })
            .limit(5);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            const processedProducts = data.map(product => ({
              ...product,
              in_stock: product.is_on_order !== undefined ? !product.is_on_order : product.stock_quantity > 0,
            }));
            
            setSearchResults(processedProducts);
            setShowSearchResults(true);
          } else {
            addAssistantMessage("I couldn't find any products on sale at the moment. Would you like to see our popular products instead?");
          }
        } else {
          // Default response for unrecognized queries
          const response = PREDEFINED_RESPONSES.not_understood[
            Math.floor(Math.random() * PREDEFINED_RESPONSES.not_understood.length)
          ];
          
          addAssistantMessage(response);
          setSuggestedQuestions([
            "What's trending now?",
            "Help me find a gift",
            "Size guide for clothing",
            "Compare similar products"
          ]);
        }
      }
    } catch (error) {
      console.error('Error handling general product query:', error);
      addAssistantMessage("I'm having trouble understanding your question. Could you try asking in a different way?");
    } finally {
      setIsTyping(false);
    }
  };
  
  // Add assistant message to the chat
  const addAssistantMessage = (text) => {
    const assistantMessage = {
      id: Date.now().toString(),
      text,
      sender: 'assistant',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };
  
  // Handle suggested question tap
  const handleSuggestedQuestionTap = (question) => {
    // Remove emoji for processing
    const cleanQuestion = question.replace(/[^\w\s]/gi, '').trim();
    setInputText(cleanQuestion);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };
  
  // Handle product tap
  const handleProductTap = (product) => {
    onClose();
    navigation.navigate('ProductDetails', { product });
  };

  // Handle order tap
  const handleOrderTap = (order) => {
    onClose();
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  // Handle shop tap
  const handleShopTap = (shop) => {
    onClose();
    navigation.navigate('ShopDetails', { shopId: shop.id });
  };
  
  // Render message item with enhanced UI
  const renderMessageItem = ({ item, index }) => {
    const isUser = item.sender === 'user';
    const isLastMessage = index === messages.length - 1;
    
    return (
      <Animated.View 
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
          isLastMessage && {
            transform: [{
              scale: messageScaleAnim
            }]
          }
        ]}
      >
        {!isUser && (
          <View style={styles.assistantAvatarContainer}>
            <View style={styles.assistantAvatar}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={{ width: '100%', height: '100%', borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}
              >
                <FontAwesome5 name="robot" size={18} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.onlineIndicator} />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.assistantMessageBubble
        ]}>
          {isUser ? (
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.userMessageGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.userMessageText}>
                {item.text}
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.assistantMessageBlur}>
              <Text style={styles.assistantMessageText}>
                {item.text}
              </Text>
            </View>
          )}
          <Text style={[
            styles.messageTime,
            isUser && styles.userMessageTime
          ]}>
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </Animated.View>
    );
  };
  
  // Render product item with enhanced UI
  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => handleProductTap(item)}
      activeOpacity={0.9}
    >
      <View style={styles.productImageContainer}>
        <Image 
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.productGradient}
        />
        {item.discount_percentage > 0 && (
          <View style={styles.productDiscountBadge}>
            <Text style={styles.productDiscountText}>-{item.discount_percentage}%</Text>
          </View>
        )}
      </View>
      <View style={styles.productContent}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.productPriceContainer}>
          <Text style={styles.productPrice}>
            ${parseFloat(item.price).toFixed(2)}
          </Text>
          {item.discount_percentage > 0 && (
            <Text style={styles.productOriginalPrice}>
              ${(parseFloat(item.price) * (1 + item.discount_percentage / 100)).toFixed(2)}
            </Text>
          )}
        </View>
        <View style={styles.productFooter}>
          <View style={styles.productShopInfo}>
            <Ionicons name="storefront" size={14} color={COLORS.textSecondary} />
            <Text style={styles.productShopName} numberOfLines={1}>
              {item.shops?.name || 'Unknown Shop'}
            </Text>
          </View>
          <View style={styles.productStockBadge}>
            <View style={[
              styles.stockDot,
              { backgroundColor: item.in_stock ? COLORS.success : COLORS.error }
            ]} />
            <Text style={styles.stockText}>
              {item.in_stock ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render order item with modern design
  const renderOrderItem = ({ item }) => {
    const statusConfig = {
      'pending': {
        icon: 'clock',
        gradient: ['#FFA726', '#FF7043'],
        bgColor: '#FFF3E0'
      },
      'processing': {
        icon: 'refresh-cw',
        gradient: ['#42A5F5', '#2196F3'],
        bgColor: '#E3F2FD'
      },
      'shipped': {
        icon: 'truck',
        gradient: ['#66BB6A', '#4CAF50'],
        bgColor: '#E8F5E9'
      },
      'delivered': {
        icon: 'check-circle',
        gradient: ['#4CAF50', '#388E3C'],
        bgColor: '#E8F5E9'
      },
      'cancelled': {
        icon: 'x-circle',
        gradient: ['#EF5350', '#F44336'],
        bgColor: '#FFEBEE'
      }
    };
    
    const config = statusConfig[item.status] || statusConfig['pending'];
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => handleOrderTap(item)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={config.gradient}
          style={styles.orderGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.orderContent}>
          <View style={styles.orderHeader}>
            <View style={styles.orderIconContainer}>
              <View style={[styles.orderIconBg, { backgroundColor: config.bgColor }]}>
                <Feather name={config.icon} size={20} color={config.gradient[0]} />
              </View>
            </View>
            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.orderStatus}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
            </View>
            <View style={styles.orderAmountContainer}>
              <Text style={styles.orderAmount}>${parseFloat(item.total_amount).toFixed(2)}</Text>
              <Text style={styles.orderDate}>
                {new Date(item.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          </View>
          
          {item.order_items && item.order_items.length > 0 && (
            <View style={styles.orderItemsPreview}>
              <View style={styles.orderItemsDots}>
                {item.order_items.slice(0, 3).map((_, index) => (
                  <View key={index} style={styles.itemDot} />
                ))}
                {item.order_items.length > 3 && (
                  <Text style={styles.moreItems}>+{item.order_items.length - 3}</Text>
                )}
              </View>
              <Text style={styles.orderItemsText}>
                {item.order_items.length} item{item.order_items.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          
          {item.tracking_number && (
            <View style={styles.trackingContainer}>
              <Feather name="package" size={12} color={COLORS.textSecondary} />
              <Text style={styles.trackingText}>Track: {item.tracking_number}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render shop item with modern card design
  const renderShopItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.shopCard}
      onPress={() => handleShopTap(item)}
      activeOpacity={0.9}
    >
      <View style={styles.shopCardHeader}>
        <Image 
          source={{ uri: item.logo_url || 'https://via.placeholder.com/80' }}
          style={styles.shopLogo}
          resizeMode="cover"
        />
        {item.is_verified && (
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={16} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.shopCardContent}>
        <Text style={styles.shopName} numberOfLines={1}>
          {item.name}
        </Text>
        
        {item.description && (
          <Text style={styles.shopDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.shopStats}>
          <View style={styles.shopStatItem}>
            <Ionicons name="location" size={14} color={'#8B5CF6'} />
            <Text style={styles.shopStatText}>
              {item.location || 'Online'}
            </Text>
          </View>
          
          {item.products && item.products[0] && (
            <View style={styles.shopStatItem}>
              <Ionicons name="cube" size={14} color={'#8B5CF6'} />
              <Text style={styles.shopStatText}>
                {item.products[0].count} Products
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity style={styles.visitShopButton}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.visitShopGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.visitShopText}>Visit Shop</Text>
            <Feather name="arrow-right" size={14} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.modalContainer,
          {
            opacity: fadeAnim
          }
        ]}
      >
        {/* Background blur effect */}
        <BlurView 
          intensity={20} 
          tint="dark" 
          style={StyleSheet.absoluteFillObject} 
        />
        
        <Animated.View 
          style={[
            styles.assistantContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header with parallax effect */}
          <Animated.View 
            style={[
              styles.headerWrapper,
              {
                transform: [{
                  translateY: headerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0]
                  })
                }],
                opacity: headerAnimation
              }
            ]}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerPattern} />
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.logoContainer}>
                    <View style={styles.assistantAvatar}>
                      <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        style={{ width: '100%', height: '100%', borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <FontAwesome5 name="robot" size={22} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                    <View style={styles.pulseRing} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>AI Assistant</Text>
                    <View style={styles.headerSubtitleContainer}>
                      <View style={styles.statusDot} />
                      <Text style={styles.headerSubtitle}>Online & ready to help</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
          
          {/* Messages with enhanced container */}
          <View style={styles.messagesWrapper}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={() => (
                isTyping && (
                  <View style={styles.typingContainer}>
                    <View style={styles.typingBubble}>
                      <View style={styles.typingDotsContainer}>
                        {[0, 1, 2].map((index) => (
                          <Animated.View 
                            key={index}
                            style={[
                              styles.typingDot,
                              {
                                opacity: typingAnimation,
                                transform: [{
                                  translateY: typingAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -5]
                                  })
                                }]
                              }
                            ]} 
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                )
              )}
            />
          </View>
          
          {/* Results Sections with modern cards */}
          {showSearchResults && searchResults.length > 0 && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsSectionHeader}>
                <Text style={styles.resultsSectionTitle}>Products Found</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={searchResults}
                renderItem={renderProductItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
              />
            </View>
          )}

          {showOrderResults && orderResults.length > 0 && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsSectionHeader}>
                <Text style={styles.resultsSectionTitle}>Your Orders</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={orderResults}
                renderItem={renderOrderItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
              />
            </View>
          )}

          {showShopResults && shopResults.length > 0 && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsSectionHeader}>
                <Text style={styles.resultsSectionTitle}>Shops</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={shopResults}
                renderItem={renderShopItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
              />
            </View>
          )}
          
          {/* Suggested Questions with floating chips */}
          {!isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'assistant' && (
            <View style={styles.suggestedQuestionsWrapper}>
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedQuestionsContent}
              >
                {suggestedQuestions.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestedQuestionChip}
                    onPress={() => handleSuggestedQuestionTap(question)}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={10} tint="light" style={styles.chipBlur}>
                      <Text style={styles.suggestedQuestionText}>{question}</Text>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Modern Input Area */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <BlurView intensity={30} tint="light" style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputFieldContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ask me anything..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSendMessage}
                    multiline
                    maxHeight={100}
                  />
                  <TouchableOpacity style={styles.attachButton}>
                    <Feather name="paperclip" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    !inputText.trim() && styles.sendButtonDisabled
                  ]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim()}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={inputText.trim() ? ['#6366F1', '#8B5CF6'] : ['#E0E0E0', '#BDBDBD']}
                    style={styles.sendButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons 
                      name="send" 
                      size={18} 
                      color="#FFFFFF" 
                      style={{ transform: [{ rotate: '-45deg' }] }}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  assistantContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: Platform.OS === 'ios' ? 120 : 80,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  headerWrapper: {
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: Platform.OS === 'ios' ? 32 : 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  pulseRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  assistantAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  assistantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  userMessageBubble: {
    borderBottomRightRadius: 4,
  },
  assistantMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  userMessageGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantMessageBlur: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 4,
    opacity: 0.6,
  },
  userMessageTime: {
    color: '#FFFFFF',
    opacity: 0.7,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 50,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
    marginHorizontal: 3,
  },
  resultsSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resultsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsSectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#6366F1',
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  
  // Product Card Styles
  productCard: {
    width: 200,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#F8FAFB',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  productDiscountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  productDiscountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#6366F1',
    marginRight: 8,
  },
  productOriginalPrice: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productShopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productShopName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748B',
    marginLeft: 4,
    flex: 1,
  },
  productStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  stockText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#64748B',
  },
  
  // Order Card Styles
  orderCard: {
    width: 280,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIconContainer: {
    marginRight: 12,
  },
  orderIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: '#1F2937',
    marginBottom: 2,
  },
  orderStatus: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#64748B',
  },
  orderAmountContainer: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#6366F1',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#94A3B8',
  },
  orderItemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  orderItemsDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginRight: -8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreItems: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#64748B',
    marginLeft: 12,
  },
  orderItemsText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748B',
  },
  trackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  trackingText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748B',
    marginLeft: 6,
  },
  
  // Shop Card Styles
  shopCard: {
    width: 260,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shopCardHeader: {
    height: 100,
    position: 'relative',
    backgroundColor: '#F8FAFB',
  },
  shopLogo: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  shopCardContent: {
    padding: 16,
  },
  shopName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#1F2937',
    marginBottom: 4,
  },
  shopDescription: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  shopStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  shopStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  shopStatText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#64748B',
    marginLeft: 4,
  },
  visitShopButton: {
    width: '100%',
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
  },
  visitShopGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  visitShopText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
    marginRight: 4,
  },
  
  // Suggested Questions Styles
  suggestedQuestionsWrapper: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suggestedQuestionsContent: {
    paddingHorizontal: 16,
  },
  suggestedQuestionChip: {
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipBlur: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  suggestedQuestionText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#475569',
  },
  
  // Input Area Styles
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputFieldContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: '#1F2937',
    maxHeight: 100,
  },
  attachButton: {
    padding: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VirtualAssistant;


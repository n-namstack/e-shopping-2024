import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Image,
  Dimensions,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
  Keyboard,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { FONTS } from '../constants/theme';
import supabase from '../lib/supabase';
import useAuthStore from '../store/authStore';
import useOrderStore from '../store/orderStore';

const { width, height } = Dimensions.get('window');

// Modern minimal color palette
const MINIMAL_COLORS = {
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  accent: '#2563EB',
  accentLight: '#EFF6FF',
  accentMuted: '#DBEAFE',
  userBubble: '#111827',
  assistantBubble: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
};

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
  const [dbStats, setDbStats] = useState(null);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const messageScaleAnim = useRef(new Animated.Value(0)).current;
  
  // Fetch database statistics
  const fetchDbStats = async () => {
    try {
      // Fetch counts in parallel
      const [productsResult, shopsResult, categoriesResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('shops').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('category')
      ]);

      const productCount = productsResult.count || 0;
      const shopCount = shopsResult.count || 0;

      // Get unique categories
      const categories = categoriesResult.data
        ? [...new Set(categoriesResult.data.map(p => p.category).filter(Boolean))]
        : [];

      return {
        productCount,
        shopCount,
        categoryCount: categories.length,
        categories: categories.slice(0, 5) // Top 5 categories for display
      };
    } catch (error) {
      console.error('Error fetching db stats:', error);
      return null;
    }
  };

  // Initialize with a data-aware greeting message
  useEffect(() => {
    const initializeChat = async () => {
      if (isVisible && messages.length === 0) {
        const stats = await fetchDbStats();
        setDbStats(stats);

        let greetingText;
        const userName = user?.user_metadata?.name || user?.email?.split('@')[0];

        if (stats && stats.productCount > 0) {
          if (userName) {
            greetingText = `👋 Hi ${userName}! I'm your AI shopping assistant. We have ${stats.productCount} products from ${stats.shopCount} shops. What are you looking for today?`;
          } else {
            greetingText = `👋 Hello! I'm your AI shopping assistant. We currently have ${stats.productCount} products from ${stats.shopCount} shops across ${stats.categoryCount} categories. How can I help you today?`;
          }
        } else {
          greetingText = PREDEFINED_RESPONSES.greeting[
            Math.floor(Math.random() * PREDEFINED_RESPONSES.greeting.length)
          ];
        }

        setMessages([
          {
            id: Date.now().toString(),
            text: greetingText,
            sender: 'assistant',
            timestamp: new Date()
          }
        ]);

        // Set dynamic suggested questions based on available data
        if (stats && stats.categories.length > 0) {
          setSuggestedQuestions([
            "📦 Track my orders",
            `🛍️ Browse ${stats.categories[0] || 'products'}`,
            "🏪 Find shops nearby",
            "🔥 What's trending?"
          ]);
        }
      }
    };

    initializeChat();
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

      // Scroll to end with a longer delay to ensure content is rendered
      const scrollTimer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);

      return () => clearTimeout(scrollTimer);
    }
  }, [messages]);

  // Also scroll when typing indicator appears
  useEffect(() => {
    if (isTyping) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isTyping]);
  
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
        // Fetch products from the specified category
        const { data, error, count } = await supabase
          .from('products')
          .select('*, shops(name, logo_url)', { count: 'exact' })
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

          // Calculate price range
          const prices = data.map(p => parseFloat(p.price));
          const minPrice = Math.min(...prices).toFixed(2);
          const maxPrice = Math.max(...prices).toFixed(2);

          const inStockCount = processedProducts.filter(p => p.in_stock).length;

          let responseText = `Found ${count || data.length} ${category} products!\n\n`;
          responseText += `💰 Price range: $${minPrice} - $${maxPrice}\n`;
          responseText += `📦 ${inStockCount} currently in stock\n\n`;
          responseText += `Here are the top picks:`;

          setSearchResults(processedProducts);
          setShowSearchResults(true);

          addAssistantMessage(responseText);
        } else {
          addAssistantMessage(`I couldn't find any ${category} products at the moment. Would you like recommendations for something else?`);
        }
      } else {
        // If no specific category was mentioned, recommend trending products
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

          // Get unique shops and categories in trending
          const trendingShops = [...new Set(data.map(p => p.shops?.name).filter(Boolean))];
          const trendingCategories = [...new Set(data.map(p => p.category).filter(Boolean))];

          let responseText = "🔥 Here are the trending products right now:\n\n";
          responseText += `From ${trendingShops.length} different shops\n`;
          if (trendingCategories.length > 0) {
            responseText += `Categories: ${trendingCategories.slice(0, 3).join(', ')}`;
          }

          setSearchResults(processedProducts);
          setShowSearchResults(true);

          addAssistantMessage(responseText);
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
          // Try to provide helpful data-based response for unrecognized queries
          const stats = await fetchDbStats();

          if (stats && stats.productCount > 0) {
            // Provide a helpful response with actual data
            let helpfulResponse = "I'm here to help you shop! Here's what I can assist with:\n\n";
            helpfulResponse += `📦 We have ${stats.productCount} products available\n`;
            helpfulResponse += `🏪 ${stats.shopCount} shops to explore\n`;

            if (stats.categories.length > 0) {
              helpfulResponse += `📂 Categories: ${stats.categories.join(', ')}\n`;
            }

            helpfulResponse += "\nTry asking me to find specific products, track orders, or explore shops!";

            addAssistantMessage(helpfulResponse);

            // Show some products to help the user get started
            const { data: sampleProducts } = await supabase
              .from('products')
              .select('*, shops(name, logo_url)')
              .order('views_count', { ascending: false })
              .limit(3);

            if (sampleProducts && sampleProducts.length > 0) {
              const processedProducts = sampleProducts.map(product => ({
                ...product,
                in_stock: product.is_on_order !== undefined ? !product.is_on_order : product.stock_quantity > 0,
              }));
              setSearchResults(processedProducts);
              setShowSearchResults(true);
            }
          } else {
            const response = PREDEFINED_RESPONSES.not_understood[
              Math.floor(Math.random() * PREDEFINED_RESPONSES.not_understood.length)
            ];
            addAssistantMessage(response);
          }

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

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={MINIMAL_COLORS.background} />

        {/* Minimal Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color={MINIMAL_COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Assistant</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={20} color={MINIMAL_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Single Scrollable Content Area */}
        <ScrollView
          ref={flatListRef}
          style={styles.messagesWrapper}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {/* Messages */}
          {messages.map((item, index) => {
            const isUser = item.sender === 'user';
            const prevMessage = messages[index - 1];
            const showAvatar = !isUser && (index === 0 || prevMessage?.sender === 'user');
            const senderChanged = prevMessage && prevMessage.sender !== item.sender;

            return (
              <View
                key={item.id}
                style={[
                  styles.messageContainer,
                  isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
                  senderChanged && styles.senderChangedSpacing,
                ]}
              >
                {!isUser && (
                  <View style={styles.avatarSpace}>
                    {showAvatar && (
                      <View style={styles.assistantAvatar}>
                        <Ionicons name="sparkles" size={16} color={MINIMAL_COLORS.accent} />
                      </View>
                    )}
                  </View>
                )}
                <View style={[
                  styles.messageBubble,
                  isUser ? styles.userMessageBubble : styles.assistantMessageBubble
                ]}>
                  <Text style={[
                    styles.messageText,
                    isUser ? styles.userMessageText : styles.assistantMessageText
                  ]}>
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.avatarSpace}>
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={16} color={MINIMAL_COLORS.accent} />
                </View>
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.typingDotsContainer}>
                  {[0, 1, 2].map((i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.typingDot,
                        {
                          opacity: typingAnimation,
                          transform: [{
                            translateY: typingAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -4]
                            })
                          }]
                        }
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Inline Results - Products */}
          {showSearchResults && searchResults.length > 0 && (
            <View style={styles.inlineResultsSection}>
              <View style={styles.inlineResultsHeader}>
                <Feather name="package" size={14} color={MINIMAL_COLORS.textSecondary} />
                <Text style={styles.inlineResultsTitle}>Products</Text>
                <Text style={styles.inlineResultsCount}>{searchResults.length}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.inlineResultsList}
              >
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.inlineProductCard}
                    onPress={() => handleProductTap(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }}
                      style={styles.inlineProductImage}
                      resizeMode="cover"
                    />
                    <View style={styles.inlineProductInfo}>
                      <Text style={styles.inlineProductName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.inlineProductPrice}>${parseFloat(item.price).toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Inline Results - Orders */}
          {showOrderResults && orderResults.length > 0 && (
            <View style={styles.inlineResultsSection}>
              <View style={styles.inlineResultsHeader}>
                <Feather name="shopping-bag" size={14} color={MINIMAL_COLORS.textSecondary} />
                <Text style={styles.inlineResultsTitle}>Orders</Text>
                <Text style={styles.inlineResultsCount}>{orderResults.length}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.inlineResultsList}
              >
                {orderResults.map((item) => {
                  const statusColors = {
                    'pending': '#F59E0B',
                    'processing': MINIMAL_COLORS.accent,
                    'shipped': '#8B5CF6',
                    'delivered': MINIMAL_COLORS.success,
                    'cancelled': MINIMAL_COLORS.error
                  };
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.inlineOrderCard}
                      onPress={() => handleOrderTap(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.inlineOrderNumber}>#{item.id.slice(0, 6).toUpperCase()}</Text>
                      <Text style={[styles.inlineOrderStatus, { color: statusColors[item.status] || '#666' }]}>
                        {item.status}
                      </Text>
                      <Text style={styles.inlineOrderAmount}>${parseFloat(item.total_amount).toFixed(2)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Inline Results - Shops */}
          {showShopResults && shopResults.length > 0 && (
            <View style={styles.inlineResultsSection}>
              <View style={styles.inlineResultsHeader}>
                <Feather name="shopping-bag" size={14} color={MINIMAL_COLORS.textSecondary} />
                <Text style={styles.inlineResultsTitle}>Shops</Text>
                <Text style={styles.inlineResultsCount}>{shopResults.length}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.inlineResultsList}
              >
                {shopResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.inlineShopCard}
                    onPress={() => handleShopTap(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: item.logo_url || 'https://via.placeholder.com/80' }}
                      style={styles.inlineShopLogo}
                      resizeMode="cover"
                    />
                    <Text style={styles.inlineShopName} numberOfLines={1}>{item.name}</Text>
                    {item.is_verified && (
                      <MaterialIcons name="verified" size={12} color={MINIMAL_COLORS.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Suggested Questions - Inside scroll */}
          {!isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'assistant' && (
            <View style={styles.suggestedInline}>
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestedChip}
                  onPress={() => handleSuggestedQuestionTap(question)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestedText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Minimal Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputFieldContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Message..."
                placeholderTextColor={MINIMAL_COLORS.textMuted}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
                multiline
                maxHeight={100}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                inputText.trim() && styles.sendButtonActive
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
              activeOpacity={0.7}
            >
              <Feather
                name="arrow-up"
                size={20}
                color={inputText.trim() ? MINIMAL_COLORS.background : MINIMAL_COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: MINIMAL_COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MINIMAL_COLORS.borderLight,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MINIMAL_COLORS.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: MINIMAL_COLORS.textMuted,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Messages
  messagesWrapper: {
    flex: 1,
    backgroundColor: MINIMAL_COLORS.background,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    marginBottom: 4,
  },
  senderChangedSpacing: {
    marginTop: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
    paddingLeft: 48,
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingRight: 48,
  },
  avatarSpace: {
    width: 32,
    marginRight: 8,
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MINIMAL_COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '100%',
    borderRadius: 18,
  },
  userMessageBubble: {
    backgroundColor: MINIMAL_COLORS.userBubble,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomRightRadius: 4,
  },
  assistantMessageBubble: {
    backgroundColor: MINIMAL_COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
  userMessageText: {
    color: MINIMAL_COLORS.background,
  },
  assistantMessageText: {
    color: MINIMAL_COLORS.text,
  },

  // Typing Indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingRight: 48,
  },
  typingBubble: {
    backgroundColor: MINIMAL_COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 4,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MINIMAL_COLORS.textMuted,
    marginHorizontal: 2,
  },

  // Results Section
  resultsSection: {
    backgroundColor: MINIMAL_COLORS.background,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: MINIMAL_COLORS.borderLight,
  },
  resultsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsSectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
    letterSpacing: -0.2,
  },
  resultsCount: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: MINIMAL_COLORS.textMuted,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  // Product Card (Minimal)
  productCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: MINIMAL_COLORS.background,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
    overflow: 'hidden',
  },
  productImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: MINIMAL_COLORS.surface,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: MINIMAL_COLORS.text,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productDiscountText: {
    color: MINIMAL_COLORS.background,
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: MINIMAL_COLORS.text,
    marginBottom: 4,
    lineHeight: 17,
  },
  productPrice: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productShopName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: MINIMAL_COLORS.textMuted,
    flex: 1,
  },
  stockIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Order Card (Minimal)
  orderCard: {
    width: 200,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: MINIMAL_COLORS.background,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
    padding: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
    marginBottom: 2,
  },
  orderStatus: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: MINIMAL_COLORS.borderLight,
  },
  orderAmount: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
  },
  orderDate: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: MINIMAL_COLORS.textMuted,
  },

  // Shop Card (Minimal)
  shopCard: {
    width: 240,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: MINIMAL_COLORS.background,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: MINIMAL_COLORS.surface,
  },
  shopCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shopName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
  },
  shopLocation: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: MINIMAL_COLORS.textMuted,
    marginTop: 2,
  },

  // Suggested Questions (Minimal)
  suggestedWrapper: {
    paddingVertical: 12,
    backgroundColor: MINIMAL_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: MINIMAL_COLORS.borderLight,
  },
  suggestedContent: {
    paddingHorizontal: 16,
  },
  suggestedChip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: MINIMAL_COLORS.surface,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
  },
  suggestedText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: MINIMAL_COLORS.textSecondary,
  },

  // Input Area (Minimal)
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    backgroundColor: MINIMAL_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: MINIMAL_COLORS.borderLight,
    gap: 10,
  },
  inputFieldContainer: {
    flex: 1,
    backgroundColor: MINIMAL_COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
  },
  textInput: {
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: MINIMAL_COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MINIMAL_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: MINIMAL_COLORS.accent,
  },

  // ScrollView content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Inline Results Styles
  inlineResultsSection: {
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 40,
    marginRight: -16,
  },
  inlineResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  inlineResultsTitle: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: MINIMAL_COLORS.textSecondary,
  },
  inlineResultsCount: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: MINIMAL_COLORS.textMuted,
    backgroundColor: MINIMAL_COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inlineResultsList: {
    paddingRight: 16,
  },

  // Inline Product Card
  inlineProductCard: {
    width: 140,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: MINIMAL_COLORS.background,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
    overflow: 'hidden',
  },
  inlineProductImage: {
    width: '100%',
    height: 100,
    backgroundColor: MINIMAL_COLORS.surface,
  },
  inlineProductInfo: {
    padding: 10,
  },
  inlineProductName: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: MINIMAL_COLORS.text,
    marginBottom: 4,
  },
  inlineProductPrice: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
  },

  // Inline Order Card
  inlineOrderCard: {
    width: 130,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: MINIMAL_COLORS.background,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
    padding: 12,
  },
  inlineOrderNumber: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
    marginBottom: 4,
  },
  inlineOrderStatus: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  inlineOrderAmount: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: MINIMAL_COLORS.text,
  },

  // Inline Shop Card
  inlineShopCard: {
    width: 100,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: MINIMAL_COLORS.background,
    borderWidth: 1,
    borderColor: MINIMAL_COLORS.border,
    padding: 10,
    alignItems: 'center',
  },
  inlineShopLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MINIMAL_COLORS.surface,
    marginBottom: 8,
  },
  inlineShopName: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: MINIMAL_COLORS.text,
    textAlign: 'center',
  },

  // Suggested Questions Inline
  suggestedInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginLeft: 40,
    gap: 8,
  },
});

export default VirtualAssistant;


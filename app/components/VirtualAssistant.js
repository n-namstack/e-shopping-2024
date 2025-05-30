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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import supabase from '../lib/supabase';
import useAuthStore from '../store/authStore';

const { width, height } = Dimensions.get('window');

// Predefined responses for common questions
const PREDEFINED_RESPONSES = {
  greeting: [
    "Hello! I'm your personal shopping assistant. How may I help you today?",
    "Hi there! I can answer questions about products, orders, shops and more. What can I assist you with?",
    "Welcome to your AI shopping companion! I'm here to make your shopping experience better. How can I help?"
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
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "What's trending now?",
    "Help me find a gift",
    "Size guide for clothing",
    "Compare similar products"
  ]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  
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
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
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
        })
      ]).start();
    }
  }, [isVisible]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);
  
  // Handle sending a message
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
    setShowSearchResults(false);
    
    // Process the user's message and generate a response
    await processUserMessage(userMessage.text);
  };
  
  // Process user message and generate response
  const processUserMessage = async (text) => {
    // Simulate typing delay for more natural interaction
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowercaseText = text.toLowerCase();
    
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
    setInputText(question);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };
  
  // Handle product tap
  const handleProductTap = (product) => {
    onClose();
    navigation.navigate('ProductDetails', { product });
  };
  
  // Render message item
  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer
      ]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
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
  };
  
  // Render product item
  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => handleProductTap(item)}
    >
      <Image 
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>
          ${parseFloat(item.price).toFixed(2)}
        </Text>
        <View style={styles.productShop}>
          <Text style={styles.productShopName} numberOfLines={1}>
            {item.shops?.name || 'Unknown Shop'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  // Render suggested questions
  const renderSuggestedQuestions = () => (
    <View style={styles.suggestedQuestionsContainer}>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestedQuestionsContent}
      >
        {suggestedQuestions.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestedQuestionButton}
            onPress={() => handleSuggestedQuestionTap(question)}
          >
            <Text style={styles.suggestedQuestionText}>{question}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <Text style={styles.headerTitle}>Product Assistant</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          
          {/* Chat Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={true}
          />
          
          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, styles.typingDotMiddle]} />
                <View style={styles.typingDot} />
              </View>
            </View>
          )}
          
          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={searchResults}
                renderItem={renderProductItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.searchResultsList}
              />
            </View>
          )}
          
          {/* Suggested Questions */}
          {!isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'assistant' && (
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedQuestionsContent}
            >
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestedQuestionButton}
                  onPress={() => handleSuggestedQuestionTap(question)}
                >
                  <Text style={styles.suggestedQuestionText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          
          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={200}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                !inputText.trim() ? styles.sendButtonDisabled : {}
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  headerHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userMessageBubble: {
    backgroundColor: COLORS.primary,
  },
  assistantMessageBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
    fontFamily: FONTS.regular,
  },
  assistantMessageText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    width: 60,
    justifyContent: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gray,
    marginHorizontal: 2,
    opacity: 0.6,
  },
  typingDotMiddle: {
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.7,
  },
  suggestedQuestionsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestedQuestionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  suggestedQuestionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  searchResultsContainer: {
    marginVertical: 8,
  },
  searchResultsList: {
    paddingHorizontal: 12,
  },
  productItem: {
    width: 160,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f9f9f9',
  },
  productInfo: {
    padding: 8,
  },
  productName: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  productShop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productShopName: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
});

export default VirtualAssistant;

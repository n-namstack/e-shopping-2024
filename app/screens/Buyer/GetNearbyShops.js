import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Linking,
  ActionSheetIOS,
  Platform,
  Animated,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import supabase from "../../lib/supabase";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";

// Pre-encoded at build time — avoids file:// cross-origin issues inside Android WebView
const SHOP_ICON_DATA_URI = "data:image/png;base64,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1G8BlOxtcOHi/4/njeEPjufFn4iI4sc0gP/yuiz+8bwxJA3llW0jZZrblBtRbcAR8hTVNj79tim8cW1BtRkiIqJQO/moAj711mnldgSgfO1VTgAEcIzK5/tXlHDhsVnVMIiIiCLhouPmsKGjrNSG6rUXcGUXgNyk8ukLjs5x2Z+IiLRhGsD7jlGb+EoIpWsv4EoCINpVPn3K+rx6CERERBHypnXKt72V37njRh0Apf3/q9O2CyEQERFFx5pmS7WJFtUG3EgAlDY2NiQdF0IgIiKKjkb1a1+dagOuvg6YiIiIooEJABERkYaYABAREWmICQAREZGGmAAQERFpiAkAERGRhpgAEBERaSgRdAAnf6s36BCIiIi0wxUAIiIiDTEBICIi0hATACIiIg0xASAiItIQEwAiIiINMQEgIiLSEBMAIiIiDbmRAGRdaIOIiIiWbk61ATcSgD0utEFERERLJnertqCeAAjcodwGERERLZmEcbtqG+oJgG1+B4Ct3A4REREthW1I+7uqjSgnAIN7Bp+REN9SbYeIiIiWQOBfBnbvfk61GVd2ATSkGz8NiLvcaIuIiIgOR97ZtmLFn7nRkulGI/v377fXrjvqx1ap1A6IreD2QiIiIjfZEPjnts7OD+/YsaPsRoPCjUYO1t/dfbwjjI8KyHcD6AVE2u1jEBERxZ/MAchIGLcb0v6uG8v+REREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREtLj/HxEqO+J1E5NEAAAAAElFTkSuQmCC";
import { COLORS, FONTS } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useAppTheme } from "../../constants/themeContext";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// Radius options in meters
const RADIUS_OPTIONS = [
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "20 km", value: 20000 },
  { label: "30 km", value: 30000 },
  { label: "50 km", value: 50000 },
];

function GetNearbyShops({ navigation }) {
  const { colors } = useTheme();
  const { isDarkMode } = useAppTheme();
  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const webviewRef = useRef(null);
  const [mapIconUri] = useState(SHOP_ICON_DATA_URI);
  const flatListRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isAway, setIsAway] = useState(false);

  // New state for filters
  const [radius, setRadius] = useState(30000); // Default 30km
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempRadius, setTempRadius] = useState(30000);
  const [tempCategory, setTempCategory] = useState("all");

  // Animation for filter panel
  const filterAnim = useRef(new Animated.Value(0)).current;

  // Effect to handle the debouncing timer
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Memoized filtered shops for better performance
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const matchesSearch = shop.name
        .toLowerCase()
        .includes(debouncedQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || shop.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [shops, debouncedQuery, selectedCategory]);

  useEffect(() => {
    if (webviewRef.current && !loading) {
      webviewRef.current.postMessage(
        JSON.stringify({
          type: "UPDATE_MARKERS",
          payload: filteredShops,
        }),
      );
    }
  }, [filteredShops, loading]);

  useEffect(() => {
    // Loading nearby shops data
    loadData();
    loadCategories();

  }, []);

  // Reload when radius changes
  useEffect(() => {
    if (location) {
      fetchNearbyShops(location);
    }
  }, [radius]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const loadData = async () => {
    // 1. Request Foreground instead of Background
    let { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need location to find shops near you.",
      );
      setLoading(false);
      return;
    }

    try {
      let userLoc = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: userLoc.coords.latitude,
        lng: userLoc.coords.longitude,
      };
      setLocation(coords);
      await fetchNearbyShops(coords);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchNearbyShops = async (coords) => {
    try {
      // Fetch from Supabase with current radius
      const { data, error } = await supabase.rpc("get_nearby_shops", {
        user_lat: coords.lat,
        user_lng: coords.lng,
        radius_meters: radius,
      });

      if (error) throw error;
      setShops(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (location) {
      await fetchNearbyShops(location);
    } else {
      await loadData();
    }
  }, [location, radius]);

  // Apply filters from modal
  const applyFilters = () => {
    setRadius(tempRadius);
    setSelectedCategory(tempCategory);
    setShowFilterModal(false);
  };

  // Reset filters
  const resetFilters = () => {
    setTempRadius(30000);
    setTempCategory("all");
  };

  // Get active filter count for badge
  const getActiveFilterCount = () => {
    let count = 0;
    if (radius !== 30000) count++;
    if (selectedCategory !== "all") count++;
    return count;
  };

  // Handle message function
  const handleMapMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);

    if (data.type === "MAP_MOVED") {
      setIsAway(data.isAway);
    }

    if (data.type === "MARKER_CLICKED") {
      const index = shops.findIndex((s) => s.id === data.shopId);

      if (index !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }
  };

  // Recenter map function
  const recenterMap = () => {
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ type: "RECENTER" }));

      setTimeout(() => {
        //setIsAway(false);
      }, 100);
    } else {
      console.warn("Webview ref is null!!");
    }
  };

  // leaflet HTML map
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Lobster&display=swap" rel="stylesheet">
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        #map { height: 100vh; width: 100vw; margin: 0; padding: 0; background: #f0f0f0; }
        html, body { margin: 0; padding: 0; height: 100%; }
        .leaflet-control-attribution { display: none; }
        
        /* Shop marker — remove default white box from divIcon */
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }

        /* Custom Popup Styling */
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 5px;
          font-family: sans-serif;
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }

        #name{
          color: ${COLORS.namStackMainColor};       
          font-family: "Lobster", sans-serif;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
       // 1. Define Base Layers
       var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
        
        var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        // Store user location in a global variable within JS
        var userLat = ${location?.lat || 0};
        var userLng = ${location?.lng || 0};

        // 2. Initialize Map with Satellite as default
        var map = L.map('map', { 
          zoomControl: false,
          layers: [satelliteLayer] // Default view
        }).setView([userLat, userLng], 13);

        // 3. Add Layer Toggle Control (Top Right)
        var baseMaps = {
          "Satellite": satelliteLayer,
          "Streets": streetLayer
        };
        L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

        // Define Shop Icon using divIcon for reliable rendering on Android WebView
        var shopIcon = L.divIcon({
          className: '',
          html: '<img src="${mapIconUri}" style="width:48px;height:48px;display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));" />',
          iconSize: [48, 48],
          iconAnchor: [24, 48],
          popupAnchor: [0, -50]
        });

        // Add User Marker (Blue Pulse Circle)
        L.circleMarker([userLat, userLng], {
          radius: 10,
          fillColor: "#2A87FF",
          color: "#fff",
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map).bindPopup("You are here");

        // Create a Layer Group for Shop Markers so we can clear them easily
        var markerLayer = L.layerGroup().addTo(map);
        var markerObjects = {}; // To keep track of marker instances by shop ID

        // Function to Draw Markers
        function updateMarkers(shopList) {
          // Clear old markers
          markerLayer.clearLayers();
          markerObjects = {};

          shopList.forEach(shop => {
            var m = L.marker([shop.latitude, shop.longitude], { icon: shopIcon })
              .addTo(markerLayer)
              .bindPopup("<div id='name'>" + shop.name + "</div>", { className: 'custom-popup' });
            
            // Send message back to React Native when a marker is clicked
            m.on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MARKER_CLICKED',
                shopId: shop.id
              }));
            });

            markerObjects[shop.id] = m;
          });
        }

        var isRecentering = false;

        // Function to check if map is away from user
        map.on('moveend', function() {
          if (isRecentering){
            isRecentering = false;
            return;
          }

          var center = map.getCenter();
          var distance = map.distance(center, [userLat, userLng]);
          
          // If map moved more than 500 meters away from user, show the button
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_MOVED',
            isAway: distance > 500
          }));
        });

        const handleMessage = (event) => {
          // Sometimes the data is wrapped differently depending on the OS
          let message;
          try {
            message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          } catch (e) {
            return; // Not a JSON message we care about
          }

          if (message.type === 'RECENTER') {
            isRecentering = true;
            map.flyTo([userLat, userLng], 15, { animate: true, duration: 1.5 });
          }
          
          if (message.type === 'UPDATE_MARKERS') {
            updateMarkers(message.payload);
          }
          
          if (message.type === 'FOCUS_SHOP') {
            map.flyTo([message.lat, message.lng], 16);
            if (markerObjects[message.id]) markerObjects[message.id].openPopup();
          }
        };

        // Listen on BOTH window (iOS) and document (Android)
        window.addEventListener('message', handleMessage);
        document.addEventListener('message', handleMessage);

        // Listen for messages from React Native
        // window.addEventListener('message', (event) => {
        //   const message = JSON.parse(event.data);

        //   if (message.type === 'RECENTER') {
        //     isRecentering = true;
        //     map.flyTo([userLat, userLng], 15);
        //   }

        //   if (message.type === 'FOCUS_SHOP') {
        //     map.flyTo([message.lat, message.lng], 15, { animate: true, duration: 1.5 });
            
        //     // Optional: Auto-open popup when swiped to in the carousel
        //     if (markerObjects[message.id]) {
        //        markerObjects[message.id].openPopup();
        //     }
        //   }

        //   if (message.type === 'UPDATE_MARKERS') {
        //     updateMarkers(message.payload);
        //   }
        // });

        // Initial Load
        updateMarkers(${JSON.stringify(shops)});
      </script>
    </body>
    </html>
  `;

  const onShopSwipe = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && webviewRef.current) {
      const shop = viewableItems[0].item;
      // Fixed: match the type string used in the HTML 'message' listener
      webviewRef.current.postMessage(
        JSON.stringify({
          type: "FOCUS_SHOP",
          lat: shop.latitude,
          lng: shop.longitude,
          id: shop.id,
        }),
      );
    }
  }).current;

  const getShopStatus = (item) => {
    // If your DB has an 'is_open' boolean, use it.
    // Otherwise, here is a simple time-based check:
    const now = new Date();
    const hour = now.getHours();

    // Example: Shops are open between 8 AM and 8 PM
    const isOpen = hour >= 8 && hour < 20;

    return {
      label: isOpen ? "Open" : "Closed",
      color: isOpen ? "#22C55E" : "#EF4444", // Green for open, Red for closed
      bgColor: isOpen ? "#DCFCE7" : "#FEE2E2",
    };
  };

  const formatName = (name) => {
    if (!name) return "";
    return name.length > 12 ? name.substring(0, 12).trim() + ".." : name;
  };

  // Open shop direction function
  const openDirections = (shop) => {
    const lat = shop.latitude;
    const lng = shop.longitude;
    const label = shop.name;

    const urlApple = `maps:0,0?q=${label}@${lat},${lng}`;
    const urlGoogle = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Apple Maps", "Google Maps"],
          cancelButtonIndex: 0,
          title: "Get Directions",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) Linking.openURL(urlApple);
          if (buttonIndex === 2) Linking.openURL(urlGoogle);
        },
      );
    } else {
      Alert.alert("Get Directions", "Which map would you like to use?", [
        { text: "Google Maps", onPress: () => Linking.openURL(urlGoogle) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  // Render shop card function
  const renderShopCard = ({ item }) => {
    const status = getShopStatus(item);

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        {/* Shop Name + Distance */}
        <View style={styles.cardHeader}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {formatName(item.name)}
          </Text>
          <View style={[styles.distPill, { backgroundColor: isDarkMode ? "#1E1B4B" : "#EEF2FF" }]}>
            <Ionicons name="location-outline" size={12} color="#6366F1" />
            <Text style={styles.distPillText}>
              {(item.dist_meters / 1000).toFixed(2)} km
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text
          style={[styles.description, { color: isDarkMode ? "#9CA3AF" : "#6B7280" }]}
          numberOfLines={2}
        >
          {item.description || "Discover amazing products at this local shop."}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => navigation.navigate("ShopDetails", { shopId: item.id })}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#6366F1", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shopNowGradient}
            >
              <Ionicons name="storefront-outline" size={16} color="#fff" />
              <Text style={styles.shopNowText}>Shop Now</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.directionsBtn, { backgroundColor: isDarkMode ? "#2C2C3E" : "#F3F4F6" }]}
            onPress={() => openDirections(item)}
          >
            <Ionicons name="navigate" size={22} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render filter modal
  const renderFilterModal = () => {
    const activeFilters = getActiveFilterCount();

    return (
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Filters
              </Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Radius Section */}
              <View
                style={[
                  styles.filterSection,
                  { borderBottomColor: isDarkMode ? "#333" : "#f0f0f0" },
                ]}
              >
                <Text style={[styles.filterLabel, { color: colors.text }]}>
                  Search Radius
                </Text>
                <Text style={styles.radiusValue}>
                  {(tempRadius / 1000).toFixed(0)} km
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={5000}
                  maximumValue={50000}
                  step={5000}
                  value={tempRadius}
                  onValueChange={setTempRadius}
                  minimumTrackTintColor="#6366F1"
                  maximumTrackTintColor={isDarkMode ? "#555" : "#ddd"}
                  thumbTintColor="#6366F1"
                />
                <View style={styles.radiusLabels}>
                  <Text
                    style={[
                      styles.radiusLabelText,
                      { color: isDarkMode ? "#aaa" : "#999" },
                    ]}
                  >
                    5 km
                  </Text>
                  <Text
                    style={[
                      styles.radiusLabelText,
                      { color: isDarkMode ? "#aaa" : "#999" },
                    ]}
                  >
                    50 km
                  </Text>
                </View>
              </View>

              {/* Category Section */}
              <View
                style={[
                  styles.filterSection,
                  { borderBottomColor: isDarkMode ? "#333" : "#f0f0f0" },
                ]}
              >
                <Text style={[styles.filterLabel, { color: colors.text }]}>
                  Category
                </Text>
                <View style={styles.categoryGrid}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      { backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5" },
                      tempCategory === "all" && styles.categoryChipActive,
                    ]}
                    onPress={() => setTempCategory("all")}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={16}
                      color={
                        tempCategory === "all"
                          ? "#fff"
                          : isDarkMode
                            ? "#aaa"
                            : "#666"
                      }
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isDarkMode ? "#aaa" : "#666" },
                        tempCategory === "all" && styles.categoryChipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5" },
                        tempCategory === cat.name && styles.categoryChipActive,
                      ]}
                      onPress={() => setTempCategory(cat.name)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: isDarkMode ? "#aaa" : "#666" },
                          tempCategory === cat.name &&
                            styles.categoryChipTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.resetBtn,
                  { borderColor: isDarkMode ? "#555" : "#ddd" },
                ]}
                onPress={resetFilters}
              >
                <Text
                  style={[
                    styles.resetBtnText,
                    { color: isDarkMode ? "#aaa" : "#666" },
                  ]}
                >
                  Reset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  {
    /** Render search bar */
  }
  const renderSearchBar = () => {
    const isSearching = searchQuery !== debouncedQuery;
    const activeFilters = getActiveFilterCount();

    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchWrapper,
              {
                backgroundColor: isDarkMode ? "#1e1e1e" : "white",
                borderColor: colors.border,
                borderWidth: 2,
              },
            ]}
          >
            {isSearching ? (
              <ActivityIndicator
                size="small"
                color={colors.text}
                style={styles.searchIcon}
              />
            ) : (
              <Ionicons
                name="search"
                size={20}
                color={isDarkMode ? "#aaa" : "#999"}
                style={styles.searchIcon}
              />
            )}

            <TextInput
              style={[
                styles.searchInput,
                { color: isDarkMode ? colors.text : "#333" },
              ]}
              placeholder="Search shop name..."
              placeholderTextColor={isDarkMode ? "#666" : "#999"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setTempRadius(radius);
              setTempCategory(selectedCategory);
              setShowFilterModal(true);
            }}
          >
            <Ionicons name="options-outline" size={22} color="#fff" />
            {activeFilters > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilters}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active filters display */}
        {(radius !== 30000 || selectedCategory !== "all") && (
          <View style={styles.activeFiltersRow}>
            {radius !== 30000 && (
              <View
                style={[
                  styles.activeFilterChip,
                  { backgroundColor: isDarkMode ? "#1e1e1e" : "#fff" },
                ]}
              >
                <Text
                  style={[
                    styles.activeFilterText,
                    { color: isDarkMode ? "#ccc" : "#333" },
                  ]}
                >
                  {(radius / 1000).toFixed(0)} km
                </Text>
                <TouchableOpacity onPress={() => setRadius(30000)}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={isDarkMode ? "#aaa" : "#666"}
                  />
                </TouchableOpacity>
              </View>
            )}
            {selectedCategory !== "all" && (
              <View
                style={[
                  styles.activeFilterChip,
                  { backgroundColor: isDarkMode ? "#1e1e1e" : "#fff" },
                ]}
              >
                <Text
                  style={[
                    styles.activeFilterText,
                    { color: isDarkMode ? "#ccc" : "#333" },
                  ]}
                >
                  {selectedCategory}
                </Text>
                <TouchableOpacity onPress={() => setSelectedCategory("all")}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={isDarkMode ? "#aaa" : "#666"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <Ionicons
          name="search-outline"
          size={60}
          color={isDarkMode ? "#555" : "#ccc"}
        />
        <Text style={[styles.emptyTitle, { color: colors.text,fontFamily:FONTS.regular }]}>
          No shops found
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: isDarkMode ? "#aaa" : "#666", fontFamily: FONTS.regular },
          ]}
        >
          We couldn't find any shops matching "{searchQuery}"
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={clearSearch}>
          <Text style={styles.resetButtonText}>Clear Search</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const noNearbyShops = () => {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <View
          style={[
            styles.emptyIconWrapper,
            { backgroundColor: isDarkMode ? "#1a2a3a" : "#EAF3FF" },
          ]}
        >
          <Ionicons
            name="storefront-outline"
            size={50}
            color={COLORS.namStackMainColor}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: FONTS.regular }]}>
          No shops nearby
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: isDarkMode ? "#aaa" : "#666", fontFamily: FONTS.regular },
          ]}
        >
          No shops found within {(radius / 1000).toFixed(0)} km of your
          location.
        </Text>
        {radius < 50000 && (
          <TouchableOpacity
            style={styles.expandRadiusBtn}
            onPress={() => setRadius(Math.min(radius + 10000, 50000))}
          >
            <Ionicons name="expand-outline" size={18} color="#fff" />
            <Text style={styles.expandRadiusBtnText}>
              Expand to {((radius + 10000) / 1000).toFixed(0)} km
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const clearSearch = () => {
    setSearchQuery("");

    Keyboard.dismiss();
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.loadingContent}>
          <View
            style={[
              styles.loadingIconContainer,
              { backgroundColor: colors.background,borderColor: colors.border, borderWidth: 2 },
            ]}
          >
            <Ionicons
              name="location"
              size={40}
              color={colors.text}
            />
          </View>
          <ActivityIndicator
            size="large"
            color={colors.border}
            style={styles.loadingSpinner}
          />
          <Text style={[styles.loadingTitle, { color: colors.text, fontFamily: FONTS.regular }]}>
            Finding Nearby Shops
          </Text>
          <Text
            style={[
              styles.loadingSubtitle,
              { color: isDarkMode ? "#aaa" : "#666", fontFamily: FONTS.regular },
            ]}
          >
            Searching shops within {(radius / 1000).toFixed(0)} km of your location...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderSearchBar()}
      {renderFilterModal()}

      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: leafletHTML }}
        style={styles.map}
        onMessage={handleMapMessage}
      />

      {/* Refreshing indicator overlay */}
      {refreshing && (
        <View
          style={[
            styles.refreshOverlay,
            { backgroundColor: isDarkMode ? "#1e1e1e" : "#fff" },
          ]}
        >
          <ActivityIndicator size="small" color={COLORS.namStackMainColor} />
          <Text style={[styles.refreshText, { color: colors.text, fontFamily: FONTS.regular }]}>
            Updating...
          </Text>
        </View>
      )}

      {/** Recenter button */}
      {isAway && (
        <TouchableOpacity
          style={[
            styles.recenterBtn,
            { backgroundColor: isDarkMode ? "#1e1e1e" : "white" },
          ]}
          onPress={recenterMap}
        >
          <Ionicons name="locate" size={20} color={colors.text} />
          <Text style={[styles.recenterText, { color: colors.text, fontFamily: FONTS.regular }]}>
            Recenter
          </Text>
        </TouchableOpacity>
      )}

      {/* Refresh button */}
      <TouchableOpacity
        style={[
          styles.refreshBtn,
          { backgroundColor: isDarkMode ? "#1e1e1e" : "white" },
        ]}
        onPress={onRefresh}
        disabled={refreshing}
      >
        <Ionicons name="refresh" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Shop count indicator */}
      <View style={styles.shopCountBadge}>
        <Ionicons name="storefront-outline" size={14} color="#fff" />
        <Text style={[styles.shopCountText, { color: colors.text, fontFamily: FONTS.regular }]}>
          {filteredShops.length} {filteredShops.length === 1 ? "shop" : "shops"}
        </Text>
      </View>

      {(shops.length > 0) & (filteredShops.length > 0) ? (
        <FlatList
          ref={flatListRef}
          horizontal
          data={filteredShops}
          onViewableItemsChanged={onShopSwipe}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          keyExtractor={(item) => item.id.toString()}
          snapToAlignment="center"
          snapToInterval={width * 0.8 + 20}
          decelerationRate="fast"
          style={styles.carousel}
          renderItem={renderShopCard}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
        />
      ) : (
        <View>{shops.length == 0 ? noNearbyShops() : renderEmptyState()}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Enhanced loading styles
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    padding: 30,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EAF3FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loadingSpinner: {
    marginBottom: 15,
  },
  loadingTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.namStackMainColor,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  carousel: {
    position: "absolute",
    bottom: 30,
    paddingLeft: 10,
  },
  carouselContent: {
    paddingRight: 20,
  },
  card: {
    width: width * 0.82,
    marginHorizontal: 10,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.namStackMainColor,
    flex: 1,
    marginRight: 8,
  },
  dist: {
    color: COLORS.namStackMainColor,
    fontFamily: FONTS.medium,
    fontSize: 13,
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  description: {
    color: "#666",
    fontSize: 14,
    fontFamily: FONTS.regular,
    lineHeight: 20,
    marginBottom: 16,
    height: 40, // Ensures consistent card height
  },
  button: {
    backgroundColor: COLORS.namStackMainColor,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "70%",
  },
  buttonText: {
    color: "white",
    fontFamily: FONTS.bold,
    fontSize: 15,
  },

  searchContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    height: 50,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "#333",
  },
  clearButton: { padding: 5 },

  // Filter button
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: FONTS.bold,
  },

  // Active filters row
  activeFiltersRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeFilterText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "#333",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.7,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: "#333",
  },
  modalCloseBtn: {
    padding: 5,
  },
  filterSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterLabel: {
    fontFamily: FONTS.semiBold || FONTS.bold,
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  radiusValue: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: "#6366F1",
    textAlign: "center",
    marginBottom: 10,
  },
  radiusLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  radiusLabelText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#999",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: "#6366F1",
  },
  categoryChipText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#666",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 15,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  resetBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: "#666",
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: "#6366F1",
    alignItems: "center",
  },
  applyBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: "#fff",
  },

  // Refresh overlay
  refreshOverlay: {
    position: "absolute",
    top: 130,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    gap: 8,
  },
  refreshText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.namStackMainColor,
  },

  // Refresh button
  refreshBtn: {
    position: "absolute",
    bottom: 238,
    left: 20,
    backgroundColor: "white",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  // Shop count badge
  shopCountBadge: {
    position: "absolute",
    top: 130,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    elevation: 4,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  shopCountText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: "#fff",
  },

  // Empty State Styles
  emptyContainer: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    width: width * 0.9,
    backgroundColor: "white",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    elevation: 10,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EAF3FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 10,
    color: "#333",
    fontFamily: FONTS.bold,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
    fontFamily: FONTS.regular,
  },
  expandRadiusBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  expandRadiusBtnText: {
    color: "#fff",
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetButtonText: {
    color: "white",
    fontWeight: "600",
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  distBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  distText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
    marginLeft: 4,
  },
  smallButton: {
    backgroundColor: COLORS.namStackMainColor,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  // Update your title style to account for the badge space
  title: {
    fontSize: 18,
    flex: 1,
    marginRight: 10,
    fontFamily: FONTS.bold,
  },

  // Current location recenter button
  recenterBtn: {
    position: "absolute",
    bottom: 238,
    right: 20,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recenterText: {
    marginLeft: 5,
    color: COLORS.namStackMainColor,
    fontFamily: FONTS.medium,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 10,
  },

  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  directionsButton: {
    padding: 5,
  },
  distPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  distPillText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: "#6366F1",
  },
  shopNowBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  shopNowGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  shopNowText: {
    color: "#fff",
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  directionsBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  // distBadge: {
  //   backgroundColor: "#F1F5F9",
  //   paddingHorizontal: 8,
  //   paddingVertical: 6,
  //   borderRadius: 8,
  // },
  // distText: {
  //   fontSize: 12,
  //   color: "#475569",
  //   fontWeight: "bold",
  // },
  // smallButton: {
  //   backgroundColor: COLORS.namStackMainColor,
  //   paddingHorizontal: 15,
  //   paddingVertical: 10,
  //   borderRadius: 12,
  // },
});

export default GetNearbyShops;

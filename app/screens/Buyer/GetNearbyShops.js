import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
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
import { COLORS, FONTS } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

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
  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const webviewRef = useRef(null);
  const [mapIconUri, setMapIconUri] = useState(null);
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
      const matchesSearch = shop.name.toLowerCase().includes(debouncedQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || shop.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [shops, debouncedQuery, selectedCategory]);

  useEffect(() => {
    if (webviewRef.current && !loading) {
      webviewRef.current.postMessage(
        JSON.stringify({
          type: "UPDATE_MARKERS",
          payload: filteredShops,
        })
      );
    }
  }, [filteredShops, loading]);

  useEffect(() => {
    // Loading nearby shops data
    loadData();
    loadCategories();

    // Loading map marker icon
    const source = Image.resolveAssetSource(
      require("../../../assets/shop-icon.png")
    );
    setMapIconUri(source.uri);
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
        "We need location to find shops near you."
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

        // Define Shop Icon
        var shopIcon = L.icon({
          iconUrl: '${mapIconUri}', 
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -34]
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
        })
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
        }
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
      <View style={styles.card}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={1}>
            {formatName(item.name)}
          </Text>
          <Text style={styles.dist}>
            {(item.dist_meters / 1000).toFixed(2)} {"km".toLocaleLowerCase()}
          </Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description || "Discover amazing products at this local shop."}
        </Text>
        <View style={styles.cardFooter}>
          {/** Shop now button */}
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              navigation.navigate("ShopDetails", { shopId: item.id })
            }
          >
            <Text style={styles.buttonText}>Shop Now</Text>
          </TouchableOpacity>
          {/** Get directions */}
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={() => openDirections(item)}
          >
            <Ionicons
              name="navigate-circle"
              size={45}
              color={COLORS.namStackMainColor}
            />
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
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Radius Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Search Radius</Text>
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
                  minimumTrackTintColor={COLORS.namStackMainColor}
                  maximumTrackTintColor="#ddd"
                  thumbTintColor={COLORS.namStackMainColor}
                />
                <View style={styles.radiusLabels}>
                  <Text style={styles.radiusLabelText}>5 km</Text>
                  <Text style={styles.radiusLabelText}>50 km</Text>
                </View>
              </View>

              {/* Category Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      tempCategory === "all" && styles.categoryChipActive,
                    ]}
                    onPress={() => setTempCategory("all")}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={16}
                      color={tempCategory === "all" ? "#fff" : "#666"}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
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
                        tempCategory === cat.name && styles.categoryChipActive,
                      ]}
                      onPress={() => setTempCategory(cat.name)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
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
                style={styles.resetBtn}
                onPress={resetFilters}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={applyFilters}
              >
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
          <View style={styles.searchWrapper}>
            {isSearching ? (
              <ActivityIndicator
                size="small"
                color={COLORS.namStackMainColor}
                style={styles.searchIcon}
              />
            ) : (
              <Ionicons
                name="search"
                size={20}
                color="#999"
                style={styles.searchIcon}
              />
            )}

            <TextInput
              style={styles.searchInput}
              placeholder="Search shop name..."
              placeholderTextColor={"#999"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
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
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {(radius / 1000).toFixed(0)} km
                </Text>
                <TouchableOpacity onPress={() => setRadius(30000)}>
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCategory !== "all" && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{selectedCategory}</Text>
                <TouchableOpacity onPress={() => setSelectedCategory("all")}>
                  <Ionicons name="close-circle" size={16} color="#666" />
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
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={60} color="#ccc" />
        <Text style={styles.emptyTitle}>No shops found</Text>
        <Text style={styles.emptySubtitle}>
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
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="storefront-outline" size={50} color={COLORS.namStackMainColor} />
        </View>
        <Text style={styles.emptyTitle}>No shops nearby</Text>
        <Text style={styles.emptySubtitle}>
          No shops found within {(radius / 1000).toFixed(0)} km of your location.
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
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="location" size={40} color={COLORS.namStackMainColor} />
          </View>
          <ActivityIndicator
            size="large"
            color={COLORS.namStackMainColor}
            style={styles.loadingSpinner}
          />
          <Text style={styles.loadingTitle}>Finding Nearby Shops</Text>
          <Text style={styles.loadingSubtitle}>
            Searching within {(radius / 1000).toFixed(0)} km of your location...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.refreshOverlay}>
          <ActivityIndicator size="small" color={COLORS.namStackMainColor} />
          <Text style={styles.refreshText}>Updating...</Text>
        </View>
      )}

      {/** Recenter button */}
      {isAway && (
        <TouchableOpacity style={styles.recenterBtn} onPress={recenterMap}>
          <Ionicons name="locate" size={20} color={COLORS.namStackMainColor} />
          <Text style={styles.recenterText}>Recenter</Text>
        </TouchableOpacity>
      )}

      {/* Refresh button */}
      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={onRefresh}
        disabled={refreshing}
      >
        <Ionicons
          name="refresh"
          size={20}
          color={COLORS.namStackMainColor}
        />
      </TouchableOpacity>

      {/* Shop count indicator */}
      <View style={styles.shopCountBadge}>
        <Ionicons name="storefront-outline" size={14} color="#fff" />
        <Text style={styles.shopCountText}>
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
    backgroundColor: "white",
    width: width * 0.8,
    marginHorizontal: 10,
    padding: 16,
    borderRadius: 20,
    padding: 20,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
    backgroundColor: COLORS.namStackMainColor,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    color: COLORS.namStackMainColor,
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
    backgroundColor: COLORS.namStackMainColor,
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
    backgroundColor: COLORS.namStackMainColor,
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
    backgroundColor: COLORS.namStackMainColor,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 5,
    elevation: 3,
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
    backgroundColor: COLORS.namStackMainColor,
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
    backgroundColor: COLORS.namStackMainColor,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  resetButtonText: {
    color: "white",
    fontWeight: "600",
  },
  statusBadge: {
    position: "absolute",
    top: 22,
    right: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
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
    fontSize: 17,
    color: COLORS.namStackMainColor,
    maxWidth: "70%",
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
    marginTop: 10,
  },

  footerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  directionsButton: {
    padding: 5,
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

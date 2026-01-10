import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import supabase from "../../lib/supabase";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { COLORS, FONTS } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

function GetNearbyShops({ navigation }) {
  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const webviewRef = useRef(null);
  const [mapIconUri, setMapIconUri] = useState(null);
  const flatListRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Effect to handle the debouncing timer
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  useEffect(() => {
    if (webviewRef.current && !loading) {
      webviewRef.current.postMessage(
        JSON.stringify({
          type: "UPDATE_MARKERS",
          payload: filteredShops,
        })
      );
    }
  }, [debouncedQuery, shops]);

  useEffect(() => {
    // Loading nearby shops data
    loadData();

    // Loading map marker icon
    const source = Image.resolveAssetSource(
      require("../../../assets/shop.png")
    );
    setMapIconUri(source.uri);
  }, []);

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

      // 2. Fetch from Supabase
      const { data, error } = await supabase.rpc("get_nearby_shops", {
        user_lat: coords.lat,
        user_lng: coords.lng,
        radius_meters: 30000,
      });

      if (error) throw error;
      setShops(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);

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

  // 3. Keep the HTML string outside or memoized to prevent unnecessary re-renders
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        #map { height: 100vh; width: 100vw; margin: 0; padding: 0; background: #f0f0f0; }
        html, body { margin: 0; padding: 0; height: 100%; }
        .leaflet-control-attribution { display: none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${location?.lat || 0}, ${
    location?.lng || 0
  }], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var userIcon = L.circle([${location?.lat || 0}, ${
    location?.lng || 0
  }], {
          color: '#2A87FF', fillOpacity: 0.4, radius: 0
        }).addTo(map);

        var shopIcon = L.icon({
          iconUrl: '${mapIconUri}', 
          iconSize: [30, 30], 
          iconAnchor: [19, 38], 
          popupAnchor: [0, -34] 
        });

        var markers = [];
        
        function setMarkers(shopList) {
          shopList.forEach(shop => {
            var m = L.marker([shop.latitude, shop.longitude],{icon:shopIcon})
              .addTo(map)
              .bindPopup(shop.name);

             // Add click listener to marker
            m.on('click', function() {
              const message = JSON.stringify({
                type: 'MARKER_CLICKED',
                shopId: shop.id
              });
              window.ReactNativeWebView.postMessage(message);
            });

            markers[shop.id] = m;
            markers.push(m);
          });
         
        }

        window.addEventListener('message', (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'FOCUS_SHOP') {
            map.flyTo([message.lat, message.lng], 15, { animate: true, duration: 1.5 });
          }

          if (message.type === 'UPDATE_MARKERS'){
            markerLayer.clearLayers();

            message.payload.forEach(shop => {
              L.marker([shop.latitude,shop.longitude],{icon: shopIcon})
              .addTo(markerLayer)
              .bindPopup(shop.name)
            })
          }
        });

        setMarkers(${JSON.stringify(shops)});
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

    // Example: Shops are open between 9 AM and 9 PM
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

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate("ShopDetails", { shopId: item.id })
          }
        >
          <Text style={styles.buttonText}>Shop Now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  {
    /** Render search bar */
  }
  const renderSearchBar = () => {
    const isSearching = searchQuery !== debouncedQuery;

    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          {isSearching ? (
            <ActivityIndicator
              size="small"
              color="#2A87FF"
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
      </View>
    );
  };

  const renderEmptyState = () => {
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No shops found</Text>
      <Text style={styles.emptySubtitle}>
        We couldn't find any shops matching "{searchQuery}"
      </Text>
      <TouchableOpacity style={styles.resetButton} onPress={clearSearch}>
        <Text style={styles.resetButtonText}>Clear Search</Text>
      </TouchableOpacity>
    </View>;
  };

  const clearSearch = () => {
    setSearchQuery("");

    Keyboard.dismiss();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ fontFamily: FONTS.regular }}>
          Finding shops nearby...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSearchBar()}
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: leafletHTML }}
        style={styles.map}
        onMessage={handleMapMessage}
      />

      {filteredShops.length > 0 ? (
        <FlatList
          ref={flatListRef}
          horizontal
          //data={shops}
          data={filteredShops}
          onViewableItemsChanged={onShopSwipe}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          keyExtractor={(item) => item.id.toString()}
          snapToAlignment="center"
          snapToInterval={width * 0.8 + 20}
          decelerationRate="fast"
          style={styles.carousel}
          renderItem={renderShopCard}
        />
      ) : (
        searchQuery.length > 0 && renderEmptyState()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  carousel: {
    position: "absolute",
    bottom: 30,
    paddingLeft: 10,
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
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },
  dist: {
    color: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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

  searchInput: {
    backgroundColor: "white",
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: FONTS.regular,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  searchWrapper: {
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: "#2A87FF",
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
    backgroundColor: "#2A87FF",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  // Update your title style to account for the badge space
  title: {
    fontSize: 17,
    color: "#1a1a1a",
    maxWidth: "70%",
    fontFamily: FONTS.bold,
  },
});

export default GetNearbyShops;

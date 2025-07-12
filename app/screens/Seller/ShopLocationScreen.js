import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Share,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { FONTS, COLORS } from "../../constants/theme";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_700Bold,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import useAuthStore from "../../store/authStore";
import supabase from "../../lib/supabase";

function ShopLocationScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shopData, setShopData] = useState(null);
  const { shopId } = route.params;
  const { user } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  const getLocation = async () => {
    setLoading(true);

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to use this feature."
        );
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      });
    } catch (error) {
      console.log("Location error: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLocation(null);
    setShopData(null);
    getLocation();
    fetchShopDetails();
  }, [shopId]);

  // Map Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      getLocation();
    }, 15000); // refresh every 15 seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  // Share location function
  const shareLocation = async () => {
    if (!location || !shopData) {
      Alert.alert("Error", "Location or shop data not available");
      return;
    }

    const message = `📍 ${shopData.name} Location:
    Latitude: ${location.latitude}
    Longitude: ${location.longitude}
    View on Google Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}`;

    try {
      await Share.share({
        message,
      });
    } catch (error) {
      console.error("Share error:", error.message);
      Alert.alert("Error", "Failed to share location.");
    }
  };

  // Fetch shop details function
  const fetchShopDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopId)
        .single();

      if (error) throw error;

      console.log("Location shop data: ", data.name);

      if (!data) {
        Alert.alert("Error", "Shop not found");
        navigation.goBack();
        return;
      }

      setShopData(data);
    } catch (error) {
      onsole.error("Error fetching shop details:", error.message);
      Alert.alert("Error", "Failed to load shop  for location");
    } finally {
      setLoading(false);
    }
  };

  const saveShopCordinates = async () => {
    if (!location || !shopId) return;

    if (
      location &&
      location.latitude === loc.coords.latitude &&
      location.longitude === loc.coords.longitude
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("shops")
        .update({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          updated_at: new Date().toISOString(),
        })
        .eq("id", shopId);

      if (error) throw error;

      Alert.alert("Success", "Saved shop cordinates");
    } catch (error) {
      console.error("Supabase save error:", error.message);
      Alert.alert("Error", "Failed to save coordinates.");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topPanel}>
        <Text style={styles.topPanelTitle}>
          📍 {shopData?.name || "Shop"}'s shop Coordinates
        </Text>
        {/* <Text style={styles.coord}>
          Lati: {location?.latitude} | Long: {location?.longitude} | Acc:{" "}
          {location?.accuracy}
        </Text>
         */}

        {/* {location && ( */}
        <Text style={styles.coord}>
          {/* Update, save, and share your shop location here. */}
          {/* <Text style={styles.label}>Lati:</Text> {location?.latitude} |
            <Text style={styles.label}> Long:</Text> {location?.longitude} |
            <Text style={styles.label}> Acc:</Text> {location?.accuracy} */}
        </Text>
        {/* {location && (
          <View style={styles.coordBadge}>
            <Text style={styles.coordText}>
              <Text style={styles.label}>Lati:</Text>{" "}
              {location.latitude.toFixed(6)}{" "}
              <Text style={styles.label}>| Long:</Text>{" "}
              {location.longitude.toFixed(6)}
            </Text>
          </View>
        )} */}
        {location && (
          <View style={styles.popoverContainer}>
            <View style={styles.popoverBox}>
              <Text style={styles.popoverText}>
                <Text style={styles.label}>Lati:</Text>{" "}
                {location.latitude.toFixed(6)}
                {"\n"}
                <Text style={styles.label}>Long:</Text>{" "}
                {location.longitude.toFixed(6)}
                {"\n"}
                <Text style={styles.label}>Acc:</Text>{" "}
                {/* {location.accuracy.toFixed(1)}m */}
                <Text
                  style={[
                    styles.accuracyValue,
                    location.accuracy > 50
                      ? styles.accuracyBad
                      : styles.accuracyGood,
                  ]}
                >
                  {location.accuracy.toFixed(1)} m
                </Text>
              </Text>
            </View>
            <View style={styles.popoverArrow} />
          </View>
        )}
        {/* )} */}
      </View>
      {location ? (
        <>
          {/* <View style={{ backgroundColor: "transparent" }}>
            <Text style={styles.coord}>
              <Text style={styles.label}>Latitude:</Text> {location.latitude}
            </Text>
            <Text style={styles.coord}>
              <Text style={styles.label}>Longitude:</Text> {location.longitude}
            </Text>
            <Text style={styles.coord}>
              <Text style={styles.label}>Accuracy:</Text> {location.accuracy}
            </Text>
          </View> */}
          <MapView
            style={styles.map}
            region={{
              ...location,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker coordinate={location} title={shopData?.name}>
              <View style={styles.markerPopover}>
                <View style={styles.markerBubble}>
                  <Image
                    source={require("../../../assets/shop.png")}
                    style={styles.markerIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.markerArrow} />
              </View>
            </Marker>
          </MapView>
        </>
      ) : (
        <Text style={{ fontFamily: FONTS.regular }}>
          {loading ? "Fetching location..." : "Location not available."}
        </Text>
      )}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity style={styles.button} onPress={getLocation}>
          <MaterialIcons name="refresh" size={30} color="#FFF" />
          {/* <Text style={styles.buttonText}>Refresh Location</Text> */}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { marginTop: 10 }]}
          onPress={saveShopCordinates}
        >
          <MaterialIcons name="save" size={30} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { marginTop: 10 }]}
          onPress={shareLocation}
        >
          <MaterialIcons name="share" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default ShopLocationScreen;

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    right: 20,
    bottom: 95,
    flexDirection: "column",
    alignItems: "center",
    gap: 10, // for modern RN, or use margin if not supported
  },
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontFamily: FONTS.bold,
  },
  coord: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "center",
  },
  button: {
    backgroundColor: COLORS.namStackMainColor,
    padding: 10,
    // width: "15%",
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.white,
  },
  map: {
    flex: 1,
    marginTop: 10,
    borderRadius: 10,
  },
  label: {
    fontFamily: FONTS.bold,
    color: COLORS.namStackMainColor,
  },
  customMarker: {
    backgroundColor: COLORS.background, // or any color you prefer
    borderColor: COLORS.namStackMainColor,
    borderWidth: 3,
    padding: 10,
    borderRadius: 999, // full circle
    alignItems: "center",
    justifyContent: "center",
    elevation: 5, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  markerIcon: {
    width: 20,
    height: 20,
  },

  topPanel: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)", // translucent white
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },

  coordBadge: {
    position: "absolute",
    top: 100,
    left: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },

  topPanelTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.namStackMainColor,
    textAlign: "center",
  },

  accuracyValue: {
    fontFamily: FONTS.regular,
  },

  accuracyGood: {
    color: "green",
  },

  accuracyBad: {
    color: "red",
  },

  // Pop over
  popoverContainer: {
    position: "absolute",
    top: 90,
    left: 20,
    zIndex: 10,
    alignItems: "flex-start",
  },

  popoverBox: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },

  popoverArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#fff",
    marginLeft: 10,
  },

  popoverText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "#333",
  },

  // Maker
  markerPopover: {
    alignItems: "center",
  },

  markerBubble: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.namStackMainColor,
  },

  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.namStackMainColor,
    marginTop: -1,
  },

  markerIcon: {
    width: 24,
    height: 24,
  },
});

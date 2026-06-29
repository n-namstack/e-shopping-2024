import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import ServiceProviderCard from "../../components/ServiceProviderCard";
import useBookingStore from "../../store/bookingStore";
import { FONTS } from "../../constants/theme";

const CATEGORIES = [
  "All",
  "Beauty & Wellness",
  "Health",
  "Tech Repair",
  "Automotive",
  "Home Services",
  "Education",
  "Other",
];

export default function BrowseServicesScreen({ navigation }) {
  const { colors } = useTheme();
  const { providers, loading, fetchProviders } = useBookingStore();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProviders({ category: selectedCategory, search });
  }, [selectedCategory]);

  const onSearch = () => {
    fetchProviders({ category: selectedCategory, search });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProviders({ category: selectedCategory, search });
    setRefreshing(false);
  }, [selectedCategory, search]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <LinearGradient
        colors={["#312E81", "#4F46E5", "#7C3AED"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Services</Text>
            <Text style={styles.headerSub}>
              Book trusted local professionals
            </Text>
          </View>
          <View style={styles.bubble1} />
          <View style={styles.bubble2} />
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search service providers..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={onSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  fetchProviders({ category: selectedCategory, search: "" });
                }}
              >
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Category chips */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
        renderItem={({ item }) => {
          const active = selectedCategory === item;
          return (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? "#6366F1" : colors.card,
                  borderColor: active ? "#6366F1" : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? "#fff" : colors.text },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Providers list */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="business-outline" size={56} color={colors.text + "30"} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No providers found
              </Text>
              <Text style={[styles.emptyText, { color: colors.text + "70" }]}>
                Try a different category or search term
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ServiceProviderCard
              provider={item}
              onPress={() =>
                navigation.navigate("ServiceProviderProfile", {
                  providerId: item.id,
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FONTS.bold,
    color: "#fff",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  bubble1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -30,
    right: -20,
  },
  bubble2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: 20,
    right: 60,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  categoriesRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: "center",
  },
});

import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { COLORS } from "../../constants/theme";

export default function LeafletMap({ latitude, longitude, title }) {
  const [iconUri, setIconUri] = useState(null);

  useEffect(() => {
    const source = Image.resolveAssetSource(
      require("../../../assets/shop-icon.png")
    );
    setIconUri(source.uri);
  }, []);

  if (!iconUri) return <View style={{ flex: 1, backgroundColor: "#fff" }} />;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Lobster&display=swap" rel="stylesheet">
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <style>
          html, body { margin: 0; padding: 0; height: 100%; }
          #map { height: 100%; width: 100%; }

          #name{
            color: ${COLORS.namStackMainColor};       
            font-family: "Lobster", sans-serif;
          }
        </style>
      </head>

      <body>
        <div id="map"></div>

        <script>
          const lat = ${latitude};
          const lng = ${longitude};
          const popupTitle = "${title}";
          const iconUrl = "${iconUri}";

          const map = L.map('map').setView([lat, lng], 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          const customIcon = L.icon({
            iconUrl: iconUrl,
            iconSize: [30, 30],
            iconAnchor: [22, 45],
            popupAnchor: [0, -40]
          });

          L.marker([lat, lng], { icon: customIcon })
            .addTo(map)
            .bindPopup("<div id='name'>" + popupTitle + "</div>")
            .openPopup();
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 0,
    padding: 0, 
  },
  webview: {
    flex: 1, 
    margin: 0,
    padding: 0,
  },
});

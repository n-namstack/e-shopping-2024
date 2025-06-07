# Required Dependencies for Interactive Product Features

To use the new interactive features in the ProductDetailsScreen, you need to install the following dependencies:

## Core Dependencies

```bash
# React Native Gesture Handler (for pinch-to-zoom and pan gestures)
npm install react-native-gesture-handler

# React Native Reanimated (for smooth animations)
npm install react-native-reanimated

# React Native Chart Kit (for price history charts)
npm install react-native-chart-kit react-native-svg
```

## iOS Setup (if using iOS)

For iOS, add the following to your `ios/Podfile`:

```ruby
pod 'RNGestureHandler', :path => '../node_modules/react-native-gesture-handler'
pod 'RNReanimated', :path => '../node_modules/react-native-reanimated'
```

Then run:
```bash
cd ios && pod install
```

## Android Setup

For Android, make sure your `android/app/build.gradle` includes:

```gradle
implementation project(':react-native-gesture-handler')
implementation project(':react-native-reanimated')
implementation project(':react-native-svg')
```

## Metro Configuration

Add to your `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('svg');

module.exports = config;
```

## Expo Configuration

If using Expo, add to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      "react-native-reanimated/plugin"
    ]
  }
}
```

## Usage Notes

1. **ImageZoom Component**: Uses react-native-gesture-handler and react-native-reanimated for smooth pinch-to-zoom functionality
2. **Product360View Component**: Implements drag-to-rotate with gesture detection
3. **PriceHistory Component**: Uses react-native-chart-kit for beautiful price trend charts
4. **All Components**: Fully reusable and customizable with props

## Alternative: Manual Installation

If you prefer not to install these dependencies, you can:

1. Replace `ImageZoom` with a simple `Image` component
2. Replace `Product360View` with a regular image carousel
3. Replace `PriceHistory` charts with simple text summaries
4. Keep all other components as they work with built-in React Native components

The components are designed to gracefully handle missing dependencies and will fall back to simpler implementations. 
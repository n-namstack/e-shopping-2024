# E-Shopping Namibia - React Native + Supabase App

A scalable e-commerce mobile application for the Namibian market, built with React Native and Supabase. The app supports two user types (Sellers and Buyers) and features a detailed product handling workflow.

## 🚀 Features

### For Buyers:
- Browse products without an account
- Register/login to purchase
- Multiple payment methods (Cash/Card/PayToday/eWallet)
- Order tracking 
- Product reviews
- Shop following

### For Sellers:
- Seller verification process
- Shop management
- Product listing (In Stock or On Order)
- Order fulfillment
- Sales analytics

### Product Types:
- **In Stock:** Direct purchase with immediate availability
- **On Order:** 50% deposit required, with order tracking and final payment upon arrival

## 📁 Project Structure

```
app/
├── components/         # Reusable UI components
│   ├── ui/             # Basic UI elements (buttons, inputs, etc.)
│   ├── layouts/        # Layout components
│   ├── forms/          # Form components
│   ├── product/        # Product-related components
│   ├── seller/         # Seller-specific components
│   ├── buyer/          # Buyer-specific components
│   └── common/         # Shared components
├── screens/            # App screens
│   ├── Auth/           # Authentication screens
│   ├── Buyer/          # Buyer screens
│   └── Seller/         # Seller screens
├── navigation/         # Navigation configuration
├── lib/                # Library configuration (Supabase)
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
├── assets/             # Static assets
├── styles/             # Global styles
├── constants/          # App constants
└── utils/              # Utility functions
```

## 🔧 Tech Stack

- **Frontend**: React Native (Expo)
- **State Management**: Zustand
- **Backend**: Supabase
  - Authentication
  - Database
  - Storage
  - Realtime Subscriptions
- **UI**: NativeWind (Tailwind CSS)
- **Navigation**: React Navigation
- **Payments**: Multiple payment gateways integration

## 🔌 Supabase Setup

The app uses Supabase for backend services. The schema is designed to support:

- User authentication and profiles
- Shop management
- Product listings
- Order processing
- Review systems
- Real-time notifications

See `app/lib/supabaseSchema.sql` for the complete database schema.

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a Supabase project and update credentials in `app/lib/supabase.js`
4. Run the SQL from `app/lib/supabaseSchema.sql` in your Supabase SQL editor
5. Start the development server: `npm start`

## 📱 Application Flow

### Seller Flow:
1. Register and submit verification documents
2. Wait for approval
3. Create shops
4. Add products (In Stock or On Order)
5. Process orders and update tracking

### Buyer Flow:
1. Browse available products (no account needed)
2. Register/login to purchase
3. Select payment method
4. Complete purchase and track orders

### Product Flow:
- **In Stock Products**:
  - Direct purchase
  - Choose delivery or pickup
  - Pay on delivery or upfront

- **On Order Products**:
  - 50% deposit payment
  - Seller places order with supplier
  - Tracking updates
  - Notification when product arrives
  - Remaining payment
  - Delivery or pickup

## 📋 License

# e-shopping-2024
# ShopIt – Tester's Guide

**App name:** ShopIt  
**Platform:** Android & iOS (React Native / Expo)  
**Backend:** Supabase (PostgreSQL + Realtime + Storage)  
**Payment gateway:** DPO Group (Direct Pay Online) — NAD currency  

---

## User Roles

The app has three distinct roles. Each role sees a completely different interface.

| Role | Description |
|------|-------------|
| **Buyer** | Browses and purchases products from local shops |
| **Seller** | Creates shops, lists products, and fulfils orders |
| **Admin** | Approves seller verifications and manages payouts (accessed from Seller profile) |

---

## 1. Authentication & Onboarding

### Screens
- Welcome Screen
- Onboarding (first-time walkthrough slides)
- Register (Buyer)
- Register (Seller) — separate flow
- Login
- Forgot Password
- Social Profile Completion (after Facebook/social login)
- Verification Pending

### Test Cases
- [ ] Register a new Buyer account with email & password
- [ ] Register a new Seller account
- [ ] Log in with valid credentials
- [ ] Log in with wrong password — error message shown
- [ ] Tap "Forgot Password" — email is sent
- [ ] Complete the onboarding walkthrough as a first-time user
- [ ] Log out and log back in — session is restored correctly
- [ ] Facebook/social login → social profile completion screen appears if name/details are missing

---

## 2. Buyer App

### Navigation Tabs
| Tab | Screens |
|-----|---------|
| Browse | Browse Products, Product Details, Shop Details, Favorites, All Products, Notifications, Nearby Shops |
| Shops | Shops List, Shop Details, Browse Products, Product Details |
| Cart | Cart, Checkout, Payment, DPO WebView, Payment Processing, Order Success |
| Orders | Orders List, Order Details, Order Tracking |
| Profile | Profile, Edit Profile, My Orders, Shipping Address, Payment Methods, Help Center, Terms & Privacy, Become a Seller, Account Deletion |

---

### 2.1 Browse Products (Home)

- [ ] Products list loads with images, names, prices, and shop names
- [ ] Every product card shows the **actual shop name** (not "@Shop" or a placeholder)
- [ ] Featured / trending products section is visible
- [ ] Product categories filter works
- [ ] Pull-to-refresh reloads the feed
- [ ] **Realtime — new product:** seller adds a product → it appears on the buyer's Browse screen without refreshing, and its shop name is displayed correctly (not blank)
- [ ] **Realtime — product update:** seller edits price or stock → change reflects without refreshing
- [ ] "Nearby Shops" map button opens the map with shop pins

### 2.2 Product Details

- [ ] Full product info shown: name, price, description, images, stock status, shop name
- [ ] Image gallery/zoom works
- [ ] "Add to Cart" button works for in-stock products
- [ ] On-order products show appropriate status
- [ ] Price history chart displays (if available)
- [ ] Recommended products section loads
- [ ] "Frequently Bought Together" section appears where applicable
- [ ] Product 360 view / AR viewer (if product has 3D asset)
- [ ] Comments / reviews section loads and can be submitted
- [ ] Stock alert can be set for out-of-stock items

### 2.3 Shops

- [ ] Shops list loads with logos, names, locations, ratings
- [ ] Verified shops show a verification badge
- [ ] Tap a shop → Shop Details screen with shop info and product list
- [ ] Shop rating/review can be submitted by buyers who have ordered from the shop
- [ ] "Nearby Shops" opens an interactive map (Leaflet) showing shop locations

### 2.4 Cart & Checkout

- [ ] Add product to cart — cart badge counter increments on the tab
- [ ] Cart screen shows items with quantities, subtotal, and total
- [ ] Increase / decrease quantity in cart
- [ ] Remove item from cart
- [ ] Proceed to Checkout — shipping address required
- [ ] Payment screen shows order summary
- [ ] DPO payment: tapping "Pay" opens the DPO WebView (browser-based payment page)
- [ ] Successful payment → Payment Processing screen → Order Success screen
- [ ] Cancelled payment returns to cart
- [ ] Order is created in the database after successful payment

### 2.5 Orders

- [ ] Orders list shows all buyer's orders with status badges
- [ ] Tap an order → Order Details with itemised list, amounts, and status
- [ ] Order Tracking screen shows current status and timeline
- [ ] Status updates (e.g. seller marks as shipped) are reflected in realtime

### 2.6 Favorites

- [ ] Heart icon on a product card adds it to Favorites
- [ ] Favorites screen shows saved products
- [ ] Un-favoriting removes the product from the list

### 2.7 Notifications

- [ ] Notifications screen lists all notifications (order placed, order status updates, etc.)
- [ ] Push notification received when an order status changes
- [ ] Tapping a push notification deep-links to the relevant order

### 2.8 Messaging (Buyer ↔ Seller)

- [ ] Messages tab shows list of conversations
- [ ] Open a conversation → Chat Detail screen
- [ ] Send a text message — message appears immediately
- [ ] Seller's reply appears in realtime without refreshing

### 2.9 Virtual Assistant

The AI assistant is accessible via the floating button on the browse screen.

- [ ] Opens as a full-screen modal
- [ ] Greeting message loads with live product/shop counts from the database
- [ ] Suggested quick-action chips appear below each assistant response
- [ ] Dark mode is applied correctly inside the assistant modal

**Product Search — keyword triggers**
- [ ] "Find me a blue dress" — returns relevant products
- [ ] "Search for headphones" — returns matching products
- [ ] "Show me laptops" — returns matching products

**Product Search — natural language extraction**  
The assistant must correctly strip intent phrases and stop words to find the product keyword:
- [ ] "I am looking for an iPhone" → searches for "iphone", returns iPhone products
- [ ] "I'm looking for wireless earbuds" → searches for "wireless earbuds"
- [ ] "I want to buy running shoes" → searches for "running shoes"
- [ ] "I need a laptop" → searches for "laptop"
- [ ] "I'd like a leather jacket" → searches for "leather jacket"
- [ ] "I would like to buy a dress" → searches for "dress"
- [ ] "Do you have any smartwatches?" → searches for "smartwatches"
- [ ] "Can you find me a gaming chair?" → searches for "gaming chair"
- [ ] "Get me some coffee" → searches for "coffee"
- [ ] "Buy me a phone" → searches for "phone"
- [ ] Results are searched across product name, description, and category (not name only)
- [ ] Tapping a product card in results navigates to Product Details

**Product Search — single word / no trigger**
- [ ] Typing just "iPhone" (no trigger phrase) → assistant still finds and displays matching products
- [ ] Typing just "dress" → shows dress products via the general query fallback

**Shop Queries**
- [ ] "Show me shops" — returns a list of shops
- [ ] "Show me verified shops" — returns **only** verified shops, verified badge (✓) shown on results, **no database error**
- [ ] "Popular shops" — returns shops ordered by sales
- [ ] Verified shops in results display the blue verified icon on their card
- [ ] Unverified shops display the plain shop icon
- [ ] Tapping a shop card navigates to Shop Details

**Order Queries**
- [ ] "Track my orders" — shows signed-in user's recent orders with status
- [ ] "Show my recent order" — shows the latest order with items and total
- [ ] "How many orders do I have?" — shows a summary by status
- [ ] Unauthenticated user: assistant prompts to sign in instead of crashing

**Account Queries**
- [ ] "My account info" — shows email, role, member since
- [ ] "How do I update my settings?" — gives step-by-step guide
- [ ] "How do I delete my account?" — gives account deletion steps

**Product Recommendations**
- [ ] "Recommend electronics" — shows top electronics sorted by views
- [ ] "What's trending?" — shows most viewed products across all categories
- [ ] "Show me new arrivals" — shows most recently added products
- [ ] "Show me deals" — shows products with a discount percentage applied

**Product Information**
- [ ] "Tell me about [product name]" — shows price, stock status, shop, description
- [ ] "What is the price of [product name]?" — shows price and any active discount
- [ ] "Is [product name] in stock?" — shows availability

**Product Comparison**
- [ ] "Compare [Product A] and [Product B]" — shows side-by-side price, availability, shop, rating
- [ ] "Difference between [A] and [B]" — same comparison result
- [ ] "[A] vs [B]" — same comparison result

**General Fallback**
- [ ] Completely unrecognised input — assistant shows live product count, shop count, categories, and sample products
- [ ] Greeting ("Hello", "Hi") — assistant responds with a welcome message and suggested actions

### 2.10 Profile (Buyer)

- [ ] View profile: name, email, account type
- [ ] Edit profile: update name, avatar
- [ ] Shipping addresses: add / edit / delete
- [ ] Payment methods: add / remove
- [ ] My Orders shortcut opens order history
- [ ] Help Center screen loads FAQ content
- [ ] Terms & Privacy screen loads
- [ ] "Become a Seller" — navigates to Seller Registration flow
- [ ] Account Deletion: confirmation dialog before deleting account

---

## 3. Seller App

### Navigation Tabs
| Tab | Screens |
|-----|---------|
| Dashboard | Dashboard, Analytics |
| Products | Products List, Add Product, Edit Product |
| Orders | Orders List, Order Details |
| Shops | Shops List, Shop Details, Shop Location, Create Shop, Verification |
| Profile | Profile, Edit Profile, Bank Details, Seller Payouts, Admin Payouts*, Admin Verifications*, Help Center, Terms, Account Deletion |

> *Admin Payouts and Admin Verifications are only visible/functional for admin accounts.

---

### 3.1 Dashboard

- [ ] Summary cards show: total products, total orders, total revenue, pending orders
- [ ] Stats update in realtime when a new order is placed
- [ ] Tap "Analytics" → detailed charts (sales over time, product performance)
- [ ] Unread order notification badge appears on the Orders tab icon

### 3.2 Products

- [ ] Products list shows all products across seller's shops
- [ ] **Multi-shop dialog — no duplicates:** if seller owns more than one shop, pressing "Add Product" shows a shop selection dialog where each shop name appears exactly once (no repeated entries)
- [ ] **Single-shop:** if seller owns only one shop, "Add Product" navigates directly to the Add Product form without a dialog
- [ ] Add Product form: name, description, category, price, stock quantity, images upload, on-order toggle
- [ ] Product images can be uploaded from gallery
- [ ] **Auto-refresh:** after saving a new product and navigating back, the Products list immediately shows the new product without a manual pull-to-refresh
- [ ] **Stats update:** seller dashboard "Total Products" count increments after adding a product (no RLS/permission error)
- [ ] Edit Product: all fields pre-filled and editable
- [ ] **Stats update on delete:** dashboard "Total Products" count decrements after deleting a product
- [ ] Delete product removes it from the list

### 3.3 Orders (Seller)

- [ ] Orders list shows all orders for seller's shops with status and buyer info
- [ ] Unread/new orders show a badge on the Orders tab
- [ ] Tap an order → Order Details: items, amounts, buyer address, status
- [ ] Seller can update order status (e.g. Processing → Shipped → Delivered)
- [ ] Status change triggers push notification to the buyer

### 3.4 Shops

- [ ] Shops list shows all shops owned by the seller
- [ ] **Create Shop — unverified seller:** the "Account Verification Required" notice is visible, encouraging the seller to submit documents; shop is created with `not_submitted` status
- [ ] **Create Shop — verification submitted (pending):** the "Account Verification Required" notice is **hidden** on the Create Shop screen
- [ ] **Create Shop — verified seller:** the "Account Verification Required" notice is **hidden**, and the new shop is automatically created with `verified` status (no manual admin step needed)
- [ ] Shop created by a verified seller immediately shows the verified badge in the Shops list and on the buyer's shop browse screen
- [ ] Shop Details: edit shop info, view products, view location
- [ ] Shop Location: map view showing the shop's set location
- [ ] Verification screen: upload ID document and business proof to request verification

### 3.5 Seller Verification Flow

Full end-to-end flow:

1. Seller registers and creates a shop → shop status is `not_submitted`
2. "Account Verification Required" notice shown on Create Shop screen
3. Seller goes to Verification screen → uploads documents → submits
4. Shop creation screen no longer shows the verification notice (status = `pending`)
5. Admin reviews and approves in Admin Verifications screen
6. Seller's new shops are now auto-created as `verified`

- [ ] Verification form: upload document images, submit
- [ ] After submission: status badge shows "Pending" on the Verification screen
- [ ] After submission: "Account Verification Required" section disappears from Create Shop screen
- [ ] After admin **approves**: seller status becomes "Verified"
- [ ] After admin approves: any new shop the seller creates is automatically `verified` without further admin action
- [ ] After admin **rejects**: seller is notified and can resubmit
- [ ] Verified seller's shops display a verified badge to buyers

### 3.6 Bank Account & Payouts

- [ ] Bank Details screen: add bank account name, number, branch code
- [ ] Seller Payouts: view payout history and pending balance
- [ ] Request payout (if balance available)

### 3.7 Messaging (Seller)

- [ ] Messages tab (within profile or via navigation) shows buyer conversations
- [ ] Reply to buyer messages in realtime

### 3.8 Profile (Seller)

- [ ] Edit profile, shipping addresses, help center (same as buyer)
- [ ] Bank Details link
- [ ] Seller Payouts link
- [ ] Admin-only: Admin Payouts and Admin Verifications links visible only to admins

---

## 4. Admin Features

Admin capabilities are accessed from the **Seller Profile tab** and are only visible to accounts with the admin role.

### 4.1 Admin Verifications

- [ ] List of all pending seller verification submissions
- [ ] View uploaded documents for each seller
- [ ] Approve verification → seller status set to "verified"
- [ ] Reject verification → seller notified

### 4.2 Admin Payouts

- [ ] List of all seller payout requests
- [ ] Approve or mark payout as paid
- [ ] View bank account details for each seller

---

## 5. Cross-Cutting Features

### 5.1 Dark Mode

- [ ] Toggle dark/light mode in Profile settings
- [ ] All screens, modals, and components respect the theme

### 5.2 Push Notifications

| Trigger | Recipient |
|---------|-----------|
| New order placed | Seller |
| Order status updated (Shipped, Delivered, etc.) | Buyer |
| New message received | Both |

- [ ] Notification received when app is in the foreground (in-app banner)
- [ ] Notification received when app is in the background or closed (system tray)
- [ ] Tapping a notification navigates to the relevant screen

### 5.3 Realtime Updates

- [ ] New product added by seller appears on buyer's Browse screen without refreshing
- [ ] Order status change reflects in buyer's Order Details without refreshing
- [ ] New message appears in chat without refreshing
- [ ] Seller's Orders tab badge increments when a new order is placed

### 5.4 Offline / Network Error

- [ ] Network error view appears when device is offline
- [ ] App recovers and reloads data when connection is restored

### 5.5 Personalized Feed & Offers

- [ ] Personalized product feed is shown based on browsing history
- [ ] Personalized offers component shows relevant deals

---

## 6. Known Limitations / Test Environment Notes

- Payment is processed via **DPO Group demo credentials** — use DPO test card numbers, not real cards
- Push notifications require a **physical device** (will not work in simulators/emulators)
- Map (Nearby Shops) requires **location permission** to be granted
- AR Product Viewer requires a device with ARKit/ARCore support
- The app is configured for **Namibian Dollars (NAD)** currency

---

## 7. Test Accounts to Set Up

Before testing, set up the following accounts in the app or via Supabase:

| Account | Role | Purpose |
|---------|------|---------|
| `buyer@test.com` | Buyer | End-to-end purchase flow |
| `seller@test.com` | Seller (verified) | Shop/product/order management |
| `seller2@test.com` | Seller (unverified) | Test verification flow |
| `admin@test.com` | Admin | Test admin verifications & payouts |

---

## 8. Regression Tests — Recent Fixes

This section focuses on bugs that have been fixed and must not regress.

### 8.1 Browse Products — Shop Name Display

**Bug fixed:** Products on the buyer's Browse screen were showing "@Shop" instead of the real shop name.

- [ ] Every product card on the Browse screen shows the actual shop name
- [ ] Featured products section also shows correct shop names
- [ ] After a new product is added by a seller in real-time, the product appears with its correct shop name (not blank or "@Shop")

### 8.2 Products Screen — Auto-Refresh After Adding a Product

**Bug fixed:** After adding a product, the seller had to manually pull-to-refresh to see it in the list.

- [ ] Add a new product via the Add Product form
- [ ] Press the back / save button to return to the Products list
- [ ] The new product is visible immediately without any manual refresh action
- [ ] Repeat for editing a product — updated values appear immediately on return

### 8.3 Products Screen — No Duplicate Shops in Dialog

**Bug fixed:** When a seller with multiple shops pressed "Add Product", some shop names appeared twice in the selection dialog.

- [ ] Create at least two distinct shops as a seller
- [ ] Add several products to each shop
- [ ] Press "Add Product" → shop selection dialog appears
- [ ] Each shop name appears **exactly once** in the list
- [ ] Selecting a shop navigates to Add Product with the correct `shopId`

### 8.4 Create Shop — Verification-Aware UI

**Bug fixed:** The "Account Verification Required" notice was always visible even for already-verified sellers, and new shops were not being auto-verified.

- [ ] Log in as an **unverified** seller (no submission) → "Account Verification Required" section is visible on Create Shop screen
- [ ] Log in as a seller who has **submitted documents** (status: pending) → section is **not visible**
- [ ] Log in as a **verified** seller → section is **not visible**
- [ ] Verified seller creates a new shop → shop is immediately shown with a verified badge in the shop list (no admin approval needed)
- [ ] Unverified seller creates a shop → shop has no verified badge

### 8.5 Adding a Product — No RLS Permission Error

**Bug fixed:** Adding a product triggered a Supabase Row-Level Security error (`42501`) on the `seller_stats` table, blocking the insert.

- [ ] Log in as a seller with at least one shop
- [ ] Add a new product to any shop
- [ ] Product saves successfully — no error alert or crash
- [ ] Seller's Dashboard "Total Products" stat increments correctly after the save
- [ ] Delete a product — "Total Products" stat decrements correctly

### 8.6 Virtual Assistant — Verified Shops Query

**Bug fixed:** Asking the assistant to "Show verified shops" caused a database error (`column shops.is_verified does not exist`).

- [ ] Open the Virtual Assistant
- [ ] Tap the "Show verified shops" chip or type it manually
- [ ] A list of verified shops is returned — **no error message**
- [ ] Each verified shop shows a ✅ icon in the text response
- [ ] Each verified shop shows the blue verified badge on its result card
- [ ] Unverified shops show the 🏪 icon in the text response and no badge on their card

### 8.7 Virtual Assistant — Natural Language Product Search

**Bug fixed:** The assistant failed to extract the product name from natural language prompts (e.g. "I am looking for an iPhone" would search for "i am an iphone" instead of "iphone").

- [ ] "I am looking for an iPhone" → returns iPhone-related products, not a "no results" message
- [ ] "I'm looking for wireless earbuds" → returns earbuds products
- [ ] "I want to buy running shoes" → returns shoe products
- [ ] "I need a laptop" → returns laptop products
- [ ] "Do you have any smartwatches?" → returns smartwatch products
- [ ] "Can you find me a gaming chair?" → returns chair/gaming products
- [ ] Results are also matched against **description** and **category** (not just product name)
- [ ] No filler words like "i am", "an", "looking for" appear in the search results header

---

## 9. Quick Smoke Test Checklist

For a fast sanity check on a new build, run through these in order:

1. [ ] App launches and onboarding appears on first run
2. [ ] Register a buyer account → lands on Browse screen
3. [ ] Browse screen loads products — every card shows the **actual shop name** (not "@Shop")
4. [ ] Add a product to cart → cart badge counter increments
5. [ ] Proceed to checkout → DPO payment page opens in WebView
6. [ ] Log out → log in as seller
7. [ ] Create a shop → shop appears in Shops tab
8. [ ] Add a product → product appears in Products tab **immediately without pull-to-refresh**
9. [ ] Switch to buyer account → new product appears in Browse feed with correct shop name
10. [ ] Seller with 2+ shops: press "Add Product" → each shop listed **once only** in the dialog
11. [ ] Open Virtual Assistant → type "I am looking for [product name]" → correct products appear
12. [ ] Ask assistant "Show verified shops" → shops listed, **no database error**
13. [ ] Verified seller creates a new shop → shop has verified badge immediately
14. [ ] Log in as admin → Admin Verifications screen accessible from Profile tab

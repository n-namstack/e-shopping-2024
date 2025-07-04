# 📱 App Store Submission Checklist - ShopIt

## ✅ Pre-Submission Requirements

### 1. **App Configuration** ✅ COMPLETED
- [x] Updated `app.json` with proper app name and description
- [x] Configured iOS bundle identifier: `com.namstack.eshoppiti`
- [x] Set proper permission descriptions
- [x] Added App Store URL and associated domains
- [x] Configured build settings in `eas.json`

### 2. **Legal Documents** ✅ COMPLETED
- [x] Privacy Policy created (`privacy-policy.md`)
- [x] Terms & Conditions implemented in app
- [x] Privacy Policy integrated into app screens
- [x] Contact information for support

### 3. **App Store Connect Setup** ✅ VERIFIED
- [x] App Store Connect account verified
- [x] App ID created: `6745431558`
- [x] Apple Team ID: `9Y39N2CB3W`
  - [x] Bundle ID matches: `com.namstack.eshoppit`

## 🚀 Build and Submission Commands

### Step 1: Login to EAS
```bash
npx eas login
```

### Step 2: Build for App Store
```bash
npx eas build --platform ios --profile production
```

### Step 3: Submit to App Store
```bash
npx eas submit --platform ios --profile production
```

## 📱 App Store Connect Setup

### 1. **App Information**
- **App Name**: ShopIt - E-Shopping Platform
- **Subtitle**: Shop, Sell, and Connect Seamlessly
- **Category**: Shopping (Primary), Business (Secondary)
- **Content Rating**: 4+ (Ages 4 and up)
- **Version**: 1.0.0
- **Copyright**: © 2025 ShopIt Technologies

### 2. **App Description** (Use content from `app-store-description.md`)
Copy the marketing description from the `app-store-description.md` file into:
- App Store description field
- Promotional text (if using)

### 3. **Keywords** (Max 100 characters)
```
e-commerce,shopping,marketplace,buy,sell,products,deals,mobile,store,retail
```

### 4. **Support Information**
- **Support URL**: https://shopitapp.com/support
- **Marketing URL**: https://shopitapp.com
- **Privacy Policy URL**: https://shopitapp.com/privacy

### 5. **App Review Information**
- **Contact Email**: collinnadilu@gmail.com
- **Phone Number**: [Your support phone number]
- **Demo Account**: Create a test account for Apple reviewers
  - Email: reviewer@shopitapp.com
  - Password: ReviewDemo2025!

## 📸 Screenshots Requirements

### iPhone Screenshots (REQUIRED)
You need **3-10 screenshots** in these dimensions:
- **iPhone 6.7"**: 1290 × 2796 pixels
- **iPhone 6.5"**: 1242 × 2688 pixels

### Screenshots to Capture:
1. **Home Screen** - Main dashboard with products
2. **Product Details** - Product page with reviews
3. **Shopping Cart** - Cart and checkout process
4. **Seller Dashboard** - Analytics and management
5. **Shop Creation** - Seller onboarding
6. **Order Tracking** - Order status and tracking
7. **Search Results** - Search with filters
8. **User Profile** - Account and settings

> 📖 **Detailed guide**: See `app-store-screenshots-guide.md`

## 🔧 Technical Requirements

### App Performance
- [ ] App launches successfully on iOS devices
- [ ] No crashes during basic functionality testing
- [ ] All main features work without internet (graceful degradation)
- [ ] App responds within reasonable time limits

### Content Guidelines
- [ ] No objectionable content
- [ ] Accurate app description
- [ ] All features mentioned in description work
- [ ] No misleading functionality

### Privacy Compliance
- [ ] Privacy policy accessible in app
- [ ] Proper permission requests with clear explanations
- [ ] No unauthorized data collection
- [ ] GDPR compliance for EU users

## 📋 Final Pre-Submission Checklist

### Code and Build
- [ ] All dependencies updated and compatible
- [ ] No console errors or warnings in production
- [ ] App builds successfully with production profile
- [ ] All features tested on physical iOS device
- [ ] Performance optimized (app size, loading times)

### App Store Connect
- [ ] All required screenshots uploaded
- [ ] App description and metadata complete
- [ ] Keywords optimized for discovery
- [ ] Support and privacy URLs working
- [ ] App icon uploaded (1024x1024)
- [ ] Pricing and availability set

### Legal and Compliance
- [ ] Age rating appropriate and accurate
- [ ] Export compliance declarations complete
- [ ] Content rights verified
- [ ] Third-party services terms acknowledged

### Testing
- [ ] App tested on multiple iOS versions
- [ ] All user flows tested end-to-end
- [ ] Payment processing tested (if applicable)
- [ ] Push notifications working (if implemented)
- [ ] Offline functionality verified

## 📤 Submission Process

### 1. Build Creation
```bash
# Ensure you're logged in
npx eas login

# Create production build
npx eas build --platform ios --profile production --clear-cache
```

### 2. Build Submission
```bash
# Submit to App Store Connect
npx eas submit --platform ios --profile production --latest
```

### 3. App Store Connect Final Steps
1. Login to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app
3. Go to the version you want to submit
4. Upload screenshots
5. Fill in app information
6. Add build from EAS submission
7. Submit for review

## ⚠️ Common Issues and Solutions

### Build Issues
- **Certificate Problems**: Ensure Apple Developer account is active
- **Bundle ID Mismatch**: Verify bundle ID `com.namstack.eshoppiti` in both `app.json` and App Store Connect
- **Missing Permissions**: Check all permission descriptions in `app.json`

### Submission Issues
- **Missing Screenshots**: Upload all required screenshot sizes
- **Privacy Policy**: Ensure privacy policy URL is accessible
- **Demo Account**: Provide working demo credentials for review

### Review Issues
- **Metadata Rejection**: Ensure app description matches actual functionality
- **Crash Issues**: Test thoroughly on multiple devices and iOS versions
- **Missing Features**: Implement all features mentioned in app description

## 📞 Support Contacts

- **Technical Support**: collinnadilu@gmail.com
- **App Store Review**: Use App Store Connect messaging
- **Privacy Concerns**: privacy@shopitapp.com

## 🎉 Post-Submission

### After Submission
1. **Status Monitoring**: Check App Store Connect for review status
2. **Response Time**: Typically 24-48 hours for initial review
3. **Rejection Handling**: Address any issues promptly if rejected
4. **Launch Preparation**: Prepare marketing materials for launch

### Launch Checklist
- [ ] Press release prepared
- [ ] Social media campaigns ready
- [ ] App Store optimization tracking set up
- [ ] User feedback monitoring in place
- [ ] Support documentation ready

---

## 🚀 Quick Start Commands

```bash
# 1. Install/Update dependencies
npx expo install --fix

# 2. Login to EAS
npx eas login

# 3. Build for App Store
npx eas build --platform ios --profile production

# 4. Submit to App Store
npx eas submit --platform ios --profile production --latest
```

**Note**: Make sure to have all screenshots ready and App Store Connect information complete before running the submission command.

Good luck with your App Store submission! 🍀 
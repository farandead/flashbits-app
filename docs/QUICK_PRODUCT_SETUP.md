# Quick Product Setup Reference

## 🎯 Required Product IDs

Your product IDs in App Store Connect:

```
com.flashbits.pro.monthly
com.flashbits.pro.yearly
```

## ✅ Quick Checklist

### App Store Connect
- [x] Create Auto-Renewable Subscription: `com.flashbits.pro.monthly` (1 month) ✅
- [x] Create Auto-Renewable Subscription: `com.flashbits.pro.yearly` (1 year) ✅
- [ ] Both in same subscription group
- [ ] Bundle ID matches: `com.flashbits.app` ✅

### RevenueCat Dashboard
- [ ] Import products from App Store Connect
- [ ] Link products to entitlement: "flashbits Pro"
- [ ] Create package: `monthly` → Link to `com.flashbits.pro.monthly`
- [ ] Create package: `yearly` → Link to `com.flashbits.pro.yearly`
- [ ] Add packages to "Current" offering

### Code
- [x] Product IDs updated in `revenueCatService.ts` ✅
- [x] Package matching logic works (checks for "monthly"/"yearly" keywords) ✅

## 🔍 How It Works

1. **App Store Connect Product IDs** (what Apple sees):
   - `com.flashbits.pro.monthly`
   - `com.flashbits.pro.yearly`

2. **RevenueCat Package Identifiers** (what your app uses):
   - `monthly` (linked to `com.flashbits.pro.monthly`)
   - `yearly` (linked to `com.flashbits.pro.yearly`)

3. **App Code**:
   - Matches packages by keywords: "monthly", "yearly", "annual"
   - RevenueCat handles the mapping to real product IDs

## 🧪 Testing

1. Use **sandbox test account** on **physical iOS device**
2. Open paywall → Select plan → Purchase
3. Should see native StoreKit UI with correct product IDs

## 📖 Full Guide

See `docs/APP_STORE_CONNECT_PRODUCT_SETUP.md` for detailed step-by-step instructions.


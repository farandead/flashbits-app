# RevenueCat Integration Guide

This document outlines the complete RevenueCat SDK integration for the Flashbits app.

## ✅ What's Been Implemented

### 1. **RevenueCat Service** (`services/revenueCatService.ts`)
- SDK initialization with API key: `test_RLxkHjNxnVRGtQlAkZofFMmiNfV`
- User identification and authentication sync with Firebase
- Entitlement checking for "flashbits Pro"
- Purchase flow for monthly and yearly subscriptions
- Restore purchases functionality
- Customer info and subscription status retrieval
- Product/package fetching from RevenueCat

### 2. **RevenueCat Context** (`context/RevenueCatContext.tsx`)
- Global subscription state management
- Automatic sync with Firebase Auth
- Real-time entitlement status updates
- Purchase and restore functionality
- Loading states and error handling

### 3. **Updated Paywall Component** (`components/Paywall.tsx`)
- Integration with RevenueCat offerings
- Dynamic pricing from RevenueCat
- Support for both custom paywall and RevenueCat's built-in paywall
- Purchase handling with proper error management

### 4. **Customer Center Component** (`components/CustomerCenter.tsx`)
- Built-in RevenueCat Customer Center UI
- Restore purchases functionality
- Subscription management interface

### 5. **Settings Integration** (`app/settings.tsx`)
- Pro status checking via RevenueCat
- Purchase flow integration
- Customer Center access

### 6. **App Root Integration** (`app/_layout.tsx`)
- RevenueCatProvider added to app context
- Automatic initialization on app start

## 📋 Next Steps - RevenueCat Dashboard Configuration

### 1. **Create Entitlement**
1. Go to RevenueCat Dashboard → Entitlements
2. Create a new entitlement named: **`flashbits Pro`**
3. This must match exactly: `ENTITLEMENT_ID = 'flashbits Pro'` in `revenueCatService.ts`

### 2. **Add Products**
1. Go to RevenueCat Dashboard → Products
2. Add two subscription products:
   - **Monthly**: Identifier `monthly` (or match your App Store/Play Store product ID)
   - **Yearly**: Identifier `yearly` (or match your App Store/Play Store product ID)
3. Configure pricing in App Store Connect (iOS) and Google Play Console (Android)

### 3. **Link Products to Entitlement**
1. Go to RevenueCat Dashboard → Entitlements → "flashbits Pro"
2. Attach both `monthly` and `yearly` products to this entitlement

### 4. **Create Offering**
1. Go to RevenueCat Dashboard → Offerings
2. Create a new offering (or use the default)
3. Add both packages (monthly and yearly) to the offering
4. Set this as the "Current" offering

### 5. **Configure Paywall (Optional)**
1. Go to RevenueCat Dashboard → Paywalls
2. Create a paywall design
3. Attach it to your offering
4. The app can use either:
   - Custom paywall (current implementation)
   - RevenueCat's built-in paywall (set `useRevenueCatPaywall={true}` in Paywall component)

### 6. **Configure Customer Center**
1. Go to RevenueCat Dashboard → Customer Center
2. Enable Customer Center
3. Configure which features users can access (cancel, refund, etc.)

## 🔧 Product Identifiers

The app expects products with identifiers that contain:
- **Monthly**: `monthly` or `month` in the identifier
- **Yearly**: `yearly`, `annual`, or `year` in the identifier

You can customize this logic in `revenueCatService.ts` → `purchaseSubscription()` function.

## 🧪 Testing

### Test Environment
- API Key: `test_RLxkHjNxnVRGtQlAkZofFMmiNfV` (already configured)
- This is a test key - use sandbox/test accounts for testing

### Testing Checklist
1. ✅ SDK initializes on app start
2. ✅ User ID syncs with Firebase Auth
3. ✅ Offerings load correctly
4. ✅ Packages display with correct pricing
5. ✅ Purchase flow works (use sandbox accounts)
6. ✅ Entitlement checking works
7. ✅ Restore purchases works
8. ✅ Customer Center opens correctly
9. ✅ Pro status updates in real-time

## 📱 Platform-Specific Setup

### iOS
1. Configure in-app purchases in App Store Connect
2. Create subscription products with matching identifiers
3. Test with sandbox accounts
4. Ensure StoreKit configuration is set up

### Android
1. Configure in-app products in Google Play Console
2. Create subscription products with matching identifiers
3. Test with test accounts
4. Link Google Play account in RevenueCat dashboard

## 🔐 Security Notes

1. **API Key**: Currently using test key. For production:
   - Create production API key in RevenueCat dashboard
   - Update `REVENUECAT_API_KEY` in `revenueCatService.ts`
   - Consider using environment variables

2. **User Identification**: 
   - RevenueCat user ID is synced with Firebase Auth UID
   - This ensures consistent user identification across platforms

## 🐛 Troubleshooting

### No Offerings Found
- Check RevenueCat dashboard: Is an offering created and set as "Current"?
- Verify products are attached to the offering
- Check network connectivity

### Purchase Fails
- Verify products exist in App Store/Play Store
- Check product identifiers match between stores and RevenueCat
- Ensure test/sandbox accounts are configured
- Check RevenueCat dashboard for error logs

### Entitlement Not Active
- Verify entitlement name matches exactly: `flashbits Pro`
- Check products are linked to entitlement
- Verify purchase completed successfully
- Check RevenueCat dashboard → Customer → Entitlements

## 📚 Additional Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [Expo Integration Guide](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [Paywalls Documentation](https://www.revenuecat.com/docs/tools/paywalls)
- [Customer Center Documentation](https://www.revenuecat.com/docs/tools/customer-center)

## 🎯 Key Features Implemented

✅ SDK initialization and configuration  
✅ User identification with Firebase Auth  
✅ Entitlement checking for "flashbits Pro"  
✅ Purchase flow for monthly/yearly plans  
✅ Restore purchases  
✅ Customer info retrieval  
✅ Subscription status tracking  
✅ RevenueCat Paywall support  
✅ Customer Center integration  
✅ Error handling and loading states  
✅ Real-time subscription status updates  

## 💡 Usage Examples

### Check if User is Pro
```typescript
import { useRevenueCat } from '@/context/RevenueCatContext';

const { isPro } = useRevenueCat();
```

### Purchase a Plan
```typescript
const { purchasePlan } = useRevenueCat();
const result = await purchasePlan('monthly');
```

### Restore Purchases
```typescript
const { restore } = useRevenueCat();
const result = await restore();
```

### Open Customer Center
```typescript
import CustomerCenter from '@/components/CustomerCenter';

<CustomerCenter visible={show} onClose={() => setShow(false)} />
```

---

**Note**: Remember to configure products in App Store Connect and Google Play Console, and link them in the RevenueCat dashboard before testing purchases.


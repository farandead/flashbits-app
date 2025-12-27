# Yearly Subscription Test Fix

## Problem

The yearly subscription test was failing because the package matching logic was inconsistent between the Paywall component and the purchase service.

## Root Cause

1. **Paywall Component** checks for: `'yearly' || 'annual' || 'year'`
2. **Purchase Service** only checked for: `'yearly'`

If the package identifier in RevenueCat was "annual" or something else, the purchase would fail.

## Solution

### 1. Consistent Package Matching

Created a helper function `packageMatchesPlan()` that uses the same logic as the Paywall component:

```typescript
const packageMatchesPlan = (pkg: PurchasesPackage, plan: SubscriptionPlan): boolean => {
  const identifier = pkg.identifier.toLowerCase();
  
  if (plan === 'monthly') {
    return identifier.includes('monthly') || identifier.includes('month');
  } else if (plan === 'yearly') {
    return identifier.includes('yearly') || 
           identifier.includes('annual') || 
           identifier.includes('year');
  }
  
  return false;
};
```

### 2. Better Error Messages

Added detailed error messages that show:
- Which plan was requested
- What packages are available
- Package identifiers for debugging

### 3. Enhanced Logging

Added logging to help debug:
- Number of packages found
- Package identifiers
- Which package was matched

## Testing

### Verify Package Identifiers

1. Check RevenueCat Dashboard:
   - Go to Products → Check your yearly product identifier
   - Common identifiers: `yearly`, `annual`, `yearly_subscription`, `annual_plan`

2. Check Offering Configuration:
   - Go to Offerings → Current Offering
   - Verify packages are added
   - Check package identifiers match your products

### Test Steps

1. **Check Available Packages:**
   ```typescript
   const packages = await getPackages();
   console.log('Available packages:', packages.map(p => p.identifier));
   ```

2. **Test Purchase:**
   - Open Paywall
   - Select Yearly plan
   - Attempt purchase
   - Check console logs for matching package

3. **Verify Matching:**
   - Check logs for: `Found matching package for yearly: [identifier]`
   - If not found, check error message for available packages

## Common Issues

### Issue 1: Package Not Found

**Error:** `Package for yearly plan not found`

**Solutions:**
1. Check RevenueCat Dashboard → Offerings → Current Offering
2. Verify yearly package is added to offering
3. Check package identifier contains: `yearly`, `annual`, or `year`
4. Verify product exists in App Store/Play Store

### Issue 2: Wrong Package Identifier

**Error:** Package found but wrong one purchased

**Solutions:**
1. Check package identifier in RevenueCat dashboard
2. Update matching logic if needed (should handle most cases)
3. Verify product IDs match between stores and RevenueCat

### Issue 3: No Packages Available

**Error:** `No packages available`

**Solutions:**
1. Verify offering is set as "Current" in RevenueCat dashboard
2. Check packages are added to offering
3. Verify products are linked to packages
4. Check network connectivity

## Debugging

### Enable Debug Logging

In `revenueCatService.ts`, change log level:

```typescript
Purchases.setLogLevel(LOG_LEVEL.DEBUG);
```

### Check Logs

Look for these log messages:
- `Found X packages: [identifiers]` - Shows available packages
- `Found matching package for yearly: [identifier]` - Shows matched package
- `Package for yearly plan not found. Available packages: [list]` - Shows why match failed

### Manual Package Check

You can manually check packages:

```typescript
import { getPackages } from '@/services/revenueCatService';

const packages = await getPackages();
console.log('Packages:', packages.map(p => ({
  identifier: p.identifier,
  productId: p.product.identifier,
  price: p.product.priceString
})));
```

## RevenueCat Dashboard Configuration

### Required Setup

1. **Products:**
   - Create product with identifier containing: `yearly`, `annual`, or `year`
   - Link to App Store/Play Store product

2. **Packages:**
   - Create package in offering
   - Use identifier that matches product (or contains keywords)

3. **Offering:**
   - Add both monthly and yearly packages
   - Set as "Current" offering

### Recommended Identifiers

- **Monthly:** `monthly`, `monthly_subscription`, `monthly_plan`
- **Yearly:** `yearly`, `annual`, `yearly_subscription`, `annual_plan`

The matching logic will find any of these variations.

## Verification Checklist

- [ ] Yearly product exists in RevenueCat dashboard
- [ ] Product identifier contains `yearly`, `annual`, or `year`
- [ ] Package created in offering with matching identifier
- [ ] Package added to "Current" offering
- [ ] Product linked to App Store/Play Store
- [ ] Test purchase works with sandbox account
- [ ] Logs show package matching correctly

## Summary

The fix ensures:
- ✅ Consistent package matching logic
- ✅ Better error messages for debugging
- ✅ Support for multiple identifier formats (`yearly`, `annual`, `year`)
- ✅ Enhanced logging for troubleshooting

If yearly subscription still fails, check:
1. RevenueCat dashboard configuration
2. Package identifiers
3. Console logs for detailed error messages


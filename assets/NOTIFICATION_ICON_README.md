# Notification Icon

## 📱 Required File

Add your notification icon here:

```
assets/notification-icon.png
```

## ✅ Specifications

- **Size**: 96x96 pixels
- **Format**: PNG
- **Color**: White (#FFFFFF)
- **Background**: Transparent
- **Style**: Simple, flat design

## 🎨 Design Guidelines

**Good notification icon:**
- Simple shape that's recognizable at small sizes
- White icon on transparent background
- 12px padding on all sides
- High contrast

**Examples for FlashPrep:**
- Code brackets: `</>`
- Lightning bolt: ⚡
- Checkmark: ✓
- Brain icon: 🧠

## 🛠️ How to Create

### Option 1: Canva (Easy)
1. Go to Canva.com
2. Custom size: 96x96px
3. Add white shape/icon
4. Make background transparent
5. Download as PNG

### Option 2: Figma (Professional)
1. Create 96x96px frame
2. Draw your icon in white
3. Export as PNG with transparent background

### Option 3: Online Generator
- Use AppIcon.co or similar tools
- Generate from your app icon

## 📦 After Creating

1. Save as `notification-icon.png`
2. Place in `assets/` folder
3. Rebuild app:
   ```bash
   npx expo run:ios
   npx expo run:android
   ```

## 🔍 Already Configured

Your `app.json` is already set up:
```json
"notification": {
  "icon": "./assets/notification-icon.png",
  "color": "#00FF94"
}
```

Just add the PNG file and rebuild!

## 📖 More Info

See `NOTIFICATION_ICON_SETUP.md` in the root folder for detailed instructions.


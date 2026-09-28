# PWA Icons

วาง PNG icons ขนาดต่อไปนี้ในโฟลเดอร์นี้:

| ไฟล์ | ขนาด | ใช้สำหรับ |
|---|---|---|
| `icon-192x192.png` | 192×192 px | Android Home Screen, PWA manifest |
| `icon-512x512.png` | 512×512 px | Android Splash Screen, PWA manifest |
| `apple-touch-icon.png` | 180×180 px | iOS Home Screen (Add to Home Screen) |

## วิธีสร้างจาก icon.svg

ใช้ [Squoosh](https://squoosh.app) หรือ [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator):

```bash
# ติดตั้ง pwa-asset-generator
npx pwa-asset-generator icon.svg ./ --background "#0A0A0F" --padding "10%"
```

หรือใช้ sharp ใน Node.js:

```bash
npx sharp-cli --input icon.svg --output icon-192x192.png --width 192 --height 192
npx sharp-cli --input icon.svg --output icon-512x512.png --width 512 --height 512
npx sharp-cli --input icon.svg --output apple-touch-icon.png --width 180 --height 180
```

## หมายเหตุ

- ใช้ไฟล์ `icon.svg` เป็น source of truth
- Manifest ถูกตั้งค่า `purpose: "any maskable"` รองรับ Android adaptive icons
- `apple-touch-icon.png` ต้องไม่มี rounded corners เพราะ iOS จะ clip ให้อัตโนมัติ

# Testing Mago on your iPad (and Android)

There are three ways to see Mago on a real device. Start with **1**. It works today with nothing to sign up for.

| | What you get | What you need | Cost |
|---|---|---|---|
| **1. Web preview link** | The whole demo app in Safari: every screen, sample looks, videos | Nothing, just the link | Free |
| **2. Expo Go** | The real native app running on the iPad: real haptics, motion tilt, read-aloud | The Windows PC + the free Expo Go app | Free |
| **3. Installed build (EAS)** | A Mago app icon on the iPad, the same as a store app | An Expo account + an Apple Developer account | Apple: $99/year. Expo: free tier is enough |

---

## 1. Web preview (today)

1. On the iPad, open the preview link in **Safari**.
2. Tap **Share → Add to Home Screen**. Mago now opens full screen, like an app.
3. Turn the iPad to portrait to see the phone layout. Landscape shows the iPad layout (two panes in Follow-Along).

The web version doesn't have haptics, the motion-tilt sheen, or the "Unveil" button riding above the keyboard. Everything else is the same.

## 2. Expo Go: the real app, from your Windows PC

One-time setup on the Windows PC:
1. Install **Node.js LTS** from nodejs.org (accept the defaults).
2. Install **Git** from git-scm.com.
3. Open **PowerShell** and run:
   ```
   git clone https://github.com/Nesamani-Contractor/Building-Mago.git
   cd Building-Mago
   git checkout design/wow-v2
   cd apps/mobile
   npm install
   ```

Every time you want to test:
1. In PowerShell, inside the `Building-Mago\apps\mobile` folder:
   ```
   npx expo start --tunnel
   ```
   A QR code appears. The first run may ask to install `@expo/ngrok`; answer **Y**.
2. On the iPad, install **Expo Go** from the App Store.
3. Open the iPad **Camera** app, point it at the QR code and tap the banner. Mago opens inside Expo Go.
4. Any code change reloads on the iPad automatically.

**What doesn't work in Expo Go:** voice commands and the keyboard-riding button. They need option 3. The app detects Expo Go and quietly falls back, so nothing breaks.

## 3. An installed build (EAS cloud, no Mac needed)

The build settings are already in `apps/mobile/eas.json`:
- **preview**: an installable app in demo mode. On Android it's a downloadable `.apk` file.
- **production**: the store build (live mode). Not used until accounts and keys exist.
- **development**: for programmers. It needs one extra package (`expo-dev-client`), which isn't added yet and needs your OK first.

Steps (once the accounts exist):
1. Create a free account at expo.dev.
2. Join the Apple Developer Program ($99/year). Its approval is what lets the app install on your iPad.
3. In PowerShell:
   ```
   cd Building-Mago/apps/mobile
   npx eas-cli@latest login
   npx eas-cli@latest device:create      # open the link it shows on the iPad to register it
   npx eas-cli@latest build --profile preview --platform ios
   ```
4. When the build finishes (about 15–25 minutes), open the link Expo emails you **on the iPad** and tap **Install**.
5. For Android: run the same command with `--platform android`, then open the link on the phone to download and install the `.apk`.

Later, TestFlight (iPad) and Play internal testing (Android) replace step 4. That needs the production profile and the store listings.

---

## What to try (checklist)

1. **First open:** the story plays by itself (tap the right side to skip ahead, hold to pause) → **Try it on a sample look**.
2. **The Unveil:** the step cards spring out of the deck and a gold shimmer sweeps across. Tap **Replay** to watch it again.
3. **Save this look** → confirm you're 18+ → you land on **Home** (rose screen).
4. **Home:** tap a category circle (Makeup, Skincare, Hair, Nails, Tools). Paste a YouTube link in the search field.
5. **Discover:** tap **Soft glam / Clean girl / Night out / Bold editorial**. The big photo changes, and Soft glam plays a short video.
6. **+ Unveil** tab → **Paste any GRWM** → try the sample card.
7. **Start the look → Follow-Along:** **Next step**, **Read aloud**, **See every product**.
8. **Me → Appearance:** switch to Dark and repeat 4–7.
9. Turn the iPad sideways in Follow-Along: photo on the left, step on the right.

Photos and videos are free placeholders (see `apps/mobile/assets/looks/CREDITS.md` and `assets/media/manifest.json`). They'll be replaced by the commissioned shoot.

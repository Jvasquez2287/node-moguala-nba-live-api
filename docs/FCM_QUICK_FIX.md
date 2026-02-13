# FCM Error - Quick Fix Guide

## The Error You're Seeing

```
[Expo] Ticket error: Unable to retrieve the FCM server key for the recipient's app. 
Make sure you have provided a server key as directed by the Expo FCM documentation.
```

## What This Means

This error appears when you're trying to send push notifications to **Android devices** but Firebase Cloud Messaging (FCM) credentials are not configured in your Expo project.

## 3-Step Quick Fix

### Step 1: Create Firebase Project Account
2 minutes

1. Go to https://console.firebase.google.com/
2. Click "Create a Project"
3. Name it "NBA App" and create
4. You now have your Firebase project

### Step 2: Register Android App in Firebase
3 minutes

1. In Firebase Console, click "Add app" → "Android"
2. Enter package name: `com.yourcompany.nbaapp`
3. Click "Register app"
4. Download `google-services.json` (save this file)

### Step 3: Upload FCM Key to Expo
2 minutes

**Via Expo Website (Easiest):**
1. Go to https://expo.dev/
2. Log in with your Expo account
3. Select your app/project
4. Go to "Credentials" → "Android"
5. Click "Add FCM Credentials"
6. Get your Server Key:
   - In Firebase Console: Project Settings → Service Accounts → Generate Private Key
   - Copy the entire JSON file contents (or just the key string)
7. Paste into Expo
8. Click "Save"

**Via Command Line:**
```bash
# Login to Expo
expo login

# Configure credentials
eas credentials
# Follow prompts to add FCM key
```

### Step 4: Rebuild Your App

```bash
# Rebuild Android app with new FCM credentials
eas build --platform android
```

**Important**: After uploading FCM credentials, you MUST rebuild your app. Old builds won't have FCM support.

## Detailed Guide

For a complete step-by-step guide with screenshots and troubleshooting:
→ See [docs/FCM_SETUP_GUIDE.md](FCM_SETUP_GUIDE.md)

## What Happens After Setup

1. Your Android app rebuilds with FCM support ✓
2. Users install the new app version ✓
3. App automatically gets a new Expo push token with FCM ✓
4. Token is registered with your server ✓
5. Notifications now work! ✓

## Just Testing? (Skip FCM)

If you just want to test with iOS devices for now:
- iOS doesn't need FCM
- Only rebuild for iOS
- Adding Android later is simple

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Still get FCM error | Didn't rebuild app | Run `eas build --platform android` |
| App won't install | Wrong package name | Update `app.json` with correct package |
| Can't find Firebase Console | Wrong URL | Go to https://console.firebase.google.com/ |
| Lost google-services.json | Didn't save it | Regenerate in Firebase (optional for Expo) |

## Where's My FCM Key?

### In Firebase:
```
Firebase Console
  → Project Settings (⚙️ gear icon)
    → Service Accounts tab
      → Generate New Private Key
```

### Copy from JSON:
```json
{
  "type": "service_account",
  "project_id": "nba-app-xxxxx",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  ← This entire thing or just the "server API key" string
  ...
}
```

## Server Logs Show You What's Happening

When you send a notification, watch the server logs:

**Success (iOS/no FCM needed):**
```
[Expo] Sent notifications to 1/1 users
✓ Notification delivered
```

**Android without FCM:**
```
[Expo] Ticket error: Unable to retrieve the FCM server key...
[Expo] ========== FCM CONFIGURATION ERROR ==========
[Expo] This error typically means:
[Expo] 1. Firebase Cloud Messaging (FCM) credentials are not configured in Expo
...
[Expo] Full guide: See docs/FCM_SETUP_GUIDE.md
```

**Android with FCM working:**
```
[Expo] Sent notifications to 1/1 users
✓ Android device receives notification
```

## Next Steps

1. **Right now**: Follow the 3-step quick fix above
2. **In 5 minutes**: Your Android app will have FCM support
3. **Need help?**: See [docs/FCM_SETUP_GUIDE.md](FCM_SETUP_GUIDE.md) for detailed guide
4. **Still stuck?** Check the troubleshooting section in the detailed guide

## Did It Work?

Test with:
```bash
# Register a device (from your Android app)
curl -X POST http://localhost:8000/api/v1/notifications/register-device \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-clerk-id: YOUR_CLERK_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ExponentPushToken[...]",
    "deviceName": "My Android Phone",
    "osType": "android"
  }'

# Send a test notification
curl -X POST http://localhost:8000/api/v1/notifications/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_CLERK_ID",
    "title": "FCM Test",
    "body": "If you see this, FCM is working!",
    "notificationType": "test"
  }'
```

✅ If the Android device receives the notification → **FCM is working!**

## Resources

- **Firebase Console**: https://console.firebase.google.com/
- **Expo Dashboard**: https://expo.dev/
- **Detailed FCM Guide**: [docs/FCM_SETUP_GUIDE.md](FCM_SETUP_GUIDE.md)
- **Device Registration Help**: [docs/DEVICE_REGISTRATION_DEBUG.md](DEVICE_REGISTRATION_DEBUG.md)
- **Expo Setup Help**: [docs/EXPO_SETUP.md](EXPO_SETUP.md)

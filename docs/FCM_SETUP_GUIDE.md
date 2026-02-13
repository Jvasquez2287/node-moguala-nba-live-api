# Expo FCM (Firebase Cloud Messaging) Setup Guide

## Problem: "Unable to retrieve the FCM server key"

This error occurs when trying to send push notifications to **Android devices** and Firebase Cloud Messaging (FCM) credentials are not properly configured in your Expo project.

## Understanding Firebase vs Expo vs FCM

```
┌─────────────────────────────────────────────────────────┐
│                  Push Notification Flow                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Your Server (NBA API)                                 │
│       │                                                 │
│       ├─────→ Expo Push Service                         │
│       │                                                 │
│       └─→ (If FCM configured)                           │
│                  │                                       │
│    ┌────────────┴───────────────┐                       │
│    │                            │                       │
│    ↓                            ↓                        │
│  Firebase Messaging      Apple Push Notification       │
│  (Android - FCM)         Service (iOS - APNs)          │
│    │                            │                       │
│    ↓                            ↓                        │
│  Android Devices           iOS Devices                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## What You Need

### For iOS (Already working)
- Apple Push Notification service (APNs) certificate
- Usually handled automatically by Expo

### For Android (This is the issue)
- **Firebase Project** - Google Cloud project
- **FCM Server Key** - Credentials from Firebase (deprecated but still works)
- **Expo Credentials** - Upload FCM key to Expo

## Step 1: Create a Firebase Project

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a Project"** or select an existing project
3. Enter project name, e.g., "NBA API"
4. Click through the setup screens
5. Select or create a Google Cloud project
6. Enable Google Analytics (optional)
7. Click **"Create Project"** and wait for completion

### 1.2 Register Your App with Firebase
1. In Firebase Console, click the **gear icon** (Settings)
2. Go to **"Project Settings"**
3. Click the **"Apps"** tab
4. Click **"Add app"** → Select **"Android"**
5. Enter your Android app details:
   - **Android package name**: `com.yourcompany.nbaapp` (from your Expo app.json)
   - You can skip the SHA-1 for development
6. Click **"Register app"**
7. Download `google-services.json` (save this, you might need it later)
8. Click **"Next"** through the remaining steps

## Step 2: Get Your FCM Server Key

### 2.1 Find the Server Key (Legacy)
1. In Firebase Console, go to **Project Settings** (⚙️ icon)
2. Click the **"Service Accounts"** tab
3. Click **"Generate New Private Key"**
4. A JSON file will download - **KEEP THIS SAFE**
5. The file contains your credentials

### 2.2 Extract Credentials (Alternative Method)
If you need to find existing credentials:
1. Go to **Project Settings** → **Cloud Messaging** tab
2. Look for **"Server API Key"** or **"Legacy Server Key"**
3. This is your **FCM Server Key**

## Step 3: Configure Expo with FCM

### 3.1 Upload FCM Credentials to Expo

**Option A: Using Expo CLI (Recommended)**

```bash
# Install Expo CLI globally if not already installed
npm install -g expo-cli

# Login to your Expo account
expo login

# Configure FCM for your app
expo build:android --clear-credentials
```

Or more directly:

```bash
# Go to your Expo project
cd your-project

# Upload FCM key
eas credentials
```

**Option B: Manual Upload via Expo Website**

1. Go to [Expo Dashboard](https://expo.dev/)
2. Log in with your Expo account
3. Select your app/project
4. Go to **"Credentials"** or **"Push Notifications"** section
5. Find **Android** section
6. Click **"Add FCM Credentials"** or **"Edit"**
7. Paste your FCM Server Key (the long string from Firebase)
8. Click **"Save"** or **"Update"**

### 3.2 Update app.json with Android Package

Make sure your `app.json` includes your Android package name:

```json
{
  "expo": {
    "name": "NBA App",
    "slug": "nba-app",
    "platforms": ["ios", "android"],
    "android": {
      "package": "com.yourcompany.nbaapp",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

## Step 4: Rebuild and Test

### 4.1 Rebuild Your App
After uploading FCM credentials, rebuild your Expo app:

```bash
eas build --platform android
```

or with Expo CLI:

```bash
expo build:android
```

### 4.2 Test Android Notifications

```bash
# Register device token from your Android app
curl -X POST http://localhost:8000/api/v1/notifications/register-device \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-clerk-id: YOUR_CLERK_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ExponentPushToken[xxxxxxx...]",
    "deviceName": "Android Phone",
    "osType": "android"
  }'

# Send a test notification
curl -X POST http://localhost:8000/api/v1/notifications/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_CLERK_ID",
    "title": "Test Notification",
    "body": "This is a test from NBA API",
    "notificationType": "test"
  }'
```

## Troubleshooting

### Issue 1: "Unable to retrieve the FCM server key"

**Cause:** FCM credentials not uploaded to Expo

**Solutions:**
1. Verify you uploaded the FCM key to Expo
2. Check that the key is not expired (Firebase keys don't expire, but projects can be deleted)
3. Try regenerating the key in Firebase
4. Rebuild your app after uploading new credentials

### Issue 2: "Invalid FCM credentials"

**Cause:** Wrong FCM key or corrupted key

**Solutions:**
1. Get a fresh FCM key from Firebase console
2. Make sure you copied the entire key without extra spaces
3. Verify the Firebase project is active (not deleted)
4. Try uploading again

### Issue 3: Notifications work on iOS but not Android

**Cause:** FCM not configured or credentials invalid

**Solutions:**
1. Check FCM credentials are uploaded to Expo (see above)
2. Verify android package name matches in `app.json`
3. Rebuild Android app
4. Check if Android device is actually receiving the token from Expo
5. Monitor server logs for FCM-specific errors

### Issue 4: "Certificate validation failed"

**Cause:** Firebase project certificate issue

**Solutions:**
1. Generate a new private key in Firebase
2. Verify the JSON structure is valid
3. Copy the exact text without modifications

## Firebase Console Locations (Quick Reference)

| What You Need | Path in Console |
|---|---|
| FCM Server Key | Project Settings → Service Accounts → Generate Private Key |
| Existing Server Key | Project Settings → Cloud Messaging tab |
| Android Setup | Add App → Android |
| Project ID | Project Settings → General tab |
| API Keys | Project Settings → API Keys tab |

## Useful Links

- **Firebase Console**: https://console.firebase.google.com/
- **Expo Credentials**: https://expo.dev/
- **Expo FCM Docs**: https://docs.expo.dev/push-notifications/setup/
- **Firebase Setup Guide**: https://firebase.google.com/docs/cloud-messaging/android/client
- **Expo Debugging**: https://docs.expo.dev/debugging/runtime-issues/

## Complete Setup Checklist

- [ ] Firebase project created
- [ ] Android app registered in Firebase
- [ ] FCM credentials generated/downloaded
- [ ] FCM key uploaded to Expo
- [ ] `app.json` contains `android.package`
- [ ] App rebuilt with `eas build --platform android`
- [ ] Device registered with token from new build
- [ ] No errors in server logs about FCM
- [ ] Test notification sent successfully

## Server Side - What You Don't Need to Change

Your NBA API server doesn't need any configuration for FCM. The process is:

```
1. Mobile app gets token from Expo (includes FCM setup internally)
2. Mobile app sends token to your server's /register-device endpoint
3. You store the token in database
4. Your server sends notifications to Expo
5. Expo handles routing:
   - If Android → sends through FCM
   - If iOS → sends through APNs
6. Device receives notification
```

The Expo SDK (on the client) handles all the complexity. Your server just needs to send to the Expo API, which will then route to FCM/APNs as needed.

## For Existing Projects

If you already have an app deployed and need to add FCM:

1. Generate new FCM credentials in Firebase
2. Upload to Expo
3. **Important**: Rebuild and redeploy your app
4. Ask users to reinstall/update to the new version
5. Their devices will automatically get new tokens with FCM support

## If FCM Is Still an Issue

If you'd rather test without FCM for now, you have options:

### Option 1: Use iOS Only
Deploy only to iOS initially, come back to Android later

### Option 2: Test with Expo's Managed Workflow
Use Expo's EAS Build which handles FCM automatically

### Option 3: Development vs Production
- For development: Use Expo Go (handles FCM automatically)
- For production: Build custom APK with EAS Build

## Common Mistakes

❌ **Don't:**
- Use a Service Account JSON directly without extracting the key
- Upload the same FCM key to multiple Expo projects
- Forget to rebuild after uploading FCM credentials
- Use iOS APNs key as FCM key (they're different)
- Assume old Expo tokens will work with new FCM (they won't)

✅ **Do:**
- Upload FCM credentials to Expo before building
- Rebuild your app after credential changes
- Test with fresh tokens from the new build
- Keep FCM credentials secure (don't commit to git)
- Use separate Firebase projects for dev/prod if possible

## Still Having Issues?

1. **Check server logs** - Look for `[Expo] Ticket error` messages with exact error
2. **Run debug endpoint** - Use `/debug/check-tokens` to verify token format
3. **Test with Postman** - Manually send test notifications to see exact error
4. **Firebase Console** - Verify Android app is registered and active
5. **Expo Logs** - Build with `-v` or check Expo dashboard for build logs

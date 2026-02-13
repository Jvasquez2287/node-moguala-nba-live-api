# Push Notifications Setup Reference

## Overview

This project uses **Expo Push Notifications** with Firebase Cloud Messaging (FCM) for Android and Apple Push Notification service (APNs) for iOS.

## Documentation Map

Choose your starting point based on what you need to do:

### 🚀 Getting Started
**I'm setting up push notifications for the first time**
→ [FCM_QUICK_FIX.md](FCM_QUICK_FIX.md) - 10 minute setup guide

### 🆘 Troubleshooting

| Problem | Guide |
|---------|-------|
| "Unable to retrieve FCM server key" | [FCM_QUICK_FIX.md](FCM_QUICK_FIX.md) |
| "Sent notifications to 0/1 users" | [DEVICE_REGISTRATION_DEBUG.md](DEVICE_REGISTRATION_DEBUG.md) |
| "Device token is required" | [DEVICE_REGISTRATION_DEBUG.md](DEVICE_REGISTRATION_DEBUG.md) |
| "The bearer token is invalid" (Expo token) | [EXPO_SETUP.md](EXPO_SETUP.md) |
| Android notifications not working | [FCM_SETUP_GUIDE.md](FCM_SETUP_GUIDE.md) |
| iOS notifications not working | [EXPO_SETUP.md](EXPO_SETUP.md) |

### 📚 Detailed Guides

**Complete Firebase & Expo Setup**
→ [FCM_SETUP_GUIDE.md](FCM_SETUP_GUIDE.md)
- Detailed step-by-step with explanations
- Multiple configuration methods
- Troubleshooting section
- Complete checklist

**Device Token Registration Issues**
→ [DEVICE_REGISTRATION_DEBUG.md](DEVICE_REGISTRATION_DEBUG.md)
- How to register a device token
- Debug endpoints to check registration
- Common issues and solutions
- Direct database queries

**Expo Access Token Setup**
→ [EXPO_SETUP.md](EXPO_SETUP.md)
- Getting your Expo access token
- Configuring environment variables
- Token validation and validation

## Quick Architecture

```
Your Mobile App
    ↓
    ├─(1) Gets Expo push token from Expo SDK
    │
    └─(2) Sends token to your server:
          POST /api/v1/notifications/register-device
          ↓
          NBA API Server
          ├─ Validates JWT token
          ├─ Stores token in database
          └─ Ready to send notifications
    
Your Server → Expo Service
    ↓
    ├─ iOS → Apple Push Notification Service (APNs)
    │         → iOS Devices ✓
    │
    └─ Android → Firebase Cloud Messaging (FCM)
                  → Android Devices ✓
```

## Environment Variables Needed

Create a `.env` file with:

```bash
# Expo Push Notifications
EXPO_ACCESS_TOKEN=ExponentPushToken[...]  # From https://expo.io/settings/access-tokens

# Other required vars for your app
DB_SERVER=your-server
DB_USER=your-user
DB_PASSWORD=your-password
DB_NAME=your-database
CLERK_SECRET_KEY=your-clerk-key
TOKEN_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-key
```

See `.env.example` for template.

## API Endpoints

### Register Device
```bash
POST /api/v1/notifications/register-device
Headers:
  Authorization: Bearer JWT_TOKEN
  x-clerk-id: USER_CLERK_ID
  Content-Type: application/json
Body:
  {
    "token": "ExponentPushToken[...]",
    "deviceName": "My iPhone",
    "osType": "ios|android|web"
  }
```

### Unregister Device
```bash
POST /api/v1/notifications/unregister-device
Headers:
  Authorization: Bearer JWT_TOKEN
  Content-Type: application/json
Body:
  { "token": "ExponentPushToken[...]" }
```

### Get Notification History
```bash
GET /api/v1/notifications/history?limit=50
Headers:
  Authorization: Bearer JWT_TOKEN
```

### Get Registered Devices
```bash
GET /api/v1/notifications/devices
Headers:
  Authorization: Bearer JWT_TOKEN
```

### Debug: Check User
```bash
GET /api/v1/notifications/debug/check-user
Headers:
  Authorization: Bearer JWT_TOKEN
  x-clerk-id: USER_CLERK_ID
```

### Debug: Check Tokens
```bash
GET /api/v1/notifications/debug/check-tokens
Headers:
  Authorization: Bearer JWT_TOKEN
  x-clerk-id: USER_CLERK_ID
```

## Setup Checklist

### Prerequisites
- [ ] Expo account created (https://expo.dev)
- [ ] Firebase project created (https://console.firebase.google.com)
- [ ] Database tables created (migrations 000-005 run)

### Step 1: Get Expo Access Token (5 min)
- [ ] Go to https://expo.io/settings/access-tokens
- [ ] Create new token
- [ ] Copy token
- [ ] Add to `.env`: `EXPO_ACCESS_TOKEN=ExponentPushToken[...]`
- [ ] Restart server: `npm run dev`

### Step 2: Configure Firebase for Android (5 min)
- [ ] Create Firebase project
- [ ] Register Android app
- [ ] Download google-services.json (save it)
- [ ] Update `app.json` with package name
- [ ] Generate FCM Server Key

### Step 3: Upload FCM to Expo (2 min)
- [ ] Go to https://expo.dev/
- [ ] Select your app
- [ ] Go to Credentials → Android
- [ ] Add FCM Server Key
- [ ] Click Save

### Step 4: Rebuild Mobile App (5 min)
- [ ] Update `app.json` with correct package name
- [ ] Run: `eas build --platform android`
- [ ] Wait for build to complete
- [ ] Install on Android device or emulator

### Step 5: Test (5 min)
- [ ] Open mobile app
- [ ] Get notification token from Expo SDK
- [ ] Register token with `/register-device` endpoint
- [ ] Verify with `/debug/check-tokens` endpoint
- [ ] Send test notification
- [ ] Verify device receives it

**Total time: ~25 minutes**

## Common Error Messages

### FCM Errors
```
[Expo] Ticket error: Unable to retrieve the FCM server key for the recipient's app
```
→ See [FCM_QUICK_FIX.md](FCM_QUICK_FIX.md)

### Device Not Found
```
[Expo] No active tokens found for user: user_123
```
→ See [DEVICE_REGISTRATION_DEBUG.md](DEVICE_REGISTRATION_DEBUG.md)

### Expo Token Invalid
```
[Expo] The bearer token is invalid
```
→ See [EXPO_SETUP.md](EXPO_SETUP.md)

## Files Involved

### Configuration
- `.env` - Environment variables (EXPO_ACCESS_TOKEN, etc.)
- `.env.example` - Template with all variables

### Services
- `src/services/expoNotificationSystem.ts` - Core notification service
- `src/services/tokenCheck.ts` - JWT validation

### Routes
- `src/routes/notifications.ts` - API endpoints + debug endpoints

### Database
- `src/migrations/005_create_notifications_tables.sql` - Tables for notifications

### Documentation
- `docs/FCM_QUICK_FIX.md` - 3-step setup
- `docs/FCM_SETUP_GUIDE.md` - Detailed guide
- `docs/DEVICE_REGISTRATION_DEBUG.md` - Debug and troubleshoot
- `docs/EXPO_SETUP.md` - Expo token configuration
- `docs/PUSH_NOTIFICATIONS_SETUP.md` - This file

## Database Tables

```sql
device_tokens              -- Stores device push tokens
├─ user_id               -- FK to users.clerk_id
├─ token                 -- Expo push token (unique)
├─ is_active             -- Boolean, soft delete
└─ created_at, last_used

notifications            -- Notification history
├─ user_id               -- FK to users.clerk_id
├─ title, body, data
├─ notification_type     -- game_started, score_update, etc.
└─ delivery_status       -- pending, sent, failed

notification_tickets     -- Expo async ticket tracking
├─ notification_id       -- FK to notifications
├─ ticket_id             -- Expo receipt ID
└─ ticket_data, created_at

user_notification_preferences -- User opt-in/opt-out
├─ user_id (unique)      -- FK to users.clerk_id
├─ game_updates (bool)
├─ score_updates (bool)
├─ bet_notifications (bool)
└─ promotional_notifications (bool)
```

## Notification Types

Supported notification types your API can send:

- `game_started` - Game has started
- `score_update` - Live score update
- `game_ended` - Game has finished
- `bet_placed` - User placed a bet
- `bet_won` - User bet was successful
- `bet_lost` - User bet was unsuccessful
- `bet_push` - User bet was a push
- `subscription_activated` - Subscription started
- `subscription_expired` - Subscription ended
- `promotional` - Marketing message

## User Preferences

Users can opt-in/opt-out of notification categories via:
```bash
PUT /api/v1/notifications/preferences
```

Supported preferences:
- `game_updates` (default: true)
- `score_updates` (default: true)
- `game_ended` (default: true)
- `bet_notifications` (default: true)
- `subscription_notifications` (default: true)
- `promotional_notifications` (default: false)

## Testing

### Using curl
See individual guides for complete curl examples.

### From Mobile App
```javascript
// React Native / Expo
import * as Notifications from 'expo-notifications';

// Get token
const token = (await Notifications.getExpoPushTokenAsync()).data;
// Register with your server
await fetch('http://localhost:8000/api/v1/notifications/register-device', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'x-clerk-id': userId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token,
    deviceName: 'My Phone',
    osType: 'ios' // or 'android'
  })
});
```

## Performance

- **Batch sending**: Messages sent in batches of 100
- **Rate limits**: Respect Expo rate limits (check Expo docs)
- **Async processing**: Tickets tracked asynchronously
- **Database**: Indexed on user_id and notification_type for fast queries

## Security

- **JWT required**: All endpoints require valid JWT token
- **User isolation**: Users can only access their own tokens
- **Token validation**: Tokens validated with TokenCheckService
- **No public endpoints**: All endpoints require authentication
- **Secure storage**: Tokens encrypted in transit

## Monitoring

Check notification stats:
```bash
GET /api/v1/notifications/stats
Headers:
  Authorization: Bearer JWT_TOKEN
```

Monitor server logs for:
- `[Expo]` messages - Expo service operations
- `[Notification Route]` - API endpoint operations
- `[TokenCheck]` - Authentication checks

## Support

If you're stuck:

1. **Read the issue-specific guide** - Start with the error message guide table above
2. **Check server logs** - They provide detailed error info
3. **Use debug endpoints** - `check-user` and `check-tokens` help diagnose
4. **Review database** - Check if tokens are actually stored
5. **Verify environment** - Ensure `.env` has all required variables

## Next Steps

- **Not a developer?** [FCM_QUICK_FIX.md](FCM_QUICK_FIX.md)
- **Setting up for the first time?** [FCM_SETUP_GUIDE.md](FCM_SETUP_GUIDE.md)  
- **Debugging an issue?** Check the troubleshooting table above
- **Want complete details?** Read the specific guide for your situation

# Expo Push Notifications Setup Guide

## Overview

The NBA API uses Expo's push notification service to send real-time notifications to mobile clients. To enable push notifications, you must configure your Expo access token.

## Getting Your Expo Access Token

### Step 1: Create an Expo Account
1. Go to [https://expo.dev](https://expo.dev)
2. Sign up for a free account if you don't have one

### Step 2: Generate an Access Token
1. Log in to your Expo account
2. Go to [https://expo.io/settings/access-tokens](https://expo.io/settings/access-tokens)
3. Click **"Create Token"**
4. Give your token a descriptive name (e.g., "NBA API Server")
5. Select appropriate permissions (public read/write access is fine for development)
6. Click **"Create"**
7. Copy the generated token - **save this somewhere safe, you'll only see it once!**

## Configuration

### Step 1: Update Your Environment Variables
Add the following to your `.env` file in the root directory:

```bash
EXPO_ACCESS_TOKEN=ExponentPushToken[[xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]]
```

Replace the placeholder with your actual token from step 2.

### Step 2: Restart the Server
After updating the `.env` file, restart your Node.js server:

```bash
npm run dev
```

You should see in the console:
```
[Expo] Notification system initialized with access token: ExponentPushT...
```

If you see this warning instead:
```
[Expo] WARNING: EXPO_ACCESS_TOKEN environment variable is not set!
```

Then the token was not properly loaded. Check:
1. The `.env` file is in the project root directory
2. The syntax is correct: `EXPO_ACCESS_TOKEN=<token>`
3. No extra spaces around the equals sign
4. The server was restarted after updating `.env`

## Troubleshooting

### Error: "The bearer token is invalid"

This error occurs when:

1. **Token is not set**: Make sure `EXPO_ACCESS_TOKEN` is defined in your `.env` file
2. **Token is expired**: Expo tokens don't expire, but if you deleted or regenerated the token, you need to update your `.env` file
3. **Token format is wrong**: Make sure you copied the entire token, including any prefixes like `ExponentPushToken[` or `[`
4. **Typo in environment variable name**: Must be exactly `EXPO_ACCESS_TOKEN` (case-sensitive on Linux/Mac)

### How to Fix

1. **Verify your token is set:**
   ```bash
   # On Mac/Linux:
   echo $EXPO_ACCESS_TOKEN
   
   # On Windows PowerShell:
   $env:EXPO_ACCESS_TOKEN
   ```

2. **If empty, update `.env` file:**
   ```bash
   EXPO_ACCESS_TOKEN=your-actual-token-here
   ```

3. **Restart the server:**
   ```bash
   npm run dev
   ```

4. **Check the logs** for the initialization message

### Error: "AUTHENTICATION_ERROR" or "401 Unauthorized"

If you see this in addition to the bearer token error, it means:
- The token is being sent but Expo rejects it as invalid
- Regenerate a new token at [https://expo.io/settings/access-tokens](https://expo.io/settings/access-tokens)
- Update your `.env` file with the new token
- Restart the server

## Verifying Your Setup

Once configured, you can test the notification system:

### 1. Register a Device Token
Make a POST request to register a test device:

```bash
curl -X POST http://localhost:8000/api/v1/notifications/register-device \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "token": "ExponentPushToken[YOUR_TEST_TOKEN]",
    "deviceName": "Test iPhone",
    "osType": "ios"
  }'
```

### 2. Send a Test Notification
```bash
curl -X POST http://localhost:8000/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "YOUR_USER_ID",
    "title": "Test Notification",
    "body": "This is a test notification",
    "notificationType": "test"
  }'
```

### 3. Check Notification History
```bash
curl -X GET http://localhost:8000/api/v1/notifications/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Notification Features

Once configured, your system supports:

- **Game Notifications**: Game started, score updates, game ended
- **Bet Notifications**: Bet placed, won, lost, push
- **Subscription Notifications**: Subscription activated, expired, renewed
- **Promo Notifications**: Marketing and promotional content
- **User Preferences**: Users can opt-in/out of different notification categories

## Production Considerations

1. **Token Security**: 
   - Never commit your token to version control
   - Keep it in `.env` and add `.env` to `.gitignore`
   - Rotate tokens periodically

2. **Monitoring**:
   - Check database tables for delivery status
   - Review error logs for failed notifications
   - Monitor Expo account for usage statistics

3. **Rate Limits**:
   - Expo has rate limits on push notifications
   - The system batches notifications in groups of 100
   - Consider implementing delays for bulk sends

## Additional Resources

- **Expo Documentation**: https://docs.expo.dev/push-notifications/overview/
- **Expo Access Tokens**: https://docs.expo.dev/push-notifications/using-fcm/
- **SDK Reference**: https://github.com/expo/expo-server-sdk-js
- **Troubleshooting**: https://docs.expo.dev/push-notifications/troubleshooting/

## Support

If you continue to have issues:

1. Check the server console logs for detailed error messages
2. Verify token format matches exactly what Expo generated
3. Try regenerating a new token
4. Ensure server was restarted after `.env` changes
5. Check that your firewall allows outbound connections to Expo servers (https://exp.host)

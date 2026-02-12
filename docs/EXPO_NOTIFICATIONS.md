# Expo Push Notifications System

## Overview

The Expo Push Notifications System provides comprehensive mobile push notification capabilities for the NBA API. It handles device token registration, notification sending, delivery tracking, and user notification preferences.

## Architecture

### Core Components

1. **ExpoNotificationSystem Service** (`src/services/expoNotificationSystem.ts`)
   - Main service handling all notification operations
   - Manages device tokens, sends notifications, tracks delivery
   - Batch processing for efficient notification delivery
   - Singleton pattern for single instance across application

2. **Notification Routes** (`src/routes/notifications.ts`)
   - REST API endpoints for mobile client integration
   - Device token registration/unregistration
   - Notification history and preferences management
   - Statistics and monitoring endpoints

3. **Database Tables** (`src/migrations/005_create_notifications_tables.sql`)
   - `device_tokens`: Store user device push tokens
   - `notifications`: Notification history and delivery tracking
   - `notification_tickets`: Expo ticket receipts for delivery confirmation
   - `user_notification_preferences`: User notification settings

## Features

### Device Token Management

#### Register Device Token
```http
POST /api/v1/notifications/register-device
Content-Type: application/json

{
  "token": "ExponentPushToken[...]",
  "deviceName": "iPhone 12",
  "osType": "iOS"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device token registered successfully"
}
```

#### Unregister Device Token
```http
POST /api/v1/notifications/unregister-device
Content-Type: application/json

{
  "token": "ExponentPushToken[...]"
}
```

#### Get User's Devices
```http
GET /api/v1/notifications/devices
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "token": "ExponentPushToken[...]",
      "device_name": "iPhone 12",
      "os_type": "iOS",
      "is_active": 1,
      "created_at": "2024-01-15T10:30:00Z",
      "last_used": "2024-02-12T14:20:00Z"
    }
  ],
  "count": 1
}
```

### Notification Types

#### Game Updates
```typescript
await expoNotificationSystem.sendGameUpdateNotification(
  gameId,
  homeTeam,
  awayTeam,
  score,
  'game_started' | 'score_update' | 'game_ended'
);
```

**Examples:**
- Game Started: "Game Started 🏀" - "Celtics @ Lakers - Tip off!"
- Score Update: "Score Update 🏀" - "Celtics vs Lakers - 45-42 (Q2)"
- Game Ended: "Game Ended 🏀" - "Final: Celtics vs Lakers - 120-118"

#### Subscription Notifications
```typescript
await expoNotificationSystem.sendSubscriptionNotification(
  userId,
  'subscription_created' | 'subscription_renewed' | 'subscription_canceled' | 'subscription_expired',
  planName
);
```

**Examples:**
- Created: "Subscription Confirmed ✅" - "Your Premium is now active!"
- Renewed: "Subscription Renewed ✅" - "Your Premium has been renewed."
- Canceled: "Subscription Canceled ❌" - "Your Premium has been canceled."
- Expired: "Subscription Expired ⏰" - "Your Premium has expired. Renew to continue."

#### Bet Notifications
```typescript
await expoNotificationSystem.sendBetNotification(
  userId,
  betId,
  'placed' | 'won' | 'lost' | 'push',
  amount,
  winnings
);
```

**Examples:**
- Placed: "Bet Placed 🎲" - "Your bet for $5.00 has been placed."
- Won: "Bet Won! 💰" - "Congratulations! You won $12.50!"
- Lost: "Bet Lost 😢" - "Your bet has lost. Try again!"
- Push: "Bet Push 🔄" - "Your bet pushed. Amount refunded."

#### Promotional Notifications
```typescript
await expoNotificationSystem.sendPromoNotification(
  title,
  body,
  imageUrl,
  largeIconUrl
);
```

### Notification Preferences

#### Get Preferences
```http
GET /api/v1/notifications/preferences
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "game_updates": 1,
    "score_updates": 1,
    "game_ended": 1,
    "bet_notifications": 1,
    "subscription_notifications": 1,
    "promotional_notifications": 0
  }
}
```

#### Update Preferences
```http
PUT /api/v1/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameUpdates": true,
  "scoreUpdates": true,
  "gameEnded": true,
  "betNotifications": true,
  "subscriptionNotifications": true,
  "promotionalNotifications": false
}
```

### Notification History

#### Get History
```http
GET /api/v1/notifications/history?limit=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": "user_abc123",
      "title": "Game Started 🏀",
      "body": "Celtics @ Lakers - Tip off!",
      "notification_type": "game_game_started",
      "data": {
        "gameId": "game_123",
        "homeTeam": "Lakers",
        "awayTeam": "Celtics",
        "score": "0-0"
      },
      "sent_at": "2024-02-12T20:00:00Z",
      "delivery_status": "sent"
    }
  ],
  "count": 1
}
```

### Statistics

#### Get Notification Stats
```http
GET /api/v1/notifications/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDevices": 156,
    "activeDevices": 142,
    "totalNotificationsSent": 2847,
    "failedNotifications": 12
  }
}
```

## Implementation Examples

### Client Registration (React Native/Expo)

```typescript
import * as Notifications from 'expo-notifications';

async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Permission denied');
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id',
  });

  // Register with backend
  await fetch('https://api.example.com/api/v1/notifications/register-device', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      token: token.data,
      deviceName: Device.deviceName,
      osType: Platform.OS,
    }),
  });
}
```

### Sending Notifications (Backend)

```typescript
import expoNotificationSystem from './services/expoNotificationSystem';

// Send game update
await expoNotificationSystem.sendGameUpdateNotification(
  'game_123',
  'Lakers',
  'Celtics',
  '120-118 (F)',
  'game_ended'
);

// Send subscription confirmation
await expoNotificationSystem.sendSubscriptionNotification(
  'user_abc123',
  'subscription_created',
  'Premium'
);

// Send bet result
await expoNotificationSystem.sendBetNotification(
  'user_abc123',
  'bet_456',
  'won',
  '50.00',
  '125.00'
);
```

## Environment Setup

### Required Environment Variables

```env
EXPO_ACCESS_TOKEN=your_expo_access_token
```

Obtain your Expo access token from: https://expo.dev/settings/access-tokens

### Database Migration

The system automatically creates required tables on first run:

```sql
- device_tokens (device push tokens storage)
- notifications (notification history and delivery tracking)
- notification_tickets (Expo ticket receipts)
- user_notification_preferences (user notification settings)
```

Run migrations with:
```bash
npm run build
```

## Batch Processing

Notifications are sent in batches of 100 to optimize API usage and delivery speed. Large notification campaigns automatically split into multiple batches:

```typescript
const BATCH_SIZE = 100;
for (let i = 0; i < messages.length; i += BATCH_SIZE) {
  const batch = messages.slice(i, i + BATCH_SIZE);
  await expoNotificationSystem.expoClient.sendPushNotificationsAsync(batch);
}
```

## Delivery Tracking

The system maintains detailed delivery records:

- **Pending**: Notification queued for delivery
- **Sent**: Successfully sent to Expo servers
- **Failed**: Delivery failed (invalid token, service error, etc.)

Delivery status is tracked via Expo ticket receipts and stored for analysis:

```sql
SELECT delivery_status, COUNT(*) as count
FROM notifications
GROUP BY delivery_status
```

## Token Cleanup

Inactive device tokens older than 30 days are automatically cleaned up:

```typescript
await expoNotificationSystem.cleanupInactiveTokens(30);
```

## Error Handling

The system handles common error scenarios:

- **Invalid Token Format**: Tokens are validated before registration
- **Duplicate Tokens**: Same token for same user is updated, not duplicated
- **Delivery Failures**: Failed notifications are logged with error messages
- **Database Errors**: Logged but don't prevent notification attempts

## Performance Considerations

- **Batch Size**: Optimized at 100 messages per request
- **Token Validation**: All tokens validated per Expo guidelines
- **Database Indexing**: Optimized indexes on frequently queried columns
- **Cleanup Tasks**: Run during low-traffic periods

## Security

- **Token Storage**: Push tokens stored securely in database with user association
- **Access Control**: Protected routes require valid JWT authentication
- **Data Isolation**: Users can only access their own notification data
- **Rate Limiting**: Recommended to implement rate limiting on push endpoints

## Monitoring & Logging

All operations are logged with consistent naming:

```
[Expo] Device token registered for user: user_123
[Expo] Sent notifications to 45/50 users
[Expo] Error sending notifications to tokens: Invalid token format
```

Monitor logs for:
- Token registration failures
- Delivery rate anomalies
- Error message patterns
- Cleanup task execution

## Future Enhancements

- [ ] Rich media notifications (images, buttons)
- [ ] Scheduled notifications
- [ ] A/B testing for notification content
- [ ] Advanced segmentation for targeted campaigns
- [ ] Delivery analytics dashboard
- [ ] Notification templates system
- [ ] Deep link support for in-app navigation
- [ ] User engagement tracking

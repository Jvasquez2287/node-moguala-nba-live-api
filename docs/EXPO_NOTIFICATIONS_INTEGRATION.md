# Expo Notifications Integration Guide

Quick reference for integrating push notifications into your mobile app and backend.

## 1. Mobile Client Setup (React Native/Expo)

### Install Dependencies
```bash
expo install expo-notifications
```

### Request Permissions
```typescript
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
```

### Get Push Token
```typescript
export async function getPushToken() {
  if (Constants.isDevice) {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: YOUR_PROJECT_ID,
    });
    return token.data;
  }
  return null;
}
```

### Register Device
```typescript
import axios from 'axios';

export async function registerDevice(userToken: string) {
  const deviceToken = await getPushToken();
  if (!deviceToken) return;

  try {
    await axios.post(
      'https://api.example.com/api/v1/notifications/register-device',
      {
        token: deviceToken,
        deviceName: Device.modelName,
        osType: Platform.OS,
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      }
    );
  } catch (error) {
    console.error('Failed to register device:', error);
  }
}
```

### Setup Notification Listener
```typescript
export function setupNotificationListeners() {
  const notificationListener = Notifications.addNotificationResponseListener(
    (response) => {
      const { notification } = response;
      const { data } = notification.request.content;

      // Handle notification based on type
      if (data.gameId) {
        navigation.navigate('GameDetails', { gameId: data.gameId });
      } else if (data.betId) {
        navigation.navigate('BetDetails', { betId: data.betId });
      }
    }
  );

  return () => notificationListener.remove();
}
```

## 2. Backend Integration

### Send Game Update Notification
```typescript
import expoNotificationSystem from '../services/expoNotificationSystem';

export async function notifyGameStarted(game: Game) {
  await expoNotificationSystem.sendGameUpdateNotification(
    game.id,
    game.home_team,
    game.away_team,
    `${game.away_team} @ ${game.home_team}`,
    'game_started'
  );
}

export async function notifyScoreUpdate(game: Game) {
  const score = `${game.away_score}-${game.home_score}`;
  await expoNotificationSystem.sendGameUpdateNotification(
    game.id,
    game.home_team,
    game.away_team,
    score,
    'score_update'
  );
}

export async function notifyGameEnded(game: Game) {
  const score = `${game.away_score}-${game.home_score} (Final)`;
  await expoNotificationSystem.sendGameUpdateNotification(
    game.id,
    game.home_team,
    game.away_team,
    score,
    'game_ended'
  );
}
```

### Send Subscription Notifications
```typescript
// In Stripe webhook handler
router.post('/api/v1/webhooks/stripe', async (req, res) => {
  const event = req.body;

  if (event.type === 'customer.subscription.created') {
    const { customer, items } = event.data.object;
    const planName = items.data[0].plan.nickname;

    await expoNotificationSystem.sendSubscriptionNotification(
      customer,
      'subscription_created',
      planName
    );
  }

  if (event.type === 'customer.subscription.deleted') {
    const { customer, items } = event.data.object;
    const planName = items.data[0].plan.nickname;

    await expoNotificationSystem.sendSubscriptionNotification(
      customer,
      'subscription_canceled',
      planName
    );
  }
});
```

### Send Bet Notifications
```typescript
// When bet is placed
async function placeBet(userId: string, betData: Bet) {
  const bet = await createBet(userId, betData);

  await expoNotificationSystem.sendBetNotification(
    userId,
    bet.id,
    'placed',
    bet.amount.toString()
  );

  return bet;
}

// When game ends and bet is settled
async function settleBet(bet: Bet, game: Game) {
  let status: 'won' | 'lost' | 'push' = 'lost';
  let winnings = '0';

  if (bet.result === 'win') {
    status = 'won';
    winnings = bet.potential_payout.toString();
  } else if (bet.result === 'push') {
    status = 'push';
    winnings = bet.amount.toString();
  }

  await expoNotificationSystem.sendBetNotification(
    bet.user_id,
    bet.id,
    status,
    bet.amount.toString(),
    winnings
  );
}
```

### Send Promotional Notifications
```typescript
export async function sendPromoBanner(title: string, body: string) {
  const imageUrl = 'https://api.example.com/assets/promo.jpg';
  
  await expoNotificationSystem.sendPromoNotification(
    title,
    body,
    imageUrl
  );
}
```

## 3. User Preferences Management

### Get User Preferences
```typescript
async function getUserNotificationPreferences(userId: string) {
  const response = await axios.get(
    'https://api.example.com/api/v1/notifications/preferences',
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    }
  );
  return response.data.data;
}
```

### Update Preferences
```typescript
async function updateNotificationPreferences(preferences: {
  gameUpdates: boolean;
  scoreUpdates: boolean;
  betNotifications: boolean;
  promotionalNotifications: boolean;
}) {
  await axios.put(
    'https://api.example.com/api/v1/notifications/preferences',
    preferences,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    }
  );
}
```

## 4. Testing Notifications

### Manual Testing
Use the Expo CLI to send test notifications:

```bash
# Set your Expo access token
export EXPO_TOKEN=your_token

# Send test notification
npx expo send:notifications --dest ExponentPushToken[xxxxx]
```

### Backend Testing
```typescript
export async function sendTestNotification(userId: string) {
  const tokens = await expoNotificationSystem.getUserTokens(userId);
  
  if (tokens.length === 0) {
    console.log('No devices registered for user');
    return;
  }

  await expoNotificationSystem.sendNotificationsToTokens(
    tokens,
    'Test Title',
    'This is a test notification',
    {
      user_id: userId,
      title: 'Test Title',
      body: 'This is a test notification',
      notification_type: 'test',
      sent_at: new Date(),
      delivery_status: 'pending',
    }
  );
}
```

## 5. Notification History

### Get Recent Notifications
```typescript
async function getNotificationHistory(userToken: string, limit = 20) {
  const response = await axios.get(
    `https://api.example.com/api/v1/notifications/history?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    }
  );
  return response.data.data;
}
```

### Display in UI
```typescript
export function NotificationHistory() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getNotificationHistory(userToken, 50).then(setNotifications);
  }, []);

  return (
    <FlatList
      data={notifications}
      renderItem={({ item }) => (
        <View style={styles.notificationItem}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>
            {new Date(item.sent_at).toLocaleString()}
          </Text>
        </View>
      )}
      keyExtractor={(item) => item.id.toString()}
    />
  );
}
```

## 6. Troubleshooting

### Device Not Receiving Notifications

1. **Check Token Registration**
   ```typescript
   const devices = await axios.get(
     'https://api.example.com/api/v1/notifications/devices',
     { headers: { 'Authorization': `Bearer ${token}` } }
   );
   console.log('Registered devices:', devices.data.data);
   ```

2. **Verify Permissions**
   ```typescript
   const { status } = await Notifications.getPermissionsAsync();
   console.log('Notification permission status:', status);
   ```

3. **Check Notification Preferences**
   ```typescript
   const prefs = await getUserNotificationPreferences(userId);
   console.log('Preferences:', prefs);
   ```

### Valid Token Not Accepted

Ensure token format matches Expo format:
- Should start with `ExponentPushToken[`
- Should end with `]`
- Should be obtained from `Notifications.getExpoPushTokenAsync()`

### Notifications Not Showing in Foreground

By default, Expo doesn't display notifications when app is in foreground. Handle this:

```typescript
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

## 7. Best Practices

✅ **Do:**
- Request permissions before getting token
- Update preferences based on user settings
- Handle background notifications gracefully
- Test tokens before sending in production
- Monitor delivery failures
- Clean up tokens on logout

❌ **Don't:**
- Send notifications without user permission
- Check permissions every time before sending
- Store tokens in localStorage
- Send sensitive data in notification data
- Spam users with too many notifications
- Ignore notification preferences

## 8. Analytics Integration

Track notification engagement:

```typescript
async function trackNotificationClick(notificationId: number) {
  // Log to analytics
  analytics.logEvent('notification_clicked', {
    notification_id: notificationId,
    timestamp: new Date(),
  });
}

Notifications.addNotificationResponseListener((response) => {
  const notificationId = response.notification.request.content.data.id;
  trackNotificationClick(notificationId);
});
```

## Support

For issues or questions:
1. Check [EXPO_NOTIFICATIONS.md](./EXPO_NOTIFICATIONS.md) for detailed documentation
2. Review Expo documentation: https://docs.expo.dev/push-notifications/overview/
3. Check backend logs for error messages
4. Monitor notification delivery statistics via `/api/v1/notifications/stats`

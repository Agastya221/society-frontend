@AGENTS.md

- Push uses the **native FCM device token** (`getDevicePushTokenAsync`, registered via `PATCH /staff-app/fcm-token`) — *not* an Expo push token, because the backend sends through Firebase Admin to `StaffAccount.fcmToken`.
- Uses plain `StyleSheet`, not NativeWind.

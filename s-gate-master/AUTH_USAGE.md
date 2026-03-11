# JWT Authentication - Usage Examples

## Login Screen
The login screen has been updated to use the real API. Users can login with phone number or email:

```typescript
// src/app/login.tsx
const handleLogin = async () => {
    const response = await authService.login({
        identifier: identifier.trim(), // phone or email
        password: password,
    });
    
    if (response.success) {
        await login(response.data.token, response.data.user, response.data.appType);
        // Navigation happens automatically based on role
    }
};
```

## Using Protected Routes

### Simple Authentication Check
Use `useProtectedRoute()` to ensure user is authenticated:

```typescript
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function MyProtectedScreen() {
    useProtectedRoute(); // Redirects to login if not authenticated
    
    return (
        <View>
            <Text>This screen requires authentication</Text>
        </View>
    );
}
```

### Role-Based Access Control
Use `useRoleBasedRoute()` to restrict access by role:

```typescript
import { useRoleBasedRoute } from '@/hooks/useProtectedRoute';

export default function AdminOnlyScreen() {
    useRoleBasedRoute(['ADMIN']); // Only allows ADMIN role
    
    return (
        <View>
            <Text>Admin Only Content</Text>
        </View>
    );
}
```

## Accessing Auth State

### Get Current User
```typescript
import { useAuthStore } from '@/store/useAuthStore';

export default function ProfileScreen() {
    const { user, role, token } = useAuthStore();
    
    return (
        <View>
            <Text>Welcome, {user?.name}</Text>
            <Text>Role: {role}</Text>
            <Text>Email: {user?.email}</Text>
            <Text>Society: {user?.society}</Text>
            <Text>Flat: {user?.flat}</Text>
        </View>
    );
}
```

### Logout User
```typescript
import { useAuthStore } from '@/store/useAuthStore';

export default function SettingsScreen() {
    const logout = useAuthStore((state) => state.logout);
    
    const handleLogout = async () => {
        await logout();
        // User is automatically redirected to login screen
    };
    
    return (
        <Button title="Logout" onPress={handleLogout} />
    );
}
```

## Making Authenticated API Calls

All API calls automatically include the JWT token:

```typescript
import api from '@/services/api';

// Token is automatically attached to Authorization header
const response = await api.get('/residents/profile');
const data = await api.post('/gate-passes', { ... });
```

## Navigation Flow

### On App Launch
1. App checks for saved token in secure storage
2. If token exists, user is auto-logged in
3. User is redirected based on role:
   - `ADMIN` → `/(admin)` 
   - `RESIDENT` → `/(resident)/home`

### On Login Success
1. Token is saved to expo-secure-store
2. User data is saved to Zustand store
3. User is automatically redirected based on role

### On Logout
1. Token is removed from secure storage
2. Store is cleared
3. User is redirected to `/login`

### On 401 Error (Token Expired)
1. Response interceptor catches 401 error
2. Auto-logout is triggered
3. User is redirected to `/login`

## API Response Format

Your login API should return this format:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "ADMIN",
      "society": "S-Gate Residency",
      "flat": "A-101"
    },
    "appType": "mobile"
  }
}
```

## Security Notes

✅ **Token Storage**: Tokens are stored in expo-secure-store (encrypted on device)  
✅ **Auto-Logout**: 401 errors trigger automatic logout  
✅ **No Hardcoded Roles**: All role checks use data from API  
✅ **Password Clearing**: Password is cleared on error  
✅ **Loading States**: All buttons are disabled during API calls  
✅ **Navigation Lock**: Users cannot navigate before token is saved

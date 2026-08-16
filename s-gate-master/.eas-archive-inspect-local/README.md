 # S-Gate Expo App

A production-ready React Native Expo app featuring:
- **Expo Router**: File-based routing
- **NativeWind**: Tailwind CSS styling
- **Zustand**: State management
- **Axios**: API networking
- **TypeScript**: Static type checking

## Project Structure

```
/src
  /app          # Expo Router pages
    /(app)      # Protected routes (Home, Profile)
    login.tsx   # Public Auth route
  /components   # Reusable UI components
  /services     # API services
  /store        # State management (Zustand)
  /theme        # Theme configuration
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the app:**
   ```bash
   npx expo start
   ```

3. **Run on Device/Simulator:**
   - Press `i` to open in iOS Simulator
   - Press `a` to open in Android Emulator
   - Scan QR code with Expo Go app

## Key Features

- **Authentication Flow**: Protected routes logic in `src/app/_layout.tsx`.
- **Dark Mode**: Fully supported via NativeWind using `dark:` classes.
- **Path Aliases**: Use `@/` to import from `src`.

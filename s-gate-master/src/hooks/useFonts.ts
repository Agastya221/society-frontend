import { useFonts as useExpoFonts } from 'expo-font';

export function useSoraFonts() {
  return useExpoFonts({
    'Sora-Regular': require('../assets/fonts/Sora-Regular.ttf'),
    'Sora-Medium': require('../assets/fonts/Sora-Medium.ttf'),
    'Sora-SemiBold': require('../assets/fonts/Sora-SemiBold.ttf'),
    'Sora-Bold': require('../assets/fonts/Sora-Bold.ttf'),
    'Sora-ExtraBold': require('../assets/fonts/Sora-ExtraBold.ttf'),
  });
}

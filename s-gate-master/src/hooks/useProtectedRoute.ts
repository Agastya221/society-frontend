import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Custom hook to protect routes from unauthorized access
 * Redirects to login if user is not authenticated
 * 
 * @example
 * export default function ProtectedScreen() {
 *   useProtectedRoute();
 *   return <View>...</View>;
 * }
 */
export const useProtectedRoute = () => {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isLoading]);

    return { isAuthenticated, isLoading };
};

/**
 * Custom hook to protect routes AND check for specific role
 * Redirects to login if not authenticated or wrong role
 * 
 * @param allowedRoles - Array of allowed roles for this route
 * 
 * @example
 * export default function AdminOnlyScreen() {
 *   useRoleBasedRoute(['ADMIN']);
 *   return <View>...</View>;
 * }
 */
export const useRoleBasedRoute = (allowedRoles: string[]) => {
    const router = useRouter();
    const { isAuthenticated, isLoading, role } = useAuthStore();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.replace('/login');
            } else if (role && !allowedRoles.includes(role)) {
                // User doesn't have the right role, redirect based on their role
                if (role === 'ADMIN') {
                    router.replace('/(admin)');
                } else if (role === 'RESIDENT') {
                    router.replace('/(resident)/home');
                } else {
                    router.replace('/login');
                }
            }
        }
    }, [isAuthenticated, isLoading, role]);

    return { isAuthenticated, isLoading, role };
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { City } from '../types/onboarding.types';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const RECENT_CITIES_KEY = 'sgate_recent_cities';
const MAX_RECENT = 5;

// ─── Featured Cities (top 9 for grid) ─────────────────────────────────────────

const FEATURED_CITIES: City[] = [
    { id: 'bangalore', name: 'Bangalore', state: 'Karnataka', isFeatured: true },
    { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', isFeatured: true },
    { id: 'delhi', name: 'Delhi NCR', state: 'Delhi', isFeatured: true },
    { id: 'pune', name: 'Pune', state: 'Maharashtra', isFeatured: true },
    { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', isFeatured: true },
    { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', isFeatured: true },
    { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', isFeatured: true },
    { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', isFeatured: true },
    { id: 'jamshedpur', name: 'Jamshedpur', state: 'Jharkhand', isFeatured: true },
];

// ─── All Cities (alphabetical) ────────────────────────────────────────────────

const ALL_CITIES: City[] = [
    ...FEATURED_CITIES,
    { id: 'agra', name: 'Agra', state: 'Uttar Pradesh', isFeatured: false },
    { id: 'amritsar', name: 'Amritsar', state: 'Punjab', isFeatured: false },
    { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh', isFeatured: false },
    { id: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha', isFeatured: false },
    { id: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh', isFeatured: false },
    { id: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu', isFeatured: false },
    { id: 'dehradun', name: 'Dehradun', state: 'Uttarakhand', isFeatured: false },
    { id: 'faridabad', name: 'Faridabad', state: 'Haryana', isFeatured: false },
    { id: 'ghaziabad', name: 'Ghaziabad', state: 'Uttar Pradesh', isFeatured: false },
    { id: 'goa', name: 'Goa', state: 'Goa', isFeatured: false },
    { id: 'greater-noida', name: 'Greater Noida', state: 'Uttar Pradesh', isFeatured: false },
    { id: 'gurugram', name: 'Gurugram', state: 'Haryana', isFeatured: false },
    { id: 'guwahati', name: 'Guwahati', state: 'Assam', isFeatured: false },
    { id: 'indore', name: 'Indore', state: 'Madhya Pradesh', isFeatured: false },
    { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', isFeatured: false },
    { id: 'kanpur', name: 'Kanpur', state: 'Uttar Pradesh', isFeatured: false },
    { id: 'kochi', name: 'Kochi', state: 'Kerala', isFeatured: false },
    { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', isFeatured: false },
    { id: 'ludhiana', name: 'Ludhiana', state: 'Punjab', isFeatured: false },
    { id: 'mangalore', name: 'Mangalore', state: 'Karnataka', isFeatured: false },
    { id: 'mysore', name: 'Mysore', state: 'Karnataka', isFeatured: false },
    { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', isFeatured: false },
    { id: 'nashik', name: 'Nashik', state: 'Maharashtra', isFeatured: false },
    { id: 'noida', name: 'Noida', state: 'Uttar Pradesh', isFeatured: false },
    { id: 'patna', name: 'Patna', state: 'Bihar', isFeatured: false },
    { id: 'ranchi', name: 'Ranchi', state: 'Jharkhand', isFeatured: false },
    { id: 'surat', name: 'Surat', state: 'Gujarat', isFeatured: false },
    { id: 'thane', name: 'Thane', state: 'Maharashtra', isFeatured: false },
    { id: 'thiruvananthapuram', name: 'Thiruvananthapuram', state: 'Kerala', isFeatured: false },
    { id: 'vadodara', name: 'Vadodara', state: 'Gujarat', isFeatured: false },
    { id: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh', isFeatured: false },
    { id: 'vijayawada', name: 'Vijayawada', state: 'Andhra Pradesh', isFeatured: false },
    { id: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh', isFeatured: false },
].sort((a, b) => a.name.localeCompare(b.name));

// ─── Public API ───────────────────────────────────────────────────────────────

export const getFeaturedCities = (): City[] => FEATURED_CITIES;

export const getAllCities = (): City[] => ALL_CITIES;

export const searchCities = (query: string): City[] => {
    if (!query.trim()) return ALL_CITIES;
    const q = query.toLowerCase().trim();
    return ALL_CITIES.filter(
        (c) =>
            c.name.toLowerCase().includes(q) ||
            c.state.toLowerCase().includes(q)
    );
};

export const getRecentCities = async (): Promise<City[]> => {
    try {
        const raw = await AsyncStorage.getItem(RECENT_CITIES_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as City[];
    } catch {
        return [];
    }
};

export const saveRecentCity = async (city: City): Promise<void> => {
    try {
        const existing = await getRecentCities();
        const filtered = existing.filter((c) => c.id !== city.id);
        const updated = [city, ...filtered].slice(0, MAX_RECENT);
        await AsyncStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(updated));
    } catch {
        // Silently fail — non-critical
    }
};

export const clearRecentCities = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(RECENT_CITIES_KEY);
    } catch {
        // Silently fail
    }
};

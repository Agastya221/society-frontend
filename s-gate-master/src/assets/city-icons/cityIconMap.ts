/**
 * City → Landmark Icon mapping system.
 *
 * Provides culturally-relevant Indian city landmarks as SVG icons.
 * Falls back to an elegant city skyline when no specific icon exists.
 *
 * Usage:
 *   import { getCityIcon } from '@/assets/city-icons/cityIconMap';
 *   const Icon = getCityIcon('delhi');
 *   <Icon size={48} color="#C0C0C0" />
 */

import type { CityIconProps } from './types';

// ─── Landmark Icons ───────────────────────────────────────────────────────────

import IndiaGateIcon from './IndiaGateIcon';
import TajMahalIcon from './TajMahalIcon';
import CharminarIcon from './CharminarIcon';
import GatewayOfIndiaIcon from './GatewayOfIndiaIcon';
import VidhanaSoudhaIcon from './VidhanaSoudhaIcon';
import TempleIcon from './TempleIcon';
import ShaniwarWadaIcon from './ShaniwarWadaIcon';
import SidiSaiyyedIcon from './SidiSaiyyedIcon';
import VictoriaMemorialIcon from './VictoriaMemorialIcon';
import IndustrialSkylineIcon from './IndustrialSkylineIcon';
import FishingNetsIcon from './FishingNetsIcon';
import GoldenTempleIcon from './GoldenTempleIcon';
import HawaMahalIcon from './HawaMahalIcon';
import RumiDarwazaIcon from './RumiDarwazaIcon';
import MysorePalaceIcon from './MysorePalaceIcon';
import GolgharIcon from './GolgharIcon';
import GhatsIcon from './GhatsIcon';
import TajUlMasajidIcon from './TajUlMasajidIcon';
import OpenHandIcon from './OpenHandIcon';
import CitySkylineIcon from './CitySkylineIcon';

// ─── Map: city ID → React component ──────────────────────────────────────────

export const cityIconMap: Record<string, React.FC<CityIconProps>> = {
    // Featured cities (grid)
    bangalore:   VidhanaSoudhaIcon,
    mumbai:      GatewayOfIndiaIcon,
    delhi:       IndiaGateIcon,
    pune:        ShaniwarWadaIcon,
    chennai:     TempleIcon,
    hyderabad:   CharminarIcon,
    ahmedabad:   SidiSaiyyedIcon,
    kolkata:     VictoriaMemorialIcon,
    jamshedpur:  IndustrialSkylineIcon,

    // Non-featured cities with specific landmarks
    agra:        TajMahalIcon,
    amritsar:    GoldenTempleIcon,
    bhopal:      TajUlMasajidIcon,
    chandigarh:  OpenHandIcon,
    jaipur:      HawaMahalIcon,
    kochi:       FishingNetsIcon,
    lucknow:     RumiDarwazaIcon,
    mysore:      MysorePalaceIcon,
    patna:       GolgharIcon,
    varanasi:    GhatsIcon,
};

/** Elegant fallback for cities without a specific landmark icon */
export const FallbackCityIcon = CitySkylineIcon;

/**
 * Returns the landmark icon component for a given city ID.
 * Falls back to a premium city skyline silhouette.
 */
export function getCityIcon(cityId: string): React.FC<CityIconProps> {
    return cityIconMap[cityId] ?? FallbackCityIcon;
}

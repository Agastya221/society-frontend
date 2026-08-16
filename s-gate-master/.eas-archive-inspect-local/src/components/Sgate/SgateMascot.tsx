'use no memo';
import React from 'react';
import Svg, {
    Circle,
    Defs,
    Ellipse,
    G,
    LinearGradient as SvgGradient,
    Path,
    Rect,
    Stop,
} from 'react-native-svg';
import { SgateColors } from '@/constants/Sgate-theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MascotPose = 'wave' | 'happy' | 'wink' | 'thumbsup' | 'alert';

interface SgateMascotProps {
    size?: number;
    pose?: MascotPose;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SgateMascot({ size = 80, pose = 'happy' }: SgateMascotProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 120 120">
            <Defs>
                {/* Gold gradient for shield body */}
                <SvgGradient id="shieldGold" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={SgateColors.gold} />
                    <Stop offset="1" stopColor={SgateColors.goldDeep} />
                </SvgGradient>
                {/* Dark gradient for visor */}
                <SvgGradient id="visorDark" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#1A1D25" />
                    <Stop offset="1" stopColor={SgateColors.black} />
                </SvgGradient>
            </Defs>

            {/* ── Shield body ─────────────────────────────────────────── */}
            <Path
                d="M60 10 C40 10 22 20 22 40 L22 60 C22 85 40 108 60 112 C80 108 98 85 98 60 L98 40 C98 20 80 10 60 10 Z"
                fill="url(#shieldGold)"
            />

            {/* ── Inner shield highlight ──────────────────────────────── */}
            <Path
                d="M60 16 C43 16 28 24 28 42 L28 58 C28 80 43 100 60 104 C77 100 92 80 92 58 L92 42 C92 24 77 16 60 16 Z"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
            />

            {/* ── Visor (face area) ───────────────────────────────────── */}
            <Rect
                x="34"
                y="38"
                width="52"
                height="30"
                rx="15"
                ry="15"
                fill="url(#visorDark)"
            />

            {/* ── Eyes ────────────────────────────────────────────────── */}
            {renderEyes(pose)}

            {/* ── Mouth ───────────────────────────────────────────────── */}
            {renderMouth(pose)}

            {/* ── Arms / accessories ──────────────────────────────────── */}
            {renderArms(pose)}

            {/* ── Shield emblem (small S) ─────────────────────────────── */}
            <Path
                d="M55 82 C55 79 57 77 60 77 C63 77 65 79 65 82 C65 85 63 87 60 87 C57 87 55 85 55 82 Z"
                fill={SgateColors.black}
                opacity="0.6"
            />

            {/* ── Feet ────────────────────────────────────────────────── */}
            <Ellipse cx="48" cy="113" rx="8" ry="4" fill={SgateColors.goldDeep} />
            <Ellipse cx="72" cy="113" rx="8" ry="4" fill={SgateColors.goldDeep} />
        </Svg>
    );
}

// ─── Eyes per pose ───────────────────────────────────────────────────────────

function renderEyes(pose: MascotPose) {
    switch (pose) {
        case 'wink':
            return (
                <G>
                    {/* Left eye: open */}
                    <Circle cx="48" cy="52" r="4" fill="#FFFFFF" />
                    <Circle cx="49" cy="51" r="1.5" fill="#FFFFFF" opacity="0.6" />
                    {/* Right eye: wink line */}
                    <Path
                        d="M68 50 Q72 54 76 50"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </G>
            );

        case 'alert':
            return (
                <G>
                    {/* Big alert eyes */}
                    <Circle cx="48" cy="52" r="5" fill="#FFFFFF" />
                    <Circle cx="48" cy="52" r="2" fill={SgateColors.red} />
                    <Circle cx="72" cy="52" r="5" fill="#FFFFFF" />
                    <Circle cx="72" cy="52" r="2" fill={SgateColors.red} />
                </G>
            );

        default:
            // happy, wave, thumbsup — normal eyes
            return (
                <G>
                    <Circle cx="48" cy="52" r="4" fill="#FFFFFF" />
                    <Circle cx="49" cy="51" r="1.5" fill="#FFFFFF" opacity="0.6" />
                    <Circle cx="72" cy="52" r="4" fill="#FFFFFF" />
                    <Circle cx="73" cy="51" r="1.5" fill="#FFFFFF" opacity="0.6" />
                </G>
            );
    }
}

// ─── Mouth per pose ──────────────────────────────────────────────────────────

function renderMouth(pose: MascotPose) {
    switch (pose) {
        case 'happy':
        case 'wave':
        case 'thumbsup':
            // Wide smile
            return (
                <Path
                    d="M52 60 Q60 67 68 60"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            );

        case 'wink':
            // Cheeky grin
            return (
                <Path
                    d="M50 60 Q60 66 70 60"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            );

        case 'alert':
            // O-shaped surprised mouth
            return (
                <Ellipse cx="60" cy="62" rx="4" ry="5" fill="#FFFFFF" opacity="0.9" />
            );

        default:
            return null;
    }
}

// ─── Arms per pose ───────────────────────────────────────────────────────────

function renderArms(pose: MascotPose) {
    switch (pose) {
        case 'wave':
            return (
                <G>
                    {/* Left arm resting */}
                    <Path
                        d="M26 70 Q18 80 22 92"
                        fill="none"
                        stroke={SgateColors.goldDeep}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    {/* Right arm waving up */}
                    <Path
                        d="M94 70 Q102 55 108 42"
                        fill="none"
                        stroke={SgateColors.goldDeep}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    {/* Waving hand */}
                    <Circle cx="108" cy="40" r="5" fill={SgateColors.gold} />
                </G>
            );

        case 'thumbsup':
            return (
                <G>
                    {/* Left arm resting */}
                    <Path
                        d="M26 70 Q18 80 22 92"
                        fill="none"
                        stroke={SgateColors.goldDeep}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    {/* Right arm thumbs up */}
                    <Path
                        d="M94 70 Q100 60 98 50"
                        fill="none"
                        stroke={SgateColors.goldDeep}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    {/* Thumb */}
                    <Path
                        d="M96 50 L96 40"
                        fill="none"
                        stroke={SgateColors.gold}
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    {/* Fist */}
                    <Circle cx="98" cy="50" r="5" fill={SgateColors.gold} />
                </G>
            );

        case 'alert':
            return (
                <G>
                    {/* Both arms raised */}
                    <Path
                        d="M26 70 Q14 55 10 45"
                        fill="none"
                        stroke={SgateColors.goldDeep}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    <Circle cx="10" cy="43" r="4" fill={SgateColors.gold} />
                    <Path
                        d="M94 70 Q106 55 110 45"
                        fill="none"
                        stroke={SgateColors.goldDeep}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    <Circle cx="110" cy="43" r="4" fill={SgateColors.gold} />
                </G>
            );

        default:
            // happy, wink — arms at sides
            return (
                <G>
                    <Path
                        d="M26 70 Q18 80 22 92"
                        fill="none"
                        stroke={SgateColors.goldDeep}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    <Path
                        d="M94 70 Q102 80 98 92"
                        fill="none"
                        stroke={SgateColors.goldDeep}
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                </G>
            );
    }
}

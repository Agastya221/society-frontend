import { useState } from "react";
import {
  Home, Shield, User, Bell, Search, ChevronRight, Package,
  UserCheck, Users, Clock, ArrowLeft,
  Camera, Phone, MapPin, Calendar, ChevronDown,
  Settings, LogOut, Star, AlertTriangle, Fingerprint,
  Lock, QrCode, History, X, Check, ArrowRight,
  Scan, ShieldCheck, CircleDot
} from "lucide-react";

/*
  UX PRINCIPLES APPLIED:
  - Empathy: Indian residential society users, mixed ages (25-65), moderate tech comfort
  - Layout: Single focal point per screen, F-pattern reading flow
  - Essentialism: Every element earns its place, no decorative clutter
  - Guidance: Primary CTA always most prominent, clear next-step cues
  - Aesthetics: Security = trust. Dark + gold = authority + warmth
  - Novelty: Shield mascot as brand differentiator, familiar mobile patterns
  - Consistency: 4px spacing grid, 16px radius system, Sora font throughout
  - Engagement: Approve/deny feedback, status indicators, progress cues
*/

const DOT = " \u00B7 ";
const T = {
  black: "#0D0F14", ink: "#161922", charcoal: "#1E212B",
  gold: "#FFB800", goldDeep: "#E5A500", goldPale: "#FFF8E1",
  green: "#00D68F", greenBg: "#E5FBF3",
  red: "#FF5C5C", redBg: "#FFF0F0",
  blue: "#4C9AFF", blueBg: "#EBF3FF",
  violet: "#9B6DFF",
  bg: "#F5F4F0", card: "#FFFFFF", surface: "#EEECEA",
  border: "#E5E3DE", borderSoft: "#F0EEEB",
  t1: "#0D0F14", t2: "#4A4D57", t3: "#8A8D97", t4: "#B5B8C0",
};

const Noise = ({ o = 0.03 }) => (
  <div style={{ position: "absolute", inset: 0, opacity: o, mixBlendMode: "overlay", pointerEvents: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
    backgroundSize: "128px 128px" }} />
);

/* Shield Guard Mascot */
const Mascot = ({ size = 120, pose = "wave", glow = false }) => (
  <div style={{ position: "relative", width: size, height: size * 1.2, flexShrink: 0 }}>
    {glow && <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: size * 1.6, height: size * 1.6, borderRadius: "50%", background: "radial-gradient(circle, #FFB80020 0%, transparent 70%)" }} />}
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" fill="none" style={{ position: "relative" }}>
      <ellipse cx="100" cy="234" rx="45" ry="6" fill="#0D0F14" opacity="0.05"/>
      <path d="M100 10C100 10 28 36 28 90C28 144 58 196 100 214C142 196 172 144 172 90C172 36 100 10 100 10Z" fill="url(#shG)"/>
      <path d="M100 10C100 10 28 36 28 90C28 144 58 196 100 214V10Z" fill="#FFF" opacity="0.06"/>
      <path d="M100 14C100 14 32 38 32 90C32 142 60 192 100 210C140 192 168 142 168 90C168 38 100 14 100 14Z" fill="none" stroke="#FFB800" strokeWidth="1.2" opacity="0.5"/>
      <path d="M100 44C100 44 54 58 54 92C54 126 72 158 100 170C128 158 146 126 146 92C146 58 100 44 100 44Z" fill="#FFF" opacity="0.95"/>
      <ellipse cx="100" cy="50" rx="32" ry="11" fill="#161922"/>
      <ellipse cx="100" cy="48" rx="28" ry="8" fill="#1E212B"/>
      <ellipse cx="88" cy="46" rx="12" ry="3" fill="#FFF" opacity="0.08"/>
      <circle cx="100" cy="34" r="12" fill="#FFB800"/>
      <circle cx="100" cy="34" r="9" fill="#E5A500" opacity="0.3"/>
      <path d="M100 27L101.8 31.5L106.5 31.8L103 35L104 39.5L100 37L96 39.5L97 35L93.5 31.8L98.2 31.5Z" fill="#FFF" opacity="0.95"/>
      {pose === "alert" ? (
        <g><path d="M70 74C76 76 84 74 90 70" stroke="#161922" strokeWidth="3.5" strokeLinecap="round" fill="none"/><path d="M130 74C124 76 116 74 110 70" stroke="#161922" strokeWidth="3.5" strokeLinecap="round" fill="none"/></g>
      ) : (
        <g><path d="M70 76C75 72 82 71 90 74" stroke="#161922" strokeWidth="3" strokeLinecap="round" fill="none"/><path d="M130 76C125 72 118 71 110 74" stroke="#161922" strokeWidth="3" strokeLinecap="round" fill="none"/></g>
      )}
      <ellipse cx="84" cy="90" rx="11" ry="12" fill="#0D0F14"/><ellipse cx="84" cy="88" rx="9" ry="10" fill="#161922"/>
      <circle cx="88" cy="85" r="4" fill="#FFF" opacity="0.9"/><circle cx="81" cy="92" r="2" fill="#FFF" opacity="0.25"/>
      {pose === "wink" ? (
        <path d="M106 90C110 85 118 85 122 90" stroke="#161922" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      ) : (
        <g><ellipse cx="116" cy="90" rx="11" ry="12" fill="#0D0F14"/><ellipse cx="116" cy="88" rx="9" ry="10" fill="#161922"/><circle cx="120" cy="85" r="4" fill="#FFF" opacity="0.9"/><circle cx="113" cy="92" r="2" fill="#FFF" opacity="0.25"/></g>
      )}
      <circle cx="66" cy="103" r="9" fill="#FFB800" opacity="0.12"/><circle cx="134" cy="103" r="9" fill="#FFB800" opacity="0.12"/>
      {(pose === "happy" || pose === "wave" || pose === "wink") ? (
        <g><path d="M83 110C83 110 91 122 100 122C109 122 117 110 117 110" stroke="#161922" strokeWidth="3" strokeLinecap="round" fill="none"/><path d="M91 114C91 118 95 122 100 122C105 122 109 118 109 114" fill="#FF8C94" opacity="0.4"/></g>
      ) : pose === "alert" ? (<ellipse cx="100" cy="116" rx="7" ry="6" fill="#161922"/>) : (<path d="M88 114L112 114" stroke="#161922" strokeWidth="3" strokeLinecap="round"/>)}
      {pose === "wave" ? (
        <g><path d="M36 142C28 128 26 112 34 102" stroke="#161922" strokeWidth="7" strokeLinecap="round" fill="none"/><circle cx="34" cy="100" r="7" fill="#FFB800"/>
        <path d="M164 100C170 88 174 80 168 74" stroke="#161922" strokeWidth="7" strokeLinecap="round" fill="none"/><circle cx="168" cy="72" r="8" fill="#FFB800"/>
        <path d="M168 64L168 58" stroke="#FFB800" strokeWidth="4" strokeLinecap="round"/><path d="M162 68L158 64" stroke="#FFB800" strokeWidth="3" strokeLinecap="round"/><path d="M174 68L178 64" stroke="#FFB800" strokeWidth="3" strokeLinecap="round"/></g>
      ) : pose === "thumbsup" ? (
        <g><path d="M36 142C28 128 26 114 34 104" stroke="#161922" strokeWidth="7" strokeLinecap="round" fill="none"/><circle cx="34" cy="102" r="7" fill="#161922"/>
        <path d="M164 142C172 128 174 114 166 104" stroke="#161922" strokeWidth="7" strokeLinecap="round" fill="none"/><circle cx="166" cy="102" r="7" fill="#FFB800"/><path d="M166 95L166 88" stroke="#FFB800" strokeWidth="4.5" strokeLinecap="round"/></g>
      ) : (
        <g><path d="M36 142C28 128 26 114 34 104" stroke="#161922" strokeWidth="7" strokeLinecap="round" fill="none"/><circle cx="34" cy="102" r="7" fill="#161922"/>
        <path d="M164 142C172 128 174 114 166 104" stroke="#161922" strokeWidth="7" strokeLinecap="round" fill="none"/><circle cx="166" cy="102" r="7" fill="#161922"/></g>
      )}
      <rect x="56" y="160" width="88" height="9" rx="4.5" fill="#161922"/><rect x="90" y="158" width="20" height="13" rx="4" fill="#FFB800"/>
      <ellipse cx="78" cy="218" rx="18" ry="8" fill="#161922"/><ellipse cx="122" cy="218" rx="18" ry="8" fill="#161922"/>
      <ellipse cx="78" cy="216" rx="14" ry="5" fill="#1E212B"/><ellipse cx="122" cy="216" rx="14" ry="5" fill="#1E212B"/>
      <defs><linearGradient id="shG" x1="60" y1="10" x2="140" y2="214"><stop offset="0%" stopColor="#2A2D38"/><stop offset="100%" stopColor="#0D0F14"/></linearGradient></defs>
    </svg>
  </div>
);

const MascotMini = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="12" fill={T.black}/>
    <path d="M20 6C20 6 8 11 8 20C8 29 13 35 20 38C27 35 32 29 32 20C32 11 20 6 20 6Z" fill="url(#mG)" stroke="#FFB800" strokeWidth="0.8" opacity="0.9"/>
    <circle cx="20" cy="13" r="3.5" fill="#FFB800"/>
    <path d="M20 10L20.8 12L23 12.2L21.3 13.8L21.7 16L20 14.8L18.3 16L18.7 13.8L17 12.2L19.2 12Z" fill="#FFF" opacity="0.9"/>
    <ellipse cx="15.5" cy="22.5" rx="2.5" ry="3" fill="#FFF"/><ellipse cx="24.5" cy="22.5" rx="2.5" ry="3" fill="#FFF"/>
    <circle cx="15.5" cy="22" r="1.3" fill="#0D0F14"/><circle cx="24.5" cy="22" r="1.3" fill="#0D0F14"/>
    <circle cx="16.5" cy="21" r="0.7" fill="#FFF" opacity="0.8"/><circle cx="25.5" cy="21" r="0.7" fill="#FFF" opacity="0.8"/>
    <path d="M17 28C17 28 18.5 30 20 30C21.5 30 23 28 23 28" stroke="#0D0F14" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <defs><linearGradient id="mG" x1="20" y1="6" x2="20" y2="38"><stop stopColor="#282C38"/><stop offset="1" stopColor="#0D0F14"/></linearGradient></defs>
  </svg>
);

const PhoneFrame = ({ children }) => (
  <div style={{ width: 375, height: 812, borderRadius: 52, background: "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)", padding: 2, position: "relative", boxShadow: "0 50px 120px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.08)" }}>
    <div style={{ position: "absolute", right: -2, top: 160, width: 3, height: 32, borderRadius: "0 2px 2px 0", background: "#222" }} />
    <div style={{ position: "absolute", left: -2, top: 140, width: 3, height: 24, borderRadius: "2px 0 0 2px", background: "#222" }} />
    <div style={{ position: "absolute", left: -2, top: 180, width: 3, height: 50, borderRadius: "2px 0 0 2px", background: "#222" }} />
    <div style={{ width: "100%", height: "100%", borderRadius: 50, overflow: "hidden", background: T.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 50, width: 124, height: 36, borderRadius: 19, background: "#000" }}>
        <div style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: 5, background: "#0a0a1a", boxShadow: "inset 0 0 2px rgba(100,120,255,0.3)" }} />
      </div>
      <div style={{ height: 58, padding: "16px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, zIndex: 40 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>9:41</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <svg width="17" height="12" viewBox="0 0 17 12">{[0,1,2,3].map(i=><rect key={i} x={i*4.5} y={12-(i+1)*3} width="3" height={(i+1)*3} rx=".6" fill={T.t1}/>)}</svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill={T.t1}><path d="M7.5 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM3.5 6a5.5 5.5 0 018 0 .5.5 0 01-.7.7 4.3 4.3 0 00-6.6 0 .5.5 0 01-.7-.7zM1 3.5a9 9 0 0113 0 .5.5 0 01-.7.7 8 8 0 00-11.6 0A.5.5 0 011 3.5z"/></svg>
          <svg width="26" height="12" viewBox="0 0 26 12"><rect x="0" y="1" width="22" height="10" rx="2.5" stroke={T.t1} strokeWidth="1" fill="none" opacity=".25"/><rect x="1.5" y="2.5" width="17" height="7" rx="1.5" fill={T.t1}/><rect x="23.5" y="3.5" width="2" height="5" rx="1" fill={T.t1} opacity=".25"/></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>{children}</div>
      <div style={{ height: 34, display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0, background: T.card }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: T.black, opacity: 0.1 }} />
      </div>
    </div>
  </div>
);

const TabBar = ({ active = "home" }) => (
  <div style={{ background: T.card, borderTop: "1px solid " + T.borderSoft, display: "flex", justifyContent: "space-around", padding: "6px 0 2px", flexShrink: 0 }}>
    {[{ icon: Home, l: "Home", id: "home" },{ icon: UserCheck, l: "Visitors", id: "visitors" },{ icon: Package, l: "Delivery", id: "delivery" },{ icon: Users, l: "Society", id: "society" },{ icon: User, l: "Profile", id: "profile" }].map(t => (
      <div key={t.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 52 }}>
        <div style={{ width: 36, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: active === t.id ? T.goldPale : "transparent" }}>
          <t.icon size={20} color={active === t.id ? T.goldDeep : T.t4} strokeWidth={active === t.id ? 2.2 : 1.4} />
        </div>
        <span style={{ fontSize: 9.5, fontWeight: active === t.id ? 700 : 400, color: active === t.id ? T.t1 : T.t4 }}>{t.l}</span>
      </div>
    ))}
  </div>
);

const Pill = ({ text, color, bg }) => <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{text}</span>;

/* ========== SCREEN 1: ONBOARDING ========== */
const OnboardingScreen = () => {
  const [step, setStep] = useState(0);
  const data = [
    { title: "Secure Every\nEntry Point", sub: "Know who enters your society - visitors, deliveries, and services. All verified in real-time.", pose: "wave", accent: T.gold },
    { title: "One-Tap\nApprovals", sub: "Pre-approve visitors, generate QR passes, and manage deliveries from your phone.", pose: "thumbsup", accent: T.green },
    { title: "Your Society,\nSmarter", sub: "Connect with residents, track activity, and keep your community safe together.", pose: "wink", accent: T.blue },
  ];
  const s = data[step];
  return (
    <div style={{ flex: 1, background: T.black, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <Noise o={0.04} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, " + s.accent + "15 0%, transparent 70%)", top: "15%", left: "50%", transform: "translateX(-50%)" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", position: "relative" }}>
        <Mascot size={110} pose={s.pose} glow />
        <h2 style={{ fontSize: 30, fontWeight: 800, color: "#FFF", textAlign: "center", lineHeight: 1.15, letterSpacing: "-0.04em", margin: "10px 0 12px", whiteSpace: "pre-line" }}>{s.title}</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>{s.sub}</p>
      </div>
      <div style={{ padding: "0 24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: step === i ? 24 : 8, height: 8, borderRadius: 4, background: step === i ? T.gold : "rgba(255,255,255,0.15)", transition: "all 250ms ease" }} />)}
        </div>
        <div onClick={() => setStep(step < 2 ? step + 1 : 0)} style={{ width: "100%", background: T.gold, borderRadius: 16, padding: "17px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.black }}>{step < 2 ? "Next" : "Get Started"}</span>
          <ArrowRight size={18} color={T.black} strokeWidth={2.5} />
        </div>
        {step === 0 && <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Skip</p>}
      </div>
    </div>
  );
};

/* ========== SCREEN 2: LOGIN ========== */
const LoginScreen = () => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.card }}>
    <div style={{ background: T.black, padding: "16px 24px 36px", borderRadius: "0 0 36px 36px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
      <Noise o={0.05} />
      <div style={{ position: "relative" }}><Mascot size={80} pose="happy" /></div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "#FFF", margin: "6px 0 4px", letterSpacing: "-0.03em" }}>Welcome back!</h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>Sign in to your society</p>
    </div>
    <div style={{ flex: 1, padding: "28px 24px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: "0.1em", margin: "0 0 8px" }}>PHONE NUMBER</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, borderRadius: 16, padding: "15px 16px", marginBottom: 16, border: "2px solid " + T.gold }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>+91</span>
        <div style={{ width: 1, height: 20, background: T.border }} />
        <span style={{ fontSize: 15, color: T.t1, fontWeight: 500, flex: 1 }}>98765 43210</span>
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: "0.1em", margin: "0 0 8px" }}>YOUR SOCIETY</p>
      <div style={{ display: "flex", alignItems: "center", background: T.surface, borderRadius: 16, padding: "15px 16px", marginBottom: 32, border: "1.5px solid " + T.border }}>
        <MapPin size={17} color={T.t4} strokeWidth={1.6} />
        <span style={{ fontSize: 15, color: T.t1, fontWeight: 500, marginLeft: 10, flex: 1 }}>Sunrise Heights, Sakchi</span>
        <ChevronDown size={17} color={T.t4} />
      </div>
      <div style={{ background: T.black, borderRadius: 16, padding: "17px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#FFF" }}>Send OTP</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
        <div style={{ flex: 1, height: 1, background: T.border }} /><span style={{ fontSize: 12, color: T.t4 }}>or</span><div style={{ flex: 1, height: 1, background: T.border }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, border: "1.5px solid " + T.border, borderRadius: 16, padding: "15px" }}>
        <Fingerprint size={22} color={T.t1} /><span style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>Use Fingerprint</span>
      </div>
    </div>
  </div>
);

/* ========== SCREEN 3: HOME ========== */
const HomeScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ background: T.card, padding: "2px 20px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MascotMini size={42} />
            <div>
              <p style={{ fontSize: 12, color: T.t3, margin: 0 }}>Good morning</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: T.t1, margin: 0, letterSpacing: "-0.03em" }}>Sunrise Heights</p>
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}><Bell size={20} color={T.t1} strokeWidth={1.5} /></div>
            <div style={{ position: "absolute", top: -2, right: -2, width: 20, height: 20, borderRadius: 10, background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", border: "2.5px solid #FFF" }}><span style={{ fontSize: 9, fontWeight: 800, color: T.black }}>3</span></div>
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg, " + T.black + " 0%, " + T.charcoal + " 100%)", borderRadius: 22, padding: "20px", position: "relative", overflow: "hidden" }}>
          <Noise o={0.06} />
          <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 2, background: "linear-gradient(90deg, transparent, #FFB80060, transparent)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: "#FFB80018", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #FFB80025" }}>
              <ShieldCheck size={24} color={T.gold} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#FFF", margin: 0 }}>All Secure</p>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: T.green, boxShadow: "0 0 8px " + T.green + "80" }} />
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>{"2 guards active" + DOT + "Gate A, B monitored"}</p>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 26 }}>
          {[{ icon: UserCheck, label: "Pre-\nApprove", bg: T.goldPale, c: T.goldDeep },{ icon: QrCode, label: "Gate\nPass", bg: T.blueBg, c: T.blue },{ icon: Package, label: "Expect\nDelivery", bg: T.surface, c: T.t2 },{ icon: AlertTriangle, label: "SOS\nAlert", bg: T.redBg, c: T.red }].map((a, i) => (
            <div key={i} style={{ background: T.card, borderRadius: 20, padding: "14px 6px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: "1px solid " + T.borderSoft }}>
              <div style={{ width: 46, height: 46, borderRadius: 15, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><a.icon size={22} color={a.c} strokeWidth={1.6} /></div>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.t2, textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line" }}>{a.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: T.t1, margin: 0 }}>Waiting at Gate</p>
          <Pill text="2 new" color={T.goldDeep} bg={T.goldPale} />
        </div>
        {[{ name: "Rahul Electrician", type: "Service", time: "Gate A - 2 min", init: "RE", bg: T.goldPale, ic: T.goldDeep },{ name: "Amazon Delivery", type: "Delivery", time: "Gate B - just now", init: "Ad", bg: T.blueBg, ic: T.blue }].map((v, i) => (
          <div key={i} style={{ background: T.card, borderRadius: 20, padding: "16px", border: "1px solid " + T.borderSoft, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: v.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: v.ic }}>{v.init}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: T.t1, margin: 0 }}>{v.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><Pill text={v.type} color={T.t2} bg={T.surface} /><span style={{ fontSize: 12, color: T.t3 }}>{v.time}</span></div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <div style={{ flex: 1, background: T.surface, borderRadius: 14, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><X size={15} color={T.t2} strokeWidth={2.5} /><span style={{ fontSize: 13, fontWeight: 600, color: T.t2 }}>Deny</span></div>
              <div style={{ flex: 1.4, background: T.black, borderRadius: 14, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={15} color={T.gold} strokeWidth={2.5} /><span style={{ fontSize: 13, fontWeight: 600, color: "#FFF" }}>Approve</span></div>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 17, fontWeight: 800, color: T.t1, margin: "22px 0 10px" }}>{"Today's Activity"}</p>
        <div style={{ background: T.card, borderRadius: 20, border: "1px solid " + T.borderSoft, overflow: "hidden" }}>
          {[{ name: "Swiggy Delivery", time: "11:32 AM", status: "Collected", e: "Sw" },{ name: "Ravi - Plumber", time: "10:15 AM", status: "Left", e: "Rv" },{ name: "Priya (B-204)", time: "9:45 AM", status: "Inside", e: "Pr" },{ name: "Milk Delivery", time: "6:30 AM", status: "Left", e: "Mk" }].map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < 3 ? "1px solid " + T.borderSoft : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.t3 }}>{a.e}</div>
              <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 500, color: T.t1, margin: 0 }}>{a.name}</p><p style={{ fontSize: 12, color: T.t4, margin: "1px 0 0" }}>{a.time}</p></div>
              <Pill text={a.status} color={a.status === "Inside" ? T.green : T.t3} bg={a.status === "Inside" ? T.greenBg : T.surface} />
            </div>
          ))}
        </div>
        <div style={{ height: 18 }} />
      </div>
    </div>
    <TabBar active="home" />
  </div>
);

/* ========== SCREEN 4: ADD VISITOR ========== */
const AddVisitorScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ background: T.card, padding: "8px 20px 14px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid " + T.borderSoft }}><ArrowLeft size={22} color={T.t1} strokeWidth={2} /><span style={{ fontSize: 18, fontWeight: 700, color: T.t1 }}>Pre-Approve Visitor</span></div>
    <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {["Guest","Delivery","Service","Cab"].map((t,i)=><div key={t} style={{ flex: 1, padding: "10px 4px", borderRadius: 14, textAlign: "center", background: i===0?T.black:T.surface }}><span style={{ fontSize: 13, fontWeight: 600, color: i===0?"#FFF":T.t3 }}>{t}</span></div>)}
      </div>
      {[{l:"VISITOR NAME",p:"Enter full name",I:User},{l:"PHONE NUMBER",p:"+91 00000 00000",I:Phone},{l:"PURPOSE",p:"e.g. Family visit, Repair",I:Calendar}].map((f,i)=>(
        <div key={i} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: "0.1em", margin: "0 0 8px" }}>{f.l}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.surface, borderRadius: 16, padding: "14px 16px", border: "1.5px solid " + T.border }}><f.I size={17} color={T.t4} strokeWidth={1.5} /><span style={{ fontSize: 15, color: T.t4 }}>{f.p}</span></div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[{l:"DATE",v:"16 Mar 2026",I:Calendar},{l:"TIME",v:"4:00 PM",I:Clock}].map((f,i)=>(
          <div key={i} style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: "0.1em", margin: "0 0 8px" }}>{f.l}</p>
            <div style={{ background: T.surface, borderRadius: 16, padding: "14px", border: "1.5px solid " + T.border, display: "flex", alignItems: "center", gap: 8 }}><f.I size={15} color={T.t4} /><span style={{ fontSize: 14, color: T.t1, fontWeight: 500 }}>{f.v}</span></div>
          </div>
        ))}
      </div>
      <div style={{ background: T.goldPale, borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 26, border: "1.5px dashed #FFB80035" }}>
        <Camera size={22} color={T.goldDeep} /><div><p style={{ fontSize: 14, fontWeight: 600, color: T.t1, margin: 0 }}>Add visitor photo</p><p style={{ fontSize: 12, color: T.t3, margin: "2px 0 0" }}>Optional - helps guards identify</p></div>
      </div>
      <div style={{ background: T.black, borderRadius: 16, padding: "17px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Shield size={17} color={T.gold} strokeWidth={2} /><span style={{ fontSize: 16, fontWeight: 700, color: "#FFF" }}>Generate Gate Pass</span></div>
    </div>
  </div>
);

/* ========== SCREEN 5: GATE PASS ========== */
const GatePassScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ background: T.card, padding: "8px 20px 14px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid " + T.borderSoft }}><ArrowLeft size={22} color={T.t1} strokeWidth={2} /><span style={{ fontSize: 18, fontWeight: 700, color: T.t1 }}>Gate Pass</span></div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", overflow: "auto" }}>
      <Mascot size={68} pose="thumbsup" />
      <p style={{ fontSize: 14, color: T.green, fontWeight: 700, margin: "4px 0 20px" }}>Pass Generated!</p>
      <div style={{ width: "100%", background: T.card, borderRadius: 24, border: "1.5px solid #FFB80025", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ background: T.black, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <Noise o={0.05} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}><MascotMini size={22} /><span style={{ fontSize: 14, fontWeight: 700, color: "#FFF" }}>m<span style={{ color: T.gold }}>gate</span> Pass</span></div>
          <Pill text="ACTIVE" color={T.green} bg={T.green + "18"} />
        </div>
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ width: 90, height: 90, borderRadius: 18, background: T.surface, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "2px dashed " + T.border, marginBottom: 12 }}><QrCode size={46} color={T.t3} strokeWidth={1} /></div>
          <p style={{ fontSize: 12, color: T.t4, margin: "0 0 14px" }}>Show this QR at the gate</p>
          {[["Visitor","Rahul Electrician"],["Flat","A-304"],["When","16 Mar 2026, 4 PM"],["Valid","Single entry - 4 hours"],["OTP","4829"]].map(([l,v],i)=>(
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i<4?"1px solid "+T.borderSoft:"none", textAlign: "left" }}>
              <span style={{ fontSize: 13, color: T.t3 }}>{l}</span>
              <span style={{ fontSize: 14, fontWeight: l==="OTP"?800:500, color: l==="OTP"?T.gold:T.t1, fontFamily: l==="OTP"?"monospace":"inherit", letterSpacing: l==="OTP"?"0.2em":"normal" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 18 }}>
        <div style={{ flex: 1, background: T.surface, borderRadius: 16, padding: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>Share</span></div>
        <div style={{ flex: 1, background: T.black, borderRadius: 16, padding: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14, fontWeight: 600, color: "#FFF" }}>Done</span></div>
      </div>
    </div>
  </div>
);

/* ========== SCREEN 6: NOTIFICATIONS ========== */
const NotificationsScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ background: T.card, padding: "8px 20px 14px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid " + T.borderSoft }}><ArrowLeft size={22} color={T.t1} strokeWidth={2} /><span style={{ fontSize: 18, fontWeight: 700, color: T.t1, flex: 1 }}>Notifications</span><span style={{ fontSize: 13, fontWeight: 600, color: T.blue }}>Mark all read</span></div>
    <div style={{ flex: 1, overflow: "auto", padding: "14px 20px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: T.t4, letterSpacing: "0.1em", margin: "0 0 10px" }}>NEW</p>
      {[{title:"Visitor at Gate A",sub:"Rahul Electrician is waiting for approval",time:"2 min ago",icon:AlertTriangle,color:T.gold,bg:T.goldPale},
        {title:"Amazon Delivery Arrived",sub:"Your package is at Gate B. OTP: 4829",time:"5 min ago",icon:Package,color:T.blue,bg:T.blueBg},
        {title:"Guard Shift Changed",sub:"Night guard Ramesh has started duty",time:"1 hr ago",icon:ShieldCheck,color:T.green,bg:T.greenBg}
      ].map((n,i)=>(
        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: "1px solid " + T.borderSoft }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: n.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><n.icon size={20} color={n.color} strokeWidth={1.7} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><p style={{ fontSize: 14, fontWeight: 600, color: T.t1, margin: 0 }}>{n.title}</p><div style={{ width: 7, height: 7, borderRadius: 4, background: T.gold }} /></div>
            <p style={{ fontSize: 13, color: T.t3, margin: "3px 0 0", lineHeight: 1.4 }}>{n.sub}</p>
            <p style={{ fontSize: 11, color: T.t4, margin: "4px 0 0" }}>{n.time}</p>
          </div>
        </div>
      ))}
      <p style={{ fontSize: 11, fontWeight: 700, color: T.t4, letterSpacing: "0.1em", margin: "18px 0 10px" }}>EARLIER</p>
      {[{title:"Priya Sharma checked in",sub:"B-204 resident entered via Gate A",time:"Yesterday",icon:UserCheck},{title:"Monthly Society Bill",sub:"Maintenance of Rs 3,500 due on Mar 20",time:"Yesterday",icon:Calendar},{title:"New Resident Added",sub:"Vikram Singh joined Block B",time:"Mar 14",icon:Users}].map((n,i)=>(
        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: i<2?"1px solid "+T.borderSoft:"none" }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><n.icon size={20} color={T.t3} strokeWidth={1.5} /></div>
          <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 500, color: T.t2, margin: 0 }}>{n.title}</p><p style={{ fontSize: 13, color: T.t3, margin: "3px 0 0", lineHeight: 1.4 }}>{n.sub}</p><p style={{ fontSize: 11, color: T.t4, margin: "4px 0 0" }}>{n.time}</p></div>
        </div>
      ))}
    </div>
  </div>
);

/* ========== SCREEN 7: DELIVERIES ========== */
const DeliveryScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ background: T.card, padding: "4px 20px 14px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, color: T.t1, margin: "0 0 14px", letterSpacing: "-0.04em" }}>Deliveries</h1>
      <div style={{ display: "flex", background: T.surface, borderRadius: 14, padding: 3 }}>
        {["Expected","At Gate","Collected"].map((t,i)=><div key={t} style={{ flex: 1, padding: "10px 0", borderRadius: 11, textAlign: "center", background: i===1?T.card:"transparent", boxShadow: i===1?"0 1px 3px rgba(0,0,0,0.05)":"none" }}><span style={{ fontSize: 13, fontWeight: i===1?700:400, color: i===1?T.t1:T.t3 }}>{t}</span>{i===1&&<span style={{ fontSize: 10, fontWeight: 800, color: T.gold, marginLeft: 4, background: T.goldPale, padding: "1px 6px", borderRadius: 6 }}>2</span>}</div>)}
      </div>
    </div>
    <div style={{ flex: 1, overflow: "auto", padding: "14px 20px 0" }}>
      {[{from:"Amazon",item:"Electronics - 1 item",time:"5 min ago",otp:"4829",gate:true,e:"Am"},{from:"Flipkart",item:"Clothing - 2 items",time:"22 min ago",otp:"1563",gate:true,e:"Fk"},{from:"Swiggy Instamart",item:"Groceries - 8 items",time:"Expected by 3 PM",otp:null,gate:false,e:"Sw"},{from:"Delhivery",item:"Documents",time:"Expected today",otp:null,gate:false,e:"Dl"}].map((d,i)=>(
        <div key={i} style={{ background: T.card, borderRadius: 20, padding: "16px", marginBottom: 8, border: "1px solid " + (d.gate?T.gold+"30":T.borderSoft) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.t3 }}>{d.e}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: T.t1, margin: 0 }}>{d.from}</p>
                {d.otp&&<span style={{ fontSize: 12, fontWeight: 800, color: T.gold, background: T.goldPale, padding: "3px 10px", borderRadius: 10, fontFamily: "monospace" }}>{"OTP "+d.otp}</span>}
              </div>
              <p style={{ fontSize: 13, color: T.t3, margin: "2px 0 0" }}>{d.item}</p>
              <p style={{ fontSize: 12, color: d.gate?T.goldDeep:T.t4, margin: "4px 0 0", fontWeight: d.gate?600:400 }}>{d.gate?"Arrived "+d.time:d.time}</p>
            </div>
          </div>
          {d.gate&&<div style={{ marginTop: 14, background: T.black, borderRadius: 14, padding: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={16} color={T.gold} strokeWidth={2.5} /><span style={{ fontSize: 14, fontWeight: 700, color: "#FFF" }}>Collect Delivery</span></div>}
        </div>
      ))}
    </div>
    <TabBar active="delivery" />
  </div>
);

/* ========== SCREEN 8: GUARD VIEW ========== */
const GuardViewScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ background: T.card, padding: "8px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid " + T.borderSoft }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}><ArrowLeft size={22} color={T.t1} strokeWidth={2} /><span style={{ fontSize: 18, fontWeight: 700, color: T.t1 }}>Gate A - Live</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}><CircleDot size={14} color={T.red} /><span style={{ fontSize: 12, fontWeight: 600, color: T.red }}>REC</span></div>
    </div>
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ height: 200, background: "linear-gradient(180deg, " + T.ink + " 0%, " + T.charcoal + " 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <Noise o={0.08} /><div style={{ textAlign: "center", position: "relative" }}><Scan size={48} color="rgba(255,255,255,0.15)" strokeWidth={1} /><p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>Live camera feed</p></div>
        <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between" }}>
          <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "5px 10px" }}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>Gate A - Cam 01</span></div>
          <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "5px 10px" }}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>16:41:28</span></div>
        </div>
      </div>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ background: T.card, borderRadius: 18, padding: "16px", border: "1px solid " + T.borderSoft, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: T.goldPale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: T.goldDeep }}>RK</div>
            <div style={{ flex: 1 }}><p style={{ fontSize: 15, fontWeight: 600, color: T.t1, margin: 0 }}>Ramesh Kumar</p><p style={{ fontSize: 12, color: T.t3, margin: "2px 0 0" }}>On duty since 6:00 AM</p></div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: T.greenBg, borderRadius: 8, padding: "4px 10px" }}><div style={{ width: 6, height: 6, borderRadius: 3, background: T.green }} /><span style={{ fontSize: 11, fontWeight: 600, color: T.green }}>Active</span></div>
          </div>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: "0 0 10px" }}>{"Today's Gate Stats"}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {[{v:"47",l:"Entries",c:T.green},{v:"42",l:"Exits",c:T.blue},{v:"2",l:"Denied",c:T.red}].map((s,i)=>(
            <div key={i} style={{ background: T.card, borderRadius: 16, padding: "14px 8px", textAlign: "center", border: "1px solid " + T.borderSoft }}><p style={{ fontSize: 24, fontWeight: 800, color: s.c, margin: 0 }}>{s.v}</p><p style={{ fontSize: 11, color: T.t3, margin: "2px 0 0" }}>{s.l}</p></div>
          ))}
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: "0 0 10px" }}>Recent at this Gate</p>
        <div style={{ background: T.card, borderRadius: 18, border: "1px solid " + T.borderSoft, overflow: "hidden" }}>
          {[{name:"Rahul Electrician",action:"Waiting",time:"2 min ago",s:T.gold},{name:"Swiggy Delivery",action:"Entered",time:"8 min ago",s:T.green},{name:"Unknown Person",action:"Denied",time:"45 min ago",s:T.red}].map((a,i)=>(
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i<2?"1px solid "+T.borderSoft:"none" }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: a.s }} />
              <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 500, color: T.t1, margin: 0 }}>{a.name}</p><p style={{ fontSize: 12, color: T.t4, margin: "1px 0 0" }}>{a.time}</p></div>
              <Pill text={a.action} color={a.s} bg={a.s+"15"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ========== SCREEN 9: VISITOR LOG ========== */
const VisitorLogScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ background: T.card, padding: "4px 20px 14px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, color: T.t1, margin: "0 0 12px", letterSpacing: "-0.04em" }}>Visitors</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface, borderRadius: 16, padding: "12px 14px" }}><Search size={17} color={T.t4} /><span style={{ fontSize: 14, color: T.t4 }}>Search by name or flat...</span></div>
    </div>
    <div style={{ flex: 1, overflow: "auto", padding: "12px 20px 0" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: T.t4, letterSpacing: "0.1em", margin: "0 0 8px" }}>TODAY</p>
      <div style={{ background: T.card, borderRadius: 20, border: "1px solid " + T.borderSoft, overflow: "hidden", marginBottom: 18 }}>
        {[{n:"Swiggy Delivery",f:"A-304",t:"11:32 AM",s:"Left",ty:"Delivery"},{n:"Ravi Kumar",f:"B-102",t:"10:15 AM",s:"Left",ty:"Service"},{n:"Priya Sharma",f:"B-204",t:"9:45 AM",s:"Inside",ty:"Guest"},{n:"Meesho Delivery",f:"C-501",t:"9:12 AM",s:"Left",ty:"Delivery"}].map((v,i)=>(
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i<3?"1px solid "+T.borderSoft:"none" }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.t2 }}>{v.n.split(" ").map(x=>x[0]).join("")}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><p style={{ fontSize: 14, fontWeight: 600, color: T.t1, margin: 0 }}>{v.n}</p><span style={{ fontSize: 12, color: T.t4 }}>{v.t}</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><Pill text={v.ty} color={T.t2} bg={T.surface} /><span style={{ fontSize: 12, color: T.t4 }}>{v.f}</span><span style={{ fontSize: 12, fontWeight: 500, color: v.s==="Inside"?T.green:T.t4 }}>{v.s}</span></div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: T.t4, letterSpacing: "0.1em", margin: "0 0 8px" }}>YESTERDAY</p>
      <div style={{ background: T.card, borderRadius: 20, border: "1px solid " + T.borderSoft, overflow: "hidden" }}>
        {[{n:"Zepto Delivery",f:"A-304",t:"7:45 PM",ty:"Delivery"},{n:"Ankit Verma",f:"D-102",t:"3:30 PM",ty:"Guest"}].map((v,i)=>(
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i<1?"1px solid "+T.borderSoft:"none" }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.t2 }}>{v.n.split(" ").map(x=>x[0]).join("")}</div>
            <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><p style={{ fontSize: 14, fontWeight: 600, color: T.t1, margin: 0 }}>{v.n}</p><span style={{ fontSize: 12, color: T.t4 }}>{v.t}</span></div><div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><Pill text={v.ty} color={T.t2} bg={T.surface} /><span style={{ fontSize: 12, color: T.t4 }}>{v.f}</span></div></div>
          </div>
        ))}
      </div><div style={{ height: 16 }} />
    </div>
    <TabBar active="visitors" />
  </div>
);

/* ========== SCREEN 10: SOCIETY ========== */
const SocietyScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ background: T.card, padding: "4px 20px 14px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, color: T.t1, margin: "0 0 12px", letterSpacing: "-0.04em" }}>Society</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface, borderRadius: 16, padding: "12px 14px" }}><Search size={17} color={T.t4} /><span style={{ fontSize: 14, color: T.t4 }}>Search residents...</span></div>
    </div>
    <div style={{ flex: 1, overflow: "auto", padding: "10px 20px 0" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["All","Block A","Block B","Block C","Block D"].map((b,i)=><div key={b} style={{ padding: "7px 14px", borderRadius: 20, whiteSpace: "nowrap", background: i===0?T.black:T.surface }}><span style={{ fontSize: 12, fontWeight: 600, color: i===0?"#FFF":T.t3 }}>{b}</span></div>)}
      </div>
      <div style={{ background: T.card, borderRadius: 20, border: "1px solid " + T.borderSoft, overflow: "hidden" }}>
        {[{n:"Agastya Mahajan",f:"A-304",r:"Owner",c:T.gold},{n:"Priya Sharma",f:"B-204",r:"Owner",c:T.violet},{n:"Rakesh Gupta",f:"A-101",r:"Tenant",c:T.blue},{n:"Sunita Patel",f:"C-501",r:"Owner",c:T.green},{n:"Vikram Singh",f:"B-102",r:"Tenant",c:"#FF8C42"},{n:"Meena Devi",f:"D-301",r:"Owner",c:T.red}].map((r,i)=>(
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i<5?"1px solid "+T.borderSoft:"none" }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: r.c+"12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: r.c }}>{r.n.split(" ").map(x=>x[0]).join("")}</div>
            <div style={{ flex: 1 }}><p style={{ fontSize: 15, fontWeight: 600, color: T.t1, margin: 0 }}>{r.n}</p><div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}><span style={{ fontSize: 12, color: T.t3 }}>{r.f}</span><span style={{ fontSize: 11, fontWeight: 600, color: r.r==="Owner"?T.green:T.blue }}>{r.r}</span></div></div>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={15} color={T.green} strokeWidth={2} /></div>
          </div>
        ))}
      </div><div style={{ height: 16 }} />
    </div>
    <TabBar active="society" />
  </div>
);

/* ========== SCREEN 11: PROFILE ========== */
const ProfileScreen = () => (
  <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ background: T.black, padding: "20px 20px 36px", borderRadius: "0 0 36px 36px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <Noise o={0.06} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #FFB80050, transparent)" }} />
        <div style={{ width: 72, height: 72, borderRadius: 36, background: "linear-gradient(135deg, #FFB800, #E5A500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: T.black, border: "3px solid rgba(255,255,255,0.08)", marginBottom: 10 }}>AM</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#FFF", margin: "0 0 3px" }}>Agastya Mahajan</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>A-304, Sunrise Heights</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, background: "#FFB80018", borderRadius: 20, padding: "5px 14px" }}><Star size={12} color={T.gold} fill={T.gold} /><span style={{ fontSize: 12, fontWeight: 600, color: T.gold }}>Premium Resident</span></div>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {[{v:"142",l:"Visitors"},{v:"38",l:"Deliveries"},{v:"0",l:"Alerts"}].map((s,i)=>(
            <div key={i} style={{ flex: 1, background: T.card, borderRadius: 18, padding: "14px 8px", textAlign: "center", border: "1px solid " + T.borderSoft }}><p style={{ fontSize: 24, fontWeight: 800, color: T.t1, margin: 0 }}>{s.v}</p><p style={{ fontSize: 11, color: T.t3, margin: "2px 0 0" }}>{s.l}</p></div>
          ))}
        </div>
        <div style={{ background: T.card, borderRadius: 20, border: "1px solid " + T.borderSoft, overflow: "hidden" }}>
          {[{I:User,l:"Edit Profile"},{I:Shield,l:"Security Settings"},{I:Bell,l:"Notifications"},{I:Lock,l:"Privacy"},{I:Users,l:"Family Members"},{I:History,l:"Activity History"},{I:Settings,l:"App Settings"}].map((m,i)=>(
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderBottom: i<6?"1px solid "+T.borderSoft:"none" }}><m.I size={19} color={T.t2} strokeWidth={1.5} /><span style={{ fontSize: 15, fontWeight: 500, color: T.t1, flex: 1 }}>{m.l}</span><ChevronRight size={17} color={T.t4} /></div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 0" }}><LogOut size={16} color={T.red} /><span style={{ fontSize: 14, fontWeight: 600, color: T.red }}>Sign Out</span></div>
      </div>
    </div>
    <TabBar active="profile" />
  </div>
);

/* ========== MAIN PRESENTATION ========== */
const screens = [
  {id:"onboarding",l:"Onboarding",c:OnboardingScreen},{id:"login",l:"Login",c:LoginScreen},
  {id:"home",l:"Home",c:HomeScreen},{id:"add-visitor",l:"Add Visitor",c:AddVisitorScreen},
  {id:"gate-pass",l:"Gate Pass",c:GatePassScreen},{id:"notifications",l:"Notifications",c:NotificationsScreen},
  {id:"delivery",l:"Deliveries",c:DeliveryScreen},{id:"guard-view",l:"Guard View",c:GuardViewScreen},
  {id:"visitor-log",l:"Visitors",c:VisitorLogScreen},{id:"society",l:"Society",c:SocietyScreen},
  {id:"profile",l:"Profile",c:ProfileScreen},
];

export default function MGateV4() {
  const [active, setActive] = useState("onboarding");
  const cur = screens.find(s=>s.id===active);
  const Screen = cur.c;
  const idx = screens.findIndex(s=>s.id===active);
  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { font-family: 'Sora', sans-serif; box-sizing: border-box; margin: 0; }
        *::-webkit-scrollbar { display: none; }
        .sp { transition: all 120ms ease; cursor: pointer; user-select: none; }
        .sp:hover { opacity: 0.8; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 0%, #1a1d28 0%, #0D0F14 50%, #080910 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "22px 16px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}><MascotMini size={22} /><span style={{ fontSize: 18, fontWeight: 800, color: "#FFF", letterSpacing: "-0.03em" }}>m<span style={{ color: "#FFB800" }}>gate</span></span></div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 16, letterSpacing: "0.08em", textTransform: "uppercase" }}>Smart Society Security</p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", maxWidth: 480, marginBottom: 20 }}>
          {screens.map(s=><div key={s.id} className="sp" onClick={()=>setActive(s.id)} style={{ fontSize: 10.5, fontWeight: active===s.id?700:400, padding: "5px 12px", borderRadius: 20, background: active===s.id?"#FFB800":"rgba(255,255,255,0.05)", color: active===s.id?"#0D0F14":"rgba(255,255,255,0.35)", border: active===s.id?"none":"1px solid rgba(255,255,255,0.06)" }}>{s.l}</div>)}
        </div>
        <PhoneFrame><Screen /></PhoneFrame>
        <p style={{ marginTop: 16, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{cur.l + " Screen - " + (idx+1) + " of " + screens.length}</p>
      </div>
    </div>
  );
}

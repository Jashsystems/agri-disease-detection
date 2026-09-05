import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Upload,
  Camera,
  Leaf,
  MapPin,
  ChevronLeft,
  CheckCircle2,
  SearchCheck,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Users,
  Clock,
  Activity,
  ArrowUpDown,
  X,
  Globe,
  Sprout,
  ClipboardList,
  Image as ImageIcon,
  ShieldCheck,
  Map as MapIcon,
  ChevronRight,
  Loader2,
  CircleUserRound,
  Wheat,
  Phone,
  KeyRound,
  LogOut,
  Satellite,
  Route as RouteIcon,
  CloudDrizzle,
  Sun,
  CloudSun,
  Droplets,
  IdCard,
  Lock,
  History as HistoryIcon,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  uploadReport as apiUploadReport,
  fetchOfficerQueue,
  confirmCase,
  getAdvisory,
  fetchConfirmedCases,
} from "./api";

/* =========================================================================
   API DATA LAYER
   ========================================================================= */

const VILLAGES = [
  { village: "Karad", district: "Satara", lat: 17.29, lng: 74.18 },
  { village: "Wai", district: "Satara", lat: 17.95, lng: 73.89 },
  { village: "Phaltan", district: "Satara", lat: 17.99, lng: 74.43 },
  { village: "Koregaon", district: "Satara", lat: 17.7, lng: 74.16 },
  { village: "Mahabaleshwar", district: "Satara", lat: 17.92, lng: 73.66 },
];

// Current model scope: the checked model exposes five disease classes.
// Crop selection is kept explicit until the model is expanded.
const CROPS = ["Tomato"];
const STAGES = ["Seedling", "Vegetative", "Flowering", "Fruiting"];

const DISEASES = [
  {
    name: "Bacterial_Spot",
    what_it_is: "A bacterial disease that causes small dark lesions on leaves and can reduce healthy leaf area.",
    what_to_do: [
      "Remove severely affected leaves and dispose of infected plant material.",
      "Avoid overhead irrigation and keep foliage dry when possible.",
      "Use only locally approved treatment according to the product label."
    ],
    safe_dosage: "Follow the pesticide label and local agriculture officer recommendation."
  },
  {
    name: "Early_Blight",
    what_it_is: "A fungal disease that produces dark lesions and can cause progressive leaf yellowing and drop.",
    what_to_do: [
      "Remove heavily infected leaves and crop debris.",
      "Improve airflow and avoid prolonged leaf wetness.",
      "Apply an approved fungicide according to the product label."
    ],
    safe_dosage: "Follow the pesticide label and local agriculture officer recommendation."
  },
  {
    name: "Late_Blight",
    what_it_is: "A destructive disease that can spread rapidly under cool, wet conditions and cause dark lesions on foliage.",
    what_to_do: [
      "Remove severely affected tissue and avoid moving infected plant material.",
      "Improve field drainage and reduce prolonged leaf wetness.",
      "Seek an agriculture officer's treatment recommendation promptly."
    ],
    safe_dosage: "Follow the pesticide label and local agriculture officer recommendation."
  },
  {
    name: "Leaf_Mold",
    what_it_is: "A fungal disease that commonly develops under humid conditions and can cause leaf spotting and mold growth.",
    what_to_do: [
      "Improve ventilation around plants and reduce humidity where practical.",
      "Remove heavily affected leaves and dispose of crop debris.",
      "Use an approved fungicide according to the product label if recommended."
    ],
    safe_dosage: "Follow the pesticide label and local agriculture officer recommendation."
  },
  {
    name: "Healthy",
    what_it_is: "No disease pattern was identified by the current model.",
    what_to_do: [
      "Continue regular crop monitoring.",
      "Maintain good field hygiene and appropriate irrigation.",
      "Recheck the plant if new spots, discoloration, wilting, or pests appear."
    ],
    safe_dosage: "No pesticide is indicated solely from this healthy prediction."
  },
];

const OFFICER_ID = "OFF-001";

function formatDiseaseName(value = "") {
  return value.replaceAll("_", " ");
}

/* =========================================================================
   I18N — minimal dictionary for key UI strings across three languages
   ========================================================================= */

const STRINGS = {
  en: {
    appName: "AgriDrishti",
    tagline: "Point your camera at the leaf. Know what's wrong within seconds.",
    uploadPrompt: "Upload or capture a photo of the affected leaf",
    submit: "Get diagnosis",
    cropType: "Crop type",
    growthStage: "Growth stage",
    location: "Detected location",
    analyzing: "Reading the leaf pattern…",
    welcomeBack: "Welcome back",
    newDiagnosis: "New diagnosis",
    pastReports: "Your reports",
    noReports: "No reports yet — your first diagnosis will show up here.",
    phoneLabel: "Mobile number",
  },
  mr: {
    appName: "अ‍ॅग्रीदृष्टी",
    tagline: "पानावर कॅमेरा धरा. काही सेकंदात समस्या कळेल.",
    uploadPrompt: "बाधित पानाचा फोटो अपलोड करा किंवा काढा",
    submit: "निदान मिळवा",
    cropType: "पिकाचा प्रकार",
    growthStage: "वाढीचा टप्पा",
    location: "आढळलेले ठिकाण",
    analyzing: "पानाचा नमुना तपासत आहे…",
    welcomeBack: "पुन्हा स्वागत आहे",
    newDiagnosis: "नवीन निदान",
    pastReports: "तुमचे अहवाल",
    noReports: "अजून अहवाल नाहीत — तुमचे पहिले निदान इथे दिसेल.",
    phoneLabel: "मोबाईल क्रमांक",
  },
  hi: {
    appName: "एग्रीदृष्टि",
    tagline: "पत्ते पर कैमरा रखें। कुछ ही सेकंड में पता चल जाएगा।",
    uploadPrompt: "प्रभावित पत्ते की फोटो अपलोड या कैप्चर करें",
    submit: "निदान प्राप्त करें",
    cropType: "फसल का प्रकार",
    growthStage: "वृद्धि चरण",
    location: "पता लगाया गया स्थान",
    analyzing: "पत्ते का पैटर्न पढ़ रहे हैं…",
    welcomeBack: "वापसी पर स्वागत है",
    newDiagnosis: "नया निदान",
    pastReports: "आपकी रिपोर्ट्स",
    noReports: "अभी कोई रिपोर्ट नहीं — आपका पहला निदान यहाँ दिखेगा।",
    phoneLabel: "मोबाइल नंबर",
  },
};

/* =========================================================================
   DESIGN TOKENS
   Type: "Fraunces" (headline serif, optical-size + weight axis) paired
   with "Manrope" (UI/body grotesk). Inter is intentionally not used for
   anything above small captions.
   Color: a working-farmland palette — deep forest, warm paper, and a
   saturated turmeric accent in place of a flat gold fill.
   ========================================================================= */

const COLORS = {
  forest: "#1B4332",
  forestDeep: "#0F2A1F",
  forestDeeper: "#071510",
  forestLux: "#204A37",
  cream: "#F8F6EE",
  paper: "#FFFFFF",
  ink: "#16241B",
  inkSoft: "#584F3F",
  inkFaint: "#8C8570",
  border: "#E1DAC6",
  borderQuiet: "#EBE5D4",
  surfaceMuted: "#F1EDDF",
  highlight: "#E8F1EA",
  turmeric: "#BE7418",
  turmericDeep: "#8F5A11",
  turmericBright: "#E3A23E",
  turmericSoft: "#F4E3C6",
  gold: "#C99A4B",
  risk: {
    high: "#A6291F",
    medium: "#96590E",
    low: "#276149",
  },
};

const FONT_HEAD = '"Fraunces", "Iowan Old Style", Georgia, serif';
const FONT_BODY = '"Manrope", "Inter", system-ui, sans-serif';

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap');
      * { font-family: ${FONT_BODY}; box-sizing: border-box; }
      body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
      .font-head { font-family: ${FONT_HEAD}; letter-spacing: -0.025em; }
      select { color-scheme: light; }
      ::selection { background: rgba(190,116,24,0.22); }
      button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
        outline: 2px solid #BE7418;
        outline-offset: 2px;
      }
      @keyframes riseIn {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rise-in { animation: riseIn 620ms cubic-bezier(0.16, 1, 0.3, 1) both; }
      @keyframes shakeX {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-4px); }
        40%, 60% { transform: translateX(4px); }
      }
      .shake { animation: shakeX 480ms cubic-bezier(.36,.07,.19,.97) both; }
      @keyframes sheen {
        0% { transform: translateX(-120%) skewX(-12deg); }
        100% { transform: translateX(220%) skewX(-12deg); }
      }
      .sheen-sweep::after {
        content: "";
        position: absolute;
        top: 0; left: 0;
        width: 40%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
        animation: sheen 2.6s ease-in-out infinite;
        pointer-events: none;
      }
      .leaflet-container { font-family: ${FONT_BODY}; }
      .leaflet-popup-content-wrapper { border-radius: 14px; }
      @media (prefers-reduced-motion: reduce) {
        .rise-in, .shake, .sheen-sweep::after { animation: none !important; }
      }
    `}</style>
  );
}

// Subtle SVG grain overlay used behind hero / header sections instead of a
// flat color fill.
function GrainOverlay({ opacity = 0.05 }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay"
      style={{ opacity }}
      aria-hidden="true"
    >
      <filter id="grainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grainFilter)" />
    </svg>
  );
}

// Small helper: staggers entrance of list/card children on first mount.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

/* =========================================================================
   SHARED UI PRIMITIVES
   ========================================================================= */

function ConfidenceRing({ value, size = 92 }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const color = value > 80 ? COLORS.risk.low : value >= 65 ? COLORS.risk.medium : COLORS.risk.high;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#EAE4D3" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-head text-xl font-semibold" style={{ color: COLORS.forestDeep }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status, confidence }) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-[#EAF3EE] text-[#1B4332]">
        <ShieldCheck size={15} /> Confirmed by officer
      </span>
    );
  }
  if (confidence > 80) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-[#EAF3EE] text-[#1B4332]">
        <CheckCircle2 size={15} /> Advisory ready
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-[#FBF0DA] text-[#8A6210]">
      <SearchCheck size={15} /> Under expert review
    </span>
  );
}

// Small uppercase, letter-spaced meta label — used for data-density
// contexts like "CASE ID" or "CONFIDENCE SCORE" per the brief.
function MetaLabel({ children }) {
  return (
    <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.08em", color: COLORS.inkFaint }}>
      {children}
    </span>
  );
}

const cardShadow =
  "0 0.5px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(15,42,31,0.04), 0 10px 28px -14px rgba(15,42,31,0.20), 0 2px 6px -2px rgba(15,42,31,0.08)";
const cardShadowLift =
  "0 0.5px 0 rgba(255,255,255,0.7) inset, 0 2px 4px rgba(15,42,31,0.06), 0 24px 48px -18px rgba(15,42,31,0.30), 0 4px 10px -3px rgba(15,42,31,0.12)";

function PrimaryButton({ children, onClick, disabled, className = "", icon: Icon, type = "button" }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${!disabled && hover ? "sheen-sweep" : ""} ${className}`}
      style={{
        color: "#2A1502",
        background: disabled
          ? COLORS.turmeric
          : hover
          ? "linear-gradient(180deg, #E3A23E 0%, #BE7418 58%, #8F5A11 100%)"
          : "linear-gradient(180deg, #E7B160 0%, #C4801F 52%, #9C6413 100%)",
        boxShadow: !disabled && hover
          ? "inset 0 1px 0 rgba(255,255,255,0.4), 0 10px 22px -8px rgba(143,90,17,0.6)"
          : "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px -4px rgba(143,90,17,0.45)",
        transform: !disabled && hover ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {Icon && <Icon size={18} />}
      <span className="relative">{children}</span>
    </button>
  );
}

function GhostButton({ children, onClick, className = "", icon: Icon }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium border transition-all duration-200 active:scale-[0.98] ${className}`}
      style={{
        borderColor: hover ? COLORS.forest : COLORS.border,
        color: COLORS.forestDeep,
        backgroundColor: hover ? "rgba(27,67,50,0.04)" : "transparent",
      }}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function ProfileChip({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full pl-1.5 pr-3.5 py-1.5 transition-colors duration-200 hover:bg-black/5"
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            background: `linear-gradient(150deg, ${COLORS.forestLux}, ${COLORS.forestDeep})`,
            color: "#F3EFE4",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {initials(user.name)}
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold" style={{ color: COLORS.forestDeep }}>
            {user.name}
          </span>
          <span className="text-[11px]" style={{ color: COLORS.inkFaint }}>
            {user.designation || (user.role === "farmer" ? `Farmer · ${user.village}` : "Officer")}
          </span>
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-xl bg-white p-1.5 z-20"
          style={{ boxShadow: cardShadowLift, border: `1px solid ${COLORS.border}` }}
        >
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors duration-150 hover:bg-black/5"
            style={{ color: COLORS.risk.high }}
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar({ title, onBack, right, user, onLogout }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 sm:px-8">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-full p-2 -ml-2 transition-colors duration-200 hover:bg-black/5"
            aria-label="Go back"
          >
            <ChevronLeft size={22} color={COLORS.forestDeep} />
          </button>
        )}
        <h1 className="font-head text-lg font-semibold" style={{ color: COLORS.forestDeep }}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {right}
        {user && <ProfileChip user={user} onLogout={onLogout} />}
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* =========================================================================
   LANDING — mode select
   ========================================================================= */

function ModeSelect({ onSelect }) {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 120% 80% at 15% -10%, #2C5E45 0%, ${COLORS.forestDeep} 45%, ${COLORS.forestDeeper} 100%)`,
      }}
    >
      <GrainOverlay opacity={0.045} />
      {/* soft radial glow accents for depth */}
      <div
        className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(227,162,62,0.14) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)" }}
      />

      <div className="flex-1 flex flex-col justify-center px-6 py-16 sm:px-16 max-w-5xl mx-auto w-full relative">
        <div className="flex items-center gap-2.5 mb-12 rise-in">
          <div
            className="rounded-lg p-2"
            style={{
              background: "linear-gradient(145deg, rgba(227,162,62,0.28), rgba(227,162,62,0.1))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <Leaf size={20} color={COLORS.turmericSoft} />
          </div>
          <span className="text-[#F3EFE4] font-medium tracking-tight text-[15px]">AgriDrishti</span>
        </div>

        <h1
          className="font-head text-[2.6rem] sm:text-7xl font-semibold leading-[1.04] max-w-3xl rise-in"
          style={{ color: "#FBF9F2", animationDelay: "60ms" }}
        >
          Show it a leaf.
          <br />
          It tells the field what's wrong.
        </h1>
        <p
          className="mt-7 max-w-lg text-[#BFC7B9] text-lg leading-relaxed rise-in"
          style={{ animationDelay: "120ms" }}
        >
          A joint diagnostic tool for farmers and agriculture officers across Maharashtra —
          built to turn a phone photo into a same-day treatment plan.
        </p>

        <div className="mt-14 grid sm:grid-cols-2 gap-5">
          <button
            onClick={() => onSelect("farmer")}
            className="group text-left rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1.5 rise-in relative overflow-hidden"
            style={{
              background: "linear-gradient(165deg, #FCFAF3 0%, #F5F1E4 100%)",
              boxShadow: cardShadowLift,
              animationDelay: "180ms",
            }}
          >
            <div className="flex items-center justify-between relative">
              <div
                className="rounded-xl p-3"
                style={{ background: "linear-gradient(150deg, #E8F1EA, #DCEAE0)" }}
              >
                <Sprout size={22} color={COLORS.forest} />
              </div>
              <ChevronRight
                size={19}
                color={COLORS.forestDeep}
                className="transition-transform duration-300 group-hover:translate-x-1.5"
              />
            </div>
            <h2 className="font-head mt-7 text-xl font-semibold relative" style={{ color: COLORS.forestDeep }}>
              I'm a farmer
            </h2>
            <p className="mt-2 text-[15px] text-[#5B5747] leading-relaxed relative">
              Upload a photo of an affected crop and get a diagnosis with clear treatment steps.
            </p>
          </button>

          <button
            onClick={() => onSelect("officer")}
            className="group text-left rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1.5 rise-in relative overflow-hidden"
            style={{
              background: "linear-gradient(165deg, #FCFAF3 0%, #F5F1E4 100%)",
              boxShadow: cardShadowLift,
              animationDelay: "230ms",
            }}
          >
            <div className="flex items-center justify-between relative">
              <div
                className="rounded-xl p-3"
                style={{ background: "linear-gradient(150deg, #FBF0DA, #F4E3C6)" }}
              >
                <ClipboardList size={22} color="#8A6210" />
              </div>
              <ChevronRight
                size={19}
                color={COLORS.forestDeep}
                className="transition-transform duration-300 group-hover:translate-x-1.5"
              />
            </div>
            <h2 className="font-head mt-7 text-xl font-semibold relative" style={{ color: COLORS.forestDeep }}>
              I'm an officer / expert
            </h2>
            <p className="mt-2 text-[15px] text-[#5B5747] leading-relaxed relative">
              Review flagged cases, confirm or correct AI diagnoses, and track disease hotspots.
            </p>
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-[#8A9086] pb-7 relative tracking-wide">
        Government of Maharashtra — Agriculture Innovation Challenge, prototype build
      </p>
    </div>
  );
}

/* =========================================================================
   FARMER MODE
   ========================================================================= */

function LanguageToggle({ lang, setLang }) {
  const opts = [
    { code: "en", label: "EN" },
    { code: "mr", label: "मर" },
    { code: "hi", label: "हि" },
  ];
  return (
    <div className="flex items-center rounded-full p-1 gap-0.5" style={{ backgroundColor: "#EFEBDD" }}>
      {opts.map((o) => (
        <button
          key={o.code}
          onClick={() => setLang(o.code)}
          className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200"
          style={{
            backgroundColor: lang === o.code ? COLORS.forest : "transparent",
            color: lang === o.code ? "#FAF9F6" : "#5B5747",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function riskLevel(confidence) {
  if (confidence >= 80) return { label: "Low risk", color: COLORS.risk.low, bg: "#EAF3EE" };
  if (confidence >= 65) return { label: "Medium risk", color: "#8A6210", bg: "#FBF0DA" };
  return { label: "High risk", color: COLORS.risk.high, bg: "#FBEAE9" };
}

function FarmerHome({ lang, setLang, reports, onNewDiagnosis, onOpenReport }) {
  const t = STRINGS[lang];
  const mounted = useMounted();

  const myReports = useMemo(
    () => [...reports].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [reports]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
      <TopBar title={t.appName} right={<LanguageToggle lang={lang} setLang={setLang} />} />

      <div className="max-w-xl mx-auto px-5 pb-16 sm:px-8">
        <div className="rise-in">
          <p className="text-sm" style={{ color: COLORS.inkFaint }}>{t.welcomeBack}</p>
          <h2 className="font-head text-2xl font-semibold mt-1" style={{ color: COLORS.forestDeep }}>
            Farmer
          </h2>
        </div>

        <button
          onClick={onNewDiagnosis}
          className="w-full mt-6 rounded-2xl p-6 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 rise-in"
          style={{
            animationDelay: "110ms",
            background: "linear-gradient(160deg,#E7B160 0%, #C4801F 52%, #8F5A11 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 14px 30px -14px rgba(143,90,17,0.5)",
          }}
        >
          <div className="flex items-center gap-3.5 text-left">
            <span className="rounded-full p-2.5" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
              <Plus size={20} color="#2A1502" />
            </span>
            <div>
              <p className="font-semibold" style={{ color: "#2A1502" }}>{t.newDiagnosis}</p>
              <p className="text-sm" style={{ color: "#5B3A08" }}>Upload a leaf photo for analysis</p>
            </div>
          </div>
          <ChevronRight size={20} color="#2A1502" />
        </button>

        <div className="mt-10 rise-in" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <HistoryIcon size={16} color={COLORS.forest} />
            <h3 className="font-semibold" style={{ color: COLORS.forestDeep }}>{t.pastReports}</h3>
          </div>

          {myReports.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
              <p className="text-sm" style={{ color: COLORS.inkFaint }}>{t.noReports}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.map((r, i) => {
                const risk = riskLevel(r.confidence);
                return (
                  <button
                    key={r.report_id}
                    onClick={() => onOpenReport(r)}
                    className="w-full flex items-center gap-4 rounded-2xl p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 rise-in"
                    style={{
                      background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)",
                      boxShadow: cardShadow,
                      animationDelay: `${180 + i * 60}ms`,
                    }}
                  >
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS.highlight }}>
                      <Leaf size={24} color={COLORS.forest} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs" style={{ color: COLORS.inkFaint }}>{r.crop} · {timeAgo(r.timestamp)}</span>
                      <p className="font-semibold mt-0.5 truncate" style={{ color: COLORS.forestDeep }}>{formatDiseaseName(r.disease)}</p>
                      <span
                        className="inline-block mt-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: risk.bg, color: risk.color }}
                      >
                        {risk.label}
                      </span>
                    </div>
                    <ChevronRight size={18} color={COLORS.inkFaint} className="flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FarmerUpload({ lang, setLang, onSubmitted, onBack }) {
  const t = STRINGS[lang];
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [crop, setCrop] = useState("");
  const [stage, setStage] = useState("");
  const [villageName, setVillageName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const village = VILLAGES.find((v) => v.village === villageName);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be 10MB or smaller.");
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const canSubmit = imageFile && crop && stage && village && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const report = await apiUploadReport({
        crop,
        stage,
        village,
        imageFile,
      });

      let enrichedReport = {
        ...report,
        image_url: imagePreview,
        disease: formatDiseaseName(report.disease),
      };

      if (report.status === "auto_sent") {
        try {
          const advisory = await getAdvisory(report.report_id);
          enrichedReport = { ...enrichedReport, advisory };
        } catch {
          // The report is still valid; the advisory can be fetched separately.
        }
      }

      onSubmitted(enrichedReport);
    } catch (err) {
      setError(err.message || "Unable to submit the report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
      <TopBar
        title={t.appName}
        onBack={onBack}
        right={<LanguageToggle lang={lang} setLang={setLang} />}
      />

      <div className="max-w-xl mx-auto px-5 pb-16 sm:px-8">
        <p className="text-[#5B5747] mb-8">{t.tagline}</p>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className="block cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden"
          style={{
            borderColor: isDragging ? COLORS.forest : COLORS.border,
            backgroundColor: isDragging ? "#EAF3EE" : "#FFFFFF",
            boxShadow: cardShadow,
          }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Uploaded leaf" className="w-full h-64 object-cover" />
              <div className="absolute bottom-3 right-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs text-white flex items-center gap-1.5">
                <Camera size={13} /> Tap to replace
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="rounded-full p-4 mb-4" style={{ backgroundColor: "#EAF3EE" }}>
                <Upload size={26} color={COLORS.forest} />
              </div>
              <p className="font-medium" style={{ color: COLORS.forestDeep }}>
                {t.uploadPrompt}
              </p>
              <p className="text-sm text-[#8A8672] mt-1">JPG or PNG, up to 10MB</p>
            </div>
          )}
        </label>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: COLORS.forestDeep }}>
              {t.cropType}
            </label>
            <div className="relative">
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full appearance-none rounded-xl border px-4 py-3 pr-9 text-[15px] outline-none transition-colors duration-200 focus:border-[#1B4332] bg-white"
                style={{ borderColor: COLORS.border, color: COLORS.forestDeep }}
              >
                <option value="">Select</option>
                {CROPS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Wheat size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" color="#8A8672" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: COLORS.forestDeep }}>
              {t.growthStage}
            </label>
            <div className="relative">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full appearance-none rounded-xl border px-4 py-3 pr-9 text-[15px] outline-none transition-colors duration-200 focus:border-[#1B4332] bg-white"
                style={{ borderColor: COLORS.border, color: COLORS.forestDeep }}
              >
                <option value="">Select</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Sprout size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" color="#8A8672" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium block mb-2" style={{ color: COLORS.forestDeep }}>
            {t.location}
          </label>
          <div className="relative">
            <select
              value={villageName}
              onChange={(e) => setVillageName(e.target.value)}
              className="w-full appearance-none rounded-xl border px-4 py-3 pr-9 text-[15px] outline-none transition-colors duration-200 focus:border-[#1B4332] bg-white"
              style={{ borderColor: COLORS.border, color: COLORS.forestDeep }}
            >
              <option value="">Select village</option>
              {VILLAGES.map((v) => (
                <option key={v.village} value={v.village}>
                  {v.village}, {v.district}
                </option>
              ))}
            </select>
            <MapPin size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" color="#8A8672" />
          </div>
        </div>

        {village && (
          <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: COLORS.surfaceMuted }}>
            <MapPin size={16} color={COLORS.forest} />
            <span className="text-sm" style={{ color: "#5B5747" }}>
              {t.location}: <span className="font-medium" style={{ color: COLORS.forestDeep }}>
                Village {village.village}, {village.district}
              </span>
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#FBEAE9", color: COLORS.risk.high }}>
            {error}
          </div>
        )}

        <PrimaryButton
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full mt-8"
          icon={loading ? undefined : ImageIcon}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" /> {t.analyzing}
            </span>
          ) : (
            t.submit
          )}
        </PrimaryButton>
      </div>
    </div>
  );
}

function FarmerResult({ report, onHome, onFollowup, readOnly }) {
  const ready = report.confidence > 80;
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
      <TopBar title="Diagnosis" onBack={onHome} />
      <div className="max-w-xl mx-auto px-5 pb-16 sm:px-8">
        <div className="rounded-2xl p-6 flex items-center gap-5" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
          <ConfidenceRing value={report.confidence} />
          <div>
            <MetaLabel>Likely condition</MetaLabel>
            <h2 className="font-head text-2xl font-semibold mt-1" style={{ color: COLORS.forestDeep }}>
              {report.disease}
            </h2>
            <div className="mt-3">
              <StatusBadge status={report.status} confidence={report.confidence} />
            </div>
          </div>
        </div>

        {ready && report.advisory ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl p-6" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
              <h3 className="font-semibold mb-2" style={{ color: COLORS.forestDeep }}>
                What it is
              </h3>
              <p className="text-[15px] leading-relaxed text-[#4A4737]">{report.advisory.what_it_is}</p>
            </div>

            <div className="rounded-2xl p-6" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
              <h3 className="font-semibold mb-3" style={{ color: COLORS.forestDeep }}>
                What to do
              </h3>
              <ol className="space-y-3">
                {report.advisory.what_to_do.map((step, i) => (
                  <li key={i} className="flex gap-3 text-[15px] text-[#4A4737] leading-relaxed">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ backgroundColor: "#EAF3EE", color: COLORS.forest }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl p-6 relative overflow-hidden" style={{ backgroundColor: COLORS.forestDeep }}>
              <GrainOverlay opacity={0.04} />
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-[#F3EFE4] relative">
                <ShieldCheck size={17} color={COLORS.turmericSoft} /> Safe pesticide &amp; dosage
              </h3>
              <p className="text-[15px] leading-relaxed text-[#D9E4DC] relative">{report.advisory.safe_dosage}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl p-8 text-center" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: "#FBF0DA" }}>
              <SearchCheck size={24} color="#8A6210" />
            </div>
            <h3 className="font-semibold mt-4" style={{ color: COLORS.forestDeep }}>
              An officer is reviewing this case
            </h3>
            <p className="text-[15px] text-[#5B5747] mt-2 leading-relaxed">
              Our confidence in this image is a little low, so it's been sent to an agriculture
              expert for a second look. You'll be notified once it's confirmed.
            </p>
            <p className="text-sm text-[#8A8672] mt-4 flex items-center justify-center gap-1.5">
              <Clock size={14} /> Estimated response: within 24 hours
            </p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <GhostButton onClick={onHome} className="flex-1">
            Back to home
          </GhostButton>
          {!readOnly && (
            <PrimaryButton onClick={onFollowup} className="flex-1">
              Report follow-up
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function FarmerFollowup({ onHome }) {
  const [answer, setAnswer] = useState(null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
      <TopBar title="Follow-up" onBack={onHome} />
      <div className="max-w-xl mx-auto px-5 pb-16 sm:px-8">
        <div className="rounded-2xl p-8 text-center" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
          {answer === null ? (
            <>
              <h3 className="text-lg font-semibold" style={{ color: COLORS.forestDeep }}>
                Did the treatment help?
              </h3>
              <p className="text-[15px] text-[#5B5747] mt-2">
                Your answer helps us improve future advisories.
              </p>
              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={() => setAnswer("yes")}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all duration-200 active:scale-[0.98]"
                  style={{ backgroundColor: "#EAF3EE", color: COLORS.forest }}
                >
                  <ThumbsUp size={17} /> Yes
                </button>
                <button
                  onClick={() => setAnswer("no")}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-all duration-200 active:scale-[0.98]"
                  style={{ backgroundColor: "#FBEAE9", color: "#B3261E" }}
                >
                  <ThumbsDown size={17} /> No
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: "#EAF3EE" }}>
                <CheckCircle2 size={24} color={COLORS.forest} />
              </div>
              <h3 className="text-lg font-semibold mt-4" style={{ color: COLORS.forestDeep }}>
                Thanks for letting us know
              </h3>
              <p className="text-[15px] text-[#5B5747] mt-2 leading-relaxed">
                {answer === "yes"
                  ? "Glad it worked. This case will be marked resolved."
                  : "We've flagged this case for an officer to follow up with you directly."}
              </p>
              <GhostButton onClick={onHome} className="mt-6 w-full">
                Back to home
              </GhostButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   OFFICER MODE
   ========================================================================= */

function OfficerQueue({ reports, onOpenCase, onHome, onDashboard, loading, user, onLogout }) {
  const [sortBy, setSortBy] = useState("recent");
  const pending = reports.filter((r) => r.status !== "confirmed");

  const sorted = useMemo(() => {
    const arr = [...pending];
    if (sortBy === "confidence") arr.sort((a, b) => a.confidence - b.confidence);
    else if (sortBy === "risk") arr.sort((a, b) => a.confidence - b.confidence);
    else arr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return arr;
  }, [pending, sortBy]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
      <TopBar
        title="Case queue"
        onBack={onHome}
        user={user}
        onLogout={onLogout}
        right={
          <button
            onClick={onDashboard}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200"
            style={{ backgroundColor: COLORS.forest, color: "#F3EFE4" }}
          >
            <BarChart3 size={15} /> Dashboard
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-5 pb-16 sm:px-8">
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[#8A8672]">{sorted.length} cases awaiting review</p>
              <div className="flex items-center gap-1.5">
                <ArrowUpDown size={14} color="#8A8672" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm bg-transparent outline-none font-medium"
                  style={{ color: COLORS.forestDeep }}
                >
                  <option value="recent">Most recent</option>
                  <option value="confidence">Lowest confidence</option>
                  <option value="risk">Highest risk</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white p-4 h-56 animate-pulse" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
                <CheckCircle2 size={28} color={COLORS.forest} className="mx-auto" />
                <p className="mt-3 font-medium" style={{ color: COLORS.forestDeep }}>
                  All caught up
                </p>
                <p className="text-sm text-[#8A8672] mt-1">No cases waiting for review right now.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {sorted.map((r, i) => {
                  const risk = riskLevel(r.confidence);
                  return (
                    <button
                      key={r.report_id}
                      onClick={() => onOpenCase(r)}
                      className="text-left rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 rise-in"
                      style={{
                        background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)",
                        boxShadow: cardShadow,
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      <div className="relative h-32">
                        {r.image_url && (r.image_url.startsWith("http") || r.image_url.startsWith("data:")) ? (
                          <img src={r.image_url} alt={r.disease} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: COLORS.highlight }}>
                            <Leaf size={32} color={COLORS.forest} />
                          </div>
                        )}
                        <span
                          className="absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{ backgroundColor: risk.bg, color: risk.color }}
                        >
                          {risk.label}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#8A8672]">{r.crop} · {r.stage}</span>
                          <span className="text-xs text-[#8A8672]">{timeAgo(r.timestamp)}</span>
                        </div>
                        <h3 className="font-semibold mt-1" style={{ color: COLORS.forestDeep }}>
                          {r.disease}
                        </h3>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm text-[#5B5747] flex items-center gap-1">
                            <MapPin size={13} /> {r.location.village}
                          </span>
                          <span className="text-sm font-semibold" style={{ color: risk.color }}>
                            {r.confidence}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function OfficerDetail({ report, onBack, onResolved }) {
  const [correcting, setCorrecting] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(DISEASES[0].name);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const risk = riskLevel(report.confidence);

  const handleConfirm = async () => {
    setBusy(true);
    await confirmCase(report.report_id, report.disease, OFFICER_ID);
    setBusy(false);
    setToast("Diagnosis confirmed");
    setTimeout(() => onResolved(), 900);
  };

  const handleCorrect = async () => {
    setBusy(true);
    await confirmCase(report.report_id, selectedDisease, OFFICER_ID);
    setBusy(false);
    setToast("Diagnosis corrected");
    setTimeout(() => onResolved(), 900);
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: COLORS.cream }}>
      <TopBar title="Case detail" onBack={onBack} />
      <div className="max-w-2xl mx-auto px-5 pb-16 sm:px-8">
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
          <div className="relative">
            {report.image_url && (report.image_url.startsWith("http") || report.image_url.startsWith("data:")) ? (
              <img src={report.image_url} alt={report.disease} className="w-full h-64 object-cover" />
            ) : (
              <div className="w-full h-64 flex items-center justify-center" style={{ backgroundColor: COLORS.highlight }}>
                <Leaf size={48} color={COLORS.forest} />
              </div>
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: "inset 0 -48px 56px -30px rgba(7,21,16,0.32)" }}
            />
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: risk.bg, color: risk.color }}
              >
                {risk.label}
              </span>
              <MetaLabel>{report.report_id}</MetaLabel>
            </div>

            <h2 className="font-head text-xl font-semibold mt-3" style={{ color: COLORS.forestDeep }}>
              AI prediction: {report.disease}
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-5 text-sm">
              <div>
                <p className="text-[#8A8672]">Crop</p>
                <p className="font-medium mt-0.5" style={{ color: COLORS.forestDeep }}>{report.crop}</p>
              </div>
              <div>
                <p className="text-[#8A8672]">Growth stage</p>
                <p className="font-medium mt-0.5" style={{ color: COLORS.forestDeep }}>{report.stage}</p>
              </div>
              <div>
                <p className="text-[#8A8672]">Location</p>
                <p className="font-medium mt-0.5" style={{ color: COLORS.forestDeep }}>{report.location.village}</p>
              </div>
              <div>
                <p className="text-[#8A8672]">Reported</p>
                <p className="font-medium mt-0.5" style={{ color: COLORS.forestDeep }}>{timeAgo(report.timestamp)}</p>
              </div>
              <div>
                <p className="text-[#8A8672]">AI confidence</p>
                <p className="font-medium mt-0.5" style={{ color: COLORS.forestDeep }}>{report.confidence}%</p>
              </div>
              {report.farmerName && (
                <div>
                  <p className="text-[#8A8672]">Farmer</p>
                  <p className="font-medium mt-0.5" style={{ color: COLORS.forestDeep }}>{report.farmerName}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {!correcting ? (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-medium text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: COLORS.forest }}
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
              Confirm diagnosis
            </button>
            <button
              onClick={() => setCorrecting(true)}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-medium transition-all duration-200 active:scale-[0.98]"
              style={{ backgroundColor: "#FBF0DA", color: "#8A6210" }}
            >
              <AlertTriangle size={17} /> Correct diagnosis
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl p-6" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
            <label className="text-sm font-medium block mb-2" style={{ color: COLORS.forestDeep }}>
              Correct disease
            </label>
            <select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-[15px] outline-none bg-white focus:border-[#1B4332] transition-colors duration-200"
              style={{ borderColor: COLORS.border, color: COLORS.forestDeep }}
            >
              {DISEASES.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="flex gap-3 mt-4">
              <GhostButton onClick={() => setCorrecting(false)} className="flex-1">
                Cancel
              </GhostButton>
              <button
                onClick={handleCorrect}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: COLORS.turmeric, color: "#2A1502" }}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                Save correction
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white flex items-center gap-2 transition-all duration-300"
          style={{ backgroundColor: COLORS.forestDeep }}
        >
          <CheckCircle2 size={16} color={COLORS.turmericSoft} /> {toast}
        </div>
      )}
    </div>
  );
}

/* ---- Real aerial map (react-leaflet + Esri World Imagery) ---- */

const TILE_LAYERS = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
};

function diseasePinColor(disease) {
  const idx = DISEASES.findIndex((d) => d.name === disease);
  const palette = ["#B3261E", "#C17817", "#2D6A4F", "#4A6FA5", "#8A6210"];
  return palette[idx % palette.length];
}

function makeDivIcon(color) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function DiseaseMap({ reports }) {
  const [layer, setLayer] = useState("satellite");
  const tile = TILE_LAYERS[layer];

  return (
    <div className="relative rounded-xl overflow-hidden h-80" style={{ border: `1px solid ${COLORS.border}` }}>
      <MapContainer
        center={[17.7, 74.1]}
        zoom={9}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={tile.url} attribution={tile.attribution} />
        {reports.map((r) => (
          <Marker
            key={r.report_id}
            position={[r.location.lat, r.location.lng]}
            icon={makeDivIcon(diseasePinColor(r.disease))}
          >
            <Popup>
              <div style={{ fontFamily: FONT_BODY, minWidth: 150 }}>
                <p style={{ fontWeight: 700, color: COLORS.forestDeep, margin: 0 }}>{r.disease}</p>
                <p style={{ fontSize: 12, color: COLORS.inkSoft, margin: "4px 0 0" }}>{r.crop} · {r.location.village}</p>
                <p style={{ fontSize: 12, color: COLORS.inkSoft, margin: "2px 0 0" }}>Confidence: {r.confidence}%</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[1000] flex rounded-lg overflow-hidden" style={{ boxShadow: cardShadow }}>
        {["satellite", "street"].map((k) => (
          <button
            key={k}
            onClick={() => setLayer(k)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors duration-150"
            style={{
              backgroundColor: layer === k ? COLORS.forestDeep : "#fff",
              color: layer === k ? "#F3EFE4" : COLORS.forestDeep,
            }}
          >
            {k === "satellite" ? <Satellite size={13} /> : <RouteIcon size={13} />}
            {k === "satellite" ? "Satellite" : "Street"}
          </button>
        ))}
      </div>

      <div
        className="absolute bottom-3 left-3 z-[1000] rounded-lg px-3 py-2.5 space-y-1.5"
        style={{ backgroundColor: "rgba(255,255,255,0.94)", boxShadow: cardShadow }}
      >
        {DISEASES.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11px]" style={{ color: COLORS.inkSoft }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: diseasePinColor(d.name) }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function OfficerDashboard({ reports, onBack, user, onLogout }) {
  const totalThisWeek = reports.length;
  const highRisk = reports.filter((r) => r.confidence < 65).length;
  const villagesCovered = new Set(reports.map((r) => r.location.village)).size;

  const perVillage = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      map[r.location.village] = (map[r.location.village] || 0) + 1;
    });
    return Object.entries(map).map(([village, count]) => ({ village, count }));
  }, [reports]);

  const stats = [
    { label: "Total cases this week", value: totalThisWeek, icon: Activity },
    { label: "High risk cases", value: highRisk, icon: AlertTriangle },
    { label: "Villages covered", value: villagesCovered, icon: MapPin },
    { label: "Avg. response time", value: "6.4 hrs", icon: Clock },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.cream }}>
      <TopBar title="Hotspot dashboard" onBack={onBack} user={user} onLogout={onLogout} />
      <div className="max-w-5xl mx-auto px-5 pb-16 sm:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl p-5" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
              <s.icon size={18} color={COLORS.forest} />
              <p className="font-head text-2xl font-semibold mt-3" style={{ color: COLORS.forestDeep }}>
                {s.value}
              </p>
              <p className="text-xs text-[#8A8672] mt-1 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-5 mt-6">
          <div className="lg:col-span-3 rounded-2xl p-5" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.forestDeep }}>
              <MapIcon size={16} /> Disease hotspots
            </h3>
            <DiseaseMap reports={reports} />
          </div>

          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FBF9F2 100%)", boxShadow: cardShadow }}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.forestDeep }}>
              <BarChart3 size={16} /> Cases per village
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={perVillage} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9DB" />
                <XAxis dataKey="village" tick={{ fontSize: 11, fill: "#8A8672" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8A8672" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#F1EEE2" }}
                  contentStyle={{ borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {perVillage.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? COLORS.forest : COLORS.turmeric} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ROOT APP
   ========================================================================= */

export default function App() {
  const [view, setView] = useState("landing");
  const [lang, setLang] = useState("en");
  const [activeReport, setActiveReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [resultReadOnly, setResultReadOnly] = useState(false);
  const [mode, setMode] = useState(null);

  const loadOfficerQueue = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await fetchOfficerQueue();
      setReports(data);
    } catch (err) {
      console.error("Failed to load officer queue:", err);
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const loadConfirmedCases = useCallback(async () => {
    try {
      return await fetchConfirmedCases();
    } catch (err) {
      console.error("Failed to load confirmed cases:", err);
      return [];
    }
  }, []);

  const goLanding = () => {
    setMode(null);
    setView("landing");
  };

  const handleFarmer = () => {
    setMode("farmer");
    setReports([]);
    setView("farmerHome");
  };

  const handleOfficer = async () => {
    setMode("officer");
    await loadOfficerQueue();
    setView("officerQueue");
  };

  const handleLogout = goLanding;

  const handleFarmerSubmitted = async (report) => {
    setActiveReport(report);
    setResultReadOnly(false);
    setReports((current) => [report, ...current]);
    setView("farmerResult");
  };

  const handleOfficerResolved = async () => {
    await loadOfficerQueue();
    setView("officerQueue");
  };

  return (
    <div style={{ fontFamily: FONT_BODY }}>
      <GlobalStyle />

      {view === "landing" && <ModeSelect onSelect={(m) => m === "farmer" ? handleFarmer() : handleOfficer()} />}

      {view === "farmerHome" && mode === "farmer" && (
        <FarmerHome
          lang={lang}
          setLang={setLang}
          reports={reports}
          onNewDiagnosis={() => setView("farmerUpload")}
          onOpenReport={(r) => {
            setActiveReport(r);
            setResultReadOnly(true);
            setView("farmerResult");
          }}
        />
      )}

      {view === "farmerUpload" && mode === "farmer" && (
        <FarmerUpload
          lang={lang}
          setLang={setLang}
          onBack={() => setView("farmerHome")}
          onSubmitted={handleFarmerSubmitted}
        />
      )}

      {view === "farmerResult" && activeReport && (
        <FarmerResult
          report={activeReport}
          readOnly={resultReadOnly}
          onHome={() => setView("farmerHome")}
          onFollowup={() => setView("farmerFollowup")}
        />
      )}

      {view === "farmerFollowup" && (
        <FarmerFollowup onHome={() => setView("farmerHome")} />
      )}

      {view === "officerQueue" && mode === "officer" && (
        <OfficerQueue
          reports={reports}
          loading={loadingReports}
          user={{ name: "Agriculture Officer", role: "officer", designation: "Agriculture Officer" }}
          onLogout={handleLogout}
          onHome={goLanding}
          onDashboard={() => setView("officerDashboard")}
          onOpenCase={(r) => {
            setActiveReport(r);
            setView("officerDetail");
          }}
        />
      )}

      {view === "officerDetail" && activeReport && (
        <OfficerDetail
          report={activeReport}
          onBack={() => setView("officerQueue")}
          onResolved={handleOfficerResolved}
        />
      )}

      {view === "officerDashboard" && (
        <OfficerDashboard
          reports={reports}
          user={{ name: "Agriculture Officer", role: "officer", designation: "Agriculture Officer" }}
          onLogout={handleLogout}
          onBack={() => setView("officerQueue")}
        />
      )}
    </div>
  );
}

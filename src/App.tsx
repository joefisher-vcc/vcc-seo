import { useState, useEffect, useCallback, useMemo, useRef, Fragment, createContext, useContext } from "react";
import {
  BarChart3,
  BarChart2,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  MousePointerClick,
  Eye,
  LogIn,
  ChevronDown,
  ChevronUp,
  Activity,
  Globe,
  RefreshCw,
  ArrowUpRight,
  Bot,
  SlidersHorizontal,
  X,
  Filter,
  ChevronsUpDown,
  Layers,
  Lightbulb,
  ShoppingCart,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID =
  "266667320151-pr77uumhf16f4tlgj4k24sk5b77dsetq.apps.googleusercontent.com";

const AI_SOURCES: { label: string; pattern: RegExp }[] = [
  { label: "ChatGPT",      pattern: /chat\.openai\.com|chatgpt\.com/i },
  { label: "Perplexity",   pattern: /perplexity\.ai/i },
  { label: "Claude",       pattern: /claude\.ai/i },
  { label: "Gemini",       pattern: /gemini\.google\.com|bard\.google\.com/i },
  { label: "Copilot",      pattern: /copilot\.microsoft\.com/i },
  { label: "Bing",         pattern: /bing\.com/i },
  { label: "You.com",      pattern: /you\.com/i },
  { label: "Poe",          pattern: /poe\.com/i },
  { label: "Phind",        pattern: /phind\.com/i },
  { label: "Komo",         pattern: /komo\.ai/i },
  { label: "Reka",         pattern: /reka\.ai/i },
  { label: "Pi",           pattern: /pi\.ai/i },
  { label: "Character.AI", pattern: /character\.ai/i },
  { label: "HuggingFace",  pattern: /huggingface\.co/i },
];

const AI_MASTER_PATTERN =
  /(chat\.openai\.com|chatgpt\.com|perplexity\.ai|claude\.ai|bard\.google\.com|gemini\.google\.com|copilot\.microsoft\.com|bing\.com|you\.com|poe\.com|phind\.com|komo\.ai|reka\.ai|pi\.ai|character\.ai|huggingface\.co)/i;

const DATE_RANGES = [
  { value: "7",         label: "Last 7 days" },
  { value: "14",        label: "Last 14 days" },
  { value: "28",        label: "Last 28 days" },
  { value: "lastWeek",  label: "Last week (Mon–Sun)" },
  { value: "lastMonth", label: "Last month" },
  { value: "last3m",    label: "Last 3 months" },
  { value: "90",        label: "Last 90 days" },
  { value: "last6m",    label: "Last 6 months" },
  { value: "lastYear",  label: "Last year (Jan–Dec)" },
  { value: "365",       label: "Last 365 days" },
  { value: "ytd",       label: "Year to date" },
];
const DATE_RANGES_WITH_CUSTOM = [...DATE_RANGES, { value: "custom", label: "Custom range" }];

/** Resolve a dateRange value to an absolute { startDate, endDate } in YYYY-MM-DD */
function resolveDateRange(value: string): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => toISODate(d);
  const ago = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };

  if (value === "today") {
    return { startDate: fmt(today), endDate: fmt(today) };
  }
  if (value === "yesterday") {
    const yest = fmt(ago(1));
    return { startDate: yest, endDate: yest };
  }
  if (value === "lastWeek") {
    // Monday–Sunday of last week
    const day = today.getDay(); // 0=Sun
    const lastSun = ago(day === 0 ? 7 : day);
    const lastMon = ago(day === 0 ? 13 : day + 6);
    return { startDate: fmt(lastMon), endDate: fmt(lastSun) };
  }
  if (value === "lastMonth") {
    const y = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const m = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 0);
    return { startDate: fmt(start), endDate: fmt(end) };
  }
  if (value === "last3m") {
    const start = new Date(today); start.setMonth(start.getMonth() - 3); start.setDate(start.getDate() + 1);
    return { startDate: fmt(start), endDate: fmt(ago(1)) };
  }
  if (value === "last6m") {
    const start = new Date(today); start.setMonth(start.getMonth() - 6); start.setDate(start.getDate() + 1);
    return { startDate: fmt(start), endDate: fmt(ago(1)) };
  }
  if (value === "lastYear") {
    const y = today.getFullYear() - 1;
    return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
  }
  if (value === "ytd") {
    return { startDate: `${today.getFullYear()}-01-01`, endDate: fmt(ago(1)) };
  }
  // Plain number of days (7, 14, 28, 90, 365, …)
  const d = Math.max(1, parseInt(value, 10) || 28);
  return { startDate: fmt(ago(d - 1)), endDate: fmt(today) };
}

/** How many days a dateRange spans (approximate, for comparison window sizing) */
function dateRangeDays(value: string): number {
  if (value === "lastWeek")  return 7;
  if (value === "lastMonth") return 30;
  if (value === "last3m")    return 91;
  if (value === "last6m")    return 182;
  if (value === "lastYear")  return 365;
  if (value === "ytd") {
    const today = new Date();
    return Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
  }
  return Math.max(1, parseInt(value, 10) || 28);
}

function dateRangeLabel(value: string): string {
  if (value === "custom") return "custom";
  const found = DATE_RANGES.find((r) => r.value === value);
  if (found) return found.label;
  return `${value}d`;
}

const LS_GOOGLE_TOKEN = "vcc_google_access_token";
const LS_GOOGLE_TOKEN_EXP = "vcc_google_token_expires_at";
const LS_SELECTED_GA4 = "vcc_selected_ga4";
const LS_SELECTED_GSC = "vcc_selected_gsc";
const LS_ACTIVE_VIEW = "vcc_active_view";
const LS_BRAND_TERMS = "vcc_brand_terms_v5";
const LS_BRAND_TERMS_HISTORY = "vcc_brand_terms_history_v5";

function persistGoogleToken(r: { access_token?: string; expires_in?: number }) {
  if (!r.access_token) return;
  localStorage.setItem(LS_GOOGLE_TOKEN, r.access_token);
  const ms = (r.expires_in ?? 3599) * 1000;
  localStorage.setItem(LS_GOOGLE_TOKEN_EXP, String(Date.now() + ms - 120_000));
}
function readStoredGoogleToken(): string | null {
  const t = localStorage.getItem(LS_GOOGLE_TOKEN);
  const e = localStorage.getItem(LS_GOOGLE_TOKEN_EXP);
  if (!t || !e) return null;
  if (Date.now() > parseInt(e, 10)) {
    localStorage.removeItem(LS_GOOGLE_TOKEN);
    localStorage.removeItem(LS_GOOGLE_TOKEN_EXP);
    return null;
  }
  return t;
}
function clearGoogleToken() {
  localStorage.removeItem(LS_GOOGLE_TOKEN);
  localStorage.removeItem(LS_GOOGLE_TOKEN_EXP);
}

function daysInclusive(startISO: string, endISO: string): number {
  const a = new Date(startISO + "T12:00:00").getTime();
  const b = new Date(endISO + "T12:00:00").getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
function addDaysISO(iso: string, delta: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}
/** Previous period of same length ending the day before `startISO`. */
function comparisonWindowBefore(startISO: string, endISO: string): { startDate: string; endDate: string } {
  const len = daysInclusive(startISO, endISO);
  const cmpEnd = addDaysISO(startISO, -1);
  const cmpStart = addDaysISO(cmpEnd, -(len - 1));
  return { startDate: cmpStart, endDate: cmpEnd };
}

const METRIC_OPTIONS = [
  { value: "users", label: "Active Users" },
  { value: "sessions", label: "Sessions" },
  { value: "pageviews", label: "Pageviews" },
  { value: "bounceRate", label: "Bounce Rate" },
];

// Palette: dark-purple → mid-purple → light-purple → black-ish variants
const SERIES_COLORS = ["#7e22ce", "#a855f7", "#0f172a", "#c084fc", "#581c87", "#d8b4fe", "#1e293b", "#e9d5ff"];
const CHART_COLORS  = ["#7e22ce", "#a855f7", "#c084fc", "#581c87", "#d8b4fe", "#4c1d95"];
const DEVICE_COLORS = ["#7e22ce", "#a855f7", "#c084fc", "#d8b4fe"];

type ActiveView = "ga4" | "gsc" | "blend" | "intl" | "opportunities" | "gscOpportunities" | "productCategories" | "brandVsNonBrand" | "nbSeo" | "nbSignUps" | "conversions" | "seoIssues" | "performance" | "dailySnapshot";
type OppSortCol = "impressions" | "clicks" | "ctr" | "position" | "query";

/** GSC “low clicks, high impressions” opportunity heuristics (CTR is 0–1 from the API). */
const GSC_OPPORTUNITY_MIN_IMPRESSIONS = 100;
const GSC_OPPORTUNITY_MAX_CTR = 0.03;
type MetricKey  = "users" | "sessions" | "pageviews" | "bounceRate";
type SortDir    = "desc" | "asc";
type ComparisonMode = "none" | "prevPeriod" | "prevYear";

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GA4ApiRow {
  dimensionValues: { value: string }[];
  metricValues:    { value: string }[];
}
interface GSCApiRow {
  keys:        string[];
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;
}
interface PropertySummary { property: string; displayName: string }
interface AccountSummary  { propertySummaries: PropertySummary[] }
interface SiteEntry       { siteUrl: string }

interface DailyGA4 {
  date: string;
  users: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
}
interface DailyGSC {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
interface ChannelRow  { channel: string; users: number; sessions: number }
interface QueryRow    { query: string; clicks: number; impressions: number; ctr: number; position: number }
interface PagePerfRow  { page: string; clicks: number; impressions: number; ctr: number; position: number }
interface DeviceRow   { device: string; clicks: number; impressions: number }
interface AiSourceRow { source: string; label: string; sessions: number; users: number }
interface LandingPageRow { page: string; users: number; sessions: number; bounceRate: number }
interface CmpTotals { users: number; sessions: number; pageviews: number; avgBounce: number }
interface GscCmpTotals { clicks: number; impressions: number; ctr: number; position: number }

interface CountryRow {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
interface Ga4CountryRow {
  country: string;
  users: number;
  sessions: number;
}

interface SeriesRow  { date: string; [key: string]: number | string }

interface GA4Filters {
  dateRange:    string;
  customStart?: string;
  customEnd?: string;
  customCompareStart?: string;
  customCompareEnd?: string;
  metrics:      MetricKey[];
  channelFilter: string[];
  deviceFilter:  string[];
  comparison:   ComparisonMode;
}
type QueryFilterMode = "contains" | "notContains" | "regex";
interface GSCFilters {
  dateRange:       string;
  customStart?: string;
  customEnd?: string;
  customCompareStart?: string;
  customCompareEnd?: string;
  dimension:       "date" | "query" | "page" | "country" | "device";
  queryFilter:     string;
  queryFilterMode: QueryFilterMode;
  countryFilter:   string[];
  deviceFilter:    string[];
  minClicks:       string;
  minImpressions:  string;
  minPosition:     string;
  maxPosition:     string;
  minCtr:          string;
  sortBy:          "clicks" | "impressions" | "ctr" | "position";
  sortDir:         SortDir;
  comparison:      ComparisonMode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date)       { return d.toISOString().split("T")[0] }
function nDaysAgo(n: number)      { const d = new Date(); d.setDate(d.getDate() - n); return toISODate(d) }
function formatDisplayDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function formatGa4Date(raw: string) {
  return formatDisplayDate(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`);
}
function classifyAiSource(source: string): string | null {
  if (!AI_MASTER_PATTERN.test(source)) return null;
  for (const ai of AI_SOURCES) if (ai.pattern.test(source)) return ai.label;
  return null;
}
function getComparisonRange(days: number, mode: "prevPeriod" | "prevYear") {
  if (mode === "prevPeriod") {
    return { startDate: nDaysAgo(days * 2 - 1), endDate: nDaysAgo(days) };
  }
  return { startDate: nDaysAgo(days - 1 + 365), endDate: nDaysAgo(365) };
}

/**
 * Given a resolved current window (YYYY-MM-DD) and comparison mode, return the
 * correct comparison window — shifting back exactly one year for prevYear, or by
 * the exact period length for prevPeriod.
 */
function comparisonWindowFor(
  startDate: string,
  endDate: string,
  mode: "prevPeriod" | "prevYear",
): { startDate: string; endDate: string } {
  if (mode === "prevYear") {
    const shiftYear = (iso: string, delta: number) => {
      const d = new Date(iso + "T00:00:00");
      d.setFullYear(d.getFullYear() + delta);
      return toISODate(d);
    };
    return { startDate: shiftYear(startDate, -1), endDate: shiftYear(endDate, -1) };
  }
  // prevPeriod: shift back by the exact number of days in the current window
  const msPerDay = 86400000;
  const start = new Date(startDate + "T00:00:00");
  const end   = new Date(endDate + "T00:00:00");
  const span  = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  const cmpEnd   = new Date(start.getTime() - msPerDay);
  const cmpStart = new Date(cmpEnd.getTime() - (span - 1) * msPerDay);
  return { startDate: toISODate(cmpStart), endDate: toISODate(cmpEnd) };
}

type Ga4DateWin = { startDate: string; endDate: string };

function ga4DateWindows(f: GA4Filters): { current: Ga4DateWin; comparison: Ga4DateWin | null } {
  // Always resolve to absolute YYYY-MM-DD first
  let absStart: string;
  let absEnd: string;
  if (f.dateRange === "custom" && f.customStart && f.customEnd) {
    absStart = f.customStart;
    absEnd   = f.customEnd;
  } else {
    const r = resolveDateRange(f.dateRange);
    absStart = r.startDate;
    absEnd   = r.endDate;
  }

  // GA4 API can take NdaysAgo for pure numeric rolling ranges — keep that for numeric only
  let current: Ga4DateWin;
  if (/^\d+$/.test(f.dateRange) && f.dateRange !== "custom") {
    const d = Math.max(1, parseInt(f.dateRange, 10) || 28);
    current = { startDate: `${d - 1}daysAgo`, endDate: "today" };
  } else {
    current = { startDate: absStart, endDate: absEnd };
  }

  if (f.comparison === "none") return { current, comparison: null };

  if (f.dateRange === "custom" && f.customStart && f.customEnd) {
    if (f.customCompareStart && f.customCompareEnd) {
      return { current, comparison: { startDate: f.customCompareStart, endDate: f.customCompareEnd } };
    }
    return { current, comparison: comparisonWindowBefore(f.customStart, f.customEnd) };
  }

  const cmp = comparisonWindowFor(absStart, absEnd, f.comparison as "prevPeriod" | "prevYear");
  return { current, comparison: cmp };
}

function gscDateWindows(f: GSCFilters): { startDate: string; endDate: string; comparison: { startDate: string; endDate: string } | null } {
  let startDate: string;
  let endDate: string;
  if (f.dateRange === "custom" && f.customStart && f.customEnd) {
    startDate = f.customStart;
    endDate   = f.customEnd;
  } else if (f.dateRange === "yesterday") {
    // GSC has a ~2-day data lag. When the user picks "Yesterday", GA4 shows
    // actual yesterday, but we offset GSC back by 2 extra days (3 days ago)
    // so it reflects the most recently reliable GSC data available.
    const gscDay = addDaysISO(toISODate(new Date()), -3);
    startDate = gscDay;
    endDate   = gscDay;
  } else {
    const r = resolveDateRange(f.dateRange);
    startDate = r.startDate;
    endDate   = r.endDate;
  }

  if (f.comparison === "none") return { startDate, endDate, comparison: null };

  if (f.dateRange === "custom" && f.customStart && f.customEnd) {
    if (f.customCompareStart && f.customCompareEnd) {
      return { startDate, endDate, comparison: { startDate: f.customCompareStart, endDate: f.customCompareEnd } };
    }
    return { startDate, endDate, comparison: comparisonWindowBefore(f.customStart, f.customEnd) };
  }

  const cmp = comparisonWindowFor(startDate, endDate, f.comparison as "prevPeriod" | "prevYear");
  return { startDate, endDate, comparison: cmp };
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

// ─── Hover Tooltip ────────────────────────────────────────────────────────────

function HoverTooltip({ children, tip, className = "" }: { children: React.ReactNode; tip: string; className?: string; key?: string | number }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onMouseMove={handleMouseMove}
    >
      {children}
      {visible && (
        <div
          className="pointer-events-none absolute z-50 max-w-[220px] rounded-xl bg-gray-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm border border-white/10 leading-relaxed"
          style={{
            left: pos.x + 12,
            top: pos.y - 8,
            transform: pos.x > 160 ? "translateX(-110%)" : undefined,
          }}
        >
          {tip}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ current, previous, lowerIsBetter = false }: { current: number; previous: number; lowerIsBetter?: boolean }) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up  = pct > 0;
  const good = lowerIsBetter ? !up : up;
  const color = good ? "text-emerald-600" : "text-red-500";
  const bg    = good ? "bg-emerald-50"    : "bg-red-50";
  const Icon  = up ? ChevronUp : ChevronDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${bg} ${color}`}>
      <Icon size={9} strokeWidth={3} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, cmpValue, cmpLabel, onClick, active }: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  cmpValue?: number; cmpLabel?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  // Parse numeric from formatted string for delta calculation
  const currentNum = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`bg-white border rounded-2xl p-4 flex items-start gap-3 shadow-sm transition-shadow ${active ? "border-purple-500 ring-2 ring-purple-200" : "border-purple-100 hover:shadow-md"} ${onClick ? "cursor-pointer" : ""}`}>
      <div className="rounded-xl p-2 bg-purple-100 shrink-0">
        <Icon size={16} className="text-purple-700" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
          {cmpValue !== undefined && !isNaN(currentNum) && (
            <DeltaBadge current={currentNum} previous={cmpValue} lowerIsBetter={label.toLowerCase().includes("bounce") || label.toLowerCase().includes("position")} />
          )}
        </div>
        <p className="text-xs font-semibold text-purple-600 mt-1 uppercase tracking-wide leading-none">{label}</p>
        {cmpValue !== undefined && cmpLabel && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            vs {typeof cmpValue === "number" ? (Number.isInteger(cmpValue) ? cmpValue.toLocaleString() : cmpValue.toFixed(2)) : cmpValue} · {cmpLabel}
          </p>
        )}
        {sub && !cmpLabel && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Select({ value, onChange, options, placeholder, disabled, className = "" }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; disabled?: boolean; className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="appearance-none w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 disabled:opacity-40 cursor-pointer transition-all">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function TextInput({ value, onChange, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-all ${className}`} />
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void; key?: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-1 text-xs text-purple-700 font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-purple-900 transition-colors ml-0.5"><X size={10} /></button>
    </span>
  );
}

/** Strip protocol + host from a URL so tables show only the slug (path + query). Falls back to the raw string. */
function slugifyUrl(url: string): string {
  if (!url) return "/";
  try {
    const u = new URL(url);
    const path = (u.pathname || "/") + (u.search || "");
    return path || "/";
  } catch {
    // Already a slug, or a malformed URL — strip a leading scheme+host if present
    return url.replace(/^https?:\/\/[^/]+/i, "") || url;
  }
}

/**
 * Context-provided base URL used by UrlLink to resolve relative paths (e.g. "/sell-watches"
 * from GA4) into absolute links. Set this at the app root to the GSC property URL so arrow
 * links open the actual analysed site rather than the dashboard's own host.
 */
const UrlBaseContext = createContext<string>("");

/**
 * Renders a URL slug as text plus a tiny external-link arrow that opens the URL in a new tab.
 * The arrow uses stopPropagation so clicking it never triggers a parent <tr onClick> handler.
 * Pass `slug` if you've already computed it (e.g. tables that strip the domain inline); otherwise
 * the slug is derived from `url` via slugifyUrl.
 *
 * For relative paths (no protocol), the href is resolved against `UrlBaseContext` if provided,
 * falling back to window.location.origin. Set the context to the GSC property URL at the app root
 * so links open the analysed site rather than the dashboard's own host.
 */
function UrlLink({
  url,
  slug,
  className = "",
}: {
  url: string;
  slug?: string;
  className?: string;
}) {
  const base = useContext(UrlBaseContext);
  const text = slug ?? slugifyUrl(url);
  // Build an absolute href even when only a slug was passed in.
  let href = url;
  if (url && !/^https?:\/\//i.test(url)) {
    // GSC properties can be "sc-domain:vintagecashcow.co.uk" — convert to "https://vintagecashcow.co.uk" before using as a base.
    let resolvedBase = base;
    if (resolvedBase && resolvedBase.startsWith("sc-domain:")) {
      resolvedBase = "https://" + resolvedBase.slice("sc-domain:".length);
    }
    const fallbackBase = resolvedBase || (typeof window !== "undefined" ? window.location.origin : "");
    try { href = new URL(url, fallbackBase).toString(); }
    catch { href = url; }
  }
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <span className="truncate" title={url}>{text}</span>
      {url && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`Open ${href} in new tab`}
          className="shrink-0 text-gray-400 hover:text-[#5b4fa8] transition-colors"
          aria-label="Open in new tab"
        >
          <ArrowUpRight size={11} />
        </a>
      )}
    </span>
  );
}

function ChartCard({ title, children, className = "", tip }: { title: React.ReactNode; children: React.ReactNode; className?: string; tip?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm ${className}`}>
      {tip ? (
        <HoverTooltip tip={tip} className="inline-block mb-4">
          <h3 className="text-sm font-semibold text-gray-900 cursor-help border-b border-dashed border-gray-300 inline">{title}</h3>
        </HoverTooltip>
      ) : (
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}

/** Scrollable table body area (~10 table rows visible). */
function ScrollTable({ children, className = "", maxH }: { children: React.ReactNode; className?: string; maxH?: string }) {
  return (
    <div className={`overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50 ${className}`} style={{ maxHeight: maxH ?? "17.5rem", WebkitOverflowScrolling: "touch" }}>
      {children}
    </div>
  );
}

function ComparisonBanner({ days, mode, rangeHint }: { days: number; mode: ComparisonMode; rangeHint?: string }) {
  if (mode === "none") return null;
  if (rangeHint) {
    return (
      <div className="flex items-center gap-3 text-xs bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 mb-4 flex-wrap">
        <span className="font-semibold text-purple-700">Comparing:</span>
        <span className="text-gray-700">{rangeHint}</span>
      </div>
    );
  }
  const today     = new Date();
  const fmtRange  = (s: string, e: string) => `${formatDisplayDate(s)} – ${formatDisplayDate(e)}`;
  const curStart  = nDaysAgo(days - 1);
  const curEnd    = toISODate(today);
  const cmp       = getComparisonRange(days, mode);
  const modeLabel = mode === "prevPeriod" ? "Prev Period" : "Prev Year";
  return (
    <div className="flex items-center gap-3 text-xs bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 mb-4 flex-wrap">
      <span className="font-semibold text-purple-700">Comparing:</span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-0.5 bg-purple-700 inline-block rounded" />
        <span className="text-gray-700 font-medium">Current</span>
        <span className="text-gray-500">{fmtRange(curStart, curEnd)}</span>
      </span>
      <span className="text-gray-300">vs</span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-0.5 bg-purple-400 inline-block rounded" style={{ borderTop: "2px dashed #a855f7", background: "none" }} />
        <span className="text-gray-700 font-medium">{modeLabel}</span>
        <span className="text-gray-500">{fmtRange(cmp.startDate, cmp.endDate)}</span>
      </span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Loading data…</span>
    </div>
  );
}

function PosBadge({ pos }: { pos: number }) {
  const cls = pos <= 3
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : pos <= 10
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-purple-50 text-purple-600 border-purple-200";
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{pos.toFixed(1)}</span>;
}

const chartTooltipStyle = {
  contentStyle: { backgroundColor: "#ffffff", border: "1px solid #e9d5ff", borderRadius: 12, fontSize: 12, color: "#1f2937", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" },
  labelStyle: { color: "#7e22ce", fontWeight: 600 },
  itemStyle: { color: "#1f2937" },
};

function tickFilter(arr: { date: string }[], every = 4) {
  return arr.map((r, i) => (i % every === 0 ? r.date : ""));
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────

function MultiSelect({ value, onChange, options, placeholder = "Select…", maxSelections, disabled, className = "" }: {
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  maxSelections?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      if (maxSelections && value.length >= maxSelections) return;
      onChange([...value, v]);
    }
  }

  const label = value.length === 0
    ? placeholder
    : value.length <= 2
    ? value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ")
    : `${value.length} selected`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((x) => !x)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-purple-400 disabled:opacity-40 cursor-pointer transition-all hover:border-purple-300"
      >
        <span className={`truncate ${value.length === 0 ? "text-gray-400" : ""}`}>{label}</span>
        <ChevronDown size={13} className={`ml-2 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {options.map((o) => {
            const checked = value.includes(o.value);
            const locked  = !checked && !!maxSelections && value.length >= maxSelections;
            return (
              <label key={o.value} className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 transition-colors ${locked ? "opacity-40 cursor-not-allowed" : ""}`}>
                <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(o.value)}
                  className="accent-purple-700 w-3.5 h-3.5 shrink-0" />
                <span className="text-gray-700 truncate">{o.label}</span>
              </label>
            );
          })}
          {value.length > 0 && (
            <button onClick={() => { onChange([]); setOpen(false); }}
              className="w-full text-xs text-purple-600 hover:text-purple-800 py-2 border-t border-gray-100 transition-colors">
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Comparison Toggle ────────────────────────────────────────────────────────

function ComparisonToggle({ value, onChange }: { value: ComparisonMode; onChange: (v: ComparisonMode) => void }) {
  const options: { v: ComparisonMode; label: string }[] = [
    { v: "none",       label: "None" },
    { v: "prevPeriod", label: "vs Prev Period" },
    { v: "prevYear",   label: "vs Prev Year" },
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-500 font-medium mr-1">Compare:</span>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${value === o.v ? "bg-purple-700 text-white border-purple-700" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Filter Panels ────────────────────────────────────────────────────────────

function GA4FilterPanel({ filters, setFilters, channelOptions }: {
  filters: GA4Filters;
  setFilters: React.Dispatch<React.SetStateAction<GA4Filters>>;
  channelOptions: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(true);

  const activePills: { label: string; clear: () => void }[] = [];
  filters.channelFilter.forEach((c) => activePills.push({ label: `Channel: ${c}`, clear: () => setFilters((f) => ({ ...f, channelFilter: f.channelFilter.filter((x) => x !== c) })) }));
  filters.deviceFilter.forEach((d) => activePills.push({ label: `Device: ${d}`, clear: () => setFilters((f) => ({ ...f, deviceFilter: f.deviceFilter.filter((x) => x !== d) })) }));

  return (
    <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 mb-5">
      <HoverTooltip tip="Expand to filter by date range, metrics, traffic channel, or device type. Active filters show as pills below.">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full text-left">
          <SlidersHorizontal size={14} className="text-purple-500" />
          Filters & Controls
          <ChevronDown size={13} className={`ml-auto text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </HoverTooltip>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Date Range</label>
              <Select value={filters.dateRange} onChange={(v) => setFilters((f) => ({ ...f, dateRange: v }))} options={DATE_RANGES_WITH_CUSTOM} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Metrics</label>
              <MultiSelect
                value={filters.metrics}
                onChange={(v) => setFilters((f) => ({ ...f, metrics: v as MetricKey[] }))}
                options={METRIC_OPTIONS}
                placeholder="Select metrics…"
                maxSelections={4}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Channel Groups</label>
              <MultiSelect
                value={filters.channelFilter}
                onChange={(v) => setFilters((f) => ({ ...f, channelFilter: v, deviceFilter: v.length ? [] : f.deviceFilter }))}
                options={channelOptions}
                placeholder="All Channels"
                maxSelections={4}
                disabled={filters.deviceFilter.length > 0}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Devices</label>
              <MultiSelect
                value={filters.deviceFilter}
                onChange={(v) => setFilters((f) => ({ ...f, deviceFilter: v, channelFilter: v.length ? [] : f.channelFilter }))}
                options={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobile" }, { value: "tablet", label: "Tablet" }]}
                placeholder="All Devices"
                maxSelections={3}
                disabled={filters.channelFilter.length > 0}
              />
            </div>
          </div>
          {filters.dateRange === "custom" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-purple-100">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Start (current)</label>
                <input type="date" value={filters.customStart ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customStart: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">End (current)</label>
                <input type="date" value={filters.customEnd ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customEnd: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
              </div>
              {filters.comparison !== "none" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Compare start</label>
                    <input type="date" value={filters.customCompareStart ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customCompareStart: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Compare end</label>
                    <input type="date" value={filters.customCompareEnd ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customCompareEnd: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
                  </div>
                </>
              )}
            </div>
          )}
          <ComparisonToggle value={filters.comparison} onChange={(v) => setFilters((f) => ({ ...f, comparison: v }))} />
        </div>
      )}

      {activePills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-purple-100">
          {activePills.map((p) => <FilterPill key={p.label} label={p.label} onRemove={p.clear} />)}
          <button onClick={() => setFilters((f) => ({ ...f, channelFilter: [], deviceFilter: [] }))}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
            <X size={10} /> Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function GSCFilterPanel({ filters, setFilters, countryOptions }: {
  filters: GSCFilters;
  setFilters: React.Dispatch<React.SetStateAction<GSCFilters>>;
  countryOptions: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(true);

  const activePills: { label: string; clear: () => void }[] = [];
  filters.countryFilter.forEach((c) => activePills.push({ label: `Country: ${c}`, clear: () => setFilters((f) => ({ ...f, countryFilter: f.countryFilter.filter((x) => x !== c) })) }));
  filters.deviceFilter.forEach((d) => activePills.push({ label: `Device: ${d}`, clear: () => setFilters((f) => ({ ...f, deviceFilter: f.deviceFilter.filter((x) => x !== d) })) }));

  return (
    <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 mb-5">
      <HoverTooltip tip="Expand to filter Search Console data by date, query dimension (query/page/country/device), country, or device type.">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full text-left">
          <Filter size={14} className="text-purple-500" />
          Filters & Controls
          <ChevronDown size={13} className={`ml-auto text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </HoverTooltip>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Date Range</label>
              <Select value={filters.dateRange} onChange={(v) => setFilters((f) => ({ ...f, dateRange: v }))} options={DATE_RANGES_WITH_CUSTOM} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Dimension</label>
              <Select value={filters.dimension} onChange={(v) => setFilters((f) => ({ ...f, dimension: v as GSCFilters["dimension"] }))}
                options={[{ value: "date", label: "Date" }, { value: "query", label: "Query" }, { value: "page", label: "Page" }, { value: "country", label: "Country" }, { value: "device", label: "Device" }]} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Countries</label>
              <MultiSelect value={filters.countryFilter} onChange={(v) => setFilters((f) => ({ ...f, countryFilter: v }))}
                options={countryOptions} placeholder="All Countries" maxSelections={4} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Devices</label>
              <MultiSelect value={filters.deviceFilter} onChange={(v) => setFilters((f) => ({ ...f, deviceFilter: v }))}
                options={[{ value: "DESKTOP", label: "Desktop" }, { value: "MOBILE", label: "Mobile" }, { value: "TABLET", label: "Tablet" }]}
                placeholder="All Devices" maxSelections={3} />
            </div>
          </div>
          {filters.dateRange === "custom" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-purple-100">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Start (current)</label>
                <input type="date" value={filters.customStart ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customStart: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">End (current)</label>
                <input type="date" value={filters.customEnd ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customEnd: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
              </div>
              {filters.comparison !== "none" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Compare start</label>
                    <input type="date" value={filters.customCompareStart ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customCompareStart: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Compare end</label>
                    <input type="date" value={filters.customCompareEnd ?? ""} onChange={(e) => setFilters((f) => ({ ...f, customCompareEnd: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
                  </div>
                </>
              )}
            </div>
          )}
          <div className="flex items-end">
            <ComparisonToggle value={filters.comparison} onChange={(v) => setFilters((f) => ({ ...f, comparison: v }))} />
          </div>
        </div>
      )}

      {activePills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-purple-100">
          {activePills.map((p) => <FilterPill key={p.label} label={p.label} onRemove={p.clear} />)}
          <button onClick={() => setFilters((f) => ({ ...f, countryFilter: [], deviceFilter: [] }))}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
            <X size={10} /> Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ─── GSC Sortable Table ───────────────────────────────────────────────────────

function SortIcon({ col, sortBy, sortDir }: { col: string; sortBy: string; sortDir: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown size={11} className="text-gray-300" />;
  return sortDir === "asc" ? <ChevronUp size={11} className="text-purple-600" /> : <ChevronDown size={11} className="text-purple-600" />;
}


// ─── Generic sortable table helpers ───────────────────────────────────────────
type AnySort = { key: string; dir: SortDir };
function useTableSort<T>(
  rows: T[],
  initial: AnySort,
  accessor?: (row: T, key: string) => unknown,
) {
  const [sort, setSort] = useState<AnySort>(initial);
  const sorted = useMemo(() => {
    const get = accessor ?? ((r: T, k: string) => (r as unknown as Record<string, unknown>)[k]);
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = get(a, sort.key);
      const bv = get(b, sort.key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av), bn = Number(bv);
      return sort.dir === "asc" ? an - bn : bn - an;
    });
    return copy;
  }, [rows, sort, accessor]);
  const toggle = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  return { sorted, sort, toggle };
}

function SortableTh({
  label, sortKey, sort, onToggle, className = "",
}: {
  label: React.ReactNode;
  sortKey: string | null;
  sort: AnySort;
  onToggle?: (k: string) => void;
  className?: string;
}) {
  const clickable = !!sortKey && !!onToggle;
  return (
    <th
      onClick={clickable ? () => onToggle!(sortKey!) : undefined}
      className={`${className} ${clickable ? "cursor-pointer hover:text-purple-600 select-none" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey && <SortIcon col={sortKey} sortBy={sort.key} sortDir={sort.dir} />}
      </span>
    </th>
  );
}


// ─── Query Filter Bar (above GSC table) ───────────────────────────────────────

const FILTER_MODES: { value: QueryFilterMode; label: string }[] = [
  { value: "contains",    label: "Contains" },
  { value: "notContains", label: "Not Contains" },
  { value: "regex",       label: "Regex" },
];

function QueryFilterBar({ filters, setFilters, totalRows, filteredCount }: {
  filters: GSCFilters;
  setFilters: React.Dispatch<React.SetStateAction<GSCFilters>>;
  totalRows: number;
  filteredCount: number;
}) {
  const hasFilters = filters.queryFilter.trim() || filters.minClicks || filters.minImpressions || filters.minCtr || filters.minPosition || filters.maxPosition;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-purple-500" />
          <span className="text-sm font-semibold text-gray-700">Filter Queries</span>
          {hasFilters && (
            <span className="text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 font-medium">
              {filteredCount} / {totalRows}
            </span>
          )}
        </div>
        {hasFilters && (
          <button onClick={() => setFilters((f) => ({
            ...f, queryFilter: "", minClicks: "", minImpressions: "", minCtr: "", minPosition: "", maxPosition: "",
          }))} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
            <X size={11} /> Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Query text filter with mode selector */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">Query Filter</label>
          <div className="flex gap-1.5">
            <div className="relative shrink-0">
              <select
                value={filters.queryFilterMode}
                onChange={(e) => setFilters((f) => ({ ...f, queryFilterMode: e.target.value as QueryFilterMode }))}
                className="appearance-none bg-white border border-gray-200 rounded-xl pl-2.5 pr-6 py-2 text-xs text-gray-600 focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {FILTER_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <TextInput
              value={filters.queryFilter}
              onChange={(v) => setFilters((f) => ({ ...f, queryFilter: v }))}
              placeholder={filters.queryFilterMode === "regex" ? "e.g. ^brand|product$" : "e.g. seo tools"}
              className="flex-1"
            />
          </div>
          {filters.queryFilterMode === "regex" && filters.queryFilter && (() => {
            try { new RegExp(filters.queryFilter); return null; }
            catch { return <p className="text-[10px] text-red-500 mt-1">Invalid regex pattern</p>; }
          })()}
        </div>

        {/* Numeric filters */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">Min Clicks / Impressions</label>
          <div className="flex gap-1.5">
            <TextInput value={filters.minClicks} onChange={(v) => setFilters((f) => ({ ...f, minClicks: v }))} placeholder="Clicks" />
            <TextInput value={filters.minImpressions} onChange={(v) => setFilters((f) => ({ ...f, minImpressions: v }))} placeholder="Impr." />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">Position Range / Min CTR %</label>
          <div className="flex gap-1.5">
            <TextInput value={filters.minPosition} onChange={(v) => setFilters((f) => ({ ...f, minPosition: v }))} placeholder="Pos min" />
            <TextInput value={filters.maxPosition} onChange={(v) => setFilters((f) => ({ ...f, maxPosition: v }))} placeholder="Pos max" />
            <TextInput value={filters.minCtr} onChange={(v) => setFilters((f) => ({ ...f, minCtr: v }))} placeholder="CTR%" />
          </div>
        </div>
      </div>

      {/* Active filter pills */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
          {filters.queryFilter.trim() && (
            <FilterPill
              label={`${filters.queryFilterMode === "contains" ? "Contains" : filters.queryFilterMode === "notContains" ? "Not contains" : "Regex"}: "${filters.queryFilter}"`}
              onRemove={() => setFilters((f) => ({ ...f, queryFilter: "" }))}
            />
          )}
          {filters.minClicks && <FilterPill label={`Clicks ≥ ${filters.minClicks}`} onRemove={() => setFilters((f) => ({ ...f, minClicks: "" }))} />}
          {filters.minImpressions && <FilterPill label={`Impressions ≥ ${filters.minImpressions}`} onRemove={() => setFilters((f) => ({ ...f, minImpressions: "" }))} />}
          {filters.minCtr && <FilterPill label={`CTR ≥ ${filters.minCtr}%`} onRemove={() => setFilters((f) => ({ ...f, minCtr: "" }))} />}
          {filters.minPosition && <FilterPill label={`Pos ≥ ${filters.minPosition}`} onRemove={() => setFilters((f) => ({ ...f, minPosition: "" }))} />}
          {filters.maxPosition && <FilterPill label={`Pos ≤ ${filters.maxPosition}`} onRemove={() => setFilters((f) => ({ ...f, maxPosition: "" }))} />}
        </div>
      )}
    </div>
  );
}

// ─── International View ───────────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  "usa": "United States", "gbr": "United Kingdom", "deu": "Germany", "fra": "France",
  "can": "Canada", "aus": "Australia", "ind": "India", "bra": "Brazil",
  "nld": "Netherlands", "esp": "Spain", "ita": "Italy", "jpn": "Japan",
  "kor": "South Korea", "mex": "Mexico", "arg": "Argentina", "pol": "Poland",
  "swe": "Sweden", "che": "Switzerland", "aut": "Austria", "bel": "Belgium",
  "dnk": "Denmark", "nor": "Norway", "fin": "Finland", "nzl": "New Zealand",
  "prt": "Portugal", "irl": "Ireland", "sgp": "Singapore", "zaf": "South Africa",
  "idn": "Indonesia", "tha": "Thailand", "vnm": "Vietnam", "phl": "Philippines",
  "mys": "Malaysia", "cze": "Czech Republic", "hun": "Hungary", "rom": "Romania",
  "ukr": "Ukraine", "rus": "Russia", "tur": "Turkey", "pak": "Pakistan",
  "egy": "Egypt", "are": "United Arab Emirates", "sau": "Saudi Arabia", "isr": "Israel",
  "chn": "China", "twn": "Taiwan", "hkg": "Hong Kong",
};

function countryName(code: string): string {
  return COUNTRY_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

function countryFlag(code: string): string {
  if (!code || code.length < 2) return "🌐";
  const c = code.toLowerCase();
  const map3to2: Record<string, string> = {
    "usa":"us","gbr":"gb","deu":"de","fra":"fr","can":"ca","aus":"au","ind":"in",
    "bra":"br","nld":"nl","esp":"es","ita":"it","jpn":"jp","kor":"kr","mex":"mx",
    "arg":"ar","pol":"pl","swe":"se","che":"ch","aut":"at","bel":"be","dnk":"dk",
    "nor":"no","fin":"fi","nzl":"nz","prt":"pt","irl":"ie","sgp":"sg","zaf":"za",
    "idn":"id","tha":"th","vnm":"vn","phl":"ph","mys":"my","cze":"cz","hun":"hu",
    "rom":"ro","ukr":"ua","rus":"ru","tur":"tr","pak":"pk","egy":"eg","are":"ae",
    "sau":"sa","isr":"il","chn":"cn","twn":"tw","hkg":"hk",
  };
  const code2 = map3to2[c] ?? c.substring(0, 2);
  const codePoints = [...code2.toUpperCase()].map((ch) => 0x1F1E6 + ch.charCodeAt(0) - 65);
  return codePoints.map((cp) => String.fromCodePoint(cp)).join("");
}

function IntlGlobePreview({ gscRows, ga4Rows }: { gscRows: CountryRow[]; ga4Rows: Ga4CountryRow[] }) {
  const heat = new Map<string, number>();
  gscRows.forEach((r) => heat.set(r.country, (heat.get(r.country) ?? 0) + r.clicks));
  ga4Rows.forEach((r) => heat.set(r.country, (heat.get(r.country) ?? 0) + r.sessions));
  const top = [...heat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  const POS: Record<string, { left: string; top: string }> = {
    usa: { left: "20%", top: "38%" }, can: { left: "18%", top: "24%" }, gbr: { left: "45%", top: "28%" }, deu: { left: "50%", top: "30%" },
    fra: { left: "47%", top: "34%" }, esp: { left: "44%", top: "36%" }, ita: { left: "51%", top: "36%" }, ind: { left: "67%", top: "42%" },
    chn: { left: "76%", top: "38%" }, jpn: { left: "84%", top: "36%" }, aus: { left: "82%", top: "62%" }, bra: { left: "28%", top: "58%" },
    mex: { left: "14%", top: "42%" }, rus: { left: "62%", top: "22%" }, zaf: { left: "52%", top: "62%" }, kor: { left: "80%", top: "36%" },
    nld: { left: "48%", top: "27%" }, swe: { left: "52%", top: "20%" },
  };
  return (
    <div className="relative w-full max-w-md mx-auto aspect-[2/1] rounded-full bg-gradient-to-br from-sky-900 via-indigo-950 to-slate-950 border border-teal-200 shadow-inner mb-5 overflow-hidden">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,#38bdf8_0%,transparent_55%)]" />
      {top.map(([c]) => {
        const pos = POS[c] ?? { left: "50%", top: "50%" };
        return (
          <span key={c} title={c.toUpperCase()} className="absolute w-3 h-3 rounded-full bg-teal-400 border border-white shadow-md -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: pos.left, top: pos.top }} />
        );
      })}
      <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-teal-100/90 font-semibold tracking-wide">Highlighted: top countries by GSC + GA4 activity</div>
    </div>
  );
}

type IntlTab = "overview" | "gsc" | "ga4" | "rising";
type IntlSortCol = "country" | "clicks" | "impressions" | "ctr" | "position" | "users" | "sessions";

function IntlView({
  gscCountryRows, gscCountryRowsCmp,
  ga4CountryRows, ga4CountryRowsCmp,
  gscLoading, ga4Loading,
  hasCmp, hasGscCmp,
}: {
  gscCountryRows: CountryRow[];
  gscCountryRowsCmp: CountryRow[];
  ga4CountryRows: Ga4CountryRow[];
  ga4CountryRowsCmp: Ga4CountryRow[];
  gscLoading: boolean;
  ga4Loading: boolean;
  hasCmp: boolean;
  hasGscCmp: boolean;
}) {
  const [tab, setTab] = useState<IntlTab>("overview");
  const [gscSort, setGscSort] = useState<{ col: IntlSortCol; dir: SortDir }>({ col: "clicks", dir: "desc" });
  const [ga4Sort, setGa4Sort] = useState<{ col: IntlSortCol; dir: SortDir }>({ col: "sessions", dir: "desc" });

  const noData = gscCountryRows.length === 0 && ga4CountryRows.length === 0;
  const loading = gscLoading || ga4Loading;

  function toggleGscSort(col: IntlSortCol) {
    setGscSort((s) => s.col === col ? { col, dir: s.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" });
  }
  function toggleGa4Sort(col: IntlSortCol) {
    setGa4Sort((s) => s.col === col ? { col, dir: s.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" });
  }

  const sortedGsc = useMemo(() => {
    const rows = [...gscCountryRows];
    rows.sort((a, b) => {
      const av = a[gscSort.col as keyof CountryRow] as number;
      const bv = b[gscSort.col as keyof CountryRow] as number;
      if (typeof av === "string") return gscSort.dir === "asc" ? (av as unknown as string).localeCompare(bv as unknown as string) : (bv as unknown as string).localeCompare(av as unknown as string);
      return gscSort.dir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [gscCountryRows, gscSort]);

  const sortedGa4 = useMemo(() => {
    const rows = [...ga4CountryRows];
    rows.sort((a, b) => {
      const av = a[ga4Sort.col as keyof Ga4CountryRow] as number;
      const bv = b[ga4Sort.col as keyof Ga4CountryRow] as number;
      if (typeof av === "string") return ga4Sort.dir === "asc" ? (av as unknown as string).localeCompare(bv as unknown as string) : (bv as unknown as string).localeCompare(av as unknown as string);
      return ga4Sort.dir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [ga4CountryRows, ga4Sort]);

  // Rising/Falling: based on GSC click changes
  const { rising, falling } = useMemo(() => {
    if (!hasGscCmp || gscCountryRowsCmp.length === 0) return { rising: [], falling: [] };
    const cmpMap = new Map(gscCountryRowsCmp.map((r) => [r.country, r]));
    const withChange = gscCountryRows
      .map((r) => {
        const c = cmpMap.get(r.country);
        if (!c || c.clicks === 0) return null;
        const pct = ((r.clicks - c.clicks) / Math.abs(c.clicks)) * 100;
        return { ...r, pct, cmpClicks: c.clicks };
      })
      .filter((r): r is CountryRow & { pct: number; cmpClicks: number } => r !== null);
    const rising = withChange.filter((r) => r.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 10);
    const falling = withChange.filter((r) => r.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 10);
    return { rising, falling };
  }, [gscCountryRows, gscCountryRowsCmp, hasGscCmp]);

  const gscTop10 = gscCountryRows.slice(0, 10).map((r) => ({ ...r, name: countryName(r.country) }));
  const ga4Top10 = ga4CountryRows.slice(0, 10).map((r) => ({ ...r, name: countryName(r.country) }));

  const TABS: { key: IntlTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "gsc",      label: "GSC Countries" },
    { key: "ga4",      label: "GA4 Countries" },
    { key: "rising",   label: "Rising & Falling" },
  ];

  const intlTooltipStyle = {
    contentStyle: { backgroundColor: "#ffffff", border: "1px solid #99f6e4", borderRadius: 12, fontSize: 12, color: "#1f2937", boxShadow: "0 4px 16px rgba(13,148,136,0.08)" },
    labelStyle: { color: "#0d9488", fontWeight: 600 },
    itemStyle: { color: "#1f2937" },
  };

  return (
    <div className="space-y-5">
      <SectionDivider label="International" />

      {!noData && <IntlGlobePreview gscRows={gscCountryRows} ga4Rows={ga4CountryRows} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-teal-100 rounded-xl p-2"><Globe size={16} className="text-teal-700" /></div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">International Performance</h2>
          <p className="text-xs text-gray-400">Country-level GSC &amp; GA4 breakdown</p>
        </div>
      </div>

      {/* Empty state */}
      {!loading && noData && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
          <Globe size={32} className="text-teal-200 mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">No country data available yet</p>
          <p className="text-gray-300 text-xs mt-1">Select a GA4 and GSC property to load international data</p>
        </div>
      )}

      {(loading && noData) && (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="w-5 h-5 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading country data…</span>
        </div>
      )}

      {!noData && (
        <>
          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit flex-wrap">
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${tab === key ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Overview tab ── */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {gscTop10.length > 0 && (
                <ChartCard title="Top 10 Countries by GSC Clicks" tip="Countries sending the most organic search clicks to your site. Use this to identify markets worth localising content for or running geo-targeted SEO campaigns in.">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={gscTop10} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0fdfa" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip {...intlTooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Clicks"]} />
                      <Bar dataKey="clicks" name="Clicks" radius={[0, 4, 4, 0]} fill="#0d9488" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
              {ga4Top10.length > 0 && (
                <ChartCard title="Top 10 Countries by GA4 Users" tip="Countries generating the most users in GA4. Compare this with GSC clicks to spot markets where you rank but don't convert — or rank well but have low brand awareness.">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={ga4Top10} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={100} />
                      <Tooltip {...intlTooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Users"]} />
                      <Bar dataKey="users" name="Users" radius={[0, 4, 4, 0]} fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>
          )}

          {/* ── GSC Countries tab ── */}
          {tab === "gsc" && (
            <ChartCard title={`GSC Countries${hasGscCmp ? " — with comparison" : ""}`}>
              <ScrollTable>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr className="border-b border-gray-100">
                      {([
                        { col: "country",     label: "Country" },
                        { col: "clicks",      label: "Clicks" },
                        { col: "impressions", label: "Impressions" },
                        { col: "ctr",         label: "CTR" },
                        { col: "position",    label: "Position" },
                      ] as { col: IntlSortCol; label: string }[]).map(({ col, label }) => (
                        <th key={col} onClick={() => toggleGscSort(col)}
                          className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-3 last:pr-0 text-[10px] cursor-pointer hover:text-teal-600 select-none">
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {gscSort.col === col
                              ? gscSort.dir === "asc" ? <ChevronUp size={11} className="text-teal-600" /> : <ChevronDown size={11} className="text-teal-600" />
                              : <ChevronsUpDown size={11} className="text-gray-300" />
                            }
                          </span>
                        </th>
                      ))}
                      {hasGscCmp && <th className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-3 text-[10px]">Click Chg</th>}
                      {hasGscCmp && <th className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Pos Chg</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGsc.map((r, i) => {
                      const cmp = hasGscCmp ? gscCountryRowsCmp.find((x) => x.country === r.country) : null;
                      const clickDelta = cmp && cmp.clicks ? ((r.clicks - cmp.clicks) / Math.abs(cmp.clicks)) * 100 : null;
                      const posDelta   = cmp ? r.position - cmp.position : null;
                      return (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-teal-50/30 transition-colors">
                          <td className="py-2 pr-3 font-medium text-gray-800">
                            <span className="mr-1.5">{countryFlag(r.country)}</span>
                            {countryName(r.country)}
                          </td>
                          <td className="py-2 pr-3 font-semibold text-gray-900">{r.clicks.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-gray-500">{r.impressions.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-gray-600">{(r.ctr * 100).toFixed(2)}%</td>
                          <td className="py-2 pr-3"><PosBadge pos={r.position} /></td>
                          {hasGscCmp && (
                            <td className={`py-2 pr-3 font-bold text-[10px] ${clickDelta === null ? "text-gray-400" : clickDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {clickDelta === null ? "—" : `${clickDelta >= 0 ? "+" : ""}${clickDelta.toFixed(1)}%`}
                            </td>
                          )}
                          {hasGscCmp && (
                            <td className={`py-2 font-bold text-[10px] ${posDelta === null ? "text-gray-400" : posDelta <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {posDelta === null ? "—" : `${posDelta <= 0 ? "" : "+"}${posDelta.toFixed(1)}`}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollTable>
            </ChartCard>
          )}

          {/* ── GA4 Countries tab ── */}
          {tab === "ga4" && (
            <ChartCard title={`GA4 Countries${hasCmp ? " — with comparison" : ""}`}>
              <ScrollTable>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-white shadow-sm">
                    <tr className="border-b border-gray-100">
                      {([
                        { col: "country",  label: "Country" },
                        { col: "users",    label: "Users" },
                        { col: "sessions", label: "Sessions" },
                      ] as { col: IntlSortCol; label: string }[]).map(({ col, label }) => (
                        <th key={col} onClick={() => toggleGa4Sort(col)}
                          className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-3 last:pr-0 text-[10px] cursor-pointer hover:text-teal-600 select-none">
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {ga4Sort.col === col
                              ? ga4Sort.dir === "asc" ? <ChevronUp size={11} className="text-teal-600" /> : <ChevronDown size={11} className="text-teal-600" />
                              : <ChevronsUpDown size={11} className="text-gray-300" />
                            }
                          </span>
                        </th>
                      ))}
                      {hasCmp && <th className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-3 text-[10px]">User Chg</th>}
                      {hasCmp && <th className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Sess Chg</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGa4.map((r, i) => {
                      const cmp = hasCmp ? ga4CountryRowsCmp.find((x) => x.country === r.country) : null;
                      const userDelta = cmp && cmp.users ? ((r.users - cmp.users) / Math.abs(cmp.users)) * 100 : null;
                      const sessDelta = cmp && cmp.sessions ? ((r.sessions - cmp.sessions) / Math.abs(cmp.sessions)) * 100 : null;
                      return (
                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-teal-50/30 transition-colors">
                          <td className="py-2 pr-3 font-medium text-gray-800">
                            <span className="mr-1.5">{countryFlag(r.country)}</span>
                            {countryName(r.country)}
                          </td>
                          <td className="py-2 pr-3 font-semibold text-gray-900">{r.users.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-gray-600">{r.sessions.toLocaleString()}</td>
                          {hasCmp && (
                            <td className={`py-2 pr-3 font-bold text-[10px] ${userDelta === null ? "text-gray-400" : userDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {userDelta === null ? "—" : `${userDelta >= 0 ? "+" : ""}${userDelta.toFixed(1)}%`}
                            </td>
                          )}
                          {hasCmp && (
                            <td className={`py-2 font-bold text-[10px] ${sessDelta === null ? "text-gray-400" : sessDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {sessDelta === null ? "—" : `${sessDelta >= 0 ? "+" : ""}${sessDelta.toFixed(1)}%`}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollTable>
            </ChartCard>
          )}

          {/* ── Rising & Falling tab ── */}
          {tab === "rising" && (
            <>
              {!hasGscCmp ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">
                  <TrendingUp size={28} className="text-teal-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Enable comparison mode in the GSC filter panel to see rising and falling countries.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Rising */}
                  <ChartCard title="Rising Countries (GSC Clicks)">
                    {rising.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4 text-center">No rising countries found</p>
                    ) : (
                      <div className="space-y-2">
                        {rising.map((r, i) => (
                          <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                            <span className="text-lg leading-none">{countryFlag(r.country)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{countryName(r.country)}</p>
                              <p className="text-[10px] text-gray-400">{r.clicks.toLocaleString()} clicks</p>
                            </div>
                            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                              <TrendingUp size={10} className="text-emerald-600" />
                              <span className="text-[10px] font-bold text-emerald-700">+{r.pct.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>
                  {/* Falling */}
                  <ChartCard title="Falling Countries (GSC Clicks)">
                    {falling.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4 text-center">No falling countries found</p>
                    ) : (
                      <div className="space-y-2">
                        {falling.map((r, i) => (
                          <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                            <span className="text-lg leading-none">{countryFlag(r.country)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{countryName(r.country)}</p>
                              <p className="text-[10px] text-gray-400">{r.clicks.toLocaleString()} clicks</p>
                            </div>
                            <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                              <TrendingDown size={10} className="text-red-500" />
                              <span className="text-[10px] font-bold text-red-600">{r.pct.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

async function copyTableToClipboard(table: HTMLTableElement) {
  const rows = Array.from(table.querySelectorAll("tr"));
  const tsv = rows
    .map((r) =>
      Array.from(r.querySelectorAll("th,td"))
        .map((c) => (c.textContent || "").replace(/\s+/g, " ").trim())
        .join("\t")
    )
    .join("\n");
  const html = `<table border="1" cellspacing="0" cellpadding="4">${table.innerHTML}</table>`;
  try {
    const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    if (navigator.clipboard && CI) {
      await navigator.clipboard.write([
        new CI({
          "text/plain": new Blob([tsv], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    await navigator.clipboard.writeText(tsv);
  } catch {
    /* ignore */
  }
}

// ─── GSC Opportunities View ────────────────────────────────────────────────────

interface GscOppProps {
  gscQueries: QueryRow[];
  gscPages: PagePerfRow[];
  oppTableMode: "queries" | "pages";
  setOppTableMode: (m: "queries" | "pages") => void;
  oppSearch: string;
  setOppSearch: (s: string) => void;
  oppActiveFilters: Set<string>;
  setOppActiveFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  oppExpandedRow: string | null;
  setOppExpandedRow: React.Dispatch<React.SetStateAction<string | null>>;
  oppExpandedData: QueryRow[];
  oppExpandedLoading: boolean;
  oppMentionMap: Map<string, Set<string>>;
  oppMentionChecked: Set<string>;
  fetchOppExpanded: (key: string, mode: "query" | "page") => Promise<void>;
  selectedGSC: string;
  gscLoading: boolean;
}

type OppQuerySortKey = "query" | "impressions" | "clicks" | "ctr" | "position";
type OppPageSortKey  = "page" | "impressions" | "clicks" | "ctr" | "position" | "queries";

const BRAND_TERMS_GLOBAL = ["vintage cash cow", "vintagecashcow", "vcc"];

function isBrandQuery(q: string) {
  const ql = q.toLowerCase();
  return BRAND_TERMS_GLOBAL.some((b) => ql.includes(b));
}

/**
 * Default brand keyword list for the Non-Brand SEO section. Users can edit/extend this in the UI.
 *
 * IMPORTANT: classification rules (see `nbSeoClassify` for the implementation):
 *   - Terms ≥ 4 chars use case-insensitive substring matching (e.g. "vinted" matches
 *     "vinted", "vinted app", "is vinted safe", etc.).
 *   - Terms ≤ 3 chars use a word-boundary regex (e.g. "vcc" and "cc" match as whole words only,
 *     so "occasion" / "cccam" / "vccountry" stay non-brand).
 *   - Terms prefixed with "=" require the *entire query* to equal the term (e.g. "=vintage"
 *     matches the bare query "vintage" but NOT "vintage clothing" or "vintage cars").
 *   - Terms prefixed with "&" do a word-boundary match on the rest (e.g. "&cow" matches
 *     "cash cow" and "vintage cow" but NOT "scarecrow", "cowboy", or "coward").
 *   - Terms containing "+" require ALL parts as substrings, any order (e.g. "cash+cow"
 *     matches "cash cow", "cow and cash", "vintage cash big cow"; "cash+vintage" matches
 *     "vintage cash cow" and "vintage things for cash").
 *
 * Plus a built-in rule: any query containing 7+ consecutive digits (phone numbers) is brand.
 */
const NBSEO_DEFAULT_BRAND_TERMS = [
  // ── Broad rules — these three alone catch the vast majority of brand traffic ─────────
  // Word-boundary "cow": "cash cow", "vintage cow", "moo cow", "cow for cash" → brand.
  //   Does NOT match "scarecrow", "coward", "cowboy", "cowork".
  "&cow",
  // AND-of-substrings: query must contain BOTH tokens (any order, any distance).
  // Catches all typo combos of "cash cow" / "vintage cash X" the explicit list might miss.
  "cash+cow",
  "cash+vintage",
  // Broad core-phrase substrings — kept for compatibility with the rules above; any one of
  // these alone is enough to mark a query as brand even if the broader rules didn't fire.
  "cash cow",
  "cashcow",
  "vintage cash",
  // Hyphenated / punctuated variants the substrings above don't catch.
  "vintage-cash-cow",
  "cash-cow",
  // Misspellings of "cash cow" / "cashcow" — these are belt-and-braces: the broad rules
  // above already catch most of them, but listing them explicitly makes the classifier
  // self-documenting in the UI and protects against the broad rules being removed.
  "cadh cow",
  "cas cow",
  "cash and cow",
  "cash for cow",
  "casj cow",
  "vintage cow",
  // These two typos don't contain "cow" at all, so they're NOT caught by &cow or cash+cow.
  // They must stay as explicit substring entries.
  "cash ciw",
  "cash cpw",
  // Pre-existing misspellings (kept for documentation / fallback)
  "cach cow",
  "cach-cow",
  "cashcoe",
  "cashcoa",
  "cashcou",
  "cashciw",
  "cash coe",
  "cash cou",
  "ash cow",
  "cash ow",
  "xash cow",
  "vintage cach",
  "vintage cashc",
  "vintage cas cow",
  "vintage cow cash",
  "vintige cash",
  "vintge cash",
  "vintge cashcow",
  "vinatge cash",
  "vinatage cash",
  "vintaecashcow",
  "vintagcashcow",
  // Short / abbreviated (word-boundary matched because length ≤ 3, so "occasion" / "cccam" stay non-brand)
  "vcc",
  "cc",
  // Common confusions / competitor / look-alike terms users search alongside the brand
  "vinted",
  "vintage cc",
  "vintage trading",
  // Exact-match-only: a query that is *literally* the word "vintage" on its own is treated as brand,
  // but "vintage clothing", "vintage cars", etc. stay non-brand. Leading "=" marks exact-match.
  "=vintage",
  // Misspellings / alternate brand renderings of the company name itself
  "arcavindi",
  "arca vindi",
  // Additional brand variants
  "cahcow",
  "vintagecow",
];

/**
 * Built-in rule (not part of the user-editable list): any query containing a phone-number-shaped
 * sequence — 7 or more consecutive digits, ignoring common separators (spaces, dashes, dots,
 * parentheses, and a leading +) — is classified as brand. Rationale: people searching for a
 * specific phone number are almost always trying to identify or contact a known company.
 *
 * Examples that match: "0800 123 4567", "+44 1234 567890", "08001234567", "(0114) 1234567".
 * Examples that don't: "top 10 vintage cars", "iphone 15", "2024 prices".
 */
function looksLikePhoneNumber(ql: string): boolean {
  // Strip whitespace, dashes, dots, parentheses, and a leading +. Then look for a run of 7+ digits.
  const stripped = ql.replace(/[\s().+\-]/g, "");
  return /\d{7,}/.test(stripped);
}

/**
 * Classify a query against a list of brand terms.
 *
 * Term conventions supported (all case-insensitive):
 *   - Plain phrase (≥ 4 chars): substring match. e.g. "vintage cash" matches "vintage cash cow".
 *   - Plain short token (≤ 3 chars, e.g. "vcc" / "cc"): word-boundary match, so "occasion" /
 *     "cccam" / "vccountry" don't get flagged.
 *   - "=phrase": exact-match-only. e.g. "=vintage" matches the bare query "vintage" but NOT
 *     "vintage clothing".
 *   - "&word": word-boundary match for words of any length. e.g. "&cow" matches "cash cow",
 *     "vintage cow", "moo cow"; does NOT match "scarecrow", "coward", "cowboy".
 *   - "a+b" (or "a+b+c"): AND match. The query must contain every token as a substring (in any
 *     order). e.g. "cash+cow" matches "cash cow", "cow for cash", "cash and cow", "cash ciw cow".
 *
 * Built-in (not configurable): any query containing a phone-number-shaped digit sequence
 * (7+ digits after stripping separators) is treated as brand — see `looksLikePhoneNumber`.
 */
function nbSeoClassify(query: string, terms: string[]): "brand" | "nonBrand" {
  const ql = query.toLowerCase().trim();
  if (!ql) return "nonBrand";
  if (looksLikePhoneNumber(ql)) return "brand";
  for (const raw of terms) {
    const t = raw.toLowerCase().trim();
    if (!t) continue;
    // — Exact-match-only ("=phrase") —
    if (t.startsWith("=")) {
      const exact = t.slice(1).trim();
      if (exact && ql === exact) return "brand";
      continue;
    }
    // — Word-boundary on a single word ("&word") —
    if (t.startsWith("&")) {
      const word = t.slice(1).trim();
      if (!word) continue;
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      try { if (new RegExp(`\\b${escaped}\\b`, "i").test(ql)) return "brand"; } catch { /* fall through */ }
      continue;
    }
    // — AND of substrings ("a+b" / "a+b+c") —
    if (t.includes("+")) {
      const parts = t.split("+").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2 && parts.every((p) => ql.includes(p))) return "brand";
      continue;
    }
    // — Short tokens: word-boundary by default to avoid acronym collisions —
    if (t.length <= 3) {
      const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      try {
        if (new RegExp(`\\b${escaped}\\b`, "i").test(ql)) return "brand";
      } catch { /* fall through */ }
    // — Default: case-insensitive substring —
    } else if (ql.includes(t)) {
      return "brand";
    }
  }
  return "nonBrand";
}

function GscOpportunitiesView({
  gscQueries, gscPages,
  oppTableMode, setOppTableMode,
  oppSearch, setOppSearch,
  oppActiveFilters, setOppActiveFilters,
  oppExpandedRow, setOppExpandedRow,
  oppExpandedData, oppExpandedLoading,
  oppMentionMap, oppMentionChecked,
  fetchOppExpanded,
  selectedGSC, gscLoading,
}: GscOppProps) {
  const [querySortKey, setQuerySortKey] = useState<OppQuerySortKey>("impressions");
  const [querySortDir, setQuerySortDir] = useState<SortDir>("desc");
  const [pageSortKey, setPageSortKey] = useState<OppPageSortKey>("impressions");
  const [pageSortDir, setPageSortDir] = useState<SortDir>("desc");

  const toggleFilter = (f: string) => {
    setOppActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const af = oppActiveFilters;
  const searchLow = oppSearch.toLowerCase();

  // ── query filters ──
  const filteredQueries = useMemo(() => {
    let rows = [...gscQueries];
    if (searchLow) rows = rows.filter((r) => r.query.toLowerCase().includes(searchLow));
    if (af.has("no-brand"))      rows = rows.filter((r) => !isBrandQuery(r.query));
    if (af.has("on-page-2"))     rows = rows.filter((r) => r.position >= 11 && r.position <= 20);
    if (af.has("no-clicks"))     rows = rows.filter((r) => r.clicks === 0);
    if (af.has("pos-gt-10"))     rows = rows.filter((r) => r.position > 10);
    if (af.has("pos-lt-10"))     rows = rows.filter((r) => r.position < 10);
    if (af.has("impr-500"))      rows = rows.filter((r) => r.impressions >= 500);
    if (af.has("low-ctr"))       rows = rows.filter((r) => r.ctr < 0.03 && r.impressions >= 100);
    if (af.has("questions"))     rows = rows.filter((r) => /^(what|how|why|when|where|who|which|is|are|can|does|do|should|will)\b/i.test(r.query));
    if (af.has("buyer"))         rows = rows.filter((r) => /\b(buy|price|cost|cheap|best|review|near me|delivery|order|shop|discount|deal|sale|vs|compare|worth|top\s+\d)/i.test(r.query));
    if (af.has("comparison"))    rows = rows.filter((r) => /\b(vs\.?|versus|compared? to|or |alternative|better|worse)/i.test(r.query));
    if (af.has("no-mention")) {
      rows = rows.filter((r) => {
        const q = r.query.toLowerCase();
        // If no pages checked yet, keep row (can't determine yet)
        if (oppMentionChecked.size === 0) return true;
        // Check if ANY checked page mentions this query
        for (const [page, found] of oppMentionMap.entries()) {
          if (oppMentionChecked.has(page) && found.has(q)) return false;
        }
        return true;
      });
    }
    rows.sort((a, b) => {
      const dir = querySortDir === "desc" ? -1 : 1;
      const aV = a[querySortKey as keyof QueryRow] as number | string;
      const bV = b[querySortKey as keyof QueryRow] as number | string;
      return typeof aV === "string" ? dir * aV.localeCompare(bV as string) : dir * ((aV as number) - (bV as number));
    });
    return rows;
  }, [gscQueries, searchLow, af, querySortKey, querySortDir, oppMentionMap, oppMentionChecked]);

  // ── page filters ──
  const filteredPages = useMemo(() => {
    let rows = [...gscPages];
    if (searchLow) rows = rows.filter((r) => r.page.toLowerCase().includes(searchLow));
    if (af.has("no-clicks"))  rows = rows.filter((r) => r.clicks === 0);
    if (af.has("pos-gt-10"))  rows = rows.filter((r) => r.position > 10);
    if (af.has("pos-lt-10"))  rows = rows.filter((r) => r.position < 10);
    if (af.has("impr-500"))   rows = rows.filter((r) => r.impressions >= 500);
    if (af.has("on-page-2"))  rows = rows.filter((r) => r.position >= 11 && r.position <= 20);
    if (af.has("low-ctr"))    rows = rows.filter((r) => r.ctr < 0.03 && r.impressions >= 100);
    if (af.has("no-mention")) {
      // pages where <50% of queries are mentioned in copy
      rows = rows.filter((r) => {
        const checked = oppMentionChecked.has(r.page);
        if (!checked) return true;
        const mentioned = oppMentionMap.get(r.page);
        return !mentioned || mentioned.size === 0;
      });
    }
    rows.sort((a, b) => {
      const dir = pageSortDir === "desc" ? -1 : 1;
      if (pageSortKey === "queries") return dir; // stable; no query count on PagePerfRow
      const aV = a[pageSortKey as keyof PagePerfRow] as number | string;
      const bV = b[pageSortKey as keyof PagePerfRow] as number | string;
      return typeof aV === "string" ? dir * aV.localeCompare(bV as string) : dir * ((aV as number) - (bV as number));
    });
    return rows;
  }, [gscPages, searchLow, af, pageSortKey, pageSortDir, oppMentionMap, oppMentionChecked]);

  const handleRowClick = (key: string) => {
    if (oppExpandedRow === key) {
      setOppExpandedRow(null);
    } else {
      setOppExpandedRow(key);
      void fetchOppExpanded(key, oppTableMode === "queries" ? "query" : "page");
    }
  };

  const toggleQuerySort = (k: OppQuerySortKey) => {
    if (querySortKey === k) setQuerySortDir((d) => d === "desc" ? "asc" : "desc");
    else { setQuerySortKey(k); setQuerySortDir("desc"); }
  };
  const togglePageSort = (k: OppPageSortKey) => {
    if (pageSortKey === k) setPageSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setPageSortKey(k); setPageSortDir("desc"); }
  };

  const SortChevron = ({ active, dir }: { active: boolean; dir: SortDir }) =>
    active ? <span className="ml-0.5 text-[#5b4fa8]">{dir === "desc" ? "↓" : "↑"}</span> : <span className="ml-0.5 text-gray-300">↕</span>;

  // Mention status for a query (checks across all pages that might rank for it)
  const queryMentionStatus = (query: string): "yes" | "no" | "checking" => {
    const q = query.toLowerCase();
    let anyChecked = false;
    for (const [page, found] of oppMentionMap.entries()) {
      if (oppMentionChecked.has(page)) { anyChecked = true; if (found.has(q)) return "yes"; }
    }
    if (!anyChecked && oppMentionChecked.size === 0) return "checking";
    return anyChecked ? "no" : "checking";
  };

  const pageMentionCount = (page: string): { count: number; checked: boolean } => {
    const checked = oppMentionChecked.has(page);
    const found = oppMentionMap.get(page);
    return { count: found?.size ?? 0, checked };
  };

  type FilterDef = { key: string; label: string; isNew?: boolean };
  const QUERY_FILTERS: FilterDef[] = [
    { key: "on-page-2",    label: "On Page 2" },
    { key: "questions",    label: "Questions" },
    { key: "buyer",        label: "Buyer Keywords" },
    { key: "comparison",   label: "Comparison Keywords", isNew: true },
    { key: "no-mention",   label: "No Mentions" },
    { key: "impr-500",     label: "Impressions > 500" },
    { key: "no-clicks",    label: "No Clicks" },
    { key: "pos-gt-10",    label: "Best Position > 10" },
    { key: "pos-lt-10",    label: "Best Position < 10" },
    { key: "no-brand",     label: "Exclude Brand" },
  ];

  const PAGE_FILTERS: FilterDef[] = [
    { key: "on-page-2",   label: "On Page 2" },
    { key: "impr-500",    label: "Impressions > 500" },
    { key: "no-mention",  label: "No Mentions" },
    { key: "no-clicks",   label: "No Clicks" },
    { key: "pos-gt-10",   label: "Best Position > 10" },
    { key: "pos-lt-10",   label: "Best Position < 10" },
    { key: "low-ctr",     label: "Low CTR" },
  ];

  const activeFiltersArr: FilterDef[] = oppTableMode === "queries" ? QUERY_FILTERS : PAGE_FILTERS;
  const displayedRows    = oppTableMode === "queries" ? filteredQueries : filteredPages;

  if (!selectedGSC) return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
      <TrendingUp size={28} className="text-purple-200 mx-auto mb-3" />
      <p className="text-sm text-gray-400">Connect a Search Console property to use GSC Opportunities.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="bg-purple-100 rounded-xl p-2"><TrendingUp size={16} className="text-[#5b4fa8]" /></div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">GSC Opportunities</h2>
          <p className="text-xs text-gray-400">{selectedGSC} · {gscLoading ? "Loading…" : `${gscQueries.length} queries · ${gscPages.length} pages`}</p>
        </div>
      </div>

      {/* Top bar: domain + search + mode toggle */}
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 shrink-0">
          <svg width="16" height="16" viewBox="0 0 48 48" fill="none"><path d="M12 8C7.6 8 4 11.6 4 16c0 3.2 1.8 6 4.4 7.6L24 40l15.6-16.4C42.2 22 44 19.2 44 16c0-4.4-3.6-8-8-8-2.8 0-5.2 1.4-6.8 3.6L24 17l-5.2-5.4C17.2 9.4 14.8 8 12 8z" stroke="#5b4fa8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          {selectedGSC.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={oppSearch}
              onChange={(e) => setOppSearch(e.target.value)}
              placeholder={oppTableMode === "queries" ? "Search for a query…" : "Search for a page…"}
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5b4fa8] focus:ring-1 focus:ring-purple-200 transition-all"
            />
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => { setOppTableMode("queries"); setOppExpandedRow(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${oppTableMode === "queries" ? "bg-white text-[#5b4fa8] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Queries
          </button>
          <button onClick={() => { setOppTableMode("pages"); setOppExpandedRow(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${oppTableMode === "pages" ? "bg-white text-[#5b4fa8] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Pages
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Toggle Filters</p>
        <div className="flex flex-wrap gap-2">
          {activeFiltersArr.map(({ key, label, isNew }) => (
            <button key={key} onClick={() => toggleFilter(key)}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                af.has(key)
                  ? "bg-[#5b4fa8] text-white border-[#5b4fa8] shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#5b4fa8] hover:text-[#5b4fa8]"
              }`}>
              {isNew && <span className="absolute -top-2 -right-1 bg-amber-400 text-white text-[9px] font-bold px-1 rounded-full leading-tight">New!</span>}
              {label}
            </button>
          ))}
          {af.size > 0 && (
            <button onClick={() => setOppActiveFilters(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 border border-dashed border-gray-200 hover:border-red-200 transition-all">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Teal left accent bar */}
        <div className="flex">
          <div className="w-1 bg-[#5b4fa8] rounded-l-2xl shrink-0" />
          <div className="flex-1 overflow-x-auto">
            {gscLoading ? (
              <div className="flex items-center justify-center py-16 gap-2">
                <div className="w-5 h-5 border-2 border-purple-200 border-t-[#5b4fa8] rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading GSC data…</span>
              </div>
            ) : displayedRows.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">No results match the current filters.</div>
            ) : oppTableMode === "queries" ? (
              /* ── Queries table ── */
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="w-8 py-3 pl-4" />
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none"
                      onClick={() => toggleQuerySort("query")}>
                      Query <SortChevron active={querySortKey === "query"} dir={querySortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">Pages</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleQuerySort("impressions")}>
                      Unique Impressions <SortChevron active={querySortKey === "impressions"} dir={querySortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none"
                      onClick={() => toggleQuerySort("position")}>
                      Best Position <SortChevron active={querySortKey === "position"} dir={querySortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none"
                      onClick={() => toggleQuerySort("clicks")}>
                      Total Clicks <SortChevron active={querySortKey === "clicks"} dir={querySortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none"
                      onClick={() => toggleQuerySort("ctr")}>
                      Avg CTR <SortChevron active={querySortKey === "ctr"} dir={querySortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">
                      <HoverTooltip tip="Whether the query text appears in the copy of pages that rank for it. Checked automatically via page content fetch.">
                        <span className="flex items-center gap-1 cursor-help">Mentions <span className="text-[#5b4fa8] text-[10px]">ⓘ</span></span>
                      </HoverTooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueries.slice(0, 200).map((row, i) => {
                    const isExpanded = oppExpandedRow === row.query;
                    const mentionStatus = queryMentionStatus(row.query);
                    const filtered = af.has("no-mention") && mentionStatus === "yes";
                    if (filtered) return null;
                    return (
                      <>
                        <tr key={row.query}
                          className={`border-b border-gray-50 hover:bg-purple-50/40 cursor-pointer transition-colors ${isExpanded ? "bg-purple-50/60" : i % 2 === 0 ? "" : "bg-gray-50/30"}`}
                          onClick={() => handleRowClick(row.query)}>
                          <td className="py-3 pl-4 pr-1 w-8">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isExpanded ? "bg-[#5b4fa8] border-[#5b4fa8]" : "border-gray-200"}`}>
                              {isExpanded ? <ChevronUp size={11} className="text-white" /> : <ChevronDown size={11} className="text-gray-400" />}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-800 max-w-[280px]">
                            <span className={isExpanded ? "text-[#5b4fa8] underline" : ""}>{row.query}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-500">—</td>
                          <td className="py-3 px-3 font-semibold text-gray-800">{row.impressions.toLocaleString()}</td>
                          <td className="py-3 px-3"><PosBadge pos={row.position} /></td>
                          <td className="py-3 px-3 text-gray-700">{row.clicks.toLocaleString()}</td>
                          <td className="py-3 px-3 text-gray-700">{(row.ctr * 100).toFixed(1)}%</td>
                          <td className="py-3 px-3">
                            {mentionStatus === "checking" ? (
                              <span className="inline-flex items-center gap-1 text-gray-400"><div className="w-3 h-3 border border-gray-300 border-t-[#5b4fa8] rounded-full animate-spin" /> Checking…</span>
                            ) : mentionStatus === "yes" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Yes</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><span className="w-2 h-2 bg-red-400 rounded-full" /> No</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${row.query}-expanded`} className="bg-purple-50/40">
                            <td colSpan={8} className="px-8 py-3">
                              <p className="text-xs font-semibold text-[#5b4fa8] mb-2">Pages ranking for "{row.query}"</p>
                              {oppExpandedLoading ? (
                                <div className="flex items-center gap-2 py-2"><div className="w-4 h-4 border border-purple-200 border-t-[#5b4fa8] rounded-full animate-spin" /><span className="text-xs text-gray-400">Loading pages…</span></div>
                              ) : oppExpandedData.length === 0 ? (
                                <p className="text-xs text-gray-400 py-1">No pages found.</p>
                              ) : (
                                <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
                                  <thead><tr className="bg-white border-b border-gray-100">
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Page URL</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Impressions</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Position</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Clicks</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">CTR</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Mentioned?</th>
                                  </tr></thead>
                                  <tbody>
                                    {oppExpandedData.slice(0, 8).map((p, pi) => {
                                      const pageUrl = p.query; // when fetched by query, dim=page, key=query field
                                      const mentioned = oppMentionMap.get(pageUrl)?.has(row.query.toLowerCase());
                                      const checked   = oppMentionChecked.has(pageUrl);
                                      return (
                                        <tr key={pi} className="border-b border-gray-50 last:border-0">
                                          <td className="py-2 px-3 text-[#5b4fa8] max-w-[300px] truncate" title={pageUrl}>
                                            <UrlLink url={pageUrl} />
                                          </td>
                                          <td className="py-2 px-3">{p.impressions.toLocaleString()}</td>
                                          <td className="py-2 px-3"><PosBadge pos={p.position} /></td>
                                          <td className="py-2 px-3">{p.clicks}</td>
                                          <td className="py-2 px-3">{(p.ctr * 100).toFixed(1)}%</td>
                                          <td className="py-2 px-3">
                                            {!checked ? <span className="text-gray-400 text-[10px]">Checking…</span>
                                              : mentioned ? <span className="text-emerald-600 font-semibold">✓ Yes</span>
                                              : <span className="text-red-500 font-semibold">✗ No</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* ── Pages table ── */
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="w-8 py-3 pl-4" />
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none"
                      onClick={() => togglePageSort("page")}>
                      Page URL <SortChevron active={pageSortKey === "page"} dir={pageSortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">Total Queries</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => togglePageSort("impressions")}>
                      Total Impressions <SortChevron active={pageSortKey === "impressions"} dir={pageSortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none"
                      onClick={() => togglePageSort("position")}>
                      Best Position <SortChevron active={pageSortKey === "position"} dir={pageSortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none"
                      onClick={() => togglePageSort("clicks")}>
                      Total Clicks <SortChevron active={pageSortKey === "clicks"} dir={pageSortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 cursor-pointer select-none"
                      onClick={() => togglePageSort("ctr")}>
                      Total CTR <SortChevron active={pageSortKey === "ctr"} dir={pageSortDir} />
                    </th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">
                      <HoverTooltip tip="Sessions on /free-selling-pack that were referred from pages in this category — i.e. users who visited a category page then went to request a free selling pack.">
                        <span className="flex items-center gap-1 cursor-help">Total Mentions <span className="text-[#5b4fa8] text-[10px]">ⓘ</span></span>
                      </HoverTooltip>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.slice(0, 200).map((row, i) => {
                    const isExpanded = oppExpandedRow === row.page;
                    const { count: mentionCount, checked } = pageMentionCount(row.page);
                    return (
                      <>
                        <tr key={row.page}
                          className={`border-b border-gray-50 hover:bg-purple-50/40 cursor-pointer transition-colors ${isExpanded ? "bg-purple-50/60" : i % 2 === 0 ? "" : "bg-gray-50/30"}`}
                          onClick={() => handleRowClick(row.page)}>
                          <td className="py-3 pl-4 pr-1 w-8">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isExpanded ? "bg-[#5b4fa8] border-[#5b4fa8]" : "border-gray-200"}`}>
                              {isExpanded ? <ChevronUp size={11} className="text-white" /> : <ChevronDown size={11} className="text-gray-400" />}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-700 max-w-[320px] truncate" title={row.page}>
                            <span className={`inline-flex items-center gap-1 min-w-0 ${isExpanded ? "text-[#5b4fa8] underline" : ""}`}>
                              <span className="truncate">{slugifyUrl(row.page)}</span>
                              <a
                                href={row.page}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title={`Open ${row.page} in new tab`}
                                className="shrink-0 text-gray-400 hover:text-[#5b4fa8] transition-colors"
                                aria-label="Open in new tab"
                              >
                                <ArrowUpRight size={11} />
                              </a>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500">—</td>
                          <td className="py-3 px-3 font-semibold text-gray-800">{row.impressions.toLocaleString()}</td>
                          <td className="py-3 px-3"><PosBadge pos={row.position} /></td>
                          <td className="py-3 px-3 text-gray-700">{row.clicks.toLocaleString()}</td>
                          <td className="py-3 px-3 text-gray-700">{(row.ctr * 100).toFixed(1)}%</td>
                          <td className="py-3 px-3">
                            {!checked ? (
                              <span className="inline-flex items-center gap-1 text-gray-400 text-[10px]"><div className="w-3 h-3 border border-gray-300 border-t-[#5b4fa8] rounded-full animate-spin" /> Checking…</span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 font-semibold ${mentionCount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                <span className={`w-2 h-2 rounded-full ${mentionCount > 0 ? "bg-emerald-500" : "bg-red-400"}`} />
                                {mentionCount}
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${row.page}-expanded`} className="bg-purple-50/40">
                            <td colSpan={8} className="px-8 py-3">
                              <p className="text-xs font-semibold text-[#5b4fa8] mb-2">Queries ranking for this page</p>
                              {oppExpandedLoading ? (
                                <div className="flex items-center gap-2 py-2"><div className="w-4 h-4 border border-purple-200 border-t-[#5b4fa8] rounded-full animate-spin" /><span className="text-xs text-gray-400">Loading queries…</span></div>
                              ) : oppExpandedData.length === 0 ? (
                                <p className="text-xs text-gray-400 py-1">No queries found.</p>
                              ) : (
                                <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
                                  <thead><tr className="bg-white border-b border-gray-100">
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Query</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Impressions</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Position</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Clicks</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">CTR</th>
                                    <th className="py-2 px-3 text-left font-semibold text-gray-400">In Copy?</th>
                                  </tr></thead>
                                  <tbody>
                                    {oppExpandedData.slice(0, 10).map((q, qi) => {
                                      const mentioned = oppMentionMap.get(row.page)?.has(q.query.toLowerCase());
                                      const pChecked  = oppMentionChecked.has(row.page);
                                      return (
                                        <tr key={qi} className="border-b border-gray-50 last:border-0">
                                          <td className="py-2 px-3 font-medium text-gray-800">{q.query}</td>
                                          <td className="py-2 px-3">{q.impressions.toLocaleString()}</td>
                                          <td className="py-2 px-3"><PosBadge pos={q.position} /></td>
                                          <td className="py-2 px-3">{q.clicks}</td>
                                          <td className="py-2 px-3">{(q.ctr * 100).toFixed(1)}%</td>
                                          <td className="py-2 px-3">
                                            {!pChecked ? <span className="text-gray-400 text-[10px]">Checking…</span>
                                              : mentioned ? <span className="text-emerald-600 font-semibold">✓ Yes</span>
                                              : <span className="text-red-500 font-semibold">✗ No</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Row count */}
        <div className="px-5 py-2.5 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Showing {Math.min(200, displayedRows.length)} of {displayedRows.length} {oppTableMode} {af.size > 0 ? "(filtered)" : ""}
          </p>
          {oppMentionChecked.size > 0 && (
            <p className="text-xs text-gray-400">
              ✓ Mention check: {oppMentionChecked.size} page{oppMentionChecked.size !== 1 ? "s" : ""} scanned
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Product Categories View ───────────────────────────────────────────────────

interface CatRowType {
  category: string;
  clicks: number; impressions: number; ctr: number; position: number;
  leads: number; sessions: number;
  clicksCmp: number; impressionsCmp: number; leadsCmp: number; sessionsCmp: number;
  pages: string[];
}

interface ProductCatProps {
  catRows: CatRowType[];
  catLoading: boolean;
  catTab: "all" | "growing" | "decaying";
  setCatTab: (t: "all" | "growing" | "decaying") => void;
  catMetric: "clicks" | "leads" | "sessions";
  setCatMetric: (m: "clicks" | "leads" | "sessions") => void;
  catExpandedCategory: string | null;
  setCatExpandedCategory: React.Dispatch<React.SetStateAction<string | null>>;
  catExpandedData: { page: string; clicks: number; impressions: number; ctr: number; position: number; leads: number; sessions: number }[];
  catExpandedLoading: boolean;
  fetchCatExpanded: (cat: { name: string; parent: string; children: string[] }) => Promise<void>;
  vccCategories: { name: string; parent: string; children: string[] }[];
  selectedGA4: string;
  selectedGSC: string;
  dateLabel: string;
  cmpLabel: string;
}

function pctDelta(cur: number, cmp: number): number | null {
  if (!cmp) return null;
  return ((cur - cmp) / Math.abs(cmp)) * 100;
}

function CatDelta({ cur, cmp, lowerBetter = false }: { cur: number; cmp: number; lowerBetter?: boolean }) {
  const d = pctDelta(cur, cmp);
  if (d === null) return null;
  const up = d > 0;
  const good = lowerBetter ? !up : up;
  return (
    <span className={`ml-1 text-[10px] font-bold ${good ? "text-emerald-600" : "text-red-500"}`}>
      {up ? "+" : ""}{d.toFixed(0)}%
    </span>
  );
}

function SparkBar({ value, max, color = "#5b4fa8" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-gray-100 rounded-full mt-1" style={{ width: "100%" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function ProductCategoriesView({
  catRows, catLoading, catTab, setCatTab, catMetric, setCatMetric,
  catExpandedCategory, setCatExpandedCategory,
  catExpandedData, catExpandedLoading, fetchCatExpanded,
  vccCategories, selectedGA4, selectedGSC,
  dateLabel, cmpLabel,
}: ProductCatProps) {

  const getMetricVal = (r: CatRowType) => catMetric === "clicks" ? r.clicks : catMetric === "leads" ? r.leads : r.sessions;
  const getCmpVal = (r: CatRowType) => catMetric === "clicks" ? r.clicksCmp : catMetric === "leads" ? r.leadsCmp : r.sessionsCmp;

  const filtered = useMemo(() => {
    let rows = [...catRows];
    if (catTab === "growing")  rows = rows.filter((r) => (pctDelta(getMetricVal(r), getCmpVal(r)) ?? 0) > 0);
    if (catTab === "decaying") rows = rows.filter((r) => (pctDelta(getMetricVal(r), getCmpVal(r)) ?? 0) < 0);
    return rows.sort((a, b) => getMetricVal(b) - getMetricVal(a));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catRows, catTab, catMetric]);

  const maxMetric = useMemo(() => Math.max(1, ...filtered.map(getMetricVal)), [filtered, catMetric]);
  const maxLeads  = useMemo(() => Math.max(1, ...catRows.map((r) => r.leads)), [catRows]);

  const handleRowClick = (row: CatRowType) => {
    if (catExpandedCategory === row.category) {
      setCatExpandedCategory(null);
    } else {
      setCatExpandedCategory(row.category);
      const cat = vccCategories.find((c) => c.name === row.category);
      if (cat) void fetchCatExpanded(cat);
    }
  };

  if (!selectedGA4 || !selectedGSC) return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
      <Layers size={28} className="text-purple-200 mx-auto mb-3" />
      <p className="text-sm text-gray-400">Connect both a GA4 property and a Search Console property to view Product Categories.</p>
    </div>
  );

  // Summary KPIs
  const totalClicks   = catRows.reduce((s, r) => s + r.clicks, 0);
  const totalLeads    = catRows.reduce((s, r) => s + r.leads, 0);
  const totalSessions = catRows.reduce((s, r) => s + r.sessions, 0);
  const totalClicksCmp   = catRows.reduce((s, r) => s + r.clicksCmp, 0);
  const totalLeadsCmp    = catRows.reduce((s, r) => s + r.leadsCmp, 0);
  const totalSessionsCmp = catRows.reduce((s, r) => s + r.sessionsCmp, 0);

  const growingCount  = catRows.filter((r) => (pctDelta(getMetricVal(r), getCmpVal(r)) ?? 0) > 0).length;
  const decayingCount = catRows.filter((r) => (pctDelta(getMetricVal(r), getCmpVal(r)) ?? 0) < 0).length;

  const metricLabel = { clicks: "GSC Clicks", leads: "FSP Referrals", sessions: "Organic Sessions" };
  const metricColor = { clicks: "#5b4fa8", leads: "#059669", sessions: "#0ea5e9" };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 rounded-xl p-2"><Layers size={16} className="text-[#5b4fa8]" /></div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Product Categories</h2>
          <p className="text-xs text-gray-400">SEO performance by category · organic sessions · /free-selling-pack referrals · vs previous period</p>
        </div>
      </div>

      {/* Date range bar */}
      <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5b4fa8]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {dateLabel}
        </div>
        {cmpLabel && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-gray-300">vs</span>
            <span className="font-medium text-gray-600">{cmpLabel}</span>
            <span className="text-[10px] bg-purple-100 text-[#5b4fa8] font-semibold px-1.5 py-0.5 rounded-full">previous period</span>
          </div>
        )}
        <div className="ml-auto text-[10px] text-gray-400">GSC dates · GA4 organic sessions · /free-selling-pack referrals</div>
      </div>

      {/* KPI summary row */}
      {!catLoading && catRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <HoverTooltip tip="Total GSC organic clicks across all product categories in the current period.">
            <KpiCard label="Total Clicks" value={totalClicks.toLocaleString()} icon={MousePointerClick} cmpValue={totalClicksCmp} />
          </HoverTooltip>
          <HoverTooltip tip="Sessions that landed on /free-selling-pack having come from a page in this category — a direct measure of which categories drive pack requests.">
            <KpiCard label="FSP Referrals" value={totalLeads.toLocaleString()} icon={TrendingUp} cmpValue={totalLeadsCmp} />
          </HoverTooltip>
          <HoverTooltip tip="Organic search sessions from GA4 across all category pages.">
            <KpiCard label="Organic Sessions" value={totalSessions.toLocaleString()} icon={Users} cmpValue={totalSessionsCmp} />
          </HoverTooltip>
          <HoverTooltip tip="How many categories are growing vs decaying in the selected metric vs the previous period.">
            <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm">
              <div className="flex gap-4">
                <div>
                  <p className="text-xl font-bold text-emerald-600">{growingCount}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Growing</p>
                </div>
                <div className="w-px bg-gray-100" />
                <div>
                  <p className="text-xl font-bold text-red-500">{decayingCount}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Decaying</p>
                </div>
              </div>
            </div>
          </HoverTooltip>
        </div>
      )}

      {/* Controls: tab + metric toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Growing/Decaying/All tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["all", "growing", "decaying"] as const).map((t) => (
            <button key={t} onClick={() => setCatTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${catTab === t ? "bg-white text-[#5b4fa8] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "all" ? `All (${catRows.length})` : t === "growing" ? `▲ Growing (${growingCount})` : `▼ Decaying (${decayingCount})`}
            </button>
          ))}
        </div>
        {/* Metric toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["clicks", "leads", "sessions"] as const).map((m) => (
            <button key={m} onClick={() => setCatMetric(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${catMetric === m ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              style={catMetric === m ? { color: metricColor[m] } : {}}>
              {metricLabel[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex">
          <div className="w-1 bg-[#5b4fa8] rounded-l-2xl shrink-0" />
          <div className="flex-1 overflow-x-auto">
            {catLoading ? (
              <div className="flex items-center justify-center py-16 gap-2">
                <div className="w-5 h-5 border-2 border-purple-200 border-t-[#5b4fa8] rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading category data…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">No data yet. Make sure both GA4 and GSC are connected.</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="py-3 pl-4 w-8" />
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">Category</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 whitespace-nowrap" style={{ color: metricColor[catMetric] }}>{metricLabel[catMetric]}</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">Impressions</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">Avg Position</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">CTR</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 text-emerald-600">FSP Refs</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500 text-sky-600">Organic Sessions</th>
                    <th className="py-3 px-3 text-left font-semibold text-gray-500">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const isExpanded = catExpandedCategory === row.category;
                    const metVal   = getMetricVal(row);
                    const metCmp   = getCmpVal(row);
                    const delta    = pctDelta(metVal, metCmp);
                    const isGrow   = (delta ?? 0) > 0;
                    const isDecay  = (delta ?? 0) < 0;

                    return (
                      <>
                        <tr key={row.category}
                          className={`border-b border-gray-50 cursor-pointer hover:bg-purple-50/40 transition-colors ${isExpanded ? "bg-purple-50/60" : i % 2 === 0 ? "" : "bg-gray-50/20"}`}
                          onClick={() => handleRowClick(row)}>
                          <td className="py-3 pl-4 pr-1 w-8">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isExpanded ? "bg-[#5b4fa8] border-[#5b4fa8]" : "border-gray-200"}`}>
                              {isExpanded ? <ChevronUp size={11} className="text-white" /> : <ChevronDown size={11} className="text-gray-400" />}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${isExpanded ? "text-[#5b4fa8]" : "text-gray-800"}`}>{row.category}</span>
                              {isGrow  && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">▲ Growing</span>}
                              {isDecay && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">▼ Decaying</span>}
                            </div>
                            <SparkBar value={metVal} max={maxMetric} color={metricColor[catMetric]} />
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-800">
                            {metVal.toLocaleString()}
                            <CatDelta cur={metVal} cmp={metCmp} />
                          </td>
                          <td className="py-3 px-3 text-gray-600">{row.impressions.toLocaleString()}</td>
                          <td className="py-3 px-3"><PosBadge pos={row.position || 0} /></td>
                          <td className="py-3 px-3 text-gray-600">{row.position > 0 ? `${(row.ctr * 100).toFixed(1)}%` : "—"}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-emerald-600" title="Sessions referred to /free-selling-pack from this category">{row.leads.toLocaleString()}</span>
                            <CatDelta cur={row.leads} cmp={row.leadsCmp} />
                            <SparkBar value={row.leads} max={maxLeads} color="#059669" />
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-sky-600">{row.sessions.toLocaleString()}</span>
                            <CatDelta cur={row.sessions} cmp={row.sessionsCmp} />
                          </td>
                          <td className="py-3 px-3">
                            {delta !== null ? (
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                                isGrow ? "bg-emerald-50 text-emerald-600" : isDecay ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"
                              }`}>
                                {isGrow ? "▲" : isDecay ? "▼" : "—"} {Math.abs(delta).toFixed(0)}%
                              </div>
                            ) : <span className="text-gray-300 text-[10px]">No prev data</span>}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${row.category}-expanded`}>
                            <td colSpan={9} className="bg-purple-50/30 px-8 py-4 border-b border-purple-100">
                              <p className="text-xs font-semibold text-[#5b4fa8] mb-3">Pages in "{row.category}"</p>
                              {catExpandedLoading ? (
                                <div className="flex items-center gap-2 py-2">
                                  <div className="w-4 h-4 border border-purple-200 border-t-[#5b4fa8] rounded-full animate-spin" />
                                  <span className="text-xs text-gray-400">Loading pages…</span>
                                </div>
                              ) : catExpandedData.length === 0 ? (
                                <p className="text-xs text-gray-400">No page data found for this category.</p>
                              ) : (
                                <table className="w-full text-xs border border-gray-100 rounded-xl overflow-hidden">
                                  <thead>
                                    <tr className="bg-white border-b border-gray-100">
                                      <th className="py-2 px-3 text-left font-semibold text-gray-400">Page URL</th>
                                      <th className="py-2 px-3 text-left font-semibold text-gray-400">Clicks</th>
                                      <th className="py-2 px-3 text-left font-semibold text-gray-400">Impressions</th>
                                      <th className="py-2 px-3 text-left font-semibold text-gray-400">Position</th>
                                      <th className="py-2 px-3 text-left font-semibold text-gray-400">CTR</th>
                                      <th className="py-2 px-3 text-left font-semibold text-emerald-600">FSP Refs</th>
                                      <th className="py-2 px-3 text-left font-semibold text-sky-600">Org. Sessions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {catExpandedData.map((p, pi) => (
                                      <tr key={pi} className="border-b border-gray-50 last:border-0 hover:bg-purple-50/20">
                                        <td className="py-2 px-3 text-[#5b4fa8] max-w-[340px] truncate font-medium" title={p.page}>
                                          <UrlLink url={p.page} slug={p.page.replace(/^https?:\/\/[^/]+/, "")} />
                                        </td>
                                        <td className="py-2 px-3 font-semibold text-gray-800">{p.clicks.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-gray-600">{p.impressions.toLocaleString()}</td>
                                        <td className="py-2 px-3"><PosBadge pos={p.position} /></td>
                                        <td className="py-2 px-3 text-gray-600">{(p.ctr * 100).toFixed(1)}%</td>
                                        <td className="py-2 px-3 font-semibold text-emerald-600" title="Sessions referred to /free-selling-pack from this page">{p.leads}</td>
                                        <td className="py-2 px-3 font-semibold text-sky-600">{p.sessions}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {!catLoading && catRows.length > 0 && (
          <div className="px-5 py-2.5 border-t border-gray-100 flex justify-between items-center">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {catRows.length} categories · {catTab !== "all" ? catTab : "all"}
            </p>
            <p className="text-xs text-gray-400">Comparison: previous period of same length</p>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Brand vs Non-Brand View ───────────────────────────────────────────────────

interface BrandDataType {
  brandedClicks: number; nonBrandedClicks: number;
  brandedImpressions: number; nonBrandedImpressions: number;
  brandedCtr: number; nonBrandedCtr: number;
  brandedPosition: number; nonBrandedPosition: number;
  daily: { date: string; branded: number; nonBranded: number }[];
  brandedQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  nonBrandedQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  brandedPages: { page: string; clicks: number; impressions: number }[];
  nonBrandedPages: { page: string; clicks: number; impressions: number }[];
  brandedLeads: number; nonBrandedLeads: number;
  brandedSessions: number; nonBrandedSessions: number;
  brandedClicksCmp: number; nonBrandedClicksCmp: number;
  brandedLeadsCmp: number; nonBrandedLeadsCmp: number;
  brandedSessionsCmp: number; nonBrandedSessionsCmp: number;
}

interface BrandViewProps {
  brandData: BrandDataType | null;
  brandLoading: boolean;
  brandTab: "overview" | "queries" | "pages" | "leads";
  setBrandTab: (t: "overview" | "queries" | "pages" | "leads") => void;
  dateLabel: string;
  cmpLabel: string;
  selectedGSC: string;
}


function BrandPct({ branded, nonBranded }: { branded: number; nonBranded: number }) {
  const total = branded + nonBranded || 1;
  const bPct = Math.round((branded / total) * 100);
  const nbPct = 100 - bPct;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-24 text-right font-semibold text-[#5b4fa8]">{bPct}% Branded</span>
        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="h-full bg-[#5b4fa8] rounded-l-full transition-all" style={{ width: `${bPct}%` }} />
          <div className="h-full bg-emerald-400 rounded-r-full transition-all" style={{ width: `${nbPct}%` }} />
        </div>
        <span className="w-28 font-semibold text-emerald-600">{nbPct}% Non-Branded</span>
      </div>
    </div>
  );
}

function BVNBKpi({ label, branded, nonBranded, brandedCmp, nonBrandedCmp, icon: Icon, brandColor = "#5b4fa8", nbColor = "#059669" }: {
  label: string; branded: number; nonBranded: number;
  brandedCmp?: number; nonBrandedCmp?: number;
  icon: React.ElementType; brandColor?: string; nbColor?: string;
}) {
  const total = branded + nonBranded;
  const bPct = total > 0 ? Math.round((branded / total) * 100) : 0;
  const bDelta = brandedCmp ? ((branded - brandedCmp) / Math.abs(brandedCmp)) * 100 : null;
  const nbDelta = nonBrandedCmp ? ((nonBranded - nonBrandedCmp) / Math.abs(nonBrandedCmp)) * 100 : null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="rounded-xl p-2 bg-purple-50"><Icon size={14} className="text-[#5b4fa8]" /></div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="ml-auto text-xs font-bold text-gray-400">{total.toLocaleString()} total</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 rounded-xl p-3">
          <p className="text-lg font-bold" style={{ color: brandColor }}>{branded.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Branded · {bPct}%</p>
          {bDelta !== null && (
            <p className={`text-[10px] font-bold mt-1 ${bDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {bDelta >= 0 ? "+" : ""}{bDelta.toFixed(0)}% vs prev
            </p>
          )}
        </div>
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-lg font-bold" style={{ color: nbColor }}>{nonBranded.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Non-Branded · {100 - bPct}%</p>
          {nbDelta !== null && (
            <p className={`text-[10px] font-bold mt-1 ${nbDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {nbDelta >= 0 ? "+" : ""}{nbDelta.toFixed(0)}% vs prev
            </p>
          )}
        </div>
      </div>
      <BrandPct branded={branded} nonBranded={nonBranded} />
    </div>
  );
}

function BrandVsNonBrandView({ brandData, brandLoading, brandTab, setBrandTab, dateLabel, cmpLabel, selectedGSC }: BrandViewProps) {

  if (!selectedGSC) return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
      <BarChart2 size={28} className="text-purple-200 mx-auto mb-3" />
      <p className="text-sm text-gray-400">Connect a Search Console property to view brand vs non-brand data.</p>
    </div>
  );

  const TABS: { key: "overview" | "queries" | "pages" | "leads"; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "queries", label: "Queries" },
    { key: "pages", label: "Pages" },
    { key: "leads", label: "FSP Referrals & Sessions" },
  ];

  const BRAND_COLOR = "#5b4fa8";
  const NB_COLOR    = "#059669";

  const maxDailyBranded    = brandData ? Math.max(1, ...brandData.daily.map((d) => d.branded)) : 1;
  const maxDailyNonBranded = brandData ? Math.max(1, ...brandData.daily.map((d) => d.nonBranded)) : 1;
  const maxDaily = Math.max(maxDailyBranded, maxDailyNonBranded);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 rounded-xl p-2"><BarChart2 size={16} className="text-[#5b4fa8]" /></div>
        <div>
          <h2 className="text-sm font-bold text-gray-900">Brand vs Non-Brand Traffic</h2>
          <p className="text-xs text-gray-400">Splitting queries containing "cash cow" from non-branded organic search · GSC + GA4</p>
        </div>
      </div>

      {/* Date bar */}
      <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5b4fa8]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {dateLabel}
        </div>
        {cmpLabel && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="text-gray-300">vs</span>
            <span className="font-medium text-gray-600">{cmpLabel}</span>
            <span className="text-[10px] bg-purple-100 text-[#5b4fa8] font-semibold px-1.5 py-0.5 rounded-full">previous period</span>
          </div>
        )}
        <div className="flex items-center gap-3 ml-auto text-[10px] font-semibold">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: BRAND_COLOR }} /> Branded (contains "cash cow")</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: NB_COLOR }} /> Non-Branded</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setBrandTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${brandTab === t.key ? "bg-white text-[#5b4fa8] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {brandLoading && (
        <div className="flex items-center justify-center py-16 gap-2">
          <div className="w-5 h-5 border-2 border-purple-200 border-t-[#5b4fa8] rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Fetching brand data…</span>
        </div>
      )}

      {!brandLoading && !brandData && (
        <div className="py-12 text-center text-sm text-gray-400">No data loaded yet.</div>
      )}

      {!brandLoading && brandData && brandTab === "overview" && (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BVNBKpi label="GSC Clicks" branded={brandData.brandedClicks} nonBranded={brandData.nonBrandedClicks} brandedCmp={brandData.brandedClicksCmp} nonBrandedCmp={brandData.nonBrandedClicksCmp} icon={MousePointerClick} />
            <BVNBKpi label="Organic Sessions" branded={brandData.brandedSessions} nonBranded={brandData.nonBrandedSessions} brandedCmp={brandData.brandedSessionsCmp} nonBrandedCmp={brandData.nonBrandedSessionsCmp} icon={Users} />
            <BVNBKpi label="FSP Referrals" branded={brandData.brandedLeads} nonBranded={brandData.nonBrandedLeads} brandedCmp={brandData.brandedLeadsCmp} nonBrandedCmp={brandData.nonBrandedLeadsCmp} icon={TrendingUp} nbColor="#059669" />
          </div>

          {/* Position + CTR comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Average Position</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28">Branded</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (brandData.brandedPosition / 50) * 100)}%`, backgroundColor: BRAND_COLOR }} />
                  </div>
                  <PosBadge pos={brandData.brandedPosition} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28">Non-Branded</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (brandData.nonBrandedPosition / 50) * 100)}%`, backgroundColor: NB_COLOR }} />
                  </div>
                  <PosBadge pos={brandData.nonBrandedPosition} />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-4">Lower position = closer to #1. Branded queries typically rank higher.</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Average CTR</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28">Branded</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, brandData.brandedCtr * 100 * 3)}%`, backgroundColor: BRAND_COLOR }} />
                  </div>
                  <span className="text-xs font-bold text-[#5b4fa8] w-12 text-right">{(brandData.brandedCtr * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28">Non-Branded</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, brandData.nonBrandedCtr * 100 * 3)}%`, backgroundColor: NB_COLOR }} />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 w-12 text-right">{(brandData.nonBrandedCtr * 100).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-4">Branded queries typically have higher CTR due to user intent and familiarity.</p>
            </div>
          </div>

          {/* Daily trend chart */}
          {brandData.daily.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Daily Clicks — Branded vs Non-Branded</h3>
              <p className="text-xs text-gray-400 mb-4">Estimated daily split based on overall brand ratio</p>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-0.5" style={{ minWidth: `${brandData.daily.length * 14}px`, height: "120px" }}>
                  {brandData.daily.map((d, i) => {
                    const bH = Math.round((d.branded / maxDaily) * 110);
                    const nbH = Math.round((d.nonBranded / maxDaily) * 110);
                    return (
                      <div key={i} className="flex flex-col items-center gap-0" style={{ flex: 1, minWidth: "8px" }} title={`${d.date}: ${d.branded} branded, ${d.nonBranded} non-branded`}>
                        <div className="w-full flex flex-col justify-end gap-0" style={{ height: "110px" }}>
                          <div className="w-full rounded-t-sm opacity-90" style={{ height: `${nbH}px`, backgroundColor: NB_COLOR }} />
                          <div className="w-full" style={{ height: `${bH}px`, backgroundColor: BRAND_COLOR }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 mt-1 px-0.5">
                  <span>{brandData.daily[0]?.date}</span>
                  <span>{brandData.daily[Math.floor(brandData.daily.length / 2)]?.date}</span>
                  <span>{brandData.daily[brandData.daily.length - 1]?.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: BRAND_COLOR }} /> Branded</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: NB_COLOR }} /> Non-Branded</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!brandLoading && brandData && brandTab === "queries" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Branded queries */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex">
              <div className="w-1 shrink-0 rounded-l-2xl" style={{ backgroundColor: BRAND_COLOR }} />
              <div className="flex-1">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800">Top Branded Queries</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">{brandData.brandedQueries.length} queries · {brandData.brandedClicks.toLocaleString()} total clicks</p>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="py-2 px-4 text-left font-semibold text-gray-400">Query</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Clicks</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Pos.</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-400">CTR</th>
                  </tr></thead>
                  <tbody>
                    {brandData.brandedQueries.slice(0, 15).map((q, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-purple-50/30">
                        <td className="py-2 px-4 font-medium text-gray-700 max-w-[180px] truncate" title={q.query}>{q.query}</td>
                        <td className="py-2 px-3 font-semibold" style={{ color: BRAND_COLOR }}>{q.clicks.toLocaleString()}</td>
                        <td className="py-2 px-3"><PosBadge pos={q.position} /></td>
                        <td className="py-2 px-3 text-gray-500">{(q.ctr * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Non-branded queries */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex">
              <div className="w-1 shrink-0 rounded-l-2xl" style={{ backgroundColor: NB_COLOR }} />
              <div className="flex-1">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800">Top Non-Branded Queries</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">{brandData.nonBrandedQueries.length} queries · {brandData.nonBrandedClicks.toLocaleString()} total clicks</p>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="py-2 px-4 text-left font-semibold text-gray-400">Query</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Clicks</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-400">Pos.</th>
                    <th className="py-2 px-3 text-left font-semibold text-gray-400">CTR</th>
                  </tr></thead>
                  <tbody>
                    {brandData.nonBrandedQueries.slice(0, 15).map((q, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-emerald-50/30">
                        <td className="py-2 px-4 font-medium text-gray-700 max-w-[180px] truncate" title={q.query}>{q.query}</td>
                        <td className="py-2 px-3 font-semibold text-emerald-600">{q.clicks.toLocaleString()}</td>
                        <td className="py-2 px-3"><PosBadge pos={q.position} /></td>
                        <td className="py-2 px-3 text-gray-500">{(q.ctr * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {!brandLoading && brandData && brandTab === "pages" && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Top Pages by GSC Clicks</h3>
            <p className="text-xs text-gray-400 mt-1">Page-level GSC data — brand split applies at the query level. Pages receiving mostly branded traffic will have high clicks from navigational intent.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-50 bg-gray-50/60">
                <th className="py-3 px-5 text-left font-semibold text-gray-400">Page</th>
                <th className="py-3 px-3 text-left font-semibold text-gray-400">Clicks</th>
                <th className="py-3 px-3 text-left font-semibold text-gray-400">Impressions</th>
                <th className="py-3 px-3 text-left font-semibold text-gray-400">Branded share (est.)</th>
              </tr></thead>
              <tbody>
                {brandData.brandedPages.map((p, i) => {
                  const totalClicks = brandData.brandedClicks + brandData.nonBrandedClicks || 1;
                  const bRatio = brandData.brandedClicks / totalClicks;
                  const estBranded = Math.round(p.clicks * bRatio);
                  const estNb = p.clicks - estBranded;
                  return (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-purple-50/20">
                      <td className="py-2.5 px-5 font-medium text-[#5b4fa8] max-w-[380px] truncate" title={p.page}>
                        <UrlLink url={p.page} slug={p.page.replace(/^https?:\/\/[^/]+/, "")} />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-800">{p.clicks.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-gray-500">{p.impressions.toLocaleString()}</td>
                      <td className="py-2.5 px-3 w-64">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                            <div className="h-full" style={{ width: `${bRatio * 100}%`, backgroundColor: BRAND_COLOR }} />
                            <div className="h-full" style={{ width: `${(1 - bRatio) * 100}%`, backgroundColor: NB_COLOR }} />
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">{estBranded} / {estNb}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 bg-amber-50/50">
            <p className="text-[10px] text-amber-700">Note: GSC doesn't expose per-page brand splits directly. Branded share is estimated using the overall query-level brand ratio. For exact splits, filter the Queries tab by your brand terms.</p>
          </div>
        </div>
      )}

      {!brandLoading && brandData && brandTab === "leads" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BVNBKpi label="Free Selling Pack Referrals" branded={brandData.brandedLeads} nonBranded={brandData.nonBrandedLeads} brandedCmp={brandData.brandedLeadsCmp} nonBrandedCmp={brandData.nonBrandedLeadsCmp} icon={TrendingUp} />
            <BVNBKpi label="Organic Sessions" branded={brandData.brandedSessions} nonBranded={brandData.nonBrandedSessions} brandedCmp={brandData.brandedSessionsCmp} nonBrandedCmp={brandData.nonBrandedSessionsCmp} icon={Users} />
          </div>

          {/* Lead rate comparison */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Free Selling Pack Referral Rate — Branded vs Non-Branded</h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: "Branded", leads: brandData.brandedLeads, sessions: brandData.brandedSessions, color: BRAND_COLOR, bg: "bg-purple-50" },
                { label: "Non-Branded", leads: brandData.nonBrandedLeads, sessions: brandData.nonBrandedSessions, color: NB_COLOR, bg: "bg-emerald-50" },
              ].map((seg) => {
                const rate = seg.sessions > 0 ? ((seg.leads / seg.sessions) * 100).toFixed(2) : "0.00";
                return (
                  <div key={seg.label} className={`${seg.bg} rounded-xl p-4 text-center`}>
                    <p className="text-2xl font-bold" style={{ color: seg.color }}>{rate}%</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{seg.label} FSP referral rate</p>
                    <p className="text-[10px] text-gray-400 mt-2">{seg.leads.toLocaleString()} FSP refs from {seg.sessions.toLocaleString()} sessions</p>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-4 border-t border-gray-100 pt-3">FSP referral count is the actual number of sessions that landed on /free-selling-pack after visiting a branded or non-branded referring page, from GA4 pageReferrer data. Sessions are split using the overall GSC brand click ratio.</p>
          </div>
        </div>
      )}
    </div>
  );
}


function printElementAsPdf(el: HTMLElement, title: string) {
  const w = window.open("", "_blank", "width=1024,height=900");
  if (!w) return;
  const styleNodes = Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]')
  )
    .map((n) => n.outerHTML)
    .join("\n");
  const safeTitle = title.replace(/[<>]/g, "");
  w.document.open();
  w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
${styleNodes}
<style>
  @page { size: A4; margin: 12mm; }
  body { padding: 16px; font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #111; }
  [data-deco-ui], button { display: none !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
  .print-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
  .print-meta { font-size: 11px; color: #666; margin-bottom: 16px; }
</style>
</head>
<body>
<div class="print-title">${safeTitle}</div>
<div class="print-meta">Generated ${new Date().toLocaleString()}</div>
${el.outerHTML}
</body>
</html>`);
  w.document.close();
  const trigger = () => {
    try { w.focus(); w.print(); } catch { /* ignore */ }
  };
  if (w.document.readyState === "complete") {
    setTimeout(trigger, 350);
  } else {
    w.addEventListener("load", () => setTimeout(trigger, 350));
  }
}


function SlackCopyButton({ buildMessage }: { buildMessage: () => string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const msg = buildMessage();
    if (!msg) return;
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
        copied ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-gray-200 text-gray-600 hover:border-yellow-400 hover:text-yellow-700"
      }`}
    >
      {copied ? "✓ Copied!" : "📋 Copy for Slack"}
    </button>
  );
}

function SlackPreview({ buildMessage }: { buildMessage: () => string }) {
  const [copied, setCopied] = useState(false);
  const msg = buildMessage();
  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="bg-gray-900 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Slack Preview</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
            copied ? "bg-yellow-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{msg}</pre>
    </div>
  );
}

export default function App() {
  const [accessToken, setAccessToken]   = useState("");
  const [isLoggingIn, setIsLoggingIn]   = useState(false);
  const [googleReady, setGoogleReady]   = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [activeView, setActiveView]     = useState<ActiveView>(() => (localStorage.getItem(LS_ACTIVE_VIEW) as ActiveView) ?? "ga4");
  const [perfPieFilter, setPerfPieFilter] = useState<"high"|"med"|"low"|null>(null);
  const [perfSubFilter, setPerfSubFilter] = useState<string|null>(null);
  const [perfIntentFilter, setPerfIntentFilter] = useState<"informational"|"transactional"|"commercial"|"navigational"|null>(null);
  const [queryCountSearch, setQueryCountSearch] = useState("");

  const [ga4Properties, setGa4Properties] = useState<{ value: string; label: string }[]>([]);
  const [selectedGA4, setSelectedGA4]     = useState(() => localStorage.getItem(LS_SELECTED_GA4) ?? "");
  const [gscProperties, setGscProperties] = useState<{ value: string; label: string }[]>([]);
  const [selectedGSC, setSelectedGSC]     = useState(() => localStorage.getItem(LS_SELECTED_GSC) ?? "");
  // Second GA4 property for Daily Snapshot (Arcavindi)
  const [avGA4Id, setAvGA4Id] = useState("");
  const [avGscId,  setAvGscId]  = useState("");

  // ── Auto-decorate every <table> with a Copy button and every <section> with a Download-PDF button ──
  useEffect(() => {
    let raf = 0;
    const decorate = () => {
      document.querySelectorAll<HTMLTableElement>("table:not([data-tbl-deco])").forEach((tbl) => {
        tbl.setAttribute("data-tbl-deco", "1");
        const bar = document.createElement("div");
        bar.className = "flex justify-end mb-1 print:hidden";
        bar.setAttribute("data-deco-ui", "1");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "📋 Copy table";
        btn.className =
          "text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors";
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await copyTableToClipboard(tbl);
          const orig = "📋 Copy table";
          btn.textContent = "✓ Copied";
          setTimeout(() => { btn.textContent = orig; }, 1500);
        });
        bar.appendChild(btn);
        tbl.parentElement?.insertBefore(bar, tbl);
      });
      document.querySelectorAll<HTMLElement>("section:not([data-sec-deco])").forEach((sec) => {
        const h2 = sec.querySelector("h2");
        if (!h2) return;
        sec.setAttribute("data-sec-deco", "1");
        const title = (h2.textContent || "Section").trim();
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "⬇ Download PDF";
        btn.setAttribute("data-deco-ui", "1");
        btn.className =
          "ml-2 text-[10px] px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 align-middle print:hidden";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          printElementAsPdf(sec, title);
        });
        h2.appendChild(btn);
      });
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; decorate(); });
    };
    decorate();
    const obs = new MutationObserver((mutations) => {
      // Ignore mutations caused solely by our own injected UI nodes
      const meaningful = mutations.some((m) =>
        Array.from(m.addedNodes).some((n) => !(n instanceof HTMLElement) || !n.hasAttribute("data-deco-ui"))
      );
      if (meaningful) schedule();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // GA4 data
  const [ga4Daily, setGa4Daily]               = useState<DailyGA4[]>([]);
  const [ga4DailyCmp, setGa4DailyCmp]         = useState<DailyGA4[]>([]);
  const [ga4Series, setGa4Series]             = useState<SeriesRow[]>([]);
  const [ga4SeriesKeys, setGa4SeriesKeys]     = useState<string[]>([]);
  const [ga4Channels, setGa4Channels]         = useState<ChannelRow[]>([]);
  const [ga4ChannelsCmp, setGa4ChannelsCmp]   = useState<ChannelRow[]>([]);
  const [ga4AiSources, setGa4AiSources]       = useState<AiSourceRow[]>([]);
  const [ga4AiSourcesCmp, setGa4AiSourcesCmp] = useState<AiSourceRow[]>([]);
  const [ga4LandingPages, setGa4LandingPages] = useState<LandingPageRow[]>([]);
  const [ga4LandingPagesCmp, setGa4LandingPagesCmp] = useState<LandingPageRow[]>([]);
  const [landingPageFilter, setLandingPageFilter] = useState("");
  const [ga4Loading, setGa4Loading]           = useState(false);

  // GSC data
  const [gscDaily, setGscDaily]           = useState<DailyGSC[]>([]);
  const [gscDailyCmp, setGscDailyCmp]     = useState<DailyGSC[]>([]);
  const [gscSeries, setGscSeries]         = useState<SeriesRow[]>([]);
  const [gscSeriesKeys, setGscSeriesKeys] = useState<string[]>([]);
  const [gscQueries, setGscQueries]       = useState<QueryRow[]>([]);
  const [gscQueriesCmp, setGscQueriesCmp] = useState<QueryRow[]>([]);
  /** Always query dimension (up to API row cap) — used for SEO Opportunities, independent of GSC table dimension. */
  const [gscOpportunityQueries, setGscOpportunityQueries]     = useState<QueryRow[]>([]);
  const [gscOpportunityQueriesCmp, setGscOpportunityQueriesCmp] = useState<QueryRow[]>([]);
  const [gscPages, setGscPages]             = useState<PagePerfRow[]>([]);
  const [gscBuriedPageQueries, setGscBuriedPageQueries] = useState<{ page: string; query: string; impressions: number; clicks: number; position: number }[]>([]);
  /** Full unfiltered page+query bulk data for the current period — used for the Query Counting section. */
  const [gscPageQueryAll, setGscPageQueryAll] = useState<{ page: string; query: string; clicks: number; impressions: number }[]>([]);
  /** Full unfiltered page+query bulk data for the comparison period — used for the Query Counting section. */
  const [gscPageQueryAllCmp, setGscPageQueryAllCmp] = useState<{ page: string; query: string; clicks: number; impressions: number }[]>([]);

  // ── Non-Brand SEO section state ────────────────────────────────────────────
  /** Editable brand-term list used by the Non-Brand SEO section. Persisted to localStorage. */
  const [nbsBrandTerms, setNbsBrandTerms] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_BRAND_TERMS);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.every((s) => typeof s === "string")) return arr; }
    } catch { /* ignore */ }
    return NBSEO_DEFAULT_BRAND_TERMS;
  });
  /** Last 5 changes to the brand-term list. Stored as { ts, terms } entries. */
  const [nbsTermsHistory, setNbsTermsHistory] = useState<{ ts: number; terms: string[] }[]>(() => {
    try {
      const raw = localStorage.getItem(LS_BRAND_TERMS_HISTORY);
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
    } catch { /* ignore */ }
    return [];
  });
  /** Inputs for the brand-classifier editor UI. */
  const [nbsTermInput, setNbsTermInput] = useState("");
  const [nbsTestQuery, setNbsTestQuery] = useState("");
  /** NB SEO data — pre-aggregated per-landing-page numbers for current + previous + YoY periods. */
  interface NbsLandingPageRow {
    page: string;             // landing page URL
    // GSC current period (per landing page, queries aggregated)
    brandImpressions: number;
    nonBrandImpressions: number;
    nonBrandRatio: number;    // impression-weighted: nbImpr / (bImpr + nbImpr)
    // GA4 current period
    orgSessions: number;      // total Organic Search sessions where this was the entry page
    fspReferrers: number;     // sessions on /free-selling-pack that came from this referrer page
    // Modelled outputs
    nbReferrers: number;      // fspReferrers × nonBrandRatio
    brandReferrers: number;   // fspReferrers × (1 - nonBrandRatio)
    // Comparison period (previous 7 days)
    orgSessionsCmp: number;
    fspReferrersCmp: number;
    nbReferrersCmp: number;
    brandReferrersCmp: number;
    nonBrandRatioCmp: number;
    // Flags
    usedSiteWideRatio: boolean;  // true when this page had no GSC impressions → fell back to site-wide ratio
    confidence: "high" | "medium" | "low";
  }
  interface NbsDataType {
    rows: NbsLandingPageRow[];
    totals: {
      orgSessions: number;
      fspReferrers: number;
      nbReferrers: number;
      brandReferrers: number;
      orgSessionsCmp: number;
      fspReferrersCmp: number;
      nbReferrersCmp: number;
      brandReferrersCmp: number;
      brandImpressions: number;
      nonBrandImpressions: number;
      siteWideNbRatio: number;     // impression-weighted, /items-we-buy/ subset only
    };
    period: { start: string; end: string };
    cmpPeriod: { start: string; end: string };
    fetchedAt: number;
  }
  const [nbsData, setNbsData] = useState<NbsDataType | null>(null);
  const [nbsLoading, setNbsLoading] = useState(false);
  const [nbsExpandedRow, setNbsExpandedRow] = useState<string | null>(null);
  const [nbsShowTransparency, setNbsShowTransparency] = useState(false);

  // ── Non-Brand Sign Ups section state ───────────────────────────────────────
  /** Same brand/non-brand modelling as NB SEO, but click-weighted, whole-site, and
   *  using GA4 generate_lead key-event sessions involving /free-selling-pack. */
  interface NbsuLandingPageRow {
    page: string;             // landing page URL
    // GSC current period (per landing page, queries aggregated)
    brandClicks: number;
    nonBrandClicks: number;
    nonBrandRatio: number;    // click-weighted: nbClicks / (bClicks + nbClicks)
    // GA4 current period
    orgSessions: number;      // total Organic Search sessions where this was the entry page
    fspLeads: number;         // sessions that landed here, visited /free-selling-pack and fired generate_lead
    // Modelled outputs
    nbLeads: number;          // fspLeads × nonBrandRatio
    brandLeads: number;       // fspLeads × (1 - nonBrandRatio)
    // Comparison period
    orgSessionsCmp: number;
    fspLeadsCmp: number;
    nbLeadsCmp: number;
    brandLeadsCmp: number;
    nonBrandRatioCmp: number;
    // Flags
    usedSiteWideRatio: boolean;  // true when this page had no GSC clicks → fell back to site-wide ratio
    confidence: "high" | "medium" | "low";
  }
  interface NbsuDataType {
    rows: NbsuLandingPageRow[];
    totals: {
      orgSessions: number;
      fspLeads: number;
      nbLeads: number;
      brandLeads: number;
      orgSessionsCmp: number;
      fspLeadsCmp: number;
      nbLeadsCmp: number;
      brandLeadsCmp: number;
      brandClicks: number;
      nonBrandClicks: number;
      siteWideNbRatio: number;     // click-weighted, whole site
    };
    /** Raw [page, query] GSC rows for the period, already filtered to exclude ? URLs.
     *  Used to compute query-level winners/losers and per-page query-count movement. */
    queryPageRowsCur: { page: string; query: string; clicks: number; impressions: number; position: number; cls: "brand" | "nonBrand" }[];
    queryPageRowsCmp: { page: string; query: string; clicks: number; impressions: number; position: number; cls: "brand" | "nonBrand" }[];
    /** Daily series for the current period — clicks and sign-ups split by site-wide brand ratio.
     *  Used to render the brand vs non-brand trend chart. */
    daily: { date: string; brandClicks: number; nonBrandClicks: number; brandLeads: number; nonBrandLeads: number }[];
    period: { start: string; end: string };
    cmpPeriod: { start: string; end: string };
    fetchedAt: number;
  }
  /** Lightweight date filter for the NB Sign Ups section. Default = last 7 days vs previous 7. */
  interface NbsuDateFilter {
    dateRange:
      | "today"
      | "yesterday"
      | "thisWeek"      // this week (Sun → today)
      | "7"             // last 7 days
      | "lastWeek"      // last week (Sun → Sat)
      | "28"            // last 28 days
      | "30"            // last 30 days
      | "thisMonth"     // this month (1st → today)
      | "lastMonth"     // last calendar month
      | "90"            // last 90 days
      | "qtd"           // quarter to date
      | "thisYear"      // this year (Jan 1 → today)
      | "lastYear"      // last calendar year
      | "custom";
    customStart?: string;
    customEnd?: string;
    customCompareStart?: string;
    customCompareEnd?: string;
    comparison: "prev" | "prevYear" | "none";
  }
  const NBSU_DEFAULT_FILTER: NbsuDateFilter = { dateRange: "yesterday", comparison: "prev" };
  const [nbsuFilters, setNbsuFilters] = useState<NbsuDateFilter>(NBSU_DEFAULT_FILTER);
  const [nbsuFetchFilters, setNbsuFetchFilters] = useState<NbsuDateFilter>(NBSU_DEFAULT_FILTER);
  const [nbsuData, setNbsuData] = useState<NbsuDataType | null>(null);
  const [nbsuLoading, setNbsuLoading] = useState(false);
  const [nbsuShowTransparency, setNbsuShowTransparency] = useState(false);
  /** Toggle for the trend chart — clicks vs sign-ups. */
  const [nbsuTrendMetric, setNbsuTrendMetric] = useState<"clicks" | "leads">("clicks");
  /** Drill-down: when set, the landing-pages table is hidden and a query-list for this page
   *  is shown instead. `cls` controls whether brand or non-brand queries are listed. */
  const [nbsuDrill, setNbsuDrill] = useState<{ page: string; cls: "brand" | "nonBrand" } | null>(null);
  /** Expanded-row tracker for the query/url movement tables. Key format: `${tableId}::${rowKey}`. */
  const [nbsuExpanded, setNbsuExpanded] = useState<Set<string>>(new Set());
  /** NB Sign Ups forecast calculator — target % uplift in non-brand sign-ups (default 10). */
  const [nbsuForecastPct, setNbsuForecastPct] = useState<number>(10);
  const [queryCopyResults, setQueryCopyResults] = useState<Map<string, { text: string; queryHits: Map<string, boolean> }>>(new Map());
  const [queryCopyLoading, setQueryCopyLoading] = useState<Set<string>>(new Set());
  const [queryCopyPage, setQueryCopyPage] = useState<string>(""); // URL typed/selected by user
  const [queryCopyExpanded, setQueryCopyExpanded] = useState<string | null>(null);
  const [oppSort, setOppSort] = useState<{ col: OppSortCol; dir: SortDir }>({ col: "impressions", dir: "desc" });
  const [gscDevices, setGscDevices]       = useState<DeviceRow[]>([]);
  const [gscCountries, setGscCountries]   = useState<string[]>([]);
  const [gscCountryRows, setGscCountryRows]     = useState<CountryRow[]>([]);
  const [gscCountryRowsCmp, setGscCountryRowsCmp] = useState<CountryRow[]>([]);
  const [ga4CountryRows, setGa4CountryRows]     = useState<Ga4CountryRow[]>([]);
  const [ga4CountryRowsCmp, setGa4CountryRowsCmp] = useState<Ga4CountryRow[]>([]);
  const [gscLoading, setGscLoading]       = useState(false);

  const [ga4Filters, setGa4Filters] = useState<GA4Filters>({
    dateRange: "28", metrics: ["users"], channelFilter: [], deviceFilter: [], comparison: "prevYear",
  });
  const [gscFilters, setGscFilters] = useState<GSCFilters>({
    dateRange: "28", dimension: "query", queryFilter: "", queryFilterMode: "contains",
    countryFilter: [], deviceFilter: [],
    minClicks: "", minImpressions: "", minCtr: "", minPosition: "", maxPosition: "",
    sortBy: "clicks", sortDir: "desc", comparison: "prevYear",
  });

  // Debounced versions of filters that actually trigger API fetches
  const [ga4FetchFilters, setGa4FetchFilters] = useState<GA4Filters>({
    dateRange: "28", metrics: ["users"], channelFilter: [], deviceFilter: [], comparison: "prevYear",
  });
  const [gscFetchFilters, setGscFetchFilters] = useState<GSCFilters>({
    dateRange: "28", dimension: "query", queryFilter: "", queryFilterMode: "contains",
    countryFilter: [], deviceFilter: [],
    minClicks: "", minImpressions: "", minCtr: "", minPosition: "", maxPosition: "",
    sortBy: "clicks", sortDir: "desc", comparison: "prevYear",
  });

  /** When set, GA4 + GSC requests are scoped to this page path (contains match). */
  const [pageDrillPath, setPageDrillPath] = useState("");
  const [ga4TrendMetricFocus, setGa4TrendMetricFocus] = useState<MetricKey | null>(null);
  const [convEventName, setConvEventName] = useState("purchase");
  const [convEventList, setConvEventList] = useState<string[]>([]);
  const [convEventsLoading, setConvEventsLoading] = useState(false);
  const [convDaily, setConvDaily] = useState<{ date: string; count: number }[]>([]);
  const [convDailyCmp, setConvDailyCmp] = useState<{ date: string; count: number }[]>([]);
  const [convByPage, setConvByPage] = useState<{ page: string; count: number; users: number }[]>([]);
  const [convByDevice, setConvByDevice] = useState<{ device: string; count: number }[]>([]);
  const [convByChannel, setConvByChannel] = useState<{ channel: string; count: number }[]>([]);
  const [convByDayOfWeek, setConvByDayOfWeek] = useState<{ day: string; count: number }[]>([]);
  const [convLowPages, setConvLowPages] = useState<{ page: string; sessions: number; eventCount: number; rate: number }[]>([]);
  const [convAllEvents, setConvAllEvents] = useState<{ name: string; count: number }[]>([]);
  const [seoNoTraffic, setSeoNoTraffic] = useState<{ page: string; sessions: number }[]>([]);
  const [seoLowEngagement, setSeoLowEngagement] = useState<{ page: string; engagementRate: number; sessions: number }[]>([]);
  const [seo404Titles, setSeo404Titles] = useState<{ title: string; page: string; sessions: number }[]>([]);
  const [gscLinkQuery, setGscLinkQuery] = useState<string | null>(null);
  const [gscLinkPage, setGscLinkPage] = useState<string | null>(null);
  const [gscCrossPages, setGscCrossPages] = useState<QueryRow[]>([]);
  const [gscCrossQueries, setGscCrossQueries] = useState<QueryRow[]>([]);
  const [seoIssuesLoading, setSeoIssuesLoading] = useState(false);

  // ── GSC Opportunities table state ──────────────────────────────────────────
  const [oppTableMode, setOppTableMode] = useState<"queries" | "pages">("queries");
  const [oppSearch, setOppSearch] = useState("");
  const [oppActiveFilters, setOppActiveFilters] = useState<Set<string>>(new Set());
  const [oppExpandedRow, setOppExpandedRow] = useState<string | null>(null);
  const [oppExpandedData, setOppExpandedData] = useState<QueryRow[]>([]);
  const [oppExpandedLoading, setOppExpandedLoading] = useState(false);
  const [oppMentionMap, setOppMentionMap] = useState<Map<string, Set<string>>>(new Map());
  const [oppMentionChecked, setOppMentionChecked] = useState<Set<string>>(new Set());
  const BRAND_TERMS = ["vintage cash cow", "vintagecashcow", "vcc"];

  // ── Product Categories state ────────────────────────────────────────────────
  interface CatRow {
    category: string;
    clicks: number; impressions: number; ctr: number; position: number;
    leads: number; sessions: number;
    clicksCmp: number; impressionsCmp: number; leadsCmp: number; sessionsCmp: number;
    pages: string[];
    expanded?: boolean;
  }
  const [catRows, setCatRows] = useState<CatRow[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catTab, setCatTab] = useState<"all" | "growing" | "decaying">("all");
  const [catMetric, setCatMetric] = useState<"clicks" | "leads" | "sessions">("clicks");
  const [catExpandedCategory, setCatExpandedCategory] = useState<string | null>(null);
  const [catExpandedData, setCatExpandedData] = useState<{ page: string; clicks: number; impressions: number; ctr: number; position: number; leads: number; sessions: number }[]>([]);
  const [catExpandedLoading, setCatExpandedLoading] = useState(false);

  // ── Brand vs Non-Brand state ─────────────────────────────────────────────
  interface BrandData {
    // GSC query split
    brandedClicks: number; nonBrandedClicks: number;
    brandedImpressions: number; nonBrandedImpressions: number;
    brandedCtr: number; nonBrandedCtr: number;
    brandedPosition: number; nonBrandedPosition: number;
    // GSC daily trend
    daily: { date: string; branded: number; nonBranded: number }[];
    // Top branded / non-branded queries
    brandedQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
    nonBrandedQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
    // Pages split
    brandedPages: { page: string; clicks: number; impressions: number }[];
    nonBrandedPages: { page: string; clicks: number; impressions: number }[];
    // GA4 leads split
    brandedLeads: number; nonBrandedLeads: number;
    brandedSessions: number; nonBrandedSessions: number;
    // Comparison
    brandedClicksCmp: number; nonBrandedClicksCmp: number;
    brandedLeadsCmp: number; nonBrandedLeadsCmp: number;
    brandedSessionsCmp: number; nonBrandedSessionsCmp: number;
  }
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandTab, setBrandTab] = useState<"overview" | "queries" | "pages" | "leads">("overview");
  const [convLoading, setConvLoading] = useState(false);

  // ── Daily Snapshot state ──────────────────────────────────────────────────
  interface SnapResult {
    propLabel: string;
    propId: string;
    period: { start: string; end: string };
    cmpPeriod: { start: string; end: string };
    // NB SEO
    orgSessions: number; orgSessionsCmp: number;
    nbClicks: number; nbClicksCmp: number;
    nbLeads: number; nbLeadsCmp: number;
    fspLeads: number; fspLeadsCmp: number;
    nbTop3: number; nbTop3Cmp: number;
    siteWideNbRatio: number;
    // AIO
    aioSessions: number;
    aioSignUps: number;
  }
  const [snapVCC, setSnapVCC] = useState<SnapResult | null>(null);
  const [snapAV, setSnapAV]   = useState<SnapResult | null>(null);
  const [snapVCCLoading, setSnapVCCLoading] = useState(false);
  const [snapAVLoading,  setSnapAVLoading]  = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      if (window.google?.accounts?.oauth2) { setGoogleReady(true); clearInterval(t); }
    }, 100);
    return () => clearInterval(t);
  }, []);

  // Debounce GA4 API-triggering filters (dateRange, comparison, channelFilter, deviceFilter)
  useEffect(() => {
    const t = setTimeout(() => setGa4FetchFilters(ga4Filters), 400);
    return () => clearTimeout(t);
  }, [ga4Filters.dateRange, ga4Filters.customStart, ga4Filters.customEnd, ga4Filters.customCompareStart, ga4Filters.customCompareEnd, ga4Filters.comparison, ga4Filters.channelFilter, ga4Filters.deviceFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // metrics changes don't hit the API — propagate immediately
  useEffect(() => {
    setGa4FetchFilters((f) => ({ ...f, metrics: ga4Filters.metrics }));
  }, [ga4Filters.metrics]);

  // Debounce GSC API-triggering filters
  useEffect(() => {
    const t = setTimeout(() => setGscFetchFilters(gscFilters), 400);
    return () => clearTimeout(t);
  }, [gscFilters.dateRange, gscFilters.customStart, gscFilters.customEnd, gscFilters.customCompareStart, gscFilters.customCompareEnd, gscFilters.comparison, gscFilters.dimension, gscFilters.countryFilter, gscFilters.deviceFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!googleReady) return;
    const stored = readStoredGoogleToken();
    if (stored) setAccessToken(stored);
  }, [googleReady]);

  const handleLogin = useCallback(() => {
    if (!googleReady) return;
    setIsLoggingIn(true);
    window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly",
      callback: (r) => {
        setIsLoggingIn(false);
        if (!r.access_token) return;
        persistGoogleToken(r as { access_token: string; expires_in?: number });
        setAccessToken(r.access_token);
      },
    }).requestAccessToken();
  }, [googleReady]);

  const handleLogout = useCallback(() => {
    clearGoogleToken();
    setAccessToken("");
    setPageDrillPath("");
    setGscLinkQuery(null);
    setGscLinkPage(null);
  }, []);

  const VCC_GA4_LABEL = "Vintage Cash Cow - GA4";
  const AV_GA4_LABEL  = "Arcavindi - GA4";
  const VCC_GSC_URL   = "https://www.vintagecashcow.co.uk/";
  const AV_GSC_URL    = "https://www.arcavindi.com/";

  const loadProperties = useCallback(async (token: string) => {
    const [a, b] = await Promise.all([
      fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("https://www.googleapis.com/webmasters/v3/sites", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [ga4Data, gscData] = await Promise.all([a.json(), b.json()]);
    const props: { value: string; label: string }[] = [];
    (ga4Data.accountSummaries as AccountSummary[])?.forEach((acc) =>
      acc.propertySummaries?.forEach((p) => props.push({ value: p.property.split("/")[1], label: p.displayName }))
    );
    const gscProps = (gscData.siteEntry as SiteEntry[])?.map((s) => ({ value: s.siteUrl, label: s.siteUrl })) ?? [];
    setGa4Properties(props);
    setGscProperties(gscProps);

    // Auto-select VCC properties if nothing is already saved
    setSelectedGA4((prev) => {
      if (prev) return prev;
      const vcc = props.find((p) => p.label === VCC_GA4_LABEL);
      return vcc ? vcc.value : (props[0]?.value ?? "");
    });
    setSelectedGSC((prev) => {
      if (prev) return prev;
      const vcc = gscProps.find((p) => p.value === VCC_GSC_URL || p.value === VCC_GSC_URL.replace(/\/$/, ""));
      return vcc ? vcc.value : (gscProps[0]?.value ?? "");
    });
    // Auto-select Arcavindi GA4 property for snapshot
    const av = props.find((p) => p.label === AV_GA4_LABEL || p.label.toLowerCase().includes("arcavindi"));
    if (av) setAvGA4Id(av.value);
    // Auto-select Arcavindi GSC property for snapshot
    const avGsc = gscProps.find((p) => p.value === AV_GSC_URL || p.value === AV_GSC_URL.replace(/\/$/, "") || p.value.toLowerCase().includes("arcavindi"));
    if (avGsc) setAvGscId(avGsc.value);
  }, []);

  useEffect(() => { if (accessToken) loadProperties(accessToken); }, [accessToken, loadProperties]);

  // ── Persist selected properties across refreshes ─────────────────────────
  useEffect(() => { if (selectedGA4) localStorage.setItem(LS_SELECTED_GA4, selectedGA4); else localStorage.removeItem(LS_SELECTED_GA4); }, [selectedGA4]);
  useEffect(() => { if (selectedGSC) localStorage.setItem(LS_SELECTED_GSC, selectedGSC); else localStorage.removeItem(LS_SELECTED_GSC); }, [selectedGSC]);
  useEffect(() => { localStorage.setItem(LS_ACTIVE_VIEW, activeView); }, [activeView]);
  useEffect(() => { try { localStorage.setItem(LS_BRAND_TERMS, JSON.stringify(nbsBrandTerms)); } catch { /* ignore quota */ } }, [nbsBrandTerms]);
  useEffect(() => { try { localStorage.setItem(LS_BRAND_TERMS_HISTORY, JSON.stringify(nbsTermsHistory)); } catch { /* ignore quota */ } }, [nbsTermsHistory]);

  // ── Fetch GA4 ──────────────────────────────────────────────────────────────
  const fetchGA4 = useCallback(async () => {
    if (!selectedGA4 || !accessToken) return;
    setGa4Loading(true);
    const headers   = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const base      = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;

    const makeChannelFilter = (ch: string) => ({ filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "CONTAINS", value: ch } } });
    const makeDeviceFilter  = (dv: string) => ({ filter: { fieldName: "deviceCategory", stringFilter: { matchType: "EXACT", value: dv } } });

    const f = ga4FetchFilters;
    const multiChannel = f.channelFilter.length > 1;
    const multiDevice  = f.deviceFilter.length > 1;
    const needsSeries  = multiChannel || multiDevice;

    const { current: curWin, comparison: cmpWin } = ga4DateWindows(f);
    const cmpRange = cmpWin;

    const daySpan =
      f.dateRange === "custom" && f.customStart && f.customEnd
        ? Math.min(400, daysInclusive(f.customStart, f.customEnd))
        : dateRangeDays(f.dateRange);

    const startDate = curWin.startDate;
    const endDate   = curWin.endDate;

    const drillExprs: object[] = pageDrillPath.trim()
      ? [{ filter: { fieldName: "pagePathPlusQueryString", stringFilter: { matchType: "CONTAINS", value: pageDrillPath.trim() } } }]
      : [];
    const singleFilterClauses: object[] = [];
    if (!needsSeries && f.channelFilter.length === 1) singleFilterClauses.push(makeChannelFilter(f.channelFilter[0]));
    if (!needsSeries && f.deviceFilter.length === 1)  singleFilterClauses.push(makeDeviceFilter(f.deviceFilter[0]));
    const dimExprs = [...singleFilterClauses, ...drillExprs];
    const singleDimFilter = dimExprs.length
      ? { dimensionFilter: { andGroup: { expressions: dimExprs } } }
      : {};

    const aiSourceRegexFilter = { filter: { fieldName: "sessionSourceMedium", stringFilter: { matchType: "PARTIAL_REGEXP", value: "(chat\\.openai\\.com|chatgpt\\.com|perplexity\\.ai|claude\\.ai|bard\\.google\\.com|gemini\\.google\\.com|copilot\\.microsoft\\.com|bing\\.com|you\\.com|poe\\.com|phind\\.com|komo\\.ai|reka\\.ai|pi\\.ai|character\\.ai|huggingface\\.co)" } } };
    const aiDimFilter = drillExprs.length
      ? { dimensionFilter: { andGroup: { expressions: [aiSourceRegexFilter, ...drillExprs] } } }
      : { dimensionFilter: aiSourceRegexFilter };

    const dailyBody = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "bounceRate" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: daySpan + 5,
      ...singleDimFilter,
    };

    const fetchList: Promise<Response>[] = [
      // Current period daily
      fetch(base, { method: "POST", headers, body: JSON.stringify(dailyBody) }),
      // Channels
      fetch(base, { method: "POST", headers, body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
        ...singleDimFilter,
      }) }),
      // AI channels
      fetch(base, { method: "POST", headers, body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionSourceMedium" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        ...aiDimFilter,
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 100,
      }) }),
      // Landing pages
      fetch(base, { method: "POST", headers, body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "bounceRate" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 200,
        ...singleDimFilter,
      }) }),
      // Comparison period — daily, channels, AI, landing (4 requests when active)
      ...(cmpRange
        ? [
            fetch(base, { method: "POST", headers, body: JSON.stringify({
              dateRanges: [{ startDate: cmpRange.startDate, endDate: cmpRange.endDate }],
              dimensions: [{ name: "date" }],
              metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "bounceRate" }],
              orderBys: [{ dimension: { dimensionName: "date" } }],
              limit: daySpan + 5,
              ...singleDimFilter,
            }) }),
            fetch(base, { method: "POST", headers, body: JSON.stringify({
              dateRanges: [{ startDate: cmpRange.startDate, endDate: cmpRange.endDate }],
              dimensions: [{ name: "sessionDefaultChannelGroup" }],
              metrics: [{ name: "activeUsers" }, { name: "sessions" }],
              orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
              limit: 10,
              ...singleDimFilter,
            }) }),
            fetch(base, { method: "POST", headers, body: JSON.stringify({
              dateRanges: [{ startDate: cmpRange.startDate, endDate: cmpRange.endDate }],
              dimensions: [{ name: "sessionSourceMedium" }],
              metrics: [{ name: "activeUsers" }, { name: "sessions" }],
              ...aiDimFilter,
              orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
              limit: 100,
            }) }),
            fetch(base, { method: "POST", headers, body: JSON.stringify({
              dateRanges: [{ startDate: cmpRange.startDate, endDate: cmpRange.endDate }],
              dimensions: [{ name: "landingPagePlusQueryString" }],
              metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "bounceRate" }],
              orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
              limit: 200,
              ...singleDimFilter,
            }) }),
          ]
        : []
      ),
      // Per-series fetches (multi-channel or multi-device)
      ...(needsSeries
        ? (multiChannel ? f.channelFilter : f.deviceFilter).map((key) => {
            const baseCh = multiChannel ? makeChannelFilter(key) : makeDeviceFilter(key);
            const seriesDimFilter = drillExprs.length
              ? { dimensionFilter: { andGroup: { expressions: [baseCh, ...drillExprs] } } }
              : { dimensionFilter: baseCh };
            return fetch(base, { method: "POST", headers, body: JSON.stringify({
              dateRanges: [{ startDate, endDate }],
              dimensions: [{ name: "date" }],
              metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "bounceRate" }],
              ...seriesDimFilter,
              orderBys: [{ dimension: { dimensionName: "date" } }],
              limit: daySpan + 5,
            }) });
          })
        : []
      ),
      // Country data (always last so index is predictable)
      fetch(base, { method: "POST", headers, body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 50,
        ...singleDimFilter,
      }) }),
      ...(cmpRange ? [fetch(base, { method: "POST", headers, body: JSON.stringify({
        dateRanges: [{ startDate: cmpRange.startDate, endDate: cmpRange.endDate }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 50,
        ...singleDimFilter,
      }) })] : []),
    ];

    const responses = await Promise.all(fetchList);
    const jsons = await Promise.all(responses.map((r) => r.json()));

    // Indices: 0=daily, 1=channels, 2=ai, 3=landing, [4=cmpDaily,5=cmpChannels,6=cmpAi,7=cmpLanding], then series, then country (last 1 or 2)
    const dailyData      = jsons[0];
    const channelData    = jsons[1];
    const aiData         = jsons[2];
    const landingData    = jsons[3];
    const cmpBaseIdx     = 4;
    const cmpDailyData   = cmpRange ? jsons[cmpBaseIdx]     : null;
    const cmpChannelData = cmpRange ? jsons[cmpBaseIdx + 1] : null;
    const cmpAiData      = cmpRange ? jsons[cmpBaseIdx + 2] : null;
    const cmpLandingData = cmpRange ? jsons[cmpBaseIdx + 3] : null;
    // Country fetches are at the very end (after series)
    const ga4CountryData     = jsons[jsons.length - (cmpRange ? 2 : 1)];
    const ga4CmpCountryData  = cmpRange ? jsons[jsons.length - 1] : null;
    // Series data sits between fixed fetches and country fetches
    const seriesDataArr  = jsons.slice(cmpRange ? cmpBaseIdx + 4 : cmpBaseIdx, jsons.length - (cmpRange ? 2 : 1));

    const parseGA4Daily = (data: { rows?: GA4ApiRow[] }): DailyGA4[] =>
      (data.rows as GA4ApiRow[])?.map((r) => ({
        date:       formatGa4Date(r.dimensionValues[0].value),
        users:      parseInt(r.metricValues[0].value, 10),
        sessions:   parseInt(r.metricValues[1].value, 10),
        pageviews:  parseInt(r.metricValues[2].value, 10),
        bounceRate: parseFloat(r.metricValues[3].value),
      })) ?? [];

    setGa4Daily(parseGA4Daily(dailyData));
    setGa4DailyCmp(cmpDailyData ? parseGA4Daily(cmpDailyData) : []);

    // Channels parser
    const parseChannels = (data: { rows?: GA4ApiRow[] }): ChannelRow[] =>
      (data?.rows as GA4ApiRow[])?.map((r) => ({
        channel:  r.dimensionValues[0].value,
        users:    parseInt(r.metricValues[0].value, 10),
        sessions: parseInt(r.metricValues[1].value, 10),
      })) ?? [];
    setGa4Channels(parseChannels(channelData));
    setGa4ChannelsCmp(cmpChannelData ? parseChannels(cmpChannelData) : []);

    // AI sources parser
    const parseAiSources = (data: { rows?: GA4ApiRow[] }): AiSourceRow[] => {
      const map = new Map<string, AiSourceRow>();
      (data?.rows as GA4ApiRow[])?.forEach((r) => {
        const src = r.dimensionValues[0].value;
        const lbl = classifyAiSource(src);
        if (!lbl) return;
        const ex = map.get(lbl);
        const ss = parseInt(r.metricValues[1].value, 10);
        const us = parseInt(r.metricValues[0].value, 10);
        if (ex) map.set(lbl, { ...ex, sessions: ex.sessions + ss, users: ex.users + us });
        else    map.set(lbl, { source: src, label: lbl, sessions: ss, users: us });
      });
      return [...map.values()].sort((a, b) => b.sessions - a.sessions);
    };
    setGa4AiSources(parseAiSources(aiData));
    setGa4AiSourcesCmp(cmpAiData ? parseAiSources(cmpAiData) : []);

    // Landing pages parser
    const parseLanding = (data: { rows?: GA4ApiRow[] }): LandingPageRow[] =>
      (data?.rows as GA4ApiRow[])?.map((r) => ({
        page:       r.dimensionValues[0].value,
        users:      parseInt(r.metricValues[0].value, 10),
        sessions:   parseInt(r.metricValues[1].value, 10),
        bounceRate: parseFloat(r.metricValues[2].value),
      })) ?? [];
    setGa4LandingPages(parseLanding(landingData));
    setGa4LandingPagesCmp(cmpLandingData ? parseLanding(cmpLandingData) : []);

    // GA4 country data
    const parseGa4Countries = (data: { rows?: GA4ApiRow[] }): Ga4CountryRow[] =>
      (data?.rows as GA4ApiRow[])?.map((r) => ({
        country:  r.dimensionValues[0].value,
        users:    parseInt(r.metricValues[0].value, 10),
        sessions: parseInt(r.metricValues[1].value, 10),
      })) ?? [];
    setGa4CountryRows(parseGa4Countries(ga4CountryData));
    setGa4CountryRowsCmp(ga4CmpCountryData ? parseGa4Countries(ga4CmpCountryData) : []);

    // Multi-series
    if (needsSeries) {
      const keys = multiChannel ? f.channelFilter : f.deviceFilter;
      const seriesMaps = seriesDataArr.map((sd) => {
        const m = new Map<string, DailyGA4>();
        (sd.rows as GA4ApiRow[])?.forEach((r) => {
          const d = formatGa4Date(r.dimensionValues[0].value);
          m.set(d, { date: d, users: parseInt(r.metricValues[0].value, 10), sessions: parseInt(r.metricValues[1].value, 10), pageviews: parseInt(r.metricValues[2].value, 10), bounceRate: parseFloat(r.metricValues[3].value) });
        });
        return m;
      });
      const allDates = Array.from(new Set(seriesMaps.flatMap((m) => [...m.keys()]))).sort();
      const rows: SeriesRow[] = allDates.map((date) => {
        const row: SeriesRow = { date };
        keys.forEach((k, i) => {
          f.metrics.forEach((metric) => {
            const metricVal = metric === "bounceRate"
              ? +((seriesMaps[i].get(date)?.bounceRate ?? 0) * 100).toFixed(2)
              : ((seriesMaps[i].get(date) as Record<string, number> | undefined)?.[metric] ?? 0);
            row[`${k}__${metric}`] = metricVal;
          });
        });
        return row;
      });
      const seriesKeys = keys.flatMap((k) => f.metrics.map((m) => `${k}__${m}`));
      setGa4Series(rows);
      setGa4SeriesKeys(seriesKeys);
    } else {
      setGa4Series([]);
      setGa4SeriesKeys([]);
    }

    setGa4Loading(false);
  }, [selectedGA4, accessToken, ga4FetchFilters, pageDrillPath]);

  // ── Fetch GSC ──────────────────────────────────────────────────────────────
  const fetchGSC = useCallback(async () => {
    if (!selectedGSC || !accessToken) return;
    setGscLoading(true);
    const gf       = gscFetchFilters;
    const { startDate, endDate, comparison: gscCmp } = gscDateWindows(gf);
    const cmpRange = gscCmp;
    const gscDaySpan =
      gf.dateRange === "custom" && gf.customStart && gf.customEnd
        ? Math.min(400, daysInclusive(gf.customStart, gf.customEnd))
        : dateRangeDays(gf.dateRange);
    const cmpDaySpan =
      cmpRange && gf.dateRange === "custom" && gf.customCompareStart && gf.customCompareEnd
        ? Math.min(400, daysInclusive(gf.customCompareStart, gf.customCompareEnd))
        : cmpRange
          ? (gf.dateRange === "custom" && gf.customStart && gf.customEnd
              ? Math.min(400, daysInclusive(cmpRange.startDate, cmpRange.endDate))
              : gscDaySpan)
          : gscDaySpan;
    const base      = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(selectedGSC)}/searchAnalytics/query`;
    const headers   = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // queryFilter is NOT sent to the API — we fetch all rows and filter client-side
    const buildDimFilter = (device?: string, country?: string) => {
      const filters: object[] = [];
      if (device)  filters.push({ dimension: "device",  operator: "equals", expression: device });
      if (country) filters.push({ dimension: "country", operator: "equals", expression: country });
      if (pageDrillPath.trim()) filters.push({ dimension: "page", operator: "contains", expression: pageDrillPath.trim() });
      return filters.length ? { dimensionFilterGroups: [{ filters }] } : {};
    };

    const multiCountry = gf.countryFilter.length > 1;
    const multiDevice  = gf.deviceFilter.length > 1;
    const needsSeries  = multiCountry || (multiDevice && gf.countryFilter.length === 0);

    const singleFilter = buildDimFilter(
      gf.deviceFilter.length === 1  ? gf.deviceFilter[0]  : undefined,
      gf.countryFilter.length === 1 ? gf.countryFilter[0] : undefined,
    );

    const queryDim = gf.dimension === "date" ? "query" : gf.dimension;

    const fetchList: Promise<Response>[] = [
      fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["date"], rowLimit: gscDaySpan, ...singleFilter }) }),
      fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: [queryDim], rowLimit: 500, ...singleFilter }) }),
      fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["query"], rowLimit: 25000, ...singleFilter }) }),
      fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["device"], rowLimit: 10, ...singleFilter }) }),
      fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["country"], rowLimit: 100, ...singleFilter }) }),
      fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit: 1000, ...singleFilter }) }),
      fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["page", "query"], rowLimit: 25000, ...singleFilter }) }),
      ...(cmpRange ? [
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: ["date"], rowLimit: cmpDaySpan, ...singleFilter }) }),
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: [queryDim], rowLimit: 500, ...singleFilter }) }),
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: ["query"], rowLimit: 25000, ...singleFilter }) }),
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: ["country"], rowLimit: 100, ...singleFilter }) }),
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: ["page", "query"], rowLimit: 25000, ...singleFilter }) }),
      ] : []),
      ...(needsSeries
        ? (multiCountry ? gf.countryFilter : gf.deviceFilter).map((key) =>
            fetch(base, { method: "POST", headers, body: JSON.stringify({
              startDate, endDate, dimensions: ["date"], rowLimit: gscDaySpan,
              ...buildDimFilter(
                multiDevice ? key : (gf.deviceFilter[0] || undefined),
                multiCountry ? key : (gf.countryFilter[0] || undefined),
              ),
            }) })
          )
        : []
      ),
    ];

    const responses = await Promise.all(fetchList);
    const jsons = await Promise.all(responses.map((r) => r.json()));

    let idx = 0;
    const dailyData    = jsons[idx++];
    const queryData    = jsons[idx++];
    const opportunityQueryData = jsons[idx++];
    const deviceData   = jsons[idx++];
    const countryData  = jsons[idx++];
    const pageData     = jsons[idx++];
    const buriedPageQueryData = jsons[idx++];
    const cmpDailyGsc   = cmpRange ? jsons[idx++] : null;
    const cmpQueryData  = cmpRange ? jsons[idx++] : null;
    const cmpOpportunityQueryData = cmpRange ? jsons[idx++] : null;
    const cmpCountryData = cmpRange ? jsons[idx++] : null;
    const cmpPageQueryData = cmpRange ? jsons[idx++] : null;
    const seriesDataArr = jsons.slice(idx);

    const parseGSCDaily = (data: { rows?: GSCApiRow[] }): DailyGSC[] =>
      (data.rows as GSCApiRow[])?.map((r) => ({
        date:        formatDisplayDate(r.keys[0]),
        clicks:      Math.round(r.clicks),
        impressions: Math.round(r.impressions),
        ctr:         r.ctr,
        position:    r.position,
      })) ?? [];

    setGscDaily(parseGSCDaily(dailyData));
    setGscDailyCmp(cmpDailyGsc ? parseGSCDaily(cmpDailyGsc) : []);

    const parseGscQueries = (data: { rows?: GSCApiRow[] }): QueryRow[] =>
      (data?.rows as GSCApiRow[])?.map((r) => ({
        query:       r.keys[0],
        clicks:      Math.round(r.clicks),
        impressions: Math.round(r.impressions),
        ctr:         r.ctr,
        position:    r.position,
      })) ?? [];

    setGscQueries(parseGscQueries(queryData));
    setGscQueriesCmp(cmpQueryData ? parseGscQueries(cmpQueryData) : []);
    setGscOpportunityQueries(parseGscQueries(opportunityQueryData));
    setGscOpportunityQueriesCmp(cmpOpportunityQueryData ? parseGscQueries(cmpOpportunityQueryData) : []);

    setGscDevices((deviceData.rows as GSCApiRow[])?.map((r) => ({
      device:      r.keys[0],
      clicks:      Math.round(r.clicks),
      impressions: Math.round(r.impressions),
    })) ?? []);

    setGscCountries((countryData.rows as GSCApiRow[])?.map((r) => r.keys[0]) ?? []);

    const parseCountryRows = (data: { rows?: GSCApiRow[] }): CountryRow[] =>
      (data?.rows as GSCApiRow[])?.map((r) => ({
        country:     r.keys[0],
        clicks:      Math.round(r.clicks),
        impressions: Math.round(r.impressions),
        ctr:         r.ctr,
        position:    r.position,
      })) ?? [];
    setGscCountryRows(parseCountryRows(countryData));
    setGscCountryRowsCmp(cmpCountryData ? parseCountryRows(cmpCountryData) : []);
    // Build a page click lookup from pageData
    const pageClickMap = new Map<string, number>();
    ((pageData?.rows as GSCApiRow[]) ?? []).forEach((r) => pageClickMap.set(r.keys[0], Math.round(r.clicks)));
    setGscPages(((pageData?.rows as GSCApiRow[]) ?? []).map((r) => ({ page: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position })));

    // Buried: pages with <5 total clicks — pull their queries from the page+query fetch, filter pos 50+
    // The page+query fetch (25k rows) is sorted by impressions desc by GSC, so high-traffic pages dominate.
    // We use it where available, then do targeted per-page fetches for any low-click pages still missing.
    const lowClickPages = ((pageData?.rows as GSCApiRow[]) ?? [])
      .filter((r) => Math.round(r.clicks) < 5)
      .map((r) => r.keys[0])
      .slice(0, 100); // cap at 100 pages

    // First pass: extract from the bulk page+query fetch
    const bulkRows: GSCApiRow[] = buriedPageQueryData?.rows ?? [];
    const coveredPages = new Set(bulkRows.map((r: GSCApiRow) => r.keys[0]));
    const missingPages = lowClickPages.filter((p) => !coveredPages.has(p)).slice(0, 40);

    // Second pass: fetch queries for pages not represented in bulk data
    let extraRows: GSCApiRow[] = [];
    if (missingPages.length > 0) {
      const extraFetches = missingPages.map((page) =>
        fetch(base, { method: "POST", headers, body: JSON.stringify({
          startDate, endDate,
          dimensions: ["page", "query"],
          rowLimit: 200,
          dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: page }] }],
        }) }).then((r) => r.json()).catch(() => ({ rows: [] }))
      );
      const extraJsons = await Promise.all(extraFetches);
      extraRows = extraJsons.flatMap((j) => j.rows ?? []);
    }

    const allPageQueryRows: GSCApiRow[] = [...bulkRows, ...extraRows];
    setGscBuriedPageQueries(
      allPageQueryRows
        .filter((r: GSCApiRow) => r.position >= 50 && Math.round(r.impressions) >= 1 && (pageClickMap.get(r.keys[0]) ?? 0) < 5)
        .map((r: GSCApiRow) => ({
          page:        r.keys[0],
          query:       r.keys[1],
          impressions: Math.round(r.impressions),
          clicks:      Math.round(r.clicks),
          position:    r.position,
        }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 5000),
    );

    // ── Full unfiltered page+query data for Query Counting section ──
    setGscPageQueryAll(
      (bulkRows ?? []).map((r: GSCApiRow) => ({
        page:        r.keys[0],
        query:       r.keys[1],
        clicks:      Math.round(r.clicks),
        impressions: Math.round(r.impressions),
      })),
    );
    setGscPageQueryAllCmp(
      ((cmpPageQueryData?.rows as GSCApiRow[]) ?? []).map((r: GSCApiRow) => ({
        page:        r.keys[0],
        query:       r.keys[1],
        clicks:      Math.round(r.clicks),
        impressions: Math.round(r.impressions),
      })),
    );

    // Multi-series
    if (needsSeries) {
      const keys = multiCountry ? gf.countryFilter : gf.deviceFilter;
      const seriesMaps = seriesDataArr.map((sd) => {
        const m = new Map<string, DailyGSC>();
        (sd.rows as GSCApiRow[])?.forEach((r) => {
          const d = formatDisplayDate(r.keys[0]);
          m.set(d, { date: d, clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position });
        });
        return m;
      });
      const allDates = Array.from(new Set(seriesMaps.flatMap((m) => [...m.keys()]))).sort();
      const rows: SeriesRow[] = allDates.map((date) => {
        const row: SeriesRow = { date };
        keys.forEach((k, i) => {
          row[`${k}__clicks`]      = seriesMaps[i].get(date)?.clicks ?? 0;
          row[`${k}__impressions`] = seriesMaps[i].get(date)?.impressions ?? 0;
          row[`${k}__ctr`]        = +((seriesMaps[i].get(date)?.ctr ?? 0) * 100).toFixed(2);
        });
        return row;
      });
      setGscSeries(rows);
      setGscSeriesKeys(keys.map((k) => `${k}__clicks`));
    } else {
      setGscSeries([]);
      setGscSeriesKeys([]);
    }

    setGscLoading(false);
    setLastUpdated(new Date());
  }, [selectedGSC, accessToken, gscFetchFilters, pageDrillPath]);

  const convEventNameRef = useRef(convEventName);
  convEventNameRef.current = convEventName;

  const fetchPageCopy = useCallback(async (pageUrl: string, queries: string[]) => {
    if (!pageUrl || queries.length === 0) return;
    setQueryCopyLoading((s) => new Set([...s, pageUrl]));
    try {
      // Use allorigins to bypass CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;
      const res = await fetch(proxyUrl);
      const json = await res.json() as { contents?: string };
      const html = json.contents ?? "";
      // Strip HTML tags and decode entities to get plain text
      const tmp = document.createElement("div");
      tmp.innerHTML = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ");
      const text = (tmp.textContent || tmp.innerText || "").toLowerCase().replace(/\s+/g, " ");
      const queryHits = new Map<string, boolean>();
      queries.forEach((q) => {
        queryHits.set(q, text.includes(q.toLowerCase()));
      });
      setQueryCopyResults((prev) => new Map(prev).set(pageUrl, { text: text.slice(0, 5000), queryHits }));
    } catch {
      setQueryCopyResults((prev) => new Map(prev).set(pageUrl, { text: "", queryHits: new Map(queries.map((q) => [q, false])) }));
    }
    setQueryCopyLoading((s) => { const n = new Set(s); n.delete(pageUrl); return n; });
  }, []);

  const fetchConvEventList = useCallback(async () => {
    if (!selectedGA4 || !accessToken) return;
    setConvEventsLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const base = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;
    const { current: curWin } = ga4DateWindows(ga4FetchFilters);
    try {
      const res = await fetch(base, { method: "POST", headers, body: JSON.stringify({
        dateRanges: [{ startDate: curWin.startDate, endDate: curWin.endDate }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 100,
      }) }).then((r) => r.json());
      const rows: GA4ApiRow[] = res.rows ?? [];
      const events = rows.map((r) => r.dimensionValues[0].value);
      const allEvts = rows.map((r) => ({ name: r.dimensionValues[0].value, count: parseInt(r.metricValues[0].value, 10) }));
      setConvEventList(events);
      setConvAllEvents(allEvts);
      if (events.length > 0 && !events.includes(convEventNameRef.current)) {
        // auto-select first purchase-like event if present
        const preferred = events.find((e) => e === "purchase" || e === "generate_lead" || e === "conversion");
        if (preferred) setConvEventName(preferred);
        else if (!convEventNameRef.current) setConvEventName(events[0]);
      }
    } catch {}
    setConvEventsLoading(false);
  }, [selectedGA4, accessToken, ga4FetchFilters]);

  const fetchConversions = useCallback(async () => {
    if (!selectedGA4 || !accessToken) return;
    setConvLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const base = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;
    const f = ga4FetchFilters;
    const { current: curWin, comparison: cmpWin } = ga4DateWindows(f);
    const name = convEventNameRef.current.trim() || "purchase";
    const eventFilter = { dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: name } } } };
    const body = {
      dateRanges: [{ startDate: curWin.startDate, endDate: curWin.endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "eventCount" }],
      ...eventFilter,
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 400,
    };
    const parse = (data: { rows?: GA4ApiRow[] }) =>
      (data.rows as GA4ApiRow[])?.map((r) => ({
        date: formatGa4Date(r.dimensionValues[0].value),
        count: parseInt(r.metricValues[0].value, 10),
      })) ?? [];
    const cur = await fetch(base, { method: "POST", headers, body: JSON.stringify(body) }).then((r) => r.json());
    setConvDaily(parse(cur));
    if (cmpWin) {
      const cmpBody = { ...body, dateRanges: [{ startDate: cmpWin.startDate, endDate: cmpWin.endDate }] };
      const cmp = await fetch(base, { method: "POST", headers, body: JSON.stringify(cmpBody) }).then((r) => r.json());
      setConvDailyCmp(parse(cmp));
    } else setConvDailyCmp([]);

    // Fetch supplemental data in parallel
    try {
      const [pageRes, deviceRes, channelRes, dowRes, lowRes] = await Promise.all([
        // Pages with this event
        fetch(base, { method: "POST", headers, body: JSON.stringify({
          dateRanges: [{ startDate: curWin.startDate, endDate: curWin.endDate }],
          dimensions: [{ name: "pagePathPlusQueryString" }],
          metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
          ...eventFilter,
          orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
          limit: 50,
        }) }).then((r) => r.json()),
        // Device breakdown
        fetch(base, { method: "POST", headers, body: JSON.stringify({
          dateRanges: [{ startDate: curWin.startDate, endDate: curWin.endDate }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "eventCount" }],
          ...eventFilter,
          limit: 10,
        }) }).then((r) => r.json()),
        // Channel breakdown
        fetch(base, { method: "POST", headers, body: JSON.stringify({
          dateRanges: [{ startDate: curWin.startDate, endDate: curWin.endDate }],
          dimensions: [{ name: "sessionDefaultChannelGrouping" }],
          metrics: [{ name: "eventCount" }],
          ...eventFilter,
          orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
          limit: 10,
        }) }).then((r) => r.json()),
        // Day of week breakdown
        fetch(base, { method: "POST", headers, body: JSON.stringify({
          dateRanges: [{ startDate: curWin.startDate, endDate: curWin.endDate }],
          dimensions: [{ name: "dayOfWeek" }],
          metrics: [{ name: "eventCount" }],
          ...eventFilter,
          limit: 7,
        }) }).then((r) => r.json()),
        // Low conversion rate pages (sessions vs event count)
        fetch(base, { method: "POST", headers, body: JSON.stringify({
          dateRanges: [{ startDate: curWin.startDate, endDate: curWin.endDate }],
          dimensions: [{ name: "pagePathPlusQueryString" }],
          metrics: [{ name: "sessions" }, { name: "eventCount" }],
          ...eventFilter,
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 100,
        }) }).then((r) => r.json()),
      ]);

      setConvByPage(
        ((pageRes.rows as GA4ApiRow[]) ?? []).map((r) => ({
          page: r.dimensionValues[0].value,
          count: parseInt(r.metricValues[0].value, 10),
          users: parseInt(r.metricValues[1].value, 10),
        })),
      );
      setConvByDevice(
        ((deviceRes.rows as GA4ApiRow[]) ?? []).map((r) => ({
          device: r.dimensionValues[0].value,
          count: parseInt(r.metricValues[0].value, 10),
        })),
      );
      setConvByChannel(
        ((channelRes.rows as GA4ApiRow[]) ?? []).map((r) => ({
          channel: r.dimensionValues[0].value,
          count: parseInt(r.metricValues[0].value, 10),
        })),
      );
      const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      setConvByDayOfWeek(
        ((dowRes.rows as GA4ApiRow[]) ?? [])
          .map((r) => ({ day: DOW_NAMES[parseInt(r.dimensionValues[0].value, 10)] ?? r.dimensionValues[0].value, count: parseInt(r.metricValues[0].value, 10), _idx: parseInt(r.dimensionValues[0].value, 10) }))
          .sort((a, b) => a._idx - b._idx),
      );
      setConvLowPages(
        ((lowRes.rows as GA4ApiRow[]) ?? [])
          .map((r) => ({
            page: r.dimensionValues[0].value,
            sessions: parseInt(r.metricValues[0].value, 10),
            eventCount: parseInt(r.metricValues[1].value, 10),
            rate: parseInt(r.metricValues[0].value, 10) > 0 ? parseInt(r.metricValues[1].value, 10) / parseInt(r.metricValues[0].value, 10) : 0,
          }))
          .filter((r) => r.sessions >= 20)
          .sort((a, b) => a.rate - b.rate)
          .slice(0, 20),
      );
    } catch {}

    setConvLoading(false);
  }, [selectedGA4, accessToken, ga4FetchFilters]);

  // ── VCC Category map ───────────────────────────────────────────────────────
  const VCC_CATEGORIES: { name: string; parent: string; children: string[] }[] = [
    { name: "Digital Cameras", parent: "/items-we-buy/digital-cameras/", children: ["/items-we-buy/digital-cameras/digital-cameras"] },
    { name: "Video Games", parent: "/items-we-buy/video-games/", children: ["/items-we-buy/video-games/accessories","/items-we-buy/video-games/handheld","/items-we-buy/video-games/nintendo","/items-we-buy/video-games/playstation","/items-we-buy/video-games/sega","/items-we-buy/video-games/xbox"] },
    { name: "Cameras", parent: "/items-we-buy/cameras/", children: ["/items-we-buy/cameras/argoflex-cameras","/items-we-buy/cameras/large-format-cameras","/items-we-buy/cameras/mamiya-cameras","/items-we-buy/cameras/polaroid-cameras","/items-we-buy/cameras/rolleiflex-cameras","/items-we-buy/cameras/slr-cameras","/items-we-buy/cameras/tlr-cameras","/items-we-buy/cameras/vintage-cameras"] },
    { name: "Watches & Pocket Watches", parent: "/items-we-buy/watches-and-pocket-watches/", children: ["/items-we-buy/watches-and-pocket-watches/antique-pocket-watches","/items-we-buy/watches-and-pocket-watches/cartier-watches","/items-we-buy/watches-and-pocket-watches/longines-watches","/items-we-buy/watches-and-pocket-watches/omega-watches","/items-we-buy/watches-and-pocket-watches/rolex-watches","/items-we-buy/watches-and-pocket-watches/universal-polerouter-vintage-watch","/items-we-buy/watches-and-pocket-watches/vintage-watches"] },
    { name: "Jewellery", parent: "/items-we-buy/jewellery/", children: ["/items-we-buy/jewellery/antique-jewellery","/items-we-buy/jewellery/brooches","/items-we-buy/jewellery/charm-bracelets","/items-we-buy/jewellery/cufflinks","/items-we-buy/jewellery/multistone-jewellery","/items-we-buy/jewellery/trinket-boxes","/items-we-buy/jewellery/vintage-jewellery"] },
    { name: "Medals & Militaria", parent: "/items-we-buy/medals-and-militaria/", children: ["/items-we-buy/medals-and-militaria/entire-collections","/items-we-buy/medals-and-militaria/war-medals"] },
    { name: "Toys", parent: "/items-we-buy/toys/", children: ["/items-we-buy/toys/action-figures","/items-we-buy/toys/corgi-vehicles","/items-we-buy/toys/diecast-toys","/items-we-buy/toys/model-railway","/items-we-buy/toys/teddy-bears"] },
    { name: "Writing Instruments", parent: "/items-we-buy/writing-instruments/", children: ["/items-we-buy/writing-instruments/fountain-pens","/items-we-buy/writing-instruments/montblanc-pens","/items-we-buy/writing-instruments/parker-pens","/items-we-buy/writing-instruments/wahl-eversharp-fountain-pen"] },
    { name: "Old Currency", parent: "/items-we-buy/old-currency/", children: ["/items-we-buy/old-currency/obsolete-currency","/items-we-buy/old-currency/old-banknotes","/items-we-buy/old-currency/old-coins"] },
    { name: "Vintage Electronics", parent: "/items-we-buy/vintage-electronics/", children: ["/items-we-buy/vintage-electronics/retro-mobile-phones","/items-we-buy/vintage-electronics/vintage-western-electric"] },
    { name: "Gold", parent: "/items-we-buy/gold/", children: ["/items-we-buy/gold/gold-coins","/items-we-buy/gold/gold-plated","/items-we-buy/gold/gold-rings","/items-we-buy/gold/scrap-gold"] },
    { name: "Costume Jewellery", parent: "/items-we-buy/costume-jewellery/", children: ["/items-we-buy/costume-jewellery/designer-costume-jewellery","/items-we-buy/costume-jewellery/vintage-costume-jewellery"] },
    { name: "Amber", parent: "/items-we-buy/amber/", children: [] },
    { name: "Android Products", parent: "/items-we-buy/android-products/", children: [] },
    { name: "Apple Products", parent: "/items-we-buy/apple-products/", children: [] },
    { name: "Binoculars", parent: "/items-we-buy/binoculars/", children: [] },
    { name: "Clocks", parent: "/items-we-buy/clocks/", children: [] },
    { name: "Diamonds", parent: "/items-we-buy/diamonds/", children: [] },
    { name: "Gold", parent: "/items-we-buy/gold/", children: [] },
    { name: "Lego", parent: "/items-we-buy/lego/", children: [] },
    { name: "Silver & Silver Plate", parent: "/items-we-buy/silver-silver-plate/", children: [] },
    { name: "Sports Memorabilia", parent: "/items-we-buy/sports-memorabilia/", children: [] },
    { name: "Vintage Collectables", parent: "/items-we-buy/vintage-collectables/", children: [] },
    { name: "Vintage Handbags & Purses", parent: "/items-we-buy/vintage-handbags-and-purses/", children: [] },
  ];

  const FREE_SELLING_PACK_PATH = "/free-selling-pack";

  const fetchProductCategories = useCallback(async () => {
    if (!selectedGA4 || !selectedGSC || !accessToken) return;
    setCatLoading(true);
    try {
      const ga4Base = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;
      const gscBase = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(selectedGSC)}/searchAnalytics/query`;
      const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

      const f = ga4FetchFilters;
      const { current: curWin, comparison: cmpWin } = ga4DateWindows(f);
      const gf = gscFetchFilters;
      const { startDate: gscStart, endDate: gscEnd } = gscDateWindows(gf);
      const gscCmpWin = comparisonWindowBefore(gscStart, gscEnd);

      const normPath = (url: string) => {
        try { return new URL(url).pathname.replace(/\/$/, "") || "/"; } catch { return url.replace(/\/$/, "") || "/"; }
      };

      // GA4 body: organic sessions per page
      const ga4OrgBody = (dateRange: { startDate: string; endDate: string }) => ({
        dateRanges: [dateRange],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "EXACT", value: "Organic Search" } } },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 500,
      });

      // GA4 body: sessions arriving at /free-selling-pack grouped by page_referrer
      // This gives us: how many sessions on /free-selling-pack came from each referrer page
      const ga4ReferralBody = (dateRange: { startDate: string; endDate: string }) => ({
        dateRanges: [dateRange],
        dimensions: [{ name: "pageReferrer" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: {
          andGroup: { expressions: [
            { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: FREE_SELLING_PACK_PATH } } },
            { filter: { fieldName: "pageReferrer", stringFilter: { matchType: "CONTAINS", value: "vintagecashcow.co.uk" } } },
          ]}
        },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 500,
      });

      // GSC: clicks+impressions per page
      const gscPageBody = (sd: string, ed: string) => ({
        startDate: sd, endDate: ed, dimensions: ["page"], rowLimit: 500,
      });

      const [ga4OrgCur, ga4OrgCmp, ga4RefCur, ga4RefCmp, gscCur, gscCmp] = await Promise.all([
        fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(ga4OrgBody(curWin)) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }>,
        cmpWin ? fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(ga4OrgBody(cmpWin)) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }> : Promise.resolve({ rows: [] }),
        fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(ga4ReferralBody(curWin)) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }>,
        cmpWin ? fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(ga4ReferralBody(cmpWin)) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }> : Promise.resolve({ rows: [] }),
        fetch(gscBase, { method: "POST", headers, body: JSON.stringify(gscPageBody(gscStart, gscEnd)) }).then((r) => r.json()) as Promise<{ rows?: GSCApiRow[] }>,
        fetch(gscBase, { method: "POST", headers, body: JSON.stringify(gscPageBody(gscCmpWin.startDate, gscCmpWin.endDate)) }).then((r) => r.json()) as Promise<{ rows?: GSCApiRow[] }>,
      ]);

      // Build referral map: normalised page path → sessions on /free-selling-pack referred from that page
      const buildRefMap = (rows?: GA4ApiRow[]) => {
        const m = new Map<string, number>();
        (rows ?? []).forEach((r) => {
          const ref = r.dimensionValues[0].value;
          const p = normPath(ref);
          m.set(p, (m.get(p) ?? 0) + parseInt(r.metricValues[0].value, 10));
        });
        return m;
      };
      const refMapCur = buildRefMap(ga4RefCur.rows);
      const refMapCmp = buildRefMap(ga4RefCmp.rows);

      // Build session map: page path → organic sessions
      const buildSessMap = (rows?: GA4ApiRow[]) => {
        const m = new Map<string, number>();
        (rows ?? []).forEach((r) => {
          const p = r.dimensionValues[0].value.replace(/\/$/, "") || "/";
          m.set(p, (m.get(p) ?? 0) + parseInt(r.metricValues[0].value, 10));
        });
        return m;
      };
      const sessMapCur = buildSessMap(ga4OrgCur.rows);
      const sessMapCmp = buildSessMap(ga4OrgCmp.rows);

      // Build GSC map: page path → {clicks, impressions, ctr, position}
      type GscStats = { clicks: number; impressions: number; ctr: number; position: number; n: number };
      const buildGscMap = (rows?: GSCApiRow[]) => {
        const m = new Map<string, GscStats>();
        (rows ?? []).forEach((r) => {
          const p = normPath(r.keys[0]);
          const cur = m.get(p) ?? { clicks: 0, impressions: 0, ctr: 0, position: 0, n: 0 };
          m.set(p, { clicks: cur.clicks + Math.round(r.clicks), impressions: cur.impressions + Math.round(r.impressions), ctr: cur.ctr + r.ctr, position: cur.position + r.position, n: cur.n + 1 });
        });
        return m;
      };
      const gscMapCur = buildGscMap(gscCur.rows);
      const gscMapCmp = buildGscMap(gscCmp.rows);

      // Aggregate by category
      const seenNames = new Set<string>();
      const rows = VCC_CATEGORIES
        .filter((c) => { if (seenNames.has(c.name)) return false; seenNames.add(c.name); return true; })
        .map((cat) => {
          const allCatPaths = [cat.parent, ...cat.children].map((p) => p.replace(/\/$/, "") || "/");
          const sumStats = (refMap: Map<string, number>, sessMap: Map<string, number>, gscMap: Map<string, GscStats>) =>
            allCatPaths.reduce((acc, p) => {
              const g = gscMap.get(p) ?? { clicks: 0, impressions: 0, ctr: 0, position: 0, n: 0 };
              return {
                leads: acc.leads + (refMap.get(p) ?? 0),
                sessions: acc.sessions + (sessMap.get(p) ?? 0),
                clicks: acc.clicks + g.clicks,
                impressions: acc.impressions + g.impressions,
                ctrSum: acc.ctrSum + g.ctr,
                posSum: acc.posSum + g.position,
                n: acc.n + g.n,
              };
            }, { leads: 0, sessions: 0, clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, n: 0 });

          const cur = sumStats(refMapCur, sessMapCur, gscMapCur);
          const cmp = sumStats(refMapCmp, sessMapCmp, gscMapCmp);
          return {
            category: cat.name,
            clicks: cur.clicks, impressions: cur.impressions,
            ctr: cur.n > 0 ? cur.ctrSum / cur.n : 0,
            position: cur.n > 0 ? cur.posSum / cur.n : 0,
            leads: cur.leads, sessions: cur.sessions,
            clicksCmp: cmp.clicks, impressionsCmp: cmp.impressions,
            leadsCmp: cmp.leads, sessionsCmp: cmp.sessions,
            pages: allCatPaths,
          };
        })
        .sort((a, b) => b.clicks - a.clicks);

      setCatRows(rows);
    } catch (e) {
      console.error("fetchProductCategories", e);
    }
    setCatLoading(false);
  }, [selectedGA4, selectedGSC, accessToken, ga4FetchFilters, gscFetchFilters]);

  // Fetch expanded page data for a clicked category
  const fetchCatExpanded = useCallback(async (cat: { name: string; parent: string; children: string[] }) => {
    if (!selectedGA4 || !selectedGSC || !accessToken) return;
    setCatExpandedLoading(true);
    setCatExpandedData([]);
    try {
      const ga4Base = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;
      const gscBase = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(selectedGSC)}/searchAnalytics/query`;
      const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
      const { current: curWin } = ga4DateWindows(ga4FetchFilters);
      const { startDate, endDate } = gscDateWindows(gscFetchFilters);
      // All paths for this category (parent + children), normalised (no trailing slash)
      const allPaths = [cat.parent, ...cat.children].map((p) => p.replace(/\/$/, "") || "/");

      // GSC: fetch each path separately and merge (avoids OR-filter complexity)
      // We use the parent path with "contains" to catch all children in one shot
      const parentPath = cat.parent.replace(/\/$/, "");
      const gscFetch = fetch(gscBase, { method: "POST", headers, body: JSON.stringify({
        startDate, endDate,
        dimensions: ["page"],
        dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: parentPath }] }],
        rowLimit: 50,
      }) }).then((r) => r.json()) as Promise<{ rows?: GSCApiRow[] }>;

      // GA4: sessions scoped to category paths (use page path contains filter)
      const ga4PageFilter = (fieldName: string, value: string) => ({
        filter: { fieldName, stringFilter: { matchType: "EXACT", value } }
      });
      const ga4OrgFetch = fetch(ga4Base, { method: "POST", headers, body: JSON.stringify({
        dateRanges: [curWin],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: {
          andGroup: { expressions: [
            ga4PageFilter("sessionDefaultChannelGroup", "Organic Search"),
            { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: parentPath } } },
          ]}
        },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 50,
      }) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }>;

      // Fetch /free-selling-pack sessions referred from each page in this category
      const ga4RefFetch = fetch(ga4Base, { method: "POST", headers, body: JSON.stringify({
        dateRanges: [curWin],
        dimensions: [{ name: "pageReferrer" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: {
          andGroup: { expressions: [
            { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: FREE_SELLING_PACK_PATH } } },
            { filter: { fieldName: "pageReferrer", stringFilter: { matchType: "CONTAINS", value: parentPath } } },
          ]}
        },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 100,
      }) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }>;

      const [gscData, ga4Org, ga4Ref] = await Promise.all([gscFetch, ga4OrgFetch, ga4RefFetch]);

      const normPath = (url: string) => {
        try { return new URL(url).pathname.replace(/\/$/, "") || "/"; }
        catch { return url.replace(/^https?:\/\/[^\/]+/, "").replace(/\/$/, "") || "/"; }
      };
      const sessionMap = new Map<string, number>();
      const leadMap    = new Map<string, number>(); // referrals to /free-selling-pack
      (ga4Org.rows ?? []).forEach((r) => { const p = r.dimensionValues[0].value.replace(/\/$/, "") || "/"; sessionMap.set(p, (sessionMap.get(p) ?? 0) + parseInt(r.metricValues[0].value, 10)); });
      (ga4Ref.rows ?? []).forEach((r) => { const p = normPath(r.dimensionValues[0].value); leadMap.set(p, (leadMap.get(p) ?? 0) + parseInt(r.metricValues[0].value, 10)); });

      // Build rows from GSC data, enriched with GA4 data
      const gscRows = (gscData.rows ?? []).map((r) => {
        const np = normPath(r.keys[0]);
        return { page: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position, leads: leadMap.get(np) ?? 0, sessions: sessionMap.get(np) ?? 0 };
      });

      // Also include any GA4-only pages (no GSC data) that match the parent path
      const gscPageSet = new Set(gscRows.map((r) => normPath(r.page)));
      sessionMap.forEach((sessions, p) => {
        if (!gscPageSet.has(p) && p.startsWith(parentPath)) {
          gscRows.push({ page: p, clicks: 0, impressions: 0, ctr: 0, position: 0, leads: leadMap.get(p) ?? 0, sessions });
        }
      });

      setCatExpandedData(gscRows.sort((a, b) => (b.clicks + b.sessions) - (a.clicks + a.sessions)));
    } catch (e) { console.error("fetchCatExpanded", e); setCatExpandedData([]); }
    setCatExpandedLoading(false);
  }, [selectedGA4, selectedGSC, accessToken, ga4FetchFilters, gscFetchFilters]);

  // Brand terms — anything containing these is "branded"
  const BRAND_PATTERNS = ["cash cow", "vintage cash cow", "vintagecashcow", "cashcow", "vcc"];
  const isBranded = (q: string) => {
    const l = q.toLowerCase();
    return BRAND_PATTERNS.some((b) => l.includes(b));
  };

  const fetchBrandData = useCallback(async () => {
    if (!selectedGSC || !accessToken) return;
    setBrandLoading(true);
    setBrandData(null);
    try {
      const gscBase = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(selectedGSC)}/searchAnalytics/query`;
      const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
      const { startDate, endDate } = gscDateWindows(gscFetchFilters);
      const cmpWin = comparisonWindowBefore(startDate, endDate);

      // Fetch queries (current + comparison), daily clicks, pages
      const [queryCur, queryCmp, dailyCur, pagesCur] = await Promise.all([
        // Current period — all queries
        fetch(gscBase, { method: "POST", headers, body: JSON.stringify({
          startDate, endDate, dimensions: ["query"], rowLimit: 1000,
        }) }).then((r) => r.json()) as Promise<{ rows?: GSCApiRow[] }>,
        // Previous period — all queries
        fetch(gscBase, { method: "POST", headers, body: JSON.stringify({
          startDate: cmpWin.startDate, endDate: cmpWin.endDate, dimensions: ["query"], rowLimit: 1000,
        }) }).then((r) => r.json()) as Promise<{ rows?: GSCApiRow[] }>,
        // Daily clicks by date
        fetch(gscBase, { method: "POST", headers, body: JSON.stringify({
          startDate, endDate, dimensions: ["date"], rowLimit: 500,
        }) }).then((r) => r.json()) as Promise<{ rows?: GSCApiRow[] }>,
        // Pages
        fetch(gscBase, { method: "POST", headers, body: JSON.stringify({
          startDate, endDate, dimensions: ["page"], rowLimit: 500,
        }) }).then((r) => r.json()) as Promise<{ rows?: GSCApiRow[] }>,
      ]);

      // Split queries into branded / non-branded
      const splitQueries = (rows: GSCApiRow[]) => {
        const branded: typeof rows = [], nonBranded: typeof rows = [];
        (rows ?? []).forEach((r) => (isBranded(r.keys[0]) ? branded : nonBranded).push(r));
        return { branded, nonBranded };
      };
      const { branded: bQCur, nonBranded: nbQCur } = splitQueries(queryCur.rows ?? []);
      const { branded: bQCmp, nonBranded: nbQCmp } = splitQueries(queryCmp.rows ?? []);

      const sumQ = (rows: GSCApiRow[]) => rows.reduce((a, r) => ({
        clicks: a.clicks + Math.round(r.clicks),
        impressions: a.impressions + Math.round(r.impressions),
        ctrSum: a.ctrSum + r.ctr,
        posSum: a.posSum + r.position,
        n: a.n + 1,
      }), { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, n: 0 });

      const bCur = sumQ(bQCur), nbCur = sumQ(nbQCur);
      const bCmp = sumQ(bQCmp), nbCmp = sumQ(nbQCmp);

      // GA4: referrals to /free-selling-pack from branded vs non-branded pages
      // We fetch sessions on /free-selling-pack grouped by pageReferrer, then check if each referrer
      // URL contained a branded query (we use GSC query→page data to classify, or classify the referrer URL itself)
      let brandedLeads = 0, nonBrandedLeads = 0;
      let brandedSessions = 0, nonBrandedSessions = 0;
      let brandedLeadsCmp = 0, nonBrandedLeadsCmp = 0;
      let brandedSessionsCmp = 0, nonBrandedSessionsCmp = 0;

      if (selectedGA4) {
        const ga4Base = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;
        const { current: curWin, comparison: cmpGa4Win } = ga4DateWindows(ga4FetchFilters);

        // Fetch /free-selling-pack sessions by pageReferrer (which page sent them)
        const fspRefBody = (dateRange: { startDate: string; endDate: string }) => ({
          dateRanges: [dateRange],
          dimensions: [{ name: "pageReferrer" }, { name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: {
            andGroup: { expressions: [
              { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: FREE_SELLING_PACK_PATH } } },
              { filter: { fieldName: "pageReferrer", stringFilter: { matchType: "CONTAINS", value: "vintagecashcow.co.uk" } } },
            ]}
          },
          limit: 500,
        });

        // Also fetch organic sessions split — for overall session context
        const orgSessBody = (dateRange: { startDate: string; endDate: string }) => ({
          dateRanges: [dateRange],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }],
          limit: 20,
        });

        const [fspRefCur, fspRefCmp, orgCur, orgCmp] = await Promise.all([
          fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(fspRefBody(curWin)) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }>,
          cmpGa4Win ? fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(fspRefBody(cmpGa4Win)) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }> : Promise.resolve({ rows: [] }),
          fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(orgSessBody(curWin)) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }>,
          cmpGa4Win ? fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(orgSessBody(cmpGa4Win)) }).then((r) => r.json()) as Promise<{ rows?: GA4ApiRow[] }> : Promise.resolve({ rows: [] }),
        ]);

        // Classify each referrer: if the referring page URL contains a brand term → branded referral
        const classifyReferral = (refUrl: string): "branded" | "nonBranded" => {
          const l = refUrl.toLowerCase();
          return BRAND_PATTERNS.some((b) => l.includes(b.replace(/ /g, "-")) || l.includes(b.replace(/ /g, ""))) ? "branded" : "nonBranded";
        };

        const sumFspRef = (rows?: GA4ApiRow[]) => {
          let b = 0, nb = 0;
          (rows ?? []).forEach((r) => {
            const ref = r.dimensionValues[0].value;
            const sessions = parseInt(r.metricValues[0].value, 10);
            if (classifyReferral(ref)) nb += sessions;
            // Brand referrals come from /items-we-buy/* pages that have brand terms in URL — but most category pages are non-brand
            // More accurately: classify by whether the referrer is a brand-search landing page
            // For simplicity: any referrer containing brand URL patterns → branded
            if (isBranded(ref)) b += sessions; else nb += sessions - sessions; // re-sum cleanly below
          });
          // Redo cleanly
          b = 0; nb = 0;
          (rows ?? []).forEach((r) => {
            const ref = r.dimensionValues[0].value;
            const sessions = parseInt(r.metricValues[0].value, 10);
            if (isBranded(ref)) b += sessions; else nb += sessions;
          });
          return { branded: b, nonBranded: nb };
        };

        const fspCur = sumFspRef(fspRefCur.rows);
        const fspCmp = sumFspRef(fspRefCmp.rows);

        brandedLeads    = fspCur.branded;
        nonBrandedLeads = fspCur.nonBranded;
        brandedLeadsCmp    = fspCmp.branded;
        nonBrandedLeadsCmp = fspCmp.nonBranded;

        // Sessions: use GSC brand ratio applied to organic sessions
        const totalClicksCur = bCur.clicks + nbCur.clicks || 1;
        const brandRatioCur  = bCur.clicks / totalClicksCur;
        const totalClicksCmp = bCmp.clicks + nbCmp.clicks || 1;
        const brandRatioCmp  = bCmp.clicks / totalClicksCmp;

        const getOrgSessions = (rows?: GA4ApiRow[]) =>
          (rows ?? []).filter((r) => r.dimensionValues[0].value === "Organic Search").reduce((s, r) => s + parseInt(r.metricValues[0].value, 10), 0);

        const orgSessCur = getOrgSessions(orgCur.rows);
        const orgSessCmp = getOrgSessions((orgCmp as { rows?: GA4ApiRow[] }).rows);
        brandedSessions    = Math.round(orgSessCur * brandRatioCur);
        nonBrandedSessions = orgSessCur - brandedSessions;
        brandedSessionsCmp    = Math.round(orgSessCmp * brandRatioCmp);
        nonBrandedSessionsCmp = orgSessCmp - brandedSessionsCmp;
      }

      // Build daily trend (split each day's clicks by brand ratio)
      const dailyRows = (dailyCur.rows ?? []).map((r) => ({
        date: formatDisplayDate(r.keys[0]),
        branded: Math.round(r.clicks * (bCur.clicks / (bCur.clicks + nbCur.clicks || 1))),
        nonBranded: Math.round(r.clicks * (nbCur.clicks / (bCur.clicks + nbCur.clicks || 1))),
      }));

      // Page split: use query brand ratio per page (approx — we only have per-page GSC data)
      const brandedPages = (pagesCur.rows ?? [])
        .map((r) => ({ page: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions) }))
        .filter((_, i) => i < 20);
      // Non-branded pages are the same set — we can't split pages by brand query without a page+query fetch
      // So show top pages overall, noting which are predominantly branded-traffic pages
      const nonBrandedPages = [...brandedPages];

      setBrandData({
        brandedClicks: bCur.clicks, nonBrandedClicks: nbCur.clicks,
        brandedImpressions: bCur.impressions, nonBrandedImpressions: nbCur.impressions,
        brandedCtr: bCur.n > 0 ? bCur.ctrSum / bCur.n : 0,
        nonBrandedCtr: nbCur.n > 0 ? nbCur.ctrSum / nbCur.n : 0,
        brandedPosition: bCur.n > 0 ? bCur.posSum / bCur.n : 0,
        nonBrandedPosition: nbCur.n > 0 ? nbCur.posSum / nbCur.n : 0,
        daily: dailyRows,
        brandedQueries: bQCur.sort((a, b) => b.clicks - a.clicks).slice(0, 20).map((r) => ({ query: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position })),
        nonBrandedQueries: nbQCur.sort((a, b) => b.clicks - a.clicks).slice(0, 20).map((r) => ({ query: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position })),
        brandedPages, nonBrandedPages,
        brandedLeads, nonBrandedLeads,
        brandedSessions, nonBrandedSessions,
        brandedClicksCmp: bCmp.clicks, nonBrandedClicksCmp: nbCmp.clicks,
        brandedLeadsCmp, nonBrandedLeadsCmp,
        brandedSessionsCmp, nonBrandedSessionsCmp,
      });
    } catch (e) { console.error("fetchBrandData", e); }
    setBrandLoading(false);
  }, [selectedGSC, selectedGA4, accessToken, gscFetchFilters, ga4FetchFilters]);

  // ── Daily Snapshot fetch — GSC fetched once, both GA4 properties fire in parallel ──
  const fetchDailySnapshot = useCallback(async () => {
    if (!accessToken) return;

    setSnapVCC(null);
    setSnapAV(null);
    if (selectedGA4) setSnapVCCLoading(true);
    if (avGA4Id)     setSnapAVLoading(true);

    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    const AI_REGEXP = "(chat\\.openai\\.com|chatgpt\\.com|perplexity\\.ai|claude\\.ai|bard\\.google\\.com|gemini\\.google\\.com|copilot\\.microsoft\\.com|bing\\.com|you\\.com|poe\\.com|phind\\.com|komo\\.ai|reka\\.ai|pi\\.ai|character\\.ai|huggingface\\.co)";
    const aiRegexFilter = { filter: { fieldName: "sessionSourceMedium", stringFilter: { matchType: "PARTIAL_REGEXP", value: AI_REGEXP } } };

    const classify = (q: string) => nbSeoClassify(q, nbsBrandTerms);
    const normPath = (url: string): string => {
      try { return new URL(url).pathname.replace(/\/$/, "") || "/"; }
      catch { return url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/"; }
    };

    // Resolve dates — always yesterday vs day-before by default
    const today = toISODate(new Date());
    const yesterday = addDaysISO(today, -1);
    const f = nbsuFetchFilters;
    const todayD = new Date(today + "T12:00:00");
    let startDate: string, endDate: string, cmpStartDate: string, cmpEndDate: string;
    if (f.dateRange === "yesterday") {
      startDate = yesterday; endDate = yesterday;
    } else if (f.dateRange === "lastWeek") {
      const dow = todayD.getDay();
      const lastSat = addDaysISO(today, -(dow + 1));
      const lastSun = addDaysISO(lastSat, -6);
      startDate = lastSun; endDate = lastSat;
    } else if (f.dateRange === "lastMonth") {
      const y = todayD.getFullYear(), m = todayD.getMonth();
      startDate = toISODate(new Date(y, m - 1, 1));
      endDate = toISODate(new Date(y, m, 0));
    } else {
      const n = parseInt(f.dateRange, 10) || 7;
      endDate = yesterday; startDate = addDaysISO(endDate, -(n - 1));
    }
    const len = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
    cmpEndDate = addDaysISO(startDate, -1);
    cmpStartDate = addDaysISO(cmpEndDate, -(len - 1));
    const hasCmp = f.comparison !== "none";

    // GSC has a ~4-day data lag in practice. For "yesterday" mode we pin the GSC
    // current window to today-4 (last reliably available date) and the comparison
    // to today-5 so both single-day queries are guaranteed to return data.
    // For multi-day presets the windows are wide enough that lag doesn't blank results.
    let gscStart: string, gscEnd: string, gscCmpStart: string, gscCmpEnd: string;
    if (f.dateRange === "yesterday") {
      gscStart    = addDaysISO(today, -4);
      gscEnd      = addDaysISO(today, -4);
      gscCmpStart = hasCmp ? addDaysISO(today, -5) : "";
      gscCmpEnd   = hasCmp ? addDaysISO(today, -5) : "";
    } else {
      gscStart    = addDaysISO(startDate, -3);
      gscEnd      = addDaysISO(endDate, -3);
      gscCmpStart = hasCmp ? addDaysISO(cmpStartDate, -3) : "";
      gscCmpEnd   = hasCmp ? addDaysISO(cmpEndDate, -3) : "";
    }

    type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
    type Ga4Resp = { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] };

    // ── Fetch GA4 + GSC for one property — each property uses its own GSC property ─
    const fetchForGA4 = async (ga4Id: string, propLabel: string, gscPropertyUrl: string): Promise<SnapResult> => {
      const ga4Base  = `https://analyticsdata.googleapis.com/v1beta/properties/${ga4Id}:runReport`;
      const gscBase  = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscPropertyUrl)}/searchAnalytics/query`;
      const ga4Fetch = (body: object): Promise<Ga4Resp> =>
        fetch(ga4Base, { method: "POST", headers, body: JSON.stringify(body) }).then((r) => r.json() as Promise<Ga4Resp>);
      const fetchGsc = (s: string, e: string): Promise<GscRow[]> =>
        fetch(gscBase, { method: "POST", headers, body: JSON.stringify({ startDate: s, endDate: e, dimensions: ["page", "query"], rowLimit: 25000 }) })
          .then((r) => r.json()).then((res) => (res?.rows ?? []) as GscRow[]);

      const orgFilter  = { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "CONTAINS", value: "Organic Search" } } };
      const leadFilter = { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "generate_lead" } } };

      const [ga4FspCur, ga4FspCmp, ga4SessCur, ga4SessCmp, ga4AioSess, ga4AioLeads, gscCur, gscCmp] = await Promise.all([
        ga4Fetch({ dateRanges: [{ startDate, endDate }], dimensions: [{ name: "landingPagePlusQueryString" }], metrics: [{ name: "keyEvents" }], dimensionFilter: { andGroup: { expressions: [leadFilter, orgFilter] } }, limit: 10000 }),
        hasCmp ? ga4Fetch({ dateRanges: [{ startDate: cmpStartDate, endDate: cmpEndDate }], dimensions: [{ name: "landingPagePlusQueryString" }], metrics: [{ name: "keyEvents" }], dimensionFilter: { andGroup: { expressions: [leadFilter, orgFilter] } }, limit: 10000 }) : Promise.resolve<Ga4Resp>({}),
        ga4Fetch({ dateRanges: [{ startDate, endDate }], dimensions: [{ name: "landingPagePlusQueryString" }], metrics: [{ name: "sessions" }], dimensionFilter: orgFilter, limit: 10000 }),
        hasCmp ? ga4Fetch({ dateRanges: [{ startDate: cmpStartDate, endDate: cmpEndDate }], dimensions: [{ name: "landingPagePlusQueryString" }], metrics: [{ name: "sessions" }], dimensionFilter: orgFilter, limit: 10000 }) : Promise.resolve<Ga4Resp>({}),
        ga4Fetch({ dateRanges: [{ startDate, endDate }], dimensions: [{ name: "sessionSourceMedium" }], metrics: [{ name: "sessions" }], dimensionFilter: aiRegexFilter, limit: 100 }),
        ga4Fetch({ dateRanges: [{ startDate, endDate }], dimensions: [{ name: "sessionSourceMedium" }], metrics: [{ name: "keyEvents" }], dimensionFilter: { andGroup: { expressions: [leadFilter, aiRegexFilter] } }, limit: 100 }),
        fetchGsc(gscStart, gscEnd),
        hasCmp && gscCmpStart ? fetchGsc(gscCmpStart, gscCmpEnd) : Promise.resolve<GscRow[]>([]),
      ]);

      // Per-page GSC NB click ratios for this property
      type PerPage = { b: number; nb: number };
      const aggGsc = (rows: GscRow[]) => {
        const m = new Map<string, PerPage>();
        rows.forEach((r) => {
          const path = normPath(r.keys[0]);
          const clicks = Math.round(r.clicks ?? 0);
          if (!clicks) return;
          let p = m.get(path); if (!p) { p = { b: 0, nb: 0 }; m.set(path, p); }
          if (classify(r.keys[1] ?? "") === "brand") p.b += clicks; else p.nb += clicks;
        });
        return m;
      };
      const perPageCur = aggGsc(gscCur);
      const perPageCmp = aggGsc(gscCmp);

      let totalB = 0, totalNb = 0, totalBCmp = 0, totalNbCmp = 0;
      perPageCur.forEach((v) => { totalB += v.b; totalNb += v.nb; });
      perPageCmp.forEach((v) => { totalBCmp += v.b; totalNbCmp += v.nb; });
      const siteWideNbRatio    = (totalB + totalNb) > 0 ? totalNb / (totalB + totalNb) : 0;
      const siteWideNbRatioCmp = (totalBCmp + totalNbCmp) > 0 ? totalNbCmp / (totalBCmp + totalNbCmp) : siteWideNbRatio;
      const nbClicks    = totalNb;
      const nbClicksCmp = totalNbCmp;

      const bestPos = (rows: GscRow[]) => {
        const m = new Map<string, number>();
        rows.forEach((r) => { if (classify(r.keys[1] ?? "") !== "nonBrand") return; const prev = m.get(r.keys[1]); if (prev == null || r.position < prev) m.set(r.keys[1], r.position); });
        return m;
      };
      const nbTop3    = Array.from(bestPos(gscCur).values()).filter((p) => p <= 3).length;
      const nbTop3Cmp = Array.from(bestPos(gscCmp).values()).filter((p) => p <= 3).length;

      const leadsMap = (resp: Ga4Resp) => { const m = new Map<string, number>(); (resp.rows ?? []).forEach((r) => { const v = parseInt(r.metricValues[0]?.value ?? "0", 10); if (v) { const k = normPath(r.dimensionValues[0]?.value ?? ""); m.set(k, (m.get(k) ?? 0) + v); } }); return m; };
      const sessMap  = (resp: Ga4Resp) => { const m = new Map<string, number>(); (resp.rows ?? []).forEach((r) => { const k = normPath(r.dimensionValues[0]?.value ?? ""); m.set(k, (m.get(k) ?? 0) + parseInt(r.metricValues[0]?.value ?? "0", 10)); }); return m; };

      const fspCur  = leadsMap(ga4FspCur);  const fspCmp  = leadsMap(ga4FspCmp);
      const sessCur = sessMap(ga4SessCur);   const sessCmp = sessMap(ga4SessCmp);

      let totFsp = 0, totNbLeads = 0, totFspCmp = 0, totNbLeadsCmp = 0;
      new Set([...perPageCur.keys(), ...fspCur.keys()]).forEach((path) => {
        const fsp = fspCur.get(path) ?? 0; if (!fsp) return;
        const cur = perPageCur.get(path); const tc = (cur?.b ?? 0) + (cur?.nb ?? 0);
        totFsp += fsp; totNbLeads += fsp * (tc > 0 ? cur!.nb / tc : siteWideNbRatio);
      });
      new Set([...perPageCmp.keys(), ...fspCmp.keys()]).forEach((path) => {
        const fsp = fspCmp.get(path) ?? 0; if (!fsp) return;
        const cur = perPageCmp.get(path); const tc = (cur?.b ?? 0) + (cur?.nb ?? 0);
        totFspCmp += fsp; totNbLeadsCmp += fsp * (tc > 0 ? cur!.nb / tc : siteWideNbRatioCmp);
      });

      const orgSessions    = Array.from(sessCur.values()).reduce((a, b) => a + b, 0);
      const orgSessionsCmp = Array.from(sessCmp.values()).reduce((a, b) => a + b, 0);
      const aioSessions = (ga4AioSess.rows ?? []).reduce((s, r) => s + parseInt(r.metricValues[0]?.value ?? "0", 10), 0);
      const aioSignUps  = (ga4AioLeads.rows ?? []).reduce((s, r) => s + parseInt(r.metricValues[0]?.value ?? "0", 10), 0);

      return {
        propLabel, propId: ga4Id,
        period: { start: startDate, end: endDate },
        cmpPeriod: { start: hasCmp ? cmpStartDate : "", end: hasCmp ? cmpEndDate : "" },
        orgSessions, orgSessionsCmp,
        nbClicks, nbClicksCmp,
        nbLeads: Math.round(totNbLeads), nbLeadsCmp: Math.round(totNbLeadsCmp),
        fspLeads: Math.round(totFsp), fspLeadsCmp: Math.round(totFspCmp),
        nbTop3, nbTop3Cmp,
        siteWideNbRatio,
        aioSessions, aioSignUps,
      };
    };

    // Fire both property fetches in parallel — each uses its own GA4 + GSC property
    const jobs: Promise<void>[] = [];
    if (selectedGA4 && selectedGSC) {
      const label = ga4Properties.find((p) => p.value === selectedGA4)?.label ?? "Vintage Cash Cow";
      jobs.push(fetchForGA4(selectedGA4, label, selectedGSC).then(setSnapVCC).catch(console.error).finally(() => setSnapVCCLoading(false)));
    }
    if (avGA4Id && avGscId) {
      const label = ga4Properties.find((p) => p.value === avGA4Id)?.label ?? "Arcavindi";
      jobs.push(fetchForGA4(avGA4Id, label, avGscId).then(setSnapAV).catch(console.error).finally(() => setSnapAVLoading(false)));
    }
    await Promise.all(jobs);
  }, [selectedGSC, avGscId, selectedGA4, avGA4Id, accessToken, nbsBrandTerms, nbsuFetchFilters, ga4Properties]);

  // Per-landing-page non-brand calculation for /items-we-buy/ pages:
  //   1. Fixed 7-day window vs previous 7 days.
  //   2. GSC [page, query] data: for each landing page, calculate an IMPRESSION-WEIGHTED
  //      non-brand ratio. Queries are classified using the editable brand-term list.
  //   3. GA4 metrics filtered to "Organic Search" channel group:
  //      - Total Organic Search sessions per landing page (entry-page level)
  //      - Sessions arriving at /free-selling-pack grouped by pageReferrer (the page that
  //        sent them onward) — this is the FSP referrer count per landing page.
  //   4. Apply the per-page non-brand ratio to the FSP referrer count to estimate how many
  //      of those onward sessions came from non-brand vs brand search intent.
  const fetchNbsData = useCallback(async () => {
    if (!selectedGSC || !accessToken || !selectedGA4) return;
    setNbsLoading(true);
    setNbsData(null);
    try {
      const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
      const gscBase = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(selectedGSC)}/searchAnalytics/query`;
      const ga4Base = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;

      // ── Fixed window: last 7 days (GSC data finalises with a 2-3 day delay so end = today − 3),
      //    compared against the 7 days before that. ─────────────────────────────────────────────
      const endDate = addDaysISO(toISODate(new Date()), -3);
      const startDate = addDaysISO(endDate, -6);
      const cmpEndDate = addDaysISO(startDate, -1);
      const cmpStartDate = addDaysISO(cmpEndDate, -6);

      const FSP_PATH = "/free-selling-pack";
      const ITEMS_WE_BUY_PREFIX = "/items-we-buy/";
      const classify = (q: string) => nbSeoClassify(q, nbsBrandTerms);
      const normPath = (url: string): string => {
        try { return new URL(url).pathname.replace(/\/$/, "") || "/"; }
        catch { return url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/"; }
      };
      const matchesItemsWeBuy = (urlOrPath: string): boolean =>
        normPath(urlOrPath).toLowerCase().includes(ITEMS_WE_BUY_PREFIX);

      // ── GSC: [page, query] for both windows ───────────────────────────────────────────────
      type GscRow = { keys: string[]; clicks: number; impressions: number };
      const gscFetch = async (s: string, e: string): Promise<GscRow[]> => {
        const body = JSON.stringify({ startDate: s, endDate: e, dimensions: ["page", "query"], rowLimit: 25000 });
        const res = await fetch(gscBase, { method: "POST", headers, body }).then((r) => r.json());
        return (res?.rows ?? []) as GscRow[];
      };

      // ── GA4: total Organic sessions per landing page ─────────────────────────────────────
      const ga4SessionsByLandingPage = (s: string, e: string) => JSON.stringify({
        dateRanges: [{ startDate: s, endDate: e }],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "CONTAINS", value: "Organic Search" } } },
        limit: 10000,
      });

      // ── GA4: sessions arriving at /free-selling-pack grouped by pageReferrer (Organic Search) ─
      //    This tells us: for sessions on /free-selling-pack, which page sent them here?
      //    pageReferrer is the previous-page URL within the same site.
      const ga4FspByReferrer = (s: string, e: string) => JSON.stringify({
        dateRanges: [{ startDate: s, endDate: e }],
        dimensions: [{ name: "pagePath" }, { name: "pageReferrer" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: {
          andGroup: { expressions: [
            { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: FSP_PATH } } },
            { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "CONTAINS", value: "Organic Search" } } },
          ]},
        },
        limit: 10000,
      });

      type Ga4Resp = { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] };
      const ga4Fetch = (body: string): Promise<Ga4Resp> =>
        fetch(ga4Base, { method: "POST", headers, body }).then((r) => r.json() as Promise<Ga4Resp>);

      // Fire all six requests in parallel.
      const [pageQueryCur, pageQueryCmp, ga4SessCur, ga4SessCmp, ga4FspCur, ga4FspCmp] = await Promise.all([
        gscFetch(startDate, endDate),
        gscFetch(cmpStartDate, cmpEndDate),
        ga4Fetch(ga4SessionsByLandingPage(startDate, endDate)),
        ga4Fetch(ga4SessionsByLandingPage(cmpStartDate, cmpEndDate)),
        ga4Fetch(ga4FspByReferrer(startDate, endDate)),
        ga4Fetch(ga4FspByReferrer(cmpStartDate, cmpEndDate)),
      ]);

      // ── Aggregate GSC impressions per landing page, split brand vs non-brand ─────────────
      // Filter to /items-we-buy/ pages only, here at aggregation time.
      type PerPage = { brandImpr: number; nonBrandImpr: number };
      const agg = (rows: GscRow[]): Map<string, PerPage> => {
        const m = new Map<string, PerPage>();
        rows.forEach((r) => {
          const fullPage = r.keys[0];
          if (!matchesItemsWeBuy(fullPage)) return;
          const path = normPath(fullPage);
          const query = r.keys[1];
          const impr = Math.round(r.impressions);
          if (impr === 0) return;
          let p = m.get(path);
          if (!p) { p = { brandImpr: 0, nonBrandImpr: 0 }; m.set(path, p); }
          if (classify(query) === "brand") p.brandImpr += impr; else p.nonBrandImpr += impr;
        });
        return m;
      };
      const perPageCur = agg(pageQueryCur);
      const perPageCmp = agg(pageQueryCmp);

      // ── Aggregate GA4 sessions per landing page ──────────────────────────────────────────
      const sessMap = (resp: Ga4Resp): Map<string, number> => {
        const m = new Map<string, number>();
        (resp.rows ?? []).forEach((r) => {
          const path = normPath(r.dimensionValues[0]?.value ?? "");
          if (!matchesItemsWeBuy(path)) return;
          const v = parseInt(r.metricValues[0]?.value ?? "0", 10);
          m.set(path, (m.get(path) ?? 0) + v);
        });
        return m;
      };
      const sessionsCurMap = sessMap(ga4SessCur);
      const sessionsCmpMap = sessMap(ga4SessCmp);

      // ── Aggregate FSP referrers: sessions on /free-selling-pack grouped by referrer page ─
      // For each referring path that matches /items-we-buy/, count sessions that landed on FSP.
      const fspMap = (resp: Ga4Resp): Map<string, number> => {
        const m = new Map<string, number>();
        (resp.rows ?? []).forEach((r) => {
          const referrer = r.dimensionValues[1]?.value ?? "";
          if (!referrer || referrer === "(not set)" || referrer === "(direct)") return;
          const refPath = normPath(referrer);
          if (!matchesItemsWeBuy(refPath)) return;
          const v = parseInt(r.metricValues[0]?.value ?? "0", 10);
          m.set(refPath, (m.get(refPath) ?? 0) + v);
        });
        return m;
      };
      const fspCurMap = fspMap(ga4FspCur);
      const fspCmpMap = fspMap(ga4FspCmp);

      // ── Site-wide impression-weighted NB ratio across /items-we-buy/ pages ───────────────
      let totalBrandImpr = 0, totalNonBrandImpr = 0;
      perPageCur.forEach((v) => { totalBrandImpr += v.brandImpr; totalNonBrandImpr += v.nonBrandImpr; });
      const siteWideNbRatio = (totalBrandImpr + totalNonBrandImpr) > 0
        ? totalNonBrandImpr / (totalBrandImpr + totalNonBrandImpr) : 0;

      // ── Build per-page rows ──────────────────────────────────────────────────────────────
      const allPaths = new Set<string>([
        ...perPageCur.keys(),
        ...sessionsCurMap.keys(),
        ...fspCurMap.keys(),
      ]);
      const rows: NbsLandingPageRow[] = [];
      let totOrgSess = 0, totFsp = 0, totNb = 0, totBrand = 0;
      let totOrgSessCmp = 0, totFspCmp = 0, totNbCmp = 0, totBrandCmp = 0;

      allPaths.forEach((path) => {
        const cur = perPageCur.get(path);
        const cmp = perPageCmp.get(path);

        const brandImpr = cur?.brandImpr ?? 0;
        const nonBrandImpr = cur?.nonBrandImpr ?? 0;
        const totalImpr = brandImpr + nonBrandImpr;
        let nonBrandRatio = 0;
        let usedSiteWideRatio = false;
        if (totalImpr > 0) {
          nonBrandRatio = nonBrandImpr / totalImpr;
        } else {
          nonBrandRatio = siteWideNbRatio;
          usedSiteWideRatio = true;
        }
        const cmpTotal = (cmp?.brandImpr ?? 0) + (cmp?.nonBrandImpr ?? 0);
        const nonBrandRatioCmp = cmpTotal > 0 ? (cmp!.nonBrandImpr / cmpTotal) : nonBrandRatio;

        const orgSessions = sessionsCurMap.get(path) ?? 0;
        const orgSessionsCmp = sessionsCmpMap.get(path) ?? 0;
        const fspReferrers = fspCurMap.get(path) ?? 0;
        const fspReferrersCmp = fspCmpMap.get(path) ?? 0;

        const nbReferrers = fspReferrers * nonBrandRatio;
        const brandReferrers = fspReferrers * (1 - nonBrandRatio);
        const nbReferrersCmp = fspReferrersCmp * nonBrandRatioCmp;
        const brandReferrersCmp = fspReferrersCmp * (1 - nonBrandRatioCmp);

        // Confidence: high if ≥100 impressions for the page, medium if ≥20, low otherwise / fallback used.
        let confidence: "high" | "medium" | "low" = "high";
        if (usedSiteWideRatio || totalImpr < 20) confidence = "low";
        else if (totalImpr < 100) confidence = "medium";

        totOrgSess += orgSessions; totFsp += fspReferrers; totNb += nbReferrers; totBrand += brandReferrers;
        totOrgSessCmp += orgSessionsCmp; totFspCmp += fspReferrersCmp; totNbCmp += nbReferrersCmp; totBrandCmp += brandReferrersCmp;

        rows.push({
          page: path,
          brandImpressions: brandImpr,
          nonBrandImpressions: nonBrandImpr,
          nonBrandRatio,
          orgSessions,
          fspReferrers,
          nbReferrers,
          brandReferrers,
          orgSessionsCmp,
          fspReferrersCmp,
          nbReferrersCmp,
          brandReferrersCmp,
          nonBrandRatioCmp,
          usedSiteWideRatio,
          confidence,
        });
      });

      // Sort by non-brand referrers descending (this is the headline metric).
      rows.sort((a, b) => b.nbReferrers - a.nbReferrers);

      setNbsData({
        rows,
        totals: {
          orgSessions: totOrgSess,
          fspReferrers: totFsp,
          nbReferrers: totNb,
          brandReferrers: totBrand,
          orgSessionsCmp: totOrgSessCmp,
          fspReferrersCmp: totFspCmp,
          nbReferrersCmp: totNbCmp,
          brandReferrersCmp: totBrandCmp,
          brandImpressions: totalBrandImpr,
          nonBrandImpressions: totalNonBrandImpr,
          siteWideNbRatio,
        },
        period: { start: startDate, end: endDate },
        cmpPeriod: { start: cmpStartDate, end: cmpEndDate },
        fetchedAt: Date.now(),
      });
    } catch (e) { console.error("fetchNbsData", e); }
    setNbsLoading(false);
  }, [selectedGSC, selectedGA4, accessToken, nbsBrandTerms]);


  // ── Non-Brand Sign Ups fetch ───────────────────────────────────────────────
  // Per-landing-page non-brand calculation for the whole site:
  //   1. Configurable window (default last 7 days vs previous 7).
  //   2. GSC [page, query] data: for each landing page, CLICK-WEIGHTED non-brand ratio.
  //   3. GA4: total Organic Search sessions per landing page.
  //   4. GA4: sessions whose journey included /free-selling-pack AND fired the
  //      generate_lead key event — grouped by the session's landing page.
  //      Implemented via dimension=landingPagePlusQueryString + metric=keyEvents,
  //      with `eventName=generate_lead` filter. Because generate_lead fires on the
  //      FSP form, every counted session by definition involved /free-selling-pack.
  //   5. Apply per-page NB ratio to the FSP-lead count to estimate non-brand vs brand.
  const fetchNbsuData = useCallback(async () => {
    if (!selectedGSC || !accessToken || !selectedGA4) return;
    setNbsuLoading(true);
    setNbsuData(null);
    setNbsuDrill(null);
    try {
      const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
      const gscBase = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(selectedGSC)}/searchAnalytics/query`;
      const ga4Base = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;

      // ── Resolve the date windows from nbsuFetchFilters ──────────────────────
      // For rolling day-count presets (last 7/28/30/90), we end at yesterday so
      // GSC (which lags 2-3 days) + GA4 align — and "last 7 days" means what the
      // user expects (e.g. 13-19 May, not 10-16). For calendar-aligned presets
      // (this week, this month, this year, qtd, today) we use the literal
      // calendar boundary the user asked for.
      const today = toISODate(new Date());
      const yesterday = addDaysISO(today, -1);
      const gscEndCap = yesterday;
      const resolveWindow = (): { start: string; end: string; cmpStart: string; cmpEnd: string } => {
        const f = nbsuFetchFilters;

        // ── Custom range ────────────────────────────────────────────────────
        if (f.dateRange === "custom" && f.customStart && f.customEnd) {
          const start = f.customStart;
          const end = f.customEnd;
          let cmpStart: string, cmpEnd: string;
          if (f.comparison === "none") {
            cmpStart = ""; cmpEnd = "";
          } else if (f.comparison === "prevYear") {
            cmpStart = addDaysISO(start, -365);
            cmpEnd = addDaysISO(end, -365);
          } else if (f.customCompareStart && f.customCompareEnd) {
            cmpStart = f.customCompareStart; cmpEnd = f.customCompareEnd;
          } else {
            const dStart = new Date(start), dEnd = new Date(end);
            const len = Math.round((dEnd.getTime() - dStart.getTime()) / 86400000) + 1;
            cmpEnd = addDaysISO(start, -1);
            cmpStart = addDaysISO(cmpEnd, -(len - 1));
          }
          return { start, end, cmpStart, cmpEnd };
        }

        // ── Resolve the current window for each preset ──────────────────────
        const todayD = new Date(today + "T12:00:00");
        let start: string, end: string;

        switch (f.dateRange) {
          case "today": {
            start = today; end = today; break;
          }
          case "yesterday": {
            start = yesterday; end = yesterday; break;
          }
          case "thisWeek": {
            // Sunday of this week → today
            const dow = todayD.getDay(); // 0 = Sunday
            start = addDaysISO(today, -dow);
            end = today;
            break;
          }
          case "lastWeek": {
            // Last full week: Sunday → Saturday
            const dow = todayD.getDay(); // 0 = Sunday
            // Last Saturday
            const lastSat = addDaysISO(today, -(dow + 1));
            const lastSun = addDaysISO(lastSat, -6);
            start = lastSun; end = lastSat; break;
          }
          case "thisMonth": {
            const y = todayD.getFullYear(), m = todayD.getMonth();
            start = toISODate(new Date(y, m, 1));
            end = today;
            break;
          }
          case "lastMonth": {
            const y = todayD.getFullYear(), m = todayD.getMonth();
            start = toISODate(new Date(y, m - 1, 1));
            end = toISODate(new Date(y, m, 0)); // day 0 of this month = last day of prev month
            break;
          }
          case "qtd": {
            const y = todayD.getFullYear(), m = todayD.getMonth();
            const qStartMonth = Math.floor(m / 3) * 3;
            start = toISODate(new Date(y, qStartMonth, 1));
            end = today;
            break;
          }
          case "thisYear": {
            const y = todayD.getFullYear();
            start = toISODate(new Date(y, 0, 1));
            end = today;
            break;
          }
          case "lastYear": {
            const y = todayD.getFullYear() - 1;
            start = `${y}-01-01`;
            end = `${y}-12-31`;
            break;
          }
          default: {
            // Rolling day-count: "7", "28", "30", "90". End at yesterday for GSC/GA4 alignment.
            const n = parseInt(f.dateRange, 10) || 7;
            end = gscEndCap;
            start = addDaysISO(end, -(n - 1));
          }
        }

        // ── Resolve the comparison window ───────────────────────────────────
        let cmpStart = "", cmpEnd = "";
        if (f.comparison === "prevYear") {
          cmpStart = addDaysISO(start, -365);
          cmpEnd = addDaysISO(end, -365);
        } else if (f.comparison === "prev") {
          // For calendar-aligned presets, the "previous" period is the equivalent
          // prior calendar unit. For rolling/day-count presets, it's the same number
          // of days immediately before the current window.
          if (f.dateRange === "lastMonth") {
            const startD = new Date(start + "T12:00:00");
            const y = startD.getFullYear(), m = startD.getMonth();
            cmpStart = toISODate(new Date(y, m - 1, 1));
            cmpEnd = toISODate(new Date(y, m, 0));
          } else if (f.dateRange === "thisMonth") {
            const startD = new Date(start + "T12:00:00");
            const y = startD.getFullYear(), m = startD.getMonth();
            cmpStart = toISODate(new Date(y, m - 1, 1));
            // Same day-of-month as current end, but in the previous month (clamped to month length).
            const endD = new Date(end + "T12:00:00");
            const dom = endD.getDate();
            const prevMonthLastDay = new Date(y, m, 0).getDate();
            cmpEnd = toISODate(new Date(y, m - 1, Math.min(dom, prevMonthLastDay)));
          } else if (f.dateRange === "lastYear") {
            const y = new Date(start + "T12:00:00").getFullYear() - 1;
            cmpStart = `${y}-01-01`;
            cmpEnd = `${y}-12-31`;
          } else if (f.dateRange === "thisYear") {
            const y = new Date(start + "T12:00:00").getFullYear() - 1;
            cmpStart = `${y}-01-01`;
            const endD = new Date(end + "T12:00:00");
            // Same day-of-year position in previous year
            cmpEnd = toISODate(new Date(y, endD.getMonth(), endD.getDate()));
          } else if (f.dateRange === "qtd") {
            const startD = new Date(start + "T12:00:00");
            const y = startD.getFullYear(), m = startD.getMonth();
            cmpStart = toISODate(new Date(y, m - 3, 1));
            const endD = new Date(end + "T12:00:00");
            const offset = Math.round((endD.getTime() - startD.getTime()) / 86400000);
            cmpEnd = addDaysISO(cmpStart, offset);
          } else if (f.dateRange === "lastWeek" || f.dateRange === "thisWeek") {
            // Previous 7 days immediately before the current window
            cmpEnd = addDaysISO(start, -1);
            cmpStart = addDaysISO(cmpEnd, -6);
          } else {
            // Rolling day-counts + today + yesterday: previous period of same length.
            const len = Math.round((new Date(end + "T12:00:00").getTime() - new Date(start + "T12:00:00").getTime()) / 86400000) + 1;
            cmpEnd = addDaysISO(start, -1);
            cmpStart = addDaysISO(cmpEnd, -(len - 1));
          }
        }

        return { start, end, cmpStart, cmpEnd };
      };
      const { start: startDate, end: endDate, cmpStart: cmpStartDate, cmpEnd: cmpEndDate } = resolveWindow();
      const hasCmp = !!cmpStartDate && !!cmpEndDate;

      // GSC has a ~4-day data lag in practice. When "yesterday" is selected, GA4 uses actual
      // yesterday, but we pin GSC to today-4 (the last reliably available GSC date) for the
      // current window and today-5 for the comparison window so both days have data.
      // For all other presets the window is wide enough that the lag doesn't blank the result.
      const gscStartDate = nbsuFetchFilters.dateRange === "yesterday" ? addDaysISO(today, -4) : startDate;
      const gscEndDate   = nbsuFetchFilters.dateRange === "yesterday" ? addDaysISO(today, -4) : endDate;
      const gscCmpStartDate = (nbsuFetchFilters.dateRange === "yesterday" && cmpStartDate) ? addDaysISO(today, -5) : cmpStartDate;
      const gscCmpEndDate   = (nbsuFetchFilters.dateRange === "yesterday" && cmpEndDate)   ? addDaysISO(today, -5) : cmpEndDate;

      const classify = (q: string) => nbSeoClassify(q, nbsBrandTerms);
      const normPath = (url: string): string => {
        try { return new URL(url).pathname.replace(/\/$/, "") || "/"; }
        catch { return url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "") || "/"; }
      };
      // Skip any URL/path containing a query string — keeps the report focused on
      // canonical landing pages and avoids parameterised variants polluting totals.
      const hasQueryString = (s: string): boolean => s.includes("?");

      // ── GSC: [page, query] for current + comparison windows ─────────────────
      type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
      const gscFetch = async (s: string, e: string): Promise<GscRow[]> => {
        const body = JSON.stringify({ startDate: s, endDate: e, dimensions: ["page", "query"], rowLimit: 25000 });
        const res = await fetch(gscBase, { method: "POST", headers, body }).then((r) => r.json());
        return (res?.rows ?? []) as GscRow[];
      };

      // ── GA4: total Organic Search sessions per landing page ────────────────
      const ga4SessionsByLandingPage = (s: string, e: string) => JSON.stringify({
        dateRanges: [{ startDate: s, endDate: e }],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "CONTAINS", value: "Organic Search" } } },
        limit: 10000,
      });

      // ── GA4: generate_lead key-event count per landing page (Organic Search) ─
      //    keyEvents respects the event-name filter, so this is the # of
      //    generate_lead events fired in sessions starting at each landing page.
      //    Since generate_lead fires on the FSP form, this captures sessions
      //    that involved /free-selling-pack and converted.
      const ga4FspLeadsByLandingPage = (s: string, e: string) => JSON.stringify({
        dateRanges: [{ startDate: s, endDate: e }],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "keyEvents" }],
        dimensionFilter: {
          andGroup: { expressions: [
            { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "generate_lead" } } },
            { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "CONTAINS", value: "Organic Search" } } },
          ]},
        },
        limit: 10000,
      });

      type Ga4Resp = { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] };
      const ga4Fetch = (body: string): Promise<Ga4Resp> =>
        fetch(ga4Base, { method: "POST", headers, body }).then((r) => r.json() as Promise<Ga4Resp>);

      // Empty-resolver for the no-comparison case keeps the parallel array simple.
      const emptyGsc: Promise<GscRow[]> = Promise.resolve([]);
      const emptyGa4: Promise<Ga4Resp> = Promise.resolve({ rows: [] });

      // ── GSC: daily total clicks for the current period (no comparison) ─────
      // Used to build the brand vs non-brand time series in the UI. We split each
      // day's clicks by the period-wide brand/non-brand ratio (same approximation
      // as the Brand-vs-NonBrand section). For a more accurate per-day split we
      // would need a [date, query] fetch, but that runs into rowLimit issues on
      // long windows and the period-wide ratio is a reasonable trend proxy.
      const gscDaySpan = Math.max(
        1,
        Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1,
      );
      const gscDailyFetch = async (s: string, e: string): Promise<{ date: string; clicks: number }[]> => {
        const body = JSON.stringify({ startDate: s, endDate: e, dimensions: ["date"], rowLimit: Math.max(gscDaySpan, 25) });
        const res = await fetch(gscBase, { method: "POST", headers, body }).then((r) => r.json());
        return ((res?.rows ?? []) as GscRow[]).map((r) => ({ date: r.keys[0], clicks: Math.round(r.clicks ?? 0) }));
      };

      // ── GA4: daily generate_lead key-event count (Organic Search) ──────────
      const ga4FspDaily = (s: string, e: string) => JSON.stringify({
        dateRanges: [{ startDate: s, endDate: e }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "keyEvents" }],
        dimensionFilter: {
          andGroup: { expressions: [
            { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "generate_lead" } } },
            { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "CONTAINS", value: "Organic Search" } } },
          ]},
        },
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 1000,
      });

      const [pageQueryCur, pageQueryCmp, ga4SessCur, ga4SessCmp, ga4FspCur, ga4FspCmp, gscDailyCur, ga4FspDailyCur] = await Promise.all([
        gscFetch(gscStartDate, gscEndDate),
        hasCmp ? gscFetch(gscCmpStartDate, gscCmpEndDate) : emptyGsc,
        ga4Fetch(ga4SessionsByLandingPage(startDate, endDate)),
        hasCmp ? ga4Fetch(ga4SessionsByLandingPage(cmpStartDate, cmpEndDate)) : emptyGa4,
        ga4Fetch(ga4FspLeadsByLandingPage(startDate, endDate)),
        hasCmp ? ga4Fetch(ga4FspLeadsByLandingPage(cmpStartDate, cmpEndDate)) : emptyGa4,
        gscDailyFetch(gscStartDate, gscEndDate),
        ga4Fetch(ga4FspDaily(startDate, endDate)),
      ]);

      // ── Aggregate GSC CLICKS per landing page, split brand vs non-brand ────
      // Whole-site (no /items-we-buy/ filter here).
      type PerPage = { brandClicks: number; nonBrandClicks: number };
      const agg = (rows: GscRow[]): Map<string, PerPage> => {
        const m = new Map<string, PerPage>();
        rows.forEach((r) => {
          const fullPage = r.keys[0];
          const path = normPath(fullPage);
          const query = r.keys[1];
          const clicks = Math.round(r.clicks);
          if (clicks === 0) return;
          let p = m.get(path);
          if (!p) { p = { brandClicks: 0, nonBrandClicks: 0 }; m.set(path, p); }
          if (classify(query) === "brand") p.brandClicks += clicks; else p.nonBrandClicks += clicks;
        });
        return m;
      };
      const perPageCur = agg(pageQueryCur);
      const perPageCmp = agg(pageQueryCmp);

      // ── Aggregate GA4 sessions per landing page ────────────────────────────
      const sessMap = (resp: Ga4Resp): Map<string, number> => {
        const m = new Map<string, number>();
        (resp.rows ?? []).forEach((r) => {
          const raw = r.dimensionValues[0]?.value ?? "";
          const path = normPath(raw);
          const v = parseInt(r.metricValues[0]?.value ?? "0", 10);
          m.set(path, (m.get(path) ?? 0) + v);
        });
        return m;
      };
      const sessionsCurMap = sessMap(ga4SessCur);
      const sessionsCmpMap = sessMap(ga4SessCmp);

      // ── Aggregate generate_lead key-event count per landing page ───────────
      const leadsMap = (resp: Ga4Resp): Map<string, number> => {
        const m = new Map<string, number>();
        (resp.rows ?? []).forEach((r) => {
          const raw = r.dimensionValues[0]?.value ?? "";
          const path = normPath(raw);
          const v = parseInt(r.metricValues[0]?.value ?? "0", 10);
          if (v === 0) return;
          m.set(path, (m.get(path) ?? 0) + v);
        });
        return m;
      };
      const fspCurMap = leadsMap(ga4FspCur);
      const fspCmpMap = leadsMap(ga4FspCmp);

      // ── Site-wide click-weighted NB ratio across the whole site ────────────
      let totalBrandClicks = 0, totalNonBrandClicks = 0;
      perPageCur.forEach((v) => { totalBrandClicks += v.brandClicks; totalNonBrandClicks += v.nonBrandClicks; });
      const siteWideNbRatio = (totalBrandClicks + totalNonBrandClicks) > 0
        ? totalNonBrandClicks / (totalBrandClicks + totalNonBrandClicks) : 0;

      // ── Build per-page rows ────────────────────────────────────────────────
      const allPaths = new Set<string>([
        ...perPageCur.keys(),
        ...sessionsCurMap.keys(),
        ...fspCurMap.keys(),
      ]);
      const rows: NbsuLandingPageRow[] = [];
      let totOrgSess = 0, totFsp = 0, totNb = 0, totBrand = 0;
      let totOrgSessCmp = 0, totFspCmp = 0, totNbCmp = 0, totBrandCmp = 0;

      allPaths.forEach((path) => {
        const cur = perPageCur.get(path);
        const cmp = perPageCmp.get(path);

        const brandClicks = cur?.brandClicks ?? 0;
        const nonBrandClicks = cur?.nonBrandClicks ?? 0;
        const totalClicks = brandClicks + nonBrandClicks;
        let nonBrandRatio = 0;
        let usedSiteWideRatio = false;
        if (totalClicks > 0) {
          nonBrandRatio = nonBrandClicks / totalClicks;
        } else {
          nonBrandRatio = siteWideNbRatio;
          usedSiteWideRatio = true;
        }
        const cmpTotal = (cmp?.brandClicks ?? 0) + (cmp?.nonBrandClicks ?? 0);
        const nonBrandRatioCmp = cmpTotal > 0 ? (cmp!.nonBrandClicks / cmpTotal) : nonBrandRatio;

        const orgSessions = sessionsCurMap.get(path) ?? 0;
        const orgSessionsCmp = sessionsCmpMap.get(path) ?? 0;
        const fspLeads = fspCurMap.get(path) ?? 0;
        const fspLeadsCmp = fspCmpMap.get(path) ?? 0;

        // Skip pages with absolutely nothing relevant to surface.
        if (orgSessions === 0 && fspLeads === 0 && totalClicks === 0) return;

        const nbLeads = fspLeads * nonBrandRatio;
        const brandLeads = fspLeads * (1 - nonBrandRatio);
        const nbLeadsCmp = fspLeadsCmp * nonBrandRatioCmp;
        const brandLeadsCmp = fspLeadsCmp * (1 - nonBrandRatioCmp);

        // Confidence based on click volume — high if ≥50 clicks, medium ≥10, else low.
        let confidence: "high" | "medium" | "low" = "high";
        if (usedSiteWideRatio || totalClicks < 10) confidence = "low";
        else if (totalClicks < 50) confidence = "medium";

        totOrgSess += orgSessions; totFsp += fspLeads; totNb += nbLeads; totBrand += brandLeads;
        totOrgSessCmp += orgSessionsCmp; totFspCmp += fspLeadsCmp; totNbCmp += nbLeadsCmp; totBrandCmp += brandLeadsCmp;

        rows.push({
          page: path,
          brandClicks,
          nonBrandClicks,
          nonBrandRatio,
          orgSessions,
          fspLeads,
          nbLeads,
          brandLeads,
          orgSessionsCmp,
          fspLeadsCmp,
          nbLeadsCmp,
          brandLeadsCmp,
          nonBrandRatioCmp,
          usedSiteWideRatio,
          confidence,
        });
      });

      // Sort by non-brand leads desc — the headline metric.
      rows.sort((a, b) => b.nbLeads - a.nbLeads);

      // Project the raw GSC [page, query] rows into a compact shape for the
      // query-level winners/losers tables. ? URLs and zero-impression rows already
      // filtered out; classification done up-front so the UI doesn't repeat it.
      const projectGsc = (gscRows: GscRow[]) =>
        gscRows
          .filter((r) => !hasQueryString(r.keys[0]) && (r.impressions ?? 0) > 0)
          .map((r) => ({
            page: normPath(r.keys[0]),
            query: r.keys[1] ?? "",
            clicks: Math.round(r.clicks ?? 0),
            impressions: Math.round(r.impressions ?? 0),
            position: r.position ?? 0,
            cls: classify(r.keys[1] ?? "") as "brand" | "nonBrand",
          }));
      const queryPageRowsCur = projectGsc(pageQueryCur);
      const queryPageRowsCmp = projectGsc(pageQueryCmp);

      // ── Build daily time series ─────────────────────────────────────────────
      // Index GA4 daily generate_lead by date (YYYYMMDD format from the API).
      // Then for each GSC daily clicks row, split brand/non-brand using the
      // period-wide site ratio, and also split that day's GA4 leads by the
      // same ratio. This is the same approximation used by the existing
      // Brand-vs-Non-Brand trend chart elsewhere in the app.
      const ga4DailyLeadMap = new Map<string, number>();
      ((ga4FspDailyCur as Ga4Resp).rows ?? []).forEach((r) => {
        const ymd = r.dimensionValues?.[0]?.value ?? ""; // e.g. "20250515"
        const iso = ymd.length === 8 ? `${ymd.slice(0,4)}-${ymd.slice(4,6)}-${ymd.slice(6,8)}` : ymd;
        const v = Number(r.metricValues?.[0]?.value ?? 0);
        if (iso) ga4DailyLeadMap.set(iso, (ga4DailyLeadMap.get(iso) ?? 0) + v);
      });
      // GSC dates come as "YYYY-MM-DD" already.
      const brandShare = 1 - siteWideNbRatio;
      const dailyDates = new Set<string>();
      gscDailyCur.forEach((r) => dailyDates.add(r.date));
      ga4DailyLeadMap.forEach((_, k) => dailyDates.add(k));
      const dailyClicksMap = new Map(gscDailyCur.map((r) => [r.date, r.clicks]));
      const daily = Array.from(dailyDates)
        .sort()
        .map((date) => {
          const clicks = dailyClicksMap.get(date) ?? 0;
          const leads = ga4DailyLeadMap.get(date) ?? 0;
          return {
            date,
            brandClicks: Math.round(clicks * brandShare),
            nonBrandClicks: Math.round(clicks * siteWideNbRatio),
            brandLeads: leads * brandShare,
            nonBrandLeads: leads * siteWideNbRatio,
          };
        });

      setNbsuData({
        rows,
        totals: {
          orgSessions: totOrgSess,
          fspLeads: totFsp,
          nbLeads: totNb,
          brandLeads: totBrand,
          orgSessionsCmp: totOrgSessCmp,
          fspLeadsCmp: totFspCmp,
          nbLeadsCmp: totNbCmp,
          brandLeadsCmp: totBrandCmp,
          brandClicks: totalBrandClicks,
          nonBrandClicks: totalNonBrandClicks,
          siteWideNbRatio,
        },
        queryPageRowsCur,
        queryPageRowsCmp,
        daily,
        period: { start: startDate, end: endDate },
        cmpPeriod: { start: cmpStartDate, end: cmpEndDate },
        fetchedAt: Date.now(),
      });
    } catch (e) { console.error("fetchNbsuData", e); }
    setNbsuLoading(false);
  }, [selectedGSC, selectedGA4, accessToken, nbsBrandTerms, nbsuFetchFilters]);


  const fetchSeoIssues = useCallback(async () => {
    if (!selectedGA4 || !accessToken) return;
    setSeoIssuesLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const base = `https://analyticsdata.googleapis.com/v1beta/properties/${selectedGA4}:runReport`;
    const { current: curWin } = ga4DateWindows(ga4FetchFilters);
    const common = { dateRanges: [{ startDate: curWin.startDate, endDate: curWin.endDate }] };
    const [noTr, lowEng, t404] = await Promise.all([
      fetch(base, { method: "POST", headers, body: JSON.stringify({
        ...common,
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: false }],
        limit: 200,
      }) }).then((r) => r.json()),
      fetch(base, { method: "POST", headers, body: JSON.stringify({
        ...common,
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "engagementRate" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "engagementRate" }, desc: false }],
        limit: 200,
      }) }).then((r) => r.json()),
      fetch(base, { method: "POST", headers, body: JSON.stringify({
        ...common,
        dimensions: [{ name: "pageTitle" }, { name: "pagePathPlusQueryString" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: { filter: { fieldName: "pageTitle", stringFilter: { matchType: "CONTAINS", value: "404" } } },
        limit: 100,
      }) }).then((r) => r.json()),
    ]);
    setSeoNoTraffic(
      ((noTr.rows as GA4ApiRow[]) ?? [])
        .map((r) => ({ page: r.dimensionValues[0].value, sessions: parseInt(r.metricValues[0].value, 10) }))
        .filter((r) => r.sessions < 3)
        .slice(0, 100),
    );
    setSeoLowEngagement(
      ((lowEng.rows as GA4ApiRow[]) ?? [])
        .map((r) => ({
          page: r.dimensionValues[0].value,
          engagementRate: parseFloat(r.metricValues[0].value),
          sessions: parseInt(r.metricValues[1].value, 10),
        }))
        .filter((r) => r.sessions >= 10 && r.engagementRate < 0.35)
        .slice(0, 100),
    );
    setSeo404Titles(
      ((t404.rows as GA4ApiRow[]) ?? []).map((r) => ({
        title: r.dimensionValues[0].value,
        page: r.dimensionValues[1].value,
        sessions: parseInt(r.metricValues[0].value, 10),
      })),
    );
    setSeoIssuesLoading(false);
  }, [selectedGA4, accessToken, ga4FetchFilters]);

  useEffect(() => { if (activeView === "conversions" && selectedGA4 && accessToken) { void fetchConvEventList(); void fetchConversions(); } }, [activeView, selectedGA4, accessToken, fetchConversions, fetchConvEventList]);

  useEffect(() => {
    if (activeView !== "conversions" || !selectedGA4 || !accessToken) return;
    const t = setTimeout(() => void fetchConversions(), 450);
    return () => clearTimeout(t);
  }, [convEventName]); // eslint-disable-line react-hooks/exhaustive-deps -- conversions mount/refetch is handled by the effect above

  useEffect(() => { if (activeView === "seoIssues" && selectedGA4 && accessToken) void fetchSeoIssues(); }, [activeView, selectedGA4, accessToken, fetchSeoIssues]);
  useEffect(() => { if (activeView === "productCategories" && selectedGA4 && selectedGSC && accessToken) void fetchProductCategories(); }, [activeView, selectedGA4, selectedGSC, accessToken, fetchProductCategories]);
  useEffect(() => { if (activeView === "brandVsNonBrand" && selectedGSC && accessToken) void fetchBrandData(); }, [activeView, selectedGSC, accessToken, fetchBrandData]);
  useEffect(() => {
    if (activeView === "nbSeo" && selectedGSC && accessToken) void fetchNbsData();
  }, [activeView, selectedGSC, accessToken, fetchNbsData]);

  // Debounce nbsuFilters changes into nbsuFetchFilters (which is the actual fetch trigger).
  useEffect(() => {
    const t = setTimeout(() => setNbsuFetchFilters(nbsuFilters), 350);
    return () => clearTimeout(t);
  }, [nbsuFilters]);
  useEffect(() => {
    if ((activeView === "nbSignUps" || activeView === "dailySnapshot") && selectedGSC && selectedGA4 && accessToken) void fetchNbsuData();
  }, [activeView, selectedGSC, selectedGA4, accessToken, fetchNbsuData]);

  useEffect(() => {
    if (activeView === "dailySnapshot" && selectedGSC && selectedGA4 && accessToken) void fetchDailySnapshot();
  }, [activeView, selectedGSC, selectedGA4, avGA4Id, accessToken, fetchDailySnapshot]);

  // ── Auto-check mentions: for every page in gscPages, fetch copy and check query presence ──
  useEffect(() => {
    if (!gscPages.length || !gscQueries.length) return;
    const querySet = new Set<string>(gscQueries.map((q) => q.query.toLowerCase()));
    const pagesToCheck = gscPages.slice(0, 80).map((p) => p.page);
    const BRAND = ["vintage cash cow", "vintagecashcow", "vcc"];
    const checkPage = async (pageUrl: string) => {
      setOppMentionChecked((prev) => new Set([...prev, pageUrl]));
      try {
        const resp = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`);
        const json = await resp.json() as { contents: string };
        const text = (json.contents ?? "").toLowerCase().replace(/<[^>]+>/g, " ");
        const found = new Set<string>();
        for (const q of querySet) {
          if (BRAND.some((b) => q.includes(b))) continue;
          if (text.includes(q)) found.add(q);
        }
        setOppMentionMap((prev) => new Map([...prev, [pageUrl, found]]));
      } catch {
        setOppMentionMap((prev) => new Map([...prev, [pageUrl, new Set()]]));
      }
    };
    pagesToCheck.forEach((url, i) => {
      if (!oppMentionChecked.has(url)) setTimeout(() => void checkPage(url), i * 500);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gscPages.length, gscQueries.length, selectedGSC]);

  // ── Fetch expanded rows when opp table row clicked ──
  const fetchOppExpanded = useCallback(async (key: string, mode: "query" | "page") => {
    if (!selectedGSC || !accessToken) return;
    setOppExpandedLoading(true);
    setOppExpandedData([]);
    const gf = gscFetchFilters;
    const { startDate, endDate } = gscDateWindows(gf);
    const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(selectedGSC)}/searchAnalytics/query`;
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
    try {
      const dim = mode === "query" ? "page" : "query";
      const filterDim = mode === "query" ? "query" : "page";
      const j = await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify({
          startDate, endDate,
          dimensions: [dim],
          dimensionFilterGroups: [{ filters: [{ dimension: filterDim, operator: "equals", expression: key }] }],
          rowLimit: 10,
        }),
      }).then((r) => r.json()) as { rows?: GSCApiRow[] };
      const rows: QueryRow[] = ((j.rows as GSCApiRow[]) ?? []).map((r) => ({
        query: r.keys[0],
        clicks: Math.round(r.clicks),
        impressions: Math.round(r.impressions),
        ctr: r.ctr,
        position: r.position,
      }));
      setOppExpandedData(rows);
    } catch { setOppExpandedData([]); }
    setOppExpandedLoading(false);
  }, [selectedGSC, accessToken, gscFetchFilters]);

  useEffect(() => {
    if (!selectedGSC || !accessToken || (!gscLinkQuery && !gscLinkPage)) {
      setGscCrossPages([]);
      setGscCrossQueries([]);
      return;
    }
    const ac = new AbortController();
    const gf = gscFetchFilters;
    const { startDate, endDate } = gscDateWindows(gf);
    const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(selectedGSC)}/searchAnalytics/query`;
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const parseGscDim = (data: { rows?: GSCApiRow[] }): QueryRow[] =>
      (data?.rows as GSCApiRow[])?.map((r) => ({
        query: r.keys[0],
        clicks: Math.round(r.clicks),
        impressions: Math.round(r.impressions),
        ctr: r.ctr,
        position: r.position,
      })) ?? [];
    (async () => {
      try {
        if (gscLinkQuery) {
          const j = await fetch(base, {
            method: "POST",
            headers,
            signal: ac.signal,
            body: JSON.stringify({
              startDate,
              endDate,
              dimensions: ["page"],
              dimensionFilterGroups: [{ filters: [{ dimension: "query", operator: "equals", expression: gscLinkQuery }] }],
              rowLimit: 100,
            }),
          }).then((r) => r.json());
          setGscCrossPages(parseGscDim(j));
        } else setGscCrossPages([]);
        if (gscLinkPage) {
          const j2 = await fetch(base, {
            method: "POST",
            headers,
            signal: ac.signal,
            body: JSON.stringify({
              startDate,
              endDate,
              dimensions: ["query"],
              dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: gscLinkPage }] }],
              rowLimit: 100,
            }),
          }).then((r) => r.json());
          setGscCrossQueries(parseGscDim(j2));
        } else setGscCrossQueries([]);
      } catch {
        if (!ac.signal.aborted) {
          setGscCrossPages([]);
          setGscCrossQueries([]);
        }
      }
    })();
    return () => ac.abort();
  }, [gscLinkQuery, gscLinkPage, selectedGSC, accessToken, gscFetchFilters]);

  useEffect(() => { fetchGA4(); }, [fetchGA4]);
  useEffect(() => { fetchGSC(); }, [fetchGSC]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchGA4(), fetchGSC()]);
    if (activeView === "conversions") await fetchConversions();
    if (activeView === "seoIssues") await fetchSeoIssues();
    setRefreshing(false);
  }

  // ── GSC filtered + sorted rows (all client-side) ──────────────────────────
  const filteredGscRows = useMemo(() => {
    let rows = [...gscQueries];

    // Query text filter
    if (gscFilters.queryFilter.trim()) {
      const q = gscFilters.queryFilter.trim();
      if (gscFilters.queryFilterMode === "contains") {
        rows = rows.filter((r) => r.query.toLowerCase().includes(q.toLowerCase()));
      } else if (gscFilters.queryFilterMode === "notContains") {
        rows = rows.filter((r) => !r.query.toLowerCase().includes(q.toLowerCase()));
      } else if (gscFilters.queryFilterMode === "regex") {
        try {
          const re = new RegExp(q, "i");
          rows = rows.filter((r) => re.test(r.query));
        } catch { /* invalid regex — show all */ }
      }
    }

    // Numeric filters
    if (gscFilters.minClicks)      rows = rows.filter((r) => r.clicks      >= parseInt(gscFilters.minClicks));
    if (gscFilters.minImpressions) rows = rows.filter((r) => r.impressions >= parseInt(gscFilters.minImpressions));
    if (gscFilters.minCtr)         rows = rows.filter((r) => r.ctr * 100   >= parseFloat(gscFilters.minCtr));
    if (gscFilters.minPosition)    rows = rows.filter((r) => r.position    >= parseFloat(gscFilters.minPosition));
    if (gscFilters.maxPosition)    rows = rows.filter((r) => r.position    <= parseFloat(gscFilters.maxPosition));

    rows.sort((a, b) => {
      const ak = a[gscFilters.sortBy] as number;
      const bk = b[gscFilters.sortBy] as number;
      const nat = gscFilters.sortBy === "position" ? ak - bk : bk - ak;
      return gscFilters.sortDir === "asc" ? -nat : nat;
    });
    return rows;
  }, [gscQueries, gscFilters]);

  const gscOpportunityRows = useMemo(() => {
    let rows = gscOpportunityQueries.filter(
      (q) =>
        q.query.trim().length > 0 &&
        q.impressions >= GSC_OPPORTUNITY_MIN_IMPRESSIONS &&
        q.ctr <= GSC_OPPORTUNITY_MAX_CTR &&
        q.clicks < q.impressions * 0.05,
    );
    const { col, dir } = oppSort;
    rows = [...rows].sort((a, b) => {
      if (col === "query") {
        const c = a.query.localeCompare(b.query);
        return dir === "asc" ? c : -c;
      }
      const av = a[col] as number;
      const bv = b[col] as number;
      const nat = av - bv;
      return dir === "asc" ? nat : -nat;
    });
    return rows;
  }, [gscOpportunityQueries, oppSort]);

  function handleOppSort(col: OppSortCol) {
    setOppSort((s) => (s.col !== col ? { col, dir: "desc" } : { col, dir: s.dir === "desc" ? "asc" : "desc" }));
  }

  function handleGscSort(col: GSCFilters["sortBy"]) {
    setGscFilters((f) => {
      if (f.sortBy !== col) return { ...f, sortBy: col, sortDir: "desc" };
      return { ...f, sortDir: f.sortDir === "desc" ? "asc" : "desc" };
    });
  }

  // ── Landing pages filtered ─────────────────────────────────────────────────
  const filteredLandingPages = useMemo(() => {
    if (!landingPageFilter) return ga4LandingPages;
    return ga4LandingPages.filter((p) => p.page.toLowerCase().includes(landingPageFilter.toLowerCase()));
  }, [ga4LandingPages, landingPageFilter]);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const ga4TotalUsers    = ga4Daily.reduce((s, r) => s + r.users, 0);
  const ga4TotalSessions = ga4Daily.reduce((s, r) => s + r.sessions, 0);
  const ga4TotalPV       = ga4Daily.reduce((s, r) => s + r.pageviews, 0);
  const ga4AvgBounceNum  = ga4Daily.length ? (ga4Daily.reduce((s, r) => s + r.bounceRate, 0) / ga4Daily.length * 100) : 0;
  const ga4AvgBounce     = ga4AvgBounceNum.toFixed(1);

  // Comparison totals (GA4)
  const ga4CmpUsers    = ga4DailyCmp.reduce((s, r) => s + r.users, 0);
  const ga4CmpSessions = ga4DailyCmp.reduce((s, r) => s + r.sessions, 0);
  const ga4CmpPV       = ga4DailyCmp.reduce((s, r) => s + r.pageviews, 0);
  const ga4CmpBounce   = ga4DailyCmp.length ? (ga4DailyCmp.reduce((s, r) => s + r.bounceRate, 0) / ga4DailyCmp.length * 100) : 0;
  const hasCmp         = ga4Filters.comparison !== "none" && ga4DailyCmp.length > 0;

  const gscTotalClicks      = gscDaily.reduce((s, r) => s + r.clicks, 0);
  const gscTotalImpressions = gscDaily.reduce((s, r) => s + r.impressions, 0);
  const gscAvgCTRNum        = gscTotalImpressions > 0 ? (gscTotalClicks / gscTotalImpressions) * 100 : 0;
  const gscAvgCTR           = gscAvgCTRNum.toFixed(2);
  const gscAvgPositionNum   = gscDaily.length ? gscDaily.reduce((s, r) => s + r.position, 0) / gscDaily.length : 0;
  const gscAvgPosition      = gscDaily.length ? gscAvgPositionNum.toFixed(1) : "—";

  // Comparison totals (GSC)
  const gscCmpClicks      = gscDailyCmp.reduce((s, r) => s + r.clicks, 0);
  const gscCmpImpressions = gscDailyCmp.reduce((s, r) => s + r.impressions, 0);
  const gscCmpCTR         = gscCmpImpressions > 0 ? (gscCmpClicks / gscCmpImpressions) * 100 : 0;
  const gscCmpPosition    = gscDailyCmp.length ? gscDailyCmp.reduce((s, r) => s + r.position, 0) / gscDailyCmp.length : 0;
  const hasGscCmp         = gscFilters.comparison !== "none" && gscDailyCmp.length > 0;

  // Comparison date labels for display
  const cmpModeLabel = (mode: ComparisonMode) => mode === "prevPeriod" ? "prev period" : "prev year";
  const ga4CmpLabel  = hasCmp    ? cmpModeLabel(ga4Filters.comparison) : undefined;
  const gscCmpLabel  = hasGscCmp ? cmpModeLabel(gscFilters.comparison) : undefined;

  const countryOptions  = gscCountries.map((c) => ({ value: c, label: c.toUpperCase() }));
  const channelOptions  = ga4Channels.map((c) => ({ value: c.channel, label: c.channel }));
  const isLoggedIn      = !!accessToken;

  // ── GA4 chart data ─────────────────────────────────────────────────────────
  const metricLabel: Record<MetricKey, string> = {
    users: "Active Users", sessions: "Sessions", pageviews: "Pageviews", bounceRate: "Bounce Rate",
  };

  const isSingleSeries = ga4SeriesKeys.length === 0 || !!ga4TrendMetricFocus;
  const ALL_METRIC_KEYS: MetricKey[] = ["users", "sessions", "pageviews", "bounceRate"];
  const chartGA4Data = useMemo(() => {
    if (!isSingleSeries) return ga4Series;
    const cmpMap = new Map(ga4DailyCmp.map((r, i) => [i, r]));
    // Always include all 4 metric keys so clicking any scorecard has data to display,
    // regardless of which metrics are currently selected in ga4Filters.metrics.
    return ga4Daily.map((r, i) => {
      const row: SeriesRow = { date: r.date };
      ALL_METRIC_KEYS.forEach((m) => {
        row[m] = m === "bounceRate" ? +(r.bounceRate * 100).toFixed(1) : r[m];
      });
      const cmpRow = cmpMap.get(i) as DailyGA4 | undefined;
      if (cmpRow) {
        ALL_METRIC_KEYS.forEach((m) => {
          row[`${m}_cmp`] = m === "bounceRate" ? +(cmpRow.bounceRate * 100).toFixed(1) : (cmpRow as unknown as Record<string, number>)[m];
        });
      }
      return row;
    });
  }, [ga4Daily, ga4DailyCmp, ga4Series, isSingleSeries]);

  const chartGSCData = useMemo(() => {
    if (gscSeriesKeys.length > 0) return gscSeries;
    const cmpMap = new Map(gscDailyCmp.map((r, i) => [i, r]));
    return gscDaily.map((r, i) => {
      const row: SeriesRow = { date: r.date, clicks: r.clicks, impressions: r.impressions, ctr: +(r.ctr * 100).toFixed(2) } as SeriesRow;
      const cmpRow = cmpMap.get(i);
      if (cmpRow) {
        row["clicks_cmp"] = (cmpRow as unknown as Record<string, number>).clicks;
        row["impressions_cmp"] = (cmpRow as unknown as Record<string, number>).impressions;
        row["ctr_cmp"] = +((cmpRow as unknown as Record<string, number>).ctr * 100).toFixed(2);
      }
      return row;
    });
  }, [gscDaily, gscDailyCmp, gscSeries, gscSeriesKeys]);

  // ── Blend data ─────────────────────────────────────────────────────────────
  const blendData = useMemo(() => {
    const ga4Map = new Map(ga4Daily.map((r) => [r.date, r]));
    const gscMap = new Map(gscDaily.map((r) => [r.date, r]));
    const dates  = Array.from(new Set([...ga4Map.keys(), ...gscMap.keys()])).sort();
    return dates.map((date) => ({
      date,
      ga4Users:    (ga4Map.get(date) as DailyGA4 | undefined)?.users    ?? null,
      ga4Sessions: (ga4Map.get(date) as DailyGA4 | undefined)?.sessions ?? null,
      gscClicks:   (gscMap.get(date) as DailyGSC | undefined)?.clicks   ?? null,
    }));
  }, [ga4Daily, gscDaily]);

  const ga4ChartMetrics = useMemo(
    () =>
      ga4TrendMetricFocus
        ? [ga4TrendMetricFocus]
        : ga4Filters.metrics,
    [ga4TrendMetricFocus, ga4Filters.metrics],
  );



  // ── Performance Analysis ───────────────────────────────────────────────────
  // URL performance bucketed by clicks
  const getUrlPerf = (clicks: number): "high"|"med"|"low"|"opportunity" => {
    if (clicks >= 20) return "high";
    if (clicks >= 5) return "med";
    if (clicks >= 1) return "low";
    return "opportunity";
  };
  // Query performance bucketed by position
  const getQueryPerf = (position: number): "high"|"med"|"low"|"opportunity" => {
    if (position <= 5) return "high";
    if (position <= 10) return "med";
    if (position <= 20) return "low";
    return "opportunity";
  };
  // Keep getPerf as alias (used in table tier badges)
  const getPerf = getQueryPerf;
  const PERF_COLORS_MAP: Record<string, string> = {
    high: "#059669",
    med: "#d97706",
    low: "#dc2626",
    opportunity: "#2563eb"
  };
  const URL_PERF_LABELS: Record<string, string> = {
    high: "High (20+ clicks)",
    med: "Medium (5–19 clicks)",
    low: "Low (1–4 clicks)",
    opportunity: "Opportunity (0 clicks)"
  };
  const QUERY_PERF_LABELS: Record<string, string> = {
    high: "High (Pos. 1–5)",
    med: "Medium (Pos. 6–10)",
    low: "Low (Pos. 11–20)",
    opportunity: "Opportunity (Pos. 21–100)"
  };
  const PERF_LABELS = QUERY_PERF_LABELS;
  const PERF_BG: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-800",
    med: "bg-amber-100 text-amber-800",
    low: "bg-red-100 text-red-800",
    opportunity: "bg-blue-100 text-blue-800"
  };

  // URL performance (bucketed by clicks)
  const perfUrlPieData = useMemo(() => {
    const counts = { high: 0, med: 0, low: 0, opportunity: 0 };
    gscPages.forEach((p) => { counts[getUrlPerf(p.clicks)]++; });
    return (["high","med","low","opportunity"] as const)
      .map((k) => ({ name: URL_PERF_LABELS[k], value: counts[k], key: k }))
      .filter((d) => d.value > 0);
  }, [gscPages]);

  const perfFilteredPages = useMemo(() =>
    perfPieFilter ? gscPages.filter((p) => getUrlPerf(p.clicks) === perfPieFilter) : gscPages,
    [gscPages, perfPieFilter]
  );

  // Query performance (bucketed by position)
  const perfQueryPieData = useMemo(() => {
    const counts = { high: 0, med: 0, low: 0, opportunity: 0 };
    gscOpportunityQueries.forEach((q) => { counts[getQueryPerf(q.position)]++; });
    return (["high","med","low","opportunity"] as const)
      .map((k) => ({ name: QUERY_PERF_LABELS[k], value: counts[k], key: k }))
      .filter((d) => d.value > 0);
  }, [gscOpportunityQueries]);

  const perfFilteredQueries = useMemo(() =>
    perfSubFilter ? gscOpportunityQueries.filter((q) => getQueryPerf(q.position) === perfSubFilter as "high"|"med"|"low"|"opportunity") : gscOpportunityQueries,
    [gscOpportunityQueries, perfSubFilter]
  );

  // ── Query Intent classification ────────────────────────────────────────────
  // Lightweight rule-based classifier: informational / transactional / commercial / navigational.
  // Order of checks matters — more specific patterns (transactional, navigational) win over broader ones.
  type QueryIntent = "informational" | "transactional" | "commercial" | "navigational";
  const classifyQueryIntent = (raw: string): QueryIntent => {
    const q = raw.toLowerCase().trim();

    // Transactional: explicit purchase/booking/conversion intent
    if (/\b(buy|sell|order|purchase|book|hire|rent|download|signup|sign up|subscribe|join|register|apply|claim|free shipping|coupon|discount|deal|deals|voucher|promo|cheap|cheapest|near me|delivery|same day|in stock|for sale|sell my|pawn|valuation|cash for|quote)\b/.test(q)) {
      return "transactional";
    }
    // Commercial investigation: comparison / "best" / reviews / "vs"
    if (/\b(best|top|review|reviews|compare|comparison|vs|versus|alternative|alternatives|pros and cons|worth it|recommendation|recommendations|rating|ratings)\b/.test(q)) {
      return "commercial";
    }
    // Navigational: brand/site-specific or login/contact lookups
    if (/\b(login|log in|sign in|account|contact|customer service|support|address|phone number|opening hours|hours|location|near me)\b/.test(q)) {
      return "navigational";
    }
    // Informational: question words and "how/what/why/when/where/who" + "guide", "tutorial", "meaning", "definition"
    if (/\b(how|what|why|when|where|who|which|guide|tutorial|tips|ideas|meaning|definition|history|explain|examples?|learn|identify|tell if|spot|worth)\b/.test(q) || q.endsWith("?")) {
      return "informational";
    }
    // Default: most short queries without explicit verbs are informational
    return "informational";
  };

  const INTENT_COLORS: Record<QueryIntent, string> = {
    informational: "#0ea5e9", // sky
    transactional: "#059669", // emerald
    commercial:    "#d97706", // amber
    navigational:  "#7e22ce", // purple
  };
  const INTENT_LABELS: Record<QueryIntent, string> = {
    informational: "Informational",
    transactional: "Transactional",
    commercial:    "Commercial",
    navigational:  "Navigational",
  };
  const INTENT_DESCRIPTIONS: Record<QueryIntent, string> = {
    informational: "Users seeking knowledge or answers — \"how to\", \"what is\", guides, tutorials.",
    transactional: "Users ready to act — buy, sell, book, download, signup. Highest commercial value.",
    commercial:    "Users comparing options — \"best\", \"reviews\", \"vs\", alternatives. Pre-purchase research.",
    navigational:  "Users looking for a specific page or brand — login, contact, account, hours.",
  };
  const INTENT_BG: Record<QueryIntent, string> = {
    informational: "bg-sky-100 text-sky-800",
    transactional: "bg-emerald-100 text-emerald-800",
    commercial:    "bg-amber-100 text-amber-800",
    navigational:  "bg-purple-100 text-purple-800",
  };

  // Pie + breakdown data for query intent
  const perfIntentPieData = useMemo(() => {
    const counts: Record<QueryIntent, number> = { informational: 0, transactional: 0, commercial: 0, navigational: 0 };
    gscOpportunityQueries.forEach((q) => { counts[classifyQueryIntent(q.query)]++; });
    return (["informational","commercial","transactional","navigational"] as const)
      .map((k) => ({ name: INTENT_LABELS[k], value: counts[k], key: k }))
      .filter((d) => d.value > 0);
  }, [gscOpportunityQueries]);

  // Aggregated metrics per intent (for the breakdown table next to the pie)
  const perfIntentTableData = useMemo(() => {
    const agg: Record<QueryIntent, { queries: number; clicks: number; impressions: number; ctrSum: number; ctrN: number; posSum: number; posN: number }> = {
      informational: { queries: 0, clicks: 0, impressions: 0, ctrSum: 0, ctrN: 0, posSum: 0, posN: 0 },
      transactional: { queries: 0, clicks: 0, impressions: 0, ctrSum: 0, ctrN: 0, posSum: 0, posN: 0 },
      commercial:    { queries: 0, clicks: 0, impressions: 0, ctrSum: 0, ctrN: 0, posSum: 0, posN: 0 },
      navigational:  { queries: 0, clicks: 0, impressions: 0, ctrSum: 0, ctrN: 0, posSum: 0, posN: 0 },
    };
    gscOpportunityQueries.forEach((q) => {
      const k = classifyQueryIntent(q.query);
      agg[k].queries++;
      agg[k].clicks += q.clicks;
      agg[k].impressions += q.impressions;
      if (q.impressions > 0) { agg[k].ctrSum += q.ctr; agg[k].ctrN++; }
      if (q.position > 0)    { agg[k].posSum += q.position; agg[k].posN++; }
    });
    return (["informational","commercial","transactional","navigational"] as const)
      .map((k) => ({
        key: k,
        label: INTENT_LABELS[k],
        queries:     agg[k].queries,
        clicks:      agg[k].clicks,
        impressions: agg[k].impressions,
        ctr:         agg[k].ctrN > 0 ? agg[k].ctrSum / agg[k].ctrN : 0,
        avgPosition: agg[k].posN > 0 ? agg[k].posSum / agg[k].posN : 0,
      }))
      .filter((r) => r.queries > 0);
  }, [gscOpportunityQueries]);

  // ── Query Counting per URL (current vs previous period) ────────────────────
  // Counts the number of distinct queries each URL ranks for, plus clicks/impressions,
  // and pairs each URL with the same metrics from the comparison period for delta display.
  const perfQueryCountByUrl = useMemo(() => {
    type Bucket = { queries: Set<string>; clicks: number; impressions: number };
    const cur = new Map<string, Bucket>();
    const cmp = new Map<string, Bucket>();
    const addTo = (target: Map<string, Bucket>, page: string, query: string, clicks: number, impressions: number) => {
      let b = target.get(page);
      if (!b) { b = { queries: new Set(), clicks: 0, impressions: 0 }; target.set(page, b); }
      b.queries.add(query.toLowerCase());
      b.clicks += clicks;
      b.impressions += impressions;
    };
    gscPageQueryAll.forEach((r) => addTo(cur, r.page, r.query, r.clicks, r.impressions));
    gscPageQueryAllCmp.forEach((r) => addTo(cmp, r.page, r.query, r.clicks, r.impressions));

    // Union of all URLs seen in either period
    const allUrls = new Set<string>([...cur.keys(), ...cmp.keys()]);
    const rows = [...allUrls].map((page) => {
      const c = cur.get(page);
      const p = cmp.get(page);
      const queries    = c?.queries.size ?? 0;
      const queriesCmp = p?.queries.size ?? 0;
      const delta      = queries - queriesCmp;
      const pct        = queriesCmp > 0 ? ((queries - queriesCmp) / queriesCmp) * 100 : (queries > 0 ? 100 : 0);
      return {
        page,
        queries,
        queriesCmp,
        delta,
        pct,
        clicks:      c?.clicks ?? 0,
        impressions: c?.impressions ?? 0,
      };
    });
    return rows;
  }, [gscPageQueryAll, gscPageQueryAllCmp]);

  // ── Non-Brand SEO computed data ────────────────────────────────────────────
  /** Brand-vs-non-brand counts for the live editor preview (uses the user's current term list against the top 50 GSC queries from the last fetch). */
  const nbsClassifierPreview = useMemo(() => {
    return (gscOpportunityQueries.slice(0, 50)).map((q) => ({
      query: q.query,
      clicks: q.clicks,
      cls: nbSeoClassify(q.query, nbsBrandTerms),
    }));
  }, [gscOpportunityQueries, nbsBrandTerms]);
  const nbsClassifierPreviewSummary = useMemo(() => {
    let brand = 0, nonBrand = 0;
    nbsClassifierPreview.forEach((r) => { if (r.cls === "brand") brand++; else nonBrand++; });
    return { brand, nonBrand };
  }, [nbsClassifierPreview]);

  /** Test classification for whatever the user types into the test box. */
  const nbsTestResult = useMemo(() =>
    nbsTestQuery.trim() ? nbSeoClassify(nbsTestQuery, nbsBrandTerms) : null,
    [nbsTestQuery, nbsBrandTerms]
  );

  /** Sort hook for the landing-page table. */
  const nbsRowsForSort = useMemo(() => nbsData?.rows ?? [], [nbsData]);
  const nbsSort = useTableSort(nbsRowsForSort, { key: "nbReferrers", dir: "desc" });

  /** Sort hook for the NB Sign Ups landing-page table. */
  const nbsuRowsForSort = useMemo(() => nbsuData?.rows ?? [], [nbsuData]);
  const nbsuSort = useTableSort(nbsuRowsForSort, { key: "nbLeads", dir: "desc" });



  // ── Sort state for non-sortable tables ──────────────────────────────────────
  const URL_TIER_RANK: Record<string, number> = { high: 4, med: 3, low: 2, opportunity: 1 };
  const landingSort = useTableSort(filteredLandingPages, { key: "users", dir: "desc" });
  const aiSourcesSort = useTableSort(ga4AiSources, { key: "sessions", dir: "desc" });
  const crossPagesSort = useTableSort(gscCrossPages, { key: "clicks", dir: "desc" });
  const crossQueriesSort = useTableSort(gscCrossQueries, { key: "clicks", dir: "desc" });
  const blendQueriesRows = useMemo(() => gscQueries.slice(0, 5), [gscQueries]);
  const blendQueriesSort = useTableSort(blendQueriesRows, { key: "clicks", dir: "desc" });
  const convDailyMerged = useMemo(
    () => convDaily.map((r, i) => ({ date: r.date, count: r.count, compare: convDailyCmp[i]?.count ?? null })),
    [convDaily, convDailyCmp]
  );
  const convDailySort = useTableSort(convDailyMerged, { key: "date", dir: "asc" });
  const seoNoTrafficSort = useTableSort(seoNoTraffic, { key: "sessions", dir: "asc" });
  const seoLowEngSort = useTableSort(seoLowEngagement, { key: "engagementRate", dir: "asc" });
  const seo404Sort = useTableSort(seo404Titles, { key: "sessions", dir: "desc" });

  // ── Filtered + sorted Query Counting rows ──
  const perfQueryCountFiltered = useMemo(() => {
    const q = queryCountSearch.trim().toLowerCase();
    if (!q) return perfQueryCountByUrl;
    return perfQueryCountByUrl.filter((r) => r.page.toLowerCase().includes(q));
  }, [perfQueryCountByUrl, queryCountSearch]);
  const queryCountSort = useTableSort(perfQueryCountFiltered, { key: "queries", dir: "desc" });

  // ── SEO Issues: GSC-derived opportunity sets ──
  const strikingDistanceQueries = useMemo(
    () =>
      gscOpportunityQueries
        .filter((q) => q.position >= 11 && q.position <= 20 && q.impressions >= 30)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 100),
    [gscOpportunityQueries]
  );
  const lowCtrHighImpressions = useMemo(
    () =>
      gscOpportunityQueries
        .filter((q) => q.impressions >= 100 && q.position <= 20 && q.ctr < 0.02)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 100),
    [gscOpportunityQueries]
  );
  const orphanGscPages = useMemo(() => {
    // Pages getting impressions in GSC but minimal clicks — discoverability/CTR problem
    return gscPages
      .filter((p) => p.impressions >= 100 && p.clicks <= 2)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 100);
  }, [gscPages]);

  // Buried URLs: group page+query rows by page so we can show queries inline
  const [buriedSortCol, setBuriedSortCol] = useState<"impressions" | "queries" | "position">("impressions");
  const [buriedSortDir, setBuriedSortDir] = useState<"asc" | "desc">("desc");
  const [buriedExpandedPage, setBuriedExpandedPage] = useState<string | null>(null);
  const buriedByPage = useMemo(() => {
    const map = new Map<string, { page: string; totalImpressions: number; queries: { query: string; impressions: number; position: number }[] }>();
    gscBuriedPageQueries.forEach((r) => {
      if (!map.has(r.page)) map.set(r.page, { page: r.page, totalImpressions: 0, queries: [] });
      const entry = map.get(r.page)!;
      entry.totalImpressions += r.impressions;
      entry.queries.push({ query: r.query, impressions: r.impressions, position: r.position });
    });
    const rows = [...map.values()].map((e) => ({
      ...e,
      avgPosition: e.queries.reduce((s, q) => s + q.position, 0) / (e.queries.length || 1),
      queries: e.queries.sort((a, b) => b.impressions - a.impressions),
    }));
    return rows.sort((a, b) => {
      const dir = buriedSortDir === "desc" ? -1 : 1;
      if (buriedSortCol === "impressions") return dir * (a.totalImpressions - b.totalImpressions);
      if (buriedSortCol === "queries") return dir * (a.queries.length - b.queries.length);
      return dir * (a.avgPosition - b.avgPosition);
    });
  }, [gscBuriedPageQueries, buriedSortCol, buriedSortDir]);
  const queryHealthBuckets = useMemo(() => {
    const b = { top3: 0, top10: 0, striking: 0, deep: 0 };
    gscOpportunityQueries.forEach((q) => {
      if (q.position <= 3) b.top3++;
      else if (q.position <= 10) b.top10++;
      else if (q.position <= 20) b.striking++;
      else b.deep++;
    });
    return b;
  }, [gscOpportunityQueries]);
  const issueBreakdown = useMemo(
    () => [
      { key: "noTraffic", name: "No GA4 traffic", value: seoNoTraffic.length, color: "#ef4444" },
      { key: "lowEng", name: "Low engagement", value: seoLowEngagement.length, color: "#f97316" },
      { key: "title404", name: "404 in title", value: seo404Titles.length, color: "#dc2626" },
      { key: "lowCtr", name: "Low CTR (GSC)", value: lowCtrHighImpressions.length, color: "#a855f7" },
      { key: "striking", name: "Striking distance", value: strikingDistanceQueries.length, color: "#3b82f6" },
      { key: "orphan", name: "Orphan pages", value: orphanGscPages.length, color: "#0ea5e9" },
    ],
    [seoNoTraffic, seoLowEngagement, seo404Titles, lowCtrHighImpressions, strikingDistanceQueries, orphanGscPages]
  );
  const totalSeoIssues = useMemo(
    () => issueBreakdown.reduce((s, x) => s + x.value, 0),
    [issueBreakdown]
  );
  const queryHealthPie = useMemo(
    () => [
      { key: "top3", name: "Top 3", value: queryHealthBuckets.top3, color: "#10b981" },
      { key: "top10", name: "Top 10", value: queryHealthBuckets.top10, color: "#84cc16" },
      { key: "striking", name: "11–20 (striking)", value: queryHealthBuckets.striking, color: "#3b82f6" },
      { key: "deep", name: "21+ (deep)", value: queryHealthBuckets.deep, color: "#94a3b8" },
    ],
    [queryHealthBuckets]
  );
  const strikingSort = useTableSort(strikingDistanceQueries, { key: "impressions", dir: "desc" });
  const lowCtrSort = useTableSort(lowCtrHighImpressions, { key: "impressions", dir: "desc" });
  const orphanPagesSort = useTableSort(orphanGscPages, { key: "impressions", dir: "desc" });

  const perfPagesSort = useTableSort(
    perfFilteredPages,
    { key: "clicks", dir: "desc" },
    (r, k) => k === "tier" ? URL_TIER_RANK[getUrlPerf((r as { clicks: number }).clicks)] : (r as unknown as Record<string, unknown>)[k]
  );
  const perfQueriesSort = useTableSort(
    perfFilteredQueries,
    { key: "clicks", dir: "desc" },
    (r, k) => k === "tier" ? URL_TIER_RANK[getPerf((r as { position: number }).position)] : (r as unknown as Record<string, unknown>)[k]
  );

  const isoDateStr = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const ga4BannerHint = useMemo(() => {
    if (ga4Filters.comparison === "none") return undefined;
    const w = ga4DateWindows(ga4FetchFilters);
    if (!w.comparison) return undefined;
    // Resolve any NdaysAgo strings to absolute dates for display
    const resolveAbsolute = (s: string) => {
      const m = s.match(/^(\d+)daysAgo$/);
      if (m) return nDaysAgo(parseInt(m[1], 10));
      if (s === "today") return toISODate(new Date());
      return s;
    };
    const fmt = (a: string, b: string) => `${formatDisplayDate(resolveAbsolute(a))} – ${formatDisplayDate(resolveAbsolute(b))}`;
    return `${fmt(w.current.startDate, w.current.endDate)} vs ${fmt(w.comparison.startDate, w.comparison.endDate)}`;
  }, [ga4Filters.comparison, ga4FetchFilters]);

  const gscBannerHint = useMemo(() => {
    if (gscFilters.comparison === "none") return undefined;
    const w = gscDateWindows(gscFetchFilters);
    if (!w.comparison) return undefined;
    const fmt = (a: string, b: string) => `${formatDisplayDate(a)} – ${formatDisplayDate(b)}`;
    return `${fmt(w.startDate, w.endDate)} vs ${fmt(w.comparison.startDate, w.comparison.endDate)}`;
  }, [gscFilters.comparison, gscFetchFilters]);

  const VIEWS: { key: ActiveView; label: string; icon: React.ElementType }[] = [
    { key: "ga4",   label: "GA4",      icon: Users },
    { key: "gsc",   label: "GSC",      icon: Search },
    { key: "blend", label: "Blend",    icon: Layers },
    { key: "intl",  label: "International", icon: Globe },
    { key: "opportunities", label: "SEO Opportunities", icon: Lightbulb },
    { key: "gscOpportunities", label: "GSC Opportunities", icon: TrendingUp },
    { key: "productCategories", label: "Product Categories", icon: Layers },
    { key: "brandVsNonBrand", label: "Brand vs Non-Brand", icon: BarChart2 },
    { key: "nbSeo", label: "Non-Brand SEO", icon: TrendingUp },
    { key: "nbSignUps", label: "Non-Brand Sign Ups", icon: ShoppingCart },
    { key: "conversions", label: "Conversions", icon: ShoppingCart },
    { key: "seoIssues", label: "SEO Issues", icon: AlertTriangle },
    { key: "performance", label: "Performance", icon: BarChart2 },
    { key: "dailySnapshot", label: "Daily Snapshot", icon: Activity },
  ];

  const VIEW_TOOLTIPS: Record<ActiveView, string> = {
    ga4: "Google Analytics 4 — view traffic, sessions, pageviews, and bounce rate for your property.",
    gsc: "Google Search Console — track your search impressions, clicks, CTR, and average ranking position.",
    blend: "Blend — overlay GA4 and GSC data side-by-side on a single timeline to spot correlations.",
    intl: "International — see how your site performs across different countries in both GA4 and GSC.",
    opportunities: "SEO Opportunities — queries with high impressions but low CTR that are ripe for optimisation.",
    gscOpportunities: "GSC Opportunities — a full query/page explorer with smart filters for finding quick wins.",
    productCategories: "Product Categories — SEO and conversion performance grouped by site category, with trending and GA4 lead data.",
    brandVsNonBrand: "Brand vs Non-Brand — split your GSC clicks, pages, and lead conversions between branded (Vintage Cash Cow) and non-branded queries.",
    nbSeo: "Non-Brand SEO — model the non-brand share of organic sessions and leads at the landing-page level, with editable brand classifier and WoW/YoY comparisons.",
    nbSignUps: "Non-Brand Sign Ups — model the non-brand share of generate_lead key events from organic sessions that involved /free-selling-pack, click-weighted across the whole site.",
    conversions: "Conversions — monitor key conversion events and goal completions tracked in GA4.",
    seoIssues: "SEO Issues — surface technical and on-page problems that may be hurting your rankings.",
    performance: "Performance — analyse Core Web Vitals and page speed signals from your Search Console data.",
    dailySnapshot: "Daily Snapshot — yesterday's GA4 + GSC (48h lag) non-brand and AIO metrics, ready to paste into Slack.",
  };

  const [isPdfBuilding, setIsPdfBuilding] = useState(false);

  const downloadAllAsPdf = useCallback(async () => {
    setIsPdfBuilding(true);
    const originalView = activeView;
    const styleNodes = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((n) => n.outerHTML).join("\n");
    const sections: { label: string; html: string }[] = [];
    const wait = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

    for (const view of VIEWS) {
      setActiveView(view.key);
      // Wait for React to render the new tab
      await wait(400);
      const sec = document.querySelector<HTMLElement>("main section");
      if (sec) sections.push({ label: view.label, html: sec.outerHTML });
    }

    // Restore original tab
    setActiveView(originalView);
    setIsPdfBuilding(false);

    if (sections.length === 0) return;
    const w = window.open("", "_blank", "width=1200,height=900");
    if (!w) return;

    const combinedHtml = sections.map((s) =>
      `<div class="section-block"><div class="section-title">${s.label.replace(/[<>]/g,"")}</div>${s.html}</div>`
    ).join('\n<div class="page-break"></div>\n');

    w.document.open();
    w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Vintage Cash Cow — SEO Report</title>
${styleNodes}
<style>
  @page { size: A4; margin: 12mm; }
  body { padding: 16px; font-family: system-ui,-apple-system,sans-serif; background:#fff; color:#111; }
  [data-deco-ui], button { display:none !important; }
  table { page-break-inside:auto; width:100%; }
  tr { page-break-inside:avoid; page-break-after:auto; }
  thead { display:table-header-group; }
  .page-break { page-break-after:always; height:0; }
  .section-block { margin-bottom:32px; }
  .section-title { font-size:14px; font-weight:700; color:#7c3aed; margin-bottom:10px; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid #e9d5ff; padding-bottom:6px; }
  .print-header { display:flex; justify-content:space-between; align-items:baseline; border-bottom:2px solid #7c3aed; padding-bottom:10px; margin-bottom:24px; }
  .print-header h1 { font-size:18px; font-weight:800; color:#111; margin:0; }
  .print-header span { font-size:11px; color:#666; }
</style>
</head>
<body>
<div class="print-header">
  <h1>Vintage Cash Cow — SEO & Analytics Report</h1>
  <span>Generated ${new Date().toLocaleString()}</span>
</div>
${combinedHtml}
</body>
</html>`);
    w.document.close();
    const trigger = () => { try { w.focus(); w.print(); } catch { /* ignore */ } };
    if (w.document.readyState === "complete") setTimeout(trigger, 600);
    else w.addEventListener("load", () => setTimeout(trigger, 600));
  }, [activeView, VIEWS]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <UrlBaseContext.Provider value={selectedGSC}>
      <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#5b4fa8] rounded-xl p-2">
              {/* VCC Heart Logo */}
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8C7.6 8 4 11.6 4 16c0 3.2 1.8 6 4.4 7.6L24 40l15.6-16.4C42.2 22 44 19.2 44 16c0-4.4-3.6-8-8-8-2.8 0-5.2 1.4-6.8 3.6L24 17l-5.2-5.4C17.2 9.4 14.8 8 12 8z" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M17 30l7 7 7-7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">Vintage Cash Cow</h1>
              <p className="text-xs text-[#5b4fa8] mt-0.5 font-medium">SEO · GA4 · Search Console · AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <>
                {lastUpdated && <span className="text-xs text-gray-400 hidden sm:block">{lastUpdated.toLocaleTimeString()}</span>}
                <HoverTooltip tip="Export every dashboard section as a combined PDF report you can save or share.">
                  <button
                    type="button"
                    onClick={() => void downloadAllAsPdf()}
                    disabled={isPdfBuilding}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-purple-700 disabled:opacity-50 disabled:cursor-wait px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-purple-300 bg-white transition-colors"
                    title="Download every section as a single PDF"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {isPdfBuilding ? "Building PDF…" : "Download all PDF"}
                  </button>
                </HoverTooltip>
                <HoverTooltip tip="Refresh all data from GA4 and Search Console using the current filters.">
                  <button onClick={handleRefresh} disabled={refreshing || ga4Loading || gscLoading || convLoading || seoIssuesLoading}
                    className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-purple-700 hover:border-purple-300 disabled:opacity-40 transition-all">
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  </button>
                </HoverTooltip>
                <HoverTooltip tip="Disconnect your Google account and return to the login screen.">
                  <button type="button" onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition-colors">
                    <LogOut size={12} /> Log out
                  </button>
                </HoverTooltip>
                <HoverTooltip tip="Your Google account is connected and data is being fetched live.">
                  <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-200">
                    <Activity size={12} /> Connected
                  </div>
                </HoverTooltip>
              </>
            )}
            {!isLoggedIn && (
              <button onClick={handleLogin} disabled={!googleReady || isLoggingIn}
                className="flex items-center gap-2 bg-[#5b4fa8] hover:bg-[#4a3f96] disabled:bg-purple-300 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm">
                <LogIn size={14} />
                {isLoggingIn ? "Connecting…" : "Sign in with Google"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {isLoggedIn && pageDrillPath && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-sm text-amber-900">
            <span className="truncate"><span className="font-semibold">Page scope:</span> {pageDrillPath}</span>
            <button type="button" onClick={() => { setPageDrillPath(""); setGscLinkQuery(null); setGscLinkPage(null); }} className="shrink-0 text-xs font-bold text-amber-800 hover:text-amber-950 underline">Clear</button>
          </div>
        )}
        {/* Login CTA */}
        {!isLoggedIn && (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
            {/* VCC Logo Mark */}
            <div className="mx-auto w-20 h-20 bg-[#5b4fa8] rounded-2xl flex items-center justify-center mb-5 shadow-md">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8C7.6 8 4 11.6 4 16c0 3.2 1.8 6 4.4 7.6L24 40l15.6-16.4C42.2 22 44 19.2 44 16c0-4.4-3.6-8-8-8-2.8 0-5.2 1.4-6.8 3.6L24 17l-5.2-5.4C17.2 9.4 14.8 8 12 8z" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M17 30l7 7 7-7" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Vintage Cash Cow</h2>
            <p className="text-[#5b4fa8] text-sm font-semibold mb-3">SEO & Analytics Dashboard</p>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
              Connect your Google account to access GA4 analytics, Search Console data, and AI traffic insights — all in one place.
            </p>
            <button onClick={handleLogin} disabled={!googleReady || isLoggingIn}
              className="inline-flex items-center gap-2 bg-[#5b4fa8] hover:bg-[#4a3f96] disabled:bg-purple-300 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm">
              <LogIn size={16} />
              {isLoggingIn ? "Connecting…" : "Sign in with Google"}
            </button>
          </div>
        )}

        {isLoggedIn && (
          <>
            {/* ── View Switcher ── */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit flex-wrap max-w-full">
              {VIEWS.map(({ key, label, icon: Icon }) => {
                const isActive = activeView === key;
                const isNbSignUps = key === "nbSignUps";
                const isDailySnapshot = key === "dailySnapshot";
                let btnClass: string;
                if (isNbSignUps) {
                  btnClass = isActive
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-emerald-600 text-white hover:bg-emerald-700";
                } else if (isDailySnapshot) {
                  btnClass = isActive
                    ? "bg-yellow-500 text-white shadow-sm"
                    : "bg-yellow-400 text-yellow-900 hover:bg-yellow-500 hover:text-white";
                } else {
                  btnClass = isActive
                    ? "bg-purple-700 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50";
                }
                return (
                  <HoverTooltip key={key} tip={VIEW_TOOLTIPS[key as ActiveView]} className="">
                    <button onClick={() => setActiveView(key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${btnClass}`}>
                      <Icon size={14} />
                      {label}
                    </button>
                  </HoverTooltip>
                );
              })}
            </div>

            {/* ── GA4 Section ── */}
            {(activeView === "ga4" || activeView === "blend") && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 rounded-xl p-2"><Users size={16} className="text-purple-700" /></div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Google Analytics 4</h2>
                      <p className="text-xs text-gray-400">Traffic & engagement</p>
                    </div>
                  </div>
                  <div className="max-w-[220px] w-full">
                    <Select value={selectedGA4} onChange={setSelectedGA4} options={ga4Properties} placeholder="Select GA4 Property" disabled={ga4Properties.length === 0} />
                  </div>
                </div>

                {activeView !== "blend" && (
                  <GA4FilterPanel filters={ga4Filters} setFilters={setGa4Filters} channelOptions={channelOptions} />
                )}

                {ga4Loading && ga4Daily.length === 0 && <Spinner />}

                {ga4Daily.length > 0 && activeView !== "blend" && (
                  <div className={`space-y-4 transition-opacity duration-200 ${ga4Loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                    <ComparisonBanner days={dateRangeDays(ga4FetchFilters.dateRange)} mode={ga4Filters.comparison} rangeHint={ga4BannerHint} />
                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <HoverTooltip tip="Total unique users who visited your site in the selected period. Click to isolate this metric on the trend chart."><KpiCard label="Active Users"  value={ga4TotalUsers.toLocaleString()}    sub={dateRangeLabel(ga4Filters.dateRange)} icon={Users}       cmpValue={hasCmp ? ga4CmpUsers    : undefined} cmpLabel={ga4CmpLabel} onClick={() => setGa4TrendMetricFocus((c) => (c === "users" ? null : "users"))} active={ga4TrendMetricFocus === "users"} /></HoverTooltip>
                      <HoverTooltip tip="Number of sessions (visits) in the period. A single user can have multiple sessions. Click to chart this metric alone."><KpiCard label="Sessions"      value={ga4TotalSessions.toLocaleString()} sub={dateRangeLabel(ga4Filters.dateRange)} icon={Activity}    cmpValue={hasCmp ? ga4CmpSessions : undefined} cmpLabel={ga4CmpLabel} onClick={() => setGa4TrendMetricFocus((c) => (c === "sessions" ? null : "sessions"))} active={ga4TrendMetricFocus === "sessions"} /></HoverTooltip>
                      <HoverTooltip tip="Total page views recorded. Counts every page load, including repeat views by the same user. Click to chart."><KpiCard label="Pageviews"     value={ga4TotalPV.toLocaleString()}        sub={dateRangeLabel(ga4Filters.dateRange)} icon={Eye}          cmpValue={hasCmp ? ga4CmpPV       : undefined} cmpLabel={ga4CmpLabel} onClick={() => setGa4TrendMetricFocus((c) => (c === "pageviews" ? null : "pageviews"))} active={ga4TrendMetricFocus === "pageviews"} /></HoverTooltip>
                      <HoverTooltip tip="Average bounce rate across the period — the % of sessions where users left without interacting further. Lower is generally better."><KpiCard label="Avg Bounce"    value={`${ga4AvgBounce}%`}                 icon={TrendingUp}                                    cmpValue={hasCmp ? ga4CmpBounce   : undefined} cmpLabel={ga4CmpLabel} onClick={() => setGa4TrendMetricFocus((c) => (c === "bounceRate" ? null : "bounceRate"))} active={ga4TrendMetricFocus === "bounceRate"} /></HoverTooltip>
                    </div>
                    {ga4TrendMetricFocus && (
                      <p className="text-xs text-purple-600">Trend chart shows <strong>{metricLabel[ga4TrendMetricFocus as MetricKey]}</strong> only. Click the same KPI again to show all selected metrics.</p>
                    )}

                    {/* Metric chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <ChartCard title={isSingleSeries ? `${ga4ChartMetrics.map((m) => metricLabel[m as MetricKey]).join(", ")} over time${ga4Filters.comparison !== "none" ? ` — ${ga4Filters.comparison === "prevPeriod" ? "vs Prev Period" : "vs Prev Year"}` : ""}` : `${ga4Filters.deviceFilter.length > 1 ? "Devices" : "Channels"} — ${ga4ChartMetrics.map((m) => metricLabel[m as MetricKey]).join(", ")}`} className="lg:col-span-2" tip="Daily trend of your selected metrics. Click any KPI card above to isolate that metric. Use the Comparison toggle to overlay a previous period.">
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartGA4Data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                              {ga4ChartMetrics.map((m, i) => (
                                <linearGradient key={m} id={`grad_${m}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%"  stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.12} />
                                  <stop offset="95%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
                                </linearGradient>
                              ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                            <XAxis dataKey="date" ticks={tickFilter(chartGA4Data as {date:string}[])} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={40} />
                            <Tooltip {...chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={7} />
                            {isSingleSeries
                              ? ga4ChartMetrics.map((m, i) => [
                                  <Line key={m} type="monotone" dataKey={m} name={metricLabel[m as MetricKey]} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />,
                                  ga4Filters.comparison !== "none" && ga4DailyCmp.length > 0
                                    ? <Line key={`${m}_cmp`} type="monotone" dataKey={`${m}_cmp`} name={`${metricLabel[m as MetricKey]} (cmp)`} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 2 }} />
                                    : null,
                                ])
                              : ga4SeriesKeys.map((k, i) => {
                                  const [channelOrDevice, metric] = k.split("__");
                                  const label = `${channelOrDevice} — ${metricLabel[metric as MetricKey] ?? metric}`;
                                  return <Line key={k} type="monotone" dataKey={k} name={label} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />;
                                })
                            }
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      {ga4Channels.length > 0 && (
                        <ChartCard title="Top Channels" tip="Breakdown of traffic sources — Organic Search, Direct, Social, Referral, etc. Bars show sessions relative to the top channel.">
                          <div className="space-y-2.5">
                            {ga4Channels.slice(0, 6).map((c, i) => {
                              const max    = ga4Channels[0].sessions;
                              const pct    = max ? Math.round((c.sessions / max) * 100) : 0;
                              const cmpRow = hasCmp ? ga4ChannelsCmp.find((x) => x.channel === c.channel) : null;
                              const delta  = cmpRow ? ((c.sessions - cmpRow.sessions) / Math.abs(cmpRow.sessions || 1)) * 100 : null;
                              return (
                                <div key={i}>
                                  <div className="flex justify-between mb-1 gap-1">
                                    <span className="text-xs text-gray-600 truncate max-w-[110px]">{c.channel}</span>
                                    <span className="flex items-center gap-1.5">
                                      <span className="text-xs text-gray-900 font-semibold">{c.sessions.toLocaleString()}</span>
                                      {delta !== null && (
                                        <span className={`text-[10px] font-bold ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="h-1.5 bg-purple-50 rounded-full relative">
                                    {cmpRow && (
                                      <div className="absolute top-0 left-0 h-full bg-purple-200 rounded-full" style={{ width: `${max ? Math.round((cmpRow.sessions / max) * 100) : 0}%` }} />
                                    )}
                                    <div className="h-full bg-purple-600 rounded-full transition-all relative" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {hasCmp && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                              <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-purple-600 rounded inline-block" /> Current</span>
                              <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-purple-200 rounded inline-block" /> {ga4CmpLabel}</span>
                            </div>
                          )}
                        </ChartCard>
                      )}
                    </div>

                    {/* Landing Pages */}
                    {ga4LandingPages.length > 0 && (
                      <ChartCard title="Top Landing Pages" tip="Pages where users first entered your site. Click any row to drill into that page's GSC queries and GA4 data. Use the search box to filter by path.">
                        <div className="mb-3">
                          <TextInput value={landingPageFilter} onChange={setLandingPageFilter} placeholder="Filter by page path…" className="max-w-xs" />
                        </div>
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <SortableTh label="Page" sortKey="page" sort={landingSort.sort} onToggle={landingSort.toggle} className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-4 text-[10px]" />
                                <SortableTh label="Users" sortKey="users" sort={landingSort.sort} onToggle={landingSort.toggle} className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-4 text-[10px]" />
                                <SortableTh label="Sessions" sortKey="sessions" sort={landingSort.sort} onToggle={landingSort.toggle} className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-4 text-[10px]" />
                                <SortableTh label="Bounce" sortKey="bounceRate" sort={landingSort.sort} onToggle={landingSort.toggle} className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide text-[10px]" />
                              </tr>
                            </thead>
                            <tbody>
                              {landingSort.sorted.map((p, i) => {
                                const c = hasCmp ? ga4LandingPagesCmp.find((x) => x.page === p.page) : null;
                                const uDelta = c ? ((p.users - c.users) / Math.abs(c.users || 1)) * 100 : null;
                                const sDelta = c ? ((p.sessions - c.sessions) / Math.abs(c.sessions || 1)) * 100 : null;
                                return (
                                  <tr
                                    key={i}
                                    className="border-b border-gray-50 last:border-0 hover:bg-purple-50/40 transition-colors cursor-pointer"
                                    onClick={() => { setPageDrillPath(p.page); setGscLinkQuery(null); setGscLinkPage(null); }}
                                  >
                                    <td className="py-2 pr-4 text-gray-700 font-medium max-w-[200px] truncate" title={p.page}><UrlLink url={p.page} /></td>
                                    <td className="py-2 pr-4">
                                      <span className="text-gray-900 font-semibold">{p.users.toLocaleString()}</span>
                                      {uDelta !== null && <span className={`ml-1 text-[10px] font-bold ${uDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>{uDelta >= 0 ? "+" : ""}{uDelta.toFixed(0)}%</span>}
                                      {c && <div className="text-[10px] text-gray-400">{c.users.toLocaleString()}</div>}
                                    </td>
                                    <td className="py-2 pr-4">
                                      <span className="text-gray-600">{p.sessions.toLocaleString()}</span>
                                      {sDelta !== null && <span className={`ml-1 text-[10px] font-bold ${sDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>{sDelta >= 0 ? "+" : ""}{sDelta.toFixed(0)}%</span>}
                                      {c && <div className="text-[10px] text-gray-400">{c.sessions.toLocaleString()}</div>}
                                    </td>
                                    <td className="py-2 text-gray-500">{(p.bounceRate * 100).toFixed(1)}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                    )}
                  </div>
                )}

                {!ga4Loading && selectedGA4 && ga4Daily.length === 0 && activeView !== "blend" && (
                  <p className="text-sm text-gray-400 py-4">No data for this property / filter combination.</p>
                )}
              </section>
            )}

            {/* ── AI Search Channels ── */}
            {activeView === "ga4" && (ga4AiSources.length > 0 || selectedGA4) && (
              <>
                <SectionDivider label="AI Search Channels" />
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-purple-100 rounded-xl p-2"><Bot size={16} className="text-purple-700" /></div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">AI Traffic Sources</h2>
                      <p className="text-xs text-gray-400">ChatGPT, Claude, Gemini, Perplexity & more via source/medium</p>
                    </div>
                  </div>

                  {ga4Loading && ga4AiSources.length === 0 && <Spinner />}

                  {!ga4Loading && ga4AiSources.length === 0 && selectedGA4 && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                      <Bot size={28} className="text-purple-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No AI referral traffic detected in this date range.</p>
                      <p className="text-gray-300 text-xs mt-1">Monitoring: chatgpt.com, claude.ai, gemini.google.com, perplexity.ai…</p>
                    </div>
                  )}

                  {ga4AiSources.length > 0 && (
                    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity duration-200 ${ga4Loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                      <ChartCard title="Sessions by AI Source" tip="Traffic originating from AI assistants like ChatGPT, Claude, Perplexity, and Gemini, detected via referral source/medium in GA4.">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={ga4AiSources} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                            <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} width={80} />
                            <Tooltip {...chartTooltipStyle} />
                            <Bar dataKey="sessions" name="Sessions" radius={[0, 4, 4, 0]}>
                              {ga4AiSources.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      <ChartCard title={`AI Share of Traffic${hasCmp ? ` — vs ${ga4CmpLabel}` : ""}`} tip="Pie chart showing the proportion of your traffic arriving from each AI platform. Helps you understand which AI tools are driving the most referrals.">
                        <div className="flex gap-4 items-center">
                          <ResponsiveContainer width="50%" height={180}>
                            <PieChart>
                              <Pie data={ga4AiSources} dataKey="sessions" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                                {ga4AiSources.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip {...chartTooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Sessions"]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-1.5">
                            {ga4AiSources.slice(0, 6).map((s, i) => {
                              const c     = hasCmp ? ga4AiSourcesCmp.find((x) => x.label === s.label) : null;
                              const delta = c ? ((s.sessions - c.sessions) / Math.abs(c.sessions || 1)) * 100 : null;
                              return (
                                <div key={i} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                    <span className="text-xs text-gray-600">{s.label}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-semibold text-gray-900">{s.sessions.toLocaleString()}</span>
                                    {delta !== null && <span className={`ml-1 text-[10px] font-bold ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>{delta >= 0 ? "+" : ""}{delta.toFixed(0)}%</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <ScrollTable>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr>
                                <SortableTh label="Source" sortKey="label" sort={aiSourcesSort.sort} onToggle={aiSourcesSort.toggle} className="pb-2 text-left text-gray-400 font-semibold pr-3 uppercase tracking-wide text-[10px]" />
                                <SortableTh label="Sessions" sortKey="sessions" sort={aiSourcesSort.sort} onToggle={aiSourcesSort.toggle} className="pb-2 text-left text-gray-400 font-semibold pr-3 uppercase tracking-wide text-[10px]" />
                                {hasCmp && <th className="pb-2 text-left text-gray-400 font-semibold pr-3 uppercase tracking-wide text-[10px]">Prev</th>}
                                {hasCmp && <th className="pb-2 text-left text-gray-400 font-semibold pr-3 uppercase tracking-wide text-[10px]">Chg</th>}
                                <SortableTh label="Users" sortKey="users" sort={aiSourcesSort.sort} onToggle={aiSourcesSort.toggle} className="pb-2 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px]" />
                              </tr>
                            </thead>
                            <tbody>
                              {aiSourcesSort.sorted.map((s, i) => {
                                const c     = hasCmp ? ga4AiSourcesCmp.find((x) => x.label === s.label) : null;
                                const delta = c ? ((s.sessions - c.sessions) / Math.abs(c.sessions || 1)) * 100 : null;
                                return (
                                  <tr key={i} className="border-t border-gray-50 hover:bg-purple-50/50 transition-colors">
                                    <td className="py-1.5 pr-3 text-gray-700">{s.label}</td>
                                    <td className="py-1.5 pr-3 text-gray-900 font-semibold">{s.sessions.toLocaleString()}</td>
                                    {hasCmp && <td className="py-1.5 pr-3 text-gray-400">{c ? c.sessions.toLocaleString() : "—"}</td>}
                                    {hasCmp && (
                                      <td className={`py-1.5 pr-3 font-bold text-[10px] ${delta === null ? "text-gray-400" : delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                        {delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}
                                      </td>
                                    )}
                                    <td className="py-1.5 text-gray-500">{s.users.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          </ScrollTable>
                        </div>
                      </ChartCard>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ── GSC Section ── */}
            {(activeView === "gsc" || activeView === "blend") && (
              <>
                {activeView === "gsc" && <SectionDivider label="Google Search Console" />}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 rounded-xl p-2"><Search size={16} className="text-purple-700" /></div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Search Console</h2>
                        <p className="text-xs text-gray-400">Organic search performance</p>
                      </div>
                    </div>
                    <div className="max-w-[260px] w-full">
                      <Select value={selectedGSC} onChange={setSelectedGSC} options={gscProperties} placeholder="Select GSC Property" disabled={gscProperties.length === 0} />
                    </div>
                  </div>

                  {activeView !== "blend" && (
                    <GSCFilterPanel filters={gscFilters} setFilters={setGscFilters} countryOptions={countryOptions} />
                  )}

                  {gscLoading && gscDaily.length === 0 && <Spinner />}

                  {gscDaily.length > 0 && activeView !== "blend" && (
                    <div className={`space-y-4 transition-opacity duration-200 ${gscLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                      <ComparisonBanner days={dateRangeDays(gscFetchFilters.dateRange)} mode={gscFilters.comparison} rangeHint={gscBannerHint} />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <HoverTooltip tip="Times users clicked your site's links in Google Search results during this period."><KpiCard label="Total Clicks"  value={gscTotalClicks.toLocaleString()}      sub={dateRangeLabel(gscFilters.dateRange)} icon={MousePointerClick} cmpValue={hasGscCmp ? gscCmpClicks      : undefined} cmpLabel={gscCmpLabel} /></HoverTooltip>
                        <HoverTooltip tip="How many times your pages appeared in Google Search results, regardless of whether they were clicked."><KpiCard label="Impressions"   value={gscTotalImpressions.toLocaleString()} sub={dateRangeLabel(gscFilters.dateRange)} icon={Eye}               cmpValue={hasGscCmp ? gscCmpImpressions : undefined} cmpLabel={gscCmpLabel} /></HoverTooltip>
                        <HoverTooltip tip="Click-through rate — the percentage of impressions that resulted in a click. Higher CTR means your titles and meta descriptions are compelling."><KpiCard label="Avg CTR"       value={`${gscAvgCTR}%`}                      icon={TrendingUp}                                          cmpValue={hasGscCmp ? gscCmpCTR         : undefined} cmpLabel={gscCmpLabel} /></HoverTooltip>
                        <HoverTooltip tip="Your average ranking position in Google Search. Position 1 is the top result. Lower numbers are better."><KpiCard label="Avg Position"  value={gscAvgPosition}                       icon={ArrowUpRight}                                        cmpValue={hasGscCmp ? gscCmpPosition    : undefined} cmpLabel={gscCmpLabel} /></HoverTooltip>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ChartCard title={`Daily Clicks${gscSeriesKeys.length > 1 ? " by " + (gscFilters.countryFilter.length > 1 ? "Country" : "Device") : ""}${gscFilters.comparison !== "none" && gscSeriesKeys.length === 0 ? ` — ${gscFilters.comparison === "prevPeriod" ? "vs Prev Period" : "vs Prev Year"}` : ""}`} tip="Day-by-day GSC click trend. Spikes or drops here often correlate with algorithm updates, content changes, or SERP feature appearances.">
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartGSCData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                              <XAxis dataKey="date" ticks={tickFilter(chartGSCData as {date:string}[])} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} />
                              <Tooltip {...chartTooltipStyle} />
                              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={7} />
                              {gscSeriesKeys.length > 0
                                ? gscSeriesKeys.map((k, i) => (
                                    <Line key={k} type="monotone" dataKey={k} name={k.split("__")[0]} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                                  ))
                                : [
                                    <Line key="clicks" yAxisId={undefined} type="monotone" dataKey="clicks" name="Clicks" stroke="#7e22ce" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />,
                                    gscFilters.comparison !== "none" && gscDailyCmp.length > 0
                                      ? <Line key="clicks_cmp" type="monotone" dataKey="clicks_cmp" name="Clicks (cmp)" stroke="#7e22ce" strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 2 }} />
                                      : null,
                                    <Line key="impressions" type="monotone" dataKey="impressions" name="Impressions" stroke="#c084fc" strokeWidth={2} strokeDasharray="4 3" dot={false} activeDot={{ r: 3 }} />,
                                    gscFilters.comparison !== "none" && gscDailyCmp.length > 0
                                      ? <Line key="impr_cmp" type="monotone" dataKey="impressions_cmp" name="Impr (cmp)" stroke="#c084fc" strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 2 }} />
                                      : null,
                                  ]
                              }
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartCard>

                        <div className="grid grid-rows-2 gap-4">
                          {gscDevices.length > 0 && (
                            <ChartCard title="Clicks by Device" tip="How your search clicks are split across desktop, mobile, and tablet. Useful for prioritising mobile optimisation.">
                              <ResponsiveContainer width="100%" height={80}>
                                <BarChart data={gscDevices} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                  <YAxis dataKey="device" type="category" tick={{ fontSize: 10, fill: "#4b5563" }} axisLine={false} tickLine={false} width={60} />
                                  <Tooltip {...chartTooltipStyle} />
                                  <Bar dataKey="clicks" name="Clicks" radius={[0, 4, 4, 0]}>
                                    {gscDevices.map((_, i) => <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />)}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </ChartCard>
                          )}

                          <ChartCard title="Daily CTR (%)" tip="Your click-through rate over time. A declining CTR despite stable impressions suggests title/meta description improvements are needed.">
                            <ResponsiveContainer width="100%" height={80}>
                              <AreaChart data={chartGSCData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                <defs>
                                  <linearGradient id="ctrgrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7e22ce" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#7e22ce" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v}%`, "CTR"]} />
                                <Area type="monotone" dataKey="ctr" stroke="#7e22ce" strokeWidth={2} fill="url(#ctrgrad)" dot={false} />
                                {gscFilters.comparison !== "none" && gscDailyCmp.length > 0 && (
                                  <Area type="monotone" dataKey="ctr_cmp" stroke="#7e22ce" strokeWidth={1.5} strokeDasharray="5 3" fill="none" dot={false} />
                                )}
                              </AreaChart>
                            </ResponsiveContainer>
                          </ChartCard>
                        </div>
                      </div>

                      {/* ── Query filter bar ── */}
                      <QueryFilterBar filters={gscFilters} setFilters={setGscFilters} totalRows={gscQueries.length} filteredCount={filteredGscRows.length} />

                      <p className="text-xs text-gray-500">Click a <strong>query</strong> row to load top pages for that query, or a <strong>page</strong> row to load top queries. Click again in the linked table to <strong>scope the whole dashboard</strong> to that page.</p>

                      {(gscLinkQuery || gscLinkPage) && (
                        <div className="flex flex-wrap gap-2 items-center text-xs">
                          {gscLinkQuery && <FilterPill label={`Selected query: ${gscLinkQuery}`} onRemove={() => setGscLinkQuery(null)} />}
                          {gscLinkPage && <FilterPill label={`Selected page`} onRemove={() => setGscLinkPage(null)} />}
                        </div>
                      )}

                      {(gscCrossPages.length > 0 || gscCrossQueries.length > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {gscCrossPages.length > 0 && (
                            <ChartCard title="Top pages for this query">
                              <ScrollTable>
                                <table className="w-full text-xs">
                                  <thead className="sticky top-0 z-10 bg-white">
                                    <tr className="border-b border-gray-100">
                                      <SortableTh label="Page" sortKey="query" sort={crossPagesSort.sort} onToggle={crossPagesSort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />
                                      <SortableTh label="Clicks" sortKey="clicks" sort={crossPagesSort.sort} onToggle={crossPagesSort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />
                                      <SortableTh label="Impr." sortKey="impressions" sort={crossPagesSort.sort} onToggle={crossPagesSort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {crossPagesSort.sorted.map((row, i) => (
                                      <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/50 cursor-pointer" onClick={() => { setPageDrillPath(row.query); setGscLinkQuery(null); setGscLinkPage(null); }}>
                                        <td className="py-2 pr-2 max-w-[200px] truncate" title={row.query}>{row.query}</td>
                                        <td className="py-2 pr-2 font-semibold">{row.clicks.toLocaleString()}</td>
                                        <td className="py-2 text-gray-500">{row.impressions.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </ScrollTable>
                            </ChartCard>
                          )}
                          {gscCrossQueries.length > 0 && (
                            <ChartCard title="Top queries for this page">
                              <ScrollTable>
                                <table className="w-full text-xs">
                                  <thead className="sticky top-0 z-10 bg-white">
                                    <tr className="border-b border-gray-100">
                                      <SortableTh label="Query" sortKey="query" sort={crossQueriesSort.sort} onToggle={crossQueriesSort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />
                                      <SortableTh label="Clicks" sortKey="clicks" sort={crossQueriesSort.sort} onToggle={crossQueriesSort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />
                                      <SortableTh label="Impr." sortKey="impressions" sort={crossQueriesSort.sort} onToggle={crossQueriesSort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {crossQueriesSort.sorted.map((row, i) => (
                                      <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/50 cursor-pointer" onClick={() => { setGscLinkQuery(row.query); setGscLinkPage(null); }}>
                                        <td className="py-2 pr-2 max-w-[200px] truncate" title={row.query}>{row.query}</td>
                                        <td className="py-2 pr-2 font-semibold">{row.clicks.toLocaleString()}</td>
                                        <td className="py-2 text-gray-500">{row.impressions.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </ScrollTable>
                            </ChartCard>
                          )}
                        </div>
                      )}

                      {/* Queries table with sortable columns */}
                      {filteredGscRows.length > 0 && (
                        <ChartCard title={`Top by ${gscFilters.dimension === "date" ? "Query" : gscFilters.dimension}${hasGscCmp ? ` — vs ${gscCmpLabel}` : ""}`}>
                          <ScrollTable>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                <tr className="border-b border-gray-100">
                                  {[
                                    { key: null,          label: "Query / Page" },
                                    { key: "clicks",      label: "Clicks" },
                                    { key: "impressions", label: "Impressions" },
                                    { key: "ctr",         label: "CTR" },
                                    { key: "position",    label: "Position" },
                                  ].map(({ key, label }) => (
                                    <th key={label}
                                      onClick={() => key && handleGscSort(key as GSCFilters["sortBy"])}
                                      className={`pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-3 last:pr-0 text-[10px] ${key ? "cursor-pointer hover:text-purple-600 select-none" : ""}`}>
                                      <span className="inline-flex items-center gap-1">
                                        {label}
                                        {key && <SortIcon col={key} sortBy={gscFilters.sortBy} sortDir={gscFilters.sortDir} />}
                                      </span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredGscRows.map((q, i) => {
                                  const c = hasGscCmp ? gscQueriesCmp.find((x) => x.query === q.query) : null;
                                  const cd = c ? ((q.clicks - c.clicks) / Math.abs(c.clicks || 1)) * 100 : null;
                                  const pd = c ? q.position - c.position : null;
                                  return (
                                    <tr
                                      key={i}
                                      className="border-b border-gray-50 last:border-0 hover:bg-purple-50/40 transition-colors cursor-pointer"
                                      onClick={() => {
                                        if (gscFilters.dimension === "query" || gscFilters.dimension === "date") {
                                          setGscLinkQuery(q.query);
                                          setGscLinkPage(null);
                                        } else if (gscFilters.dimension === "page") {
                                          setGscLinkPage(q.query);
                                          setGscLinkQuery(null);
                                          setPageDrillPath(q.query);
                                        }
                                      }}
                                    >
                                      <td className="py-2 pr-3 text-gray-800 font-medium max-w-[180px] truncate">{q.query}</td>
                                      <td className="py-2 pr-3">
                                        <span className="text-gray-900 font-semibold">{q.clicks.toLocaleString()}</span>
                                        {cd !== null && <span className={`ml-1 text-[10px] font-bold ${cd >= 0 ? "text-emerald-600" : "text-red-500"}`}>{cd >= 0 ? "+" : ""}{cd.toFixed(0)}%</span>}
                                        {c && <div className="text-[10px] text-gray-400">{c.clicks.toLocaleString()}</div>}
                                      </td>
                                      <td className="py-2 pr-3">
                                        <span className="text-gray-500">{q.impressions.toLocaleString()}</span>
                                        {c && <div className="text-[10px] text-gray-400">{c.impressions.toLocaleString()}</div>}
                                      </td>
                                      <td className="py-2 pr-3">
                                        <span className="text-gray-600">{(q.ctr * 100).toFixed(2)}%</span>
                                        {c && <div className="text-[10px] text-gray-400">{(c.ctr * 100).toFixed(2)}%</div>}
                                      </td>
                                      <td className="py-2">
                                        <PosBadge pos={q.position} />
                                        {pd !== null && <div className={`text-[10px] font-bold mt-0.5 ${pd <= 0 ? "text-emerald-600" : "text-red-500"}`}>{pd <= 0 ? "" : "+"}{pd.toFixed(1)}</div>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </ScrollTable>
                        </ChartCard>
                      )}
                    </div>
                  )}

                  {!gscLoading && selectedGSC && gscDaily.length === 0 && activeView !== "blend" && (
                    <p className="text-sm text-gray-400 py-4">No data for this property / filter combination.</p>
                  )}
                </section>
              </>
            )}

            {/* ── Blend View ── */}
            {activeView === "blend" && (
              <>
                <SectionDivider label="Blended Overview" />
                <section className="space-y-4">
                  {(ga4Loading || gscLoading) && blendData.length === 0 && <Spinner />}

                  {blendData.length > 0 && (
                    <>
                      {/* Combined KPIs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <HoverTooltip tip="GA4 active users from your Analytics property for the selected period."><KpiCard label="GA4 Users"    value={ga4TotalUsers.toLocaleString()}      sub="GA4" icon={Users}            cmpValue={hasCmp    ? ga4CmpUsers    : undefined} cmpLabel={ga4CmpLabel} /></HoverTooltip>
                        <HoverTooltip tip="GA4 sessions — total visits to your site including repeat visits by the same user."><KpiCard label="GA4 Sessions" value={ga4TotalSessions.toLocaleString()}    sub="GA4" icon={Activity}         cmpValue={hasCmp    ? ga4CmpSessions : undefined} cmpLabel={ga4CmpLabel} /></HoverTooltip>
                        <HoverTooltip tip="GSC clicks — times users clicked your site in Google Search results."><KpiCard label="GSC Clicks"   value={gscTotalClicks.toLocaleString()}      sub="GSC" icon={MousePointerClick} cmpValue={hasGscCmp ? gscCmpClicks   : undefined} cmpLabel={gscCmpLabel} /></HoverTooltip>
                        <HoverTooltip tip="GSC impressions — how many times your pages appeared in Google search results."><KpiCard label="GSC Impr."    value={gscTotalImpressions.toLocaleString()} sub="GSC" icon={Eye}               cmpValue={hasGscCmp ? gscCmpImpressions : undefined} cmpLabel={gscCmpLabel} /></HoverTooltip>
                      </div>

                      <ChartCard title="GA4 Users · GA4 Sessions · GSC Clicks — Blended Timeline" tip="Overlays GA4 and GSC metrics on one chart using dual Y-axes. Helps you spot whether drops in organic clicks match drops in GA4 sessions, or if the gap is widening.">
                        <ResponsiveContainer width="100%" height={280}>
                          <LineChart data={blendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                            <XAxis dataKey="date" ticks={tickFilter(blendData, 5)} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="ga4" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={44} />
                            <YAxis yAxisId="gsc" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={44} />
                            <Tooltip {...chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={7} />
                            <Line yAxisId="ga4" type="monotone" dataKey="ga4Users"    name="GA4 Users"    stroke="#7e22ce" strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls={false} />
                            <Line yAxisId="ga4" type="monotone" dataKey="ga4Sessions" name="GA4 Sessions" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 2" dot={false} activeDot={{ r: 3 }} connectNulls={false} />
                            <Line yAxisId="gsc" type="monotone" dataKey="gscClicks"   name="GSC Clicks"   stroke="#0f172a" strokeWidth={2} strokeDasharray="2 2" dot={false} activeDot={{ r: 3 }} connectNulls={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      {/* Side-by-side mini KPI breakdown */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ChartCard title="Top GA4 Channels" tip="Your top traffic sources from GA4 — useful for cross-referencing against GSC organic data to understand how much search contributes vs other channels.">
                          <div className="space-y-2.5">
                            {ga4Channels.slice(0, 5).map((c, i) => {
                              const max = ga4Channels[0]?.sessions || 1;
                              const pct = Math.round((c.sessions / max) * 100);
                              return (
                                <div key={i}>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-xs text-gray-600 truncate max-w-[140px]">{c.channel}</span>
                                    <span className="text-xs text-gray-900 font-semibold">{c.sessions.toLocaleString()}</span>
                                  </div>
                                  <div className="h-1.5 bg-purple-50 rounded-full">
                                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ChartCard>

                        <ChartCard title="Top GSC Queries" tip="The search queries driving the most clicks from Google. Use this alongside GA4 channel data to understand how your organic keywords translate into actual site traffic.">
                          <ScrollTable>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                <tr className="border-b border-gray-100">
                                  <SortableTh label="Query" sortKey="query" sort={blendQueriesSort.sort} onToggle={blendQueriesSort.toggle} className="pb-2 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px] pr-3" />
                                  <SortableTh label="Clicks" sortKey="clicks" sort={blendQueriesSort.sort} onToggle={blendQueriesSort.toggle} className="pb-2 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px] pr-3" />
                                  <SortableTh label="Position" sortKey="position" sort={blendQueriesSort.sort} onToggle={blendQueriesSort.toggle} className="pb-2 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px]" />
                                </tr>
                              </thead>
                              <tbody>
                                {blendQueriesSort.sorted.map((q, i) => (
                                  <tr key={i} className="border-b border-gray-50 last:border-0">
                                    <td className="py-2 pr-3 text-gray-700 max-w-[160px] truncate">{q.query}</td>
                                    <td className="py-2 pr-3 text-gray-900 font-semibold">{q.clicks.toLocaleString()}</td>
                                    <td className="py-2"><PosBadge pos={q.position} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollTable>
                        </ChartCard>
                      </div>
                    </>
                  )}

                  {!ga4Loading && !gscLoading && blendData.length === 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                      <Layers size={28} className="text-purple-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Select a GA4 property and GSC property above to see blended data.</p>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ── SEO Opportunities (GSC) ── */}
            {activeView === "opportunities" && (
              <>
                <SectionDivider label="SEO OPPORTUNITIES" />
                <section>
                  <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-2">
                        <Lightbulb size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">SEO opportunities</h2>
                        <p className="text-xs text-gray-400 max-w-xl">
                          Queries from Search Console with high impressions but relatively few clicks (≥{GSC_OPPORTUNITY_MIN_IMPRESSIONS} impressions, CTR ≤{(GSC_OPPORTUNITY_MAX_CTR * 100).toFixed(0)}%, and clicks under 5% of impressions). Uses the same date range, comparison, and device/country filters as GSC.
                        </p>
                      </div>
                    </div>
                    <div className="max-w-[260px] w-full min-w-[200px]">
                      <Select value={selectedGSC} onChange={setSelectedGSC} options={gscProperties} placeholder="Select GSC Property" disabled={gscProperties.length === 0} />
                    </div>
                  </div>

                  <GSCFilterPanel filters={gscFilters} setFilters={setGscFilters} countryOptions={countryOptions} />

                  {gscLoading && gscOpportunityQueries.length === 0 && <Spinner />}

                  {gscOpportunityQueries.length > 0 && (
                    <div className={`space-y-4 transition-opacity duration-200 ${gscLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                      <ComparisonBanner days={dateRangeDays(gscFetchFilters.dateRange)} mode={gscFilters.comparison} rangeHint={gscBannerHint} />
                      {gscOpportunityRows.length > 0 ? (
                        <ChartCard title={`Low clicks, high impressions${hasGscCmp ? ` — vs ${gscCmpLabel}` : ""}`} tip="Queries with lots of Google impressions but very few clicks — prime candidates for better title tags and meta descriptions to boost CTR.">
                          <p className="text-xs text-gray-500 mb-3">
                            {gscOpportunityRows.length} quer{gscOpportunityRows.length === 1 ? "y" : "ies"} · from {gscOpportunityQueries.length.toLocaleString()} top queries in GSC (same filters)
                          </p>
                          <ScrollTable>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                <tr className="border-b border-gray-100">
                                  {([
                                    { key: "query" as const,       label: "Query" },
                                    { key: "clicks" as const,      label: "Clicks" },
                                    { key: "impressions" as const, label: "Impressions" },
                                    { key: "ctr" as const,         label: "CTR" },
                                    { key: "position" as const,    label: "Position" },
                                  ]).map(({ key, label }) => (
                                    <th key={label}
                                      onClick={() => handleOppSort(key)}
                                      className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-3 last:pr-0 text-[10px] cursor-pointer hover:text-amber-700 select-none">
                                      <span className="inline-flex items-center gap-1">
                                        {label}
                                        <SortIcon col={key} sortBy={oppSort.col} sortDir={oppSort.dir} />
                                      </span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {gscOpportunityRows.map((q, i) => {
                                  const c = hasGscCmp ? gscOpportunityQueriesCmp.find((x) => x.query === q.query) : null;
                                  const cd = c ? ((q.clicks - c.clicks) / Math.abs(c.clicks || 1)) * 100 : null;
                                  const pd = c ? q.position - c.position : null;
                                  return (
                                    <tr key={`${q.query}-${i}`} className="border-b border-gray-50 last:border-0 hover:bg-amber-50/30 transition-colors">
                                      <td className="py-2 pr-3 text-gray-800 font-medium max-w-[220px] truncate" title={q.query}>{q.query}</td>
                                      <td className="py-2 pr-3">
                                        <span className="text-gray-900 font-semibold">{q.clicks.toLocaleString()}</span>
                                        {cd !== null && <span className={`ml-1 text-[10px] font-bold ${cd >= 0 ? "text-emerald-600" : "text-red-500"}`}>{cd >= 0 ? "+" : ""}{cd.toFixed(0)}%</span>}
                                        {c && <div className="text-[10px] text-gray-400">{c.clicks.toLocaleString()}</div>}
                                      </td>
                                      <td className="py-2 pr-3">
                                        <span className="text-gray-700 font-medium">{q.impressions.toLocaleString()}</span>
                                        {c && <div className="text-[10px] text-gray-400">{c.impressions.toLocaleString()}</div>}
                                      </td>
                                      <td className="py-2 pr-3">
                                        <span className="text-gray-600">{(q.ctr * 100).toFixed(2)}%</span>
                                        {c && <div className="text-[10px] text-gray-400">{(c.ctr * 100).toFixed(2)}%</div>}
                                      </td>
                                      <td className="py-2">
                                        <PosBadge pos={q.position} />
                                        {pd !== null && <div className={`text-[10px] font-bold mt-0.5 ${pd <= 0 ? "text-emerald-600" : "text-red-500"}`}>{pd <= 0 ? "" : "+"}{pd.toFixed(1)}</div>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </ScrollTable>
                        </ChartCard>
                      ) : (
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
                          <Lightbulb size={24} className="text-amber-200 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No queries match the low-click / high-impression rules for this period and filters.</p>
                          <p className="text-gray-400 text-xs mt-2">Try a longer date range or relax filters if your site has limited GSC volume.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Query-in-copy analysis ── */}
                  <ChartCard title="Query in copy — do your pages mention the queries they rank for?" tip="Checks whether your ranking queries actually appear in your page content. Pages missing their target query in the copy often have lower relevance signals.">
                    <p className="text-xs text-gray-400 mb-3">
                      Select a page to fetch its live content and check which GSC queries actually appear in the copy. Queries <strong>missing from the page text</strong> are prime candidates to add naturally.
                    </p>

                    {/* Page picker */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="flex-1 min-w-[280px]">
                        <Select
                          value={queryCopyPage}
                          onChange={setQueryCopyPage}
                          options={[...new Map(gscBuriedPageQueries.map((r) => [r.page, r.page])).keys()].slice(0, 200).map((p) => ({ value: p as string, label: p as string }))}
                          placeholder="Pick a page to analyse…"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!queryCopyPage || queryCopyLoading.has(queryCopyPage)}
                        onClick={() => {
                          const queries = gscBuriedPageQueries.filter((r) => r.page === queryCopyPage).map((r) => r.query);
                          void fetchPageCopy(queryCopyPage, queries);
                        }}
                        className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800 disabled:opacity-40"
                      >
                        {queryCopyLoading.has(queryCopyPage) ? "Fetching…" : "Check copy"}
                      </button>
                    </div>

                    {/* Results table */}
                    {queryCopyResults.size > 0 && (
                      <div className="space-y-4">
                        {[...queryCopyResults.entries()].map(([page, result]) => {
                          const rows = gscBuriedPageQueries.filter((r) => r.page === page);
                          const inCopy   = rows.filter((r) => result.queryHits.get(r.query) === true);
                          const missing  = rows.filter((r) => result.queryHits.get(r.query) === false);
                          const isOpen   = queryCopyExpanded === page;
                          return (
                            <div key={page} className="rounded-xl border border-gray-100 overflow-hidden">
                              {/* Page header row */}
                              <div
                                className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => setQueryCopyExpanded(isOpen ? null : page)}
                              >
                                <div className="flex items-center gap-2 min-w-0 text-xs font-medium text-gray-700">
                                  <span className={`text-[10px] transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                                  <UrlLink url={page} />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                                    ✓ {inCopy.length} in copy
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">
                                    ✗ {missing.length} missing
                                  </span>
                                  {result.text === "" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">fetch failed</span>
                                  )}
                                </div>
                              </div>

                              {isOpen && (
                                <ScrollTable maxH="300px">
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                      <tr className="border-b border-gray-100">
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold text-[10px]">Query</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold text-[10px]">Impr.</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold text-[10px]">Position</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold text-[10px]">In copy?</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold text-[10px]">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {/* Missing first — most actionable */}
                                      {[...missing, ...inCopy].map((r) => {
                                        const hit = result.queryHits.get(r.query);
                                        return (
                                          <tr key={r.query} className={`border-b border-gray-50 ${hit ? "" : "bg-red-50/30"}`}>
                                            <td className="py-2 px-3 font-medium text-gray-800">{r.query}</td>
                                            <td className="py-2 px-3 text-gray-500">{r.impressions.toLocaleString()}</td>
                                            <td className="py-2 px-3">
                                              <span className="text-[10px] font-semibold text-red-400">{r.position.toFixed(0)}</span>
                                            </td>
                                            <td className="py-2 px-3">
                                              {hit === true  && <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">✓ Yes</span>}
                                              {hit === false && <span className="inline-block px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold">✗ No</span>}
                                              {hit === undefined && <span className="text-gray-300 text-[10px]">—</span>}
                                            </td>
                                            <td className="py-2 px-3 text-[10px] text-gray-400">
                                              {hit === false ? "Add to copy" : hit === true ? "Optimise placement" : ""}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </ScrollTable>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ChartCard>

                  {!gscLoading && selectedGSC && gscOpportunityQueries.length === 0 && (
                    <p className="text-sm text-gray-400 py-4">No query data for this property / filter combination.</p>
                  )}

                  {/* ── Buried URLs: 0 clicks + position 50+ queries ── */}
                  {(buriedByPage.length > 0 || gscLoading) && (
                    <div className={`space-y-3 transition-opacity duration-200 ${gscLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                      <ChartCard title="Buried pages — 0 clicks with queries stuck at position 50+" tip="Pages that appear in search but rank so low they never get clicked. Consider consolidating, rewriting, or building links to these pages to rescue them from obscurity.">
                        <p className="text-xs text-gray-400 mb-3">
                          URLs with <strong>fewer than 5 total clicks</strong> that have queries ranked at position 50 or deeper. Click any row to expand its queries. These pages exist in Google's index but are effectively invisible — consolidate, improve, or redirect.
                        </p>
                        <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                          <span className="font-medium">{buriedByPage.length} URLs</span>
                          <span>·</span>
                          <span>{gscBuriedPageQueries.length} buried query signals</span>
                          <span className="ml-auto flex items-center gap-1.5">
                            Sort:
                            {(["impressions", "queries", "position"] as const).map((col) => (
                              <button key={col} type="button"
                                onClick={() => { if (buriedSortCol === col) setBuriedSortDir((d) => d === "desc" ? "asc" : "desc"); else { setBuriedSortCol(col); setBuriedSortDir("desc"); } }}
                                className={`px-2 py-0.5 rounded-lg capitalize transition-colors ${buriedSortCol === col ? "bg-amber-100 text-amber-700 font-semibold" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
                                {col} {buriedSortCol === col ? (buriedSortDir === "desc" ? "↓" : "↑") : ""}
                              </button>
                            ))}
                          </span>
                        </div>
                        <ScrollTable maxH="360px">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px] pr-3">URL</th>
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px] pr-3">Buried queries</th>
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px] pr-3">Total impr.</th>
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px] pr-3">Avg pos.</th>
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Signal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {buriedByPage.slice(0, 100).map((row) => {
                                const isExpanded = buriedExpandedPage === row.page;
                                return (
                                  <>
                                    <tr key={row.page}
                                      className="border-b border-gray-50 cursor-pointer hover:bg-amber-50/40 transition-colors"
                                      onClick={() => setBuriedExpandedPage(isExpanded ? null : row.page)}>
                                      <td className="py-2 pr-3">
                                        <div className="flex items-center gap-1.5 max-w-[220px] text-gray-700 font-medium">
                                          <span className={`text-[10px] transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                                          <UrlLink url={row.page} />
                                        </div>
                                      </td>
                                      <td className="py-2 pr-3">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">{row.queries.length}</span>
                                      </td>
                                      <td className="py-2 pr-3 font-medium">{row.totalImpressions.toLocaleString()}</td>
                                      <td className="py-2 pr-3">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold text-[10px]">
                                          {row.avgPosition.toFixed(0)}
                                        </span>
                                      </td>
                                      <td className="py-2">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${row.totalImpressions >= 100 ? "bg-red-50 text-red-600" : row.totalImpressions >= 20 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"}`}>
                                          {row.totalImpressions >= 100 ? "High waste" : row.totalImpressions >= 20 ? "Moderate" : "Low"}
                                        </span>
                                      </td>
                                    </tr>
                                    {isExpanded && row.queries.map((q) => (
                                      <tr key={`${row.page}__${q.query}`} className="border-b border-gray-50 bg-amber-50/20">
                                        <td className="py-1.5 pl-6 pr-3 text-gray-400 italic max-w-[220px] truncate" title={q.query}>↳ {q.query}</td>
                                        <td className="py-1.5 pr-3 text-gray-300">—</td>
                                        <td className="py-1.5 pr-3 text-gray-500">{q.impressions.toLocaleString()}</td>
                                        <td className="py-1.5 pr-3">
                                          <span className="text-[10px] text-red-400 font-medium">{q.position.toFixed(0)}</span>
                                        </td>
                                        <td className="py-1.5" />
                                      </tr>
                                    ))}
                                  </>
                                );
                              })}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ── GSC Opportunities Table ── */}
            {activeView === "gscOpportunities" && (
              <>
                <SectionDivider label="GSC OPPORTUNITIES" />
                <section>
                  <GscOpportunitiesView
                    gscQueries={gscQueries}
                    gscPages={gscPages}
                    oppTableMode={oppTableMode}
                    setOppTableMode={setOppTableMode}
                    oppSearch={oppSearch}
                    setOppSearch={setOppSearch}
                    oppActiveFilters={oppActiveFilters}
                    setOppActiveFilters={setOppActiveFilters}
                    oppExpandedRow={oppExpandedRow}
                    setOppExpandedRow={setOppExpandedRow}
                    oppExpandedData={oppExpandedData}
                    oppExpandedLoading={oppExpandedLoading}
                    oppMentionMap={oppMentionMap}
                    oppMentionChecked={oppMentionChecked}
                    fetchOppExpanded={fetchOppExpanded}
                    selectedGSC={selectedGSC}
                    gscLoading={gscLoading}
                  />
                </section>
              </>
            )}

            {/* ── Conversions (GA4 event) ── */}
            {activeView === "conversions" && (
              <>
                <SectionDivider label="CONVERSIONS" />
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2"><ShoppingCart size={16} className="text-emerald-700" /></div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Conversions</h2>
                        <p className="text-xs text-gray-400">Event counts by day — uses the same date range &amp; comparison as GA4 filters.</p>
                      </div>
                    </div>
                    <div className="max-w-[220px] w-full min-w-[180px]">
                      <Select value={selectedGA4} onChange={setSelectedGA4} options={ga4Properties} placeholder="Select GA4 Property" disabled={ga4Properties.length === 0} />
                    </div>
                  </div>
                  <GA4FilterPanel filters={ga4Filters} setFilters={setGa4Filters} channelOptions={channelOptions} />
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[260px]">
                      <label className="block text-xs text-gray-500 mb-1 font-medium">Event name {convEventsLoading && <span className="text-gray-300 ml-1">loading…</span>}</label>
                      {convEventList.length > 0 ? (
                        <Select
                          value={convEventName}
                          onChange={(v) => { setConvEventName(v); }}
                          options={convEventList.map((e) => ({ value: e, label: e }))}
                          placeholder="Select an event"
                        />
                      ) : (
                        <TextInput value={convEventName} onChange={setConvEventName} placeholder="e.g. purchase, generate_lead" />
                      )}
                    </div>
                    <button type="button" onClick={() => void fetchConversions()} className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">Update</button>
                  </div>

                  {/* All events comparison table */}
                  {convAllEvents.length > 0 && (
                    <ChartCard title="All events overview — pick one to analyse" tip="A summary of all GA4 conversion events tracked on your site. Click or type the name of an event below to drill into its daily trend, device split, and top converting pages.">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        <ScrollTable maxH="220px">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Event</th>
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Count</th>
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Share</th>
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {convAllEvents.slice(0, 15).map((e) => {
                                const total = convAllEvents.reduce((s, x) => s + x.count, 0);
                                const pct = total > 0 ? (e.count / total * 100).toFixed(1) : "0.0";
                                return (
                                  <tr key={e.name} className={`border-b border-gray-50 cursor-pointer hover:bg-emerald-50 transition-colors ${convEventName === e.name ? "bg-emerald-50" : ""}`}
                                    onClick={() => { setConvEventName(e.name); void fetchConversions(); }}>
                                    <td className="py-1.5 font-medium text-gray-700 max-w-[160px] truncate">{e.name}</td>
                                    <td className="py-1.5 font-semibold">{e.count.toLocaleString()}</td>
                                    <td className="py-1.5 text-gray-400">{pct}%</td>
                                    <td className="py-1.5"><div className="h-1.5 rounded-full bg-emerald-100 w-20 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </ScrollTable>
                        <ResponsiveContainer width="100%" height={210}>
                          <PieChart>
                            <Pie data={convAllEvents.slice(0, 8).map((e, i) => ({ name: e.name, value: e.count, fill: ["#059669","#0ea5e9","#8b5cf6","#f59e0b","#ef4444","#10b981","#6366f1","#f97316"][i] }))}
                              dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={2}>
                              {convAllEvents.slice(0, 8).map((_, i) => (
                                <Cell key={i} fill={["#059669","#0ea5e9","#8b5cf6","#f59e0b","#ef4444","#10b981","#6366f1","#f97316"][i]} />
                              ))}
                            </Pie>
                            <Tooltip {...chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </ChartCard>
                  )}

                  {convLoading && convDaily.length === 0 && <Spinner />}
                  {convDaily.length > 0 && (
                    <div className={`space-y-4 ${convLoading ? "opacity-60" : ""}`}>
                      <ComparisonBanner days={dateRangeDays(ga4FetchFilters.dateRange)} mode={ga4Filters.comparison} rangeHint={ga4BannerHint} />

                      {/* KPI summary row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <HoverTooltip tip="Total times the selected conversion event fired across all sessions in the date range."><KpiCard label="Total events" value={convDaily.reduce((s, r) => s + r.count, 0).toLocaleString()} sub={`${convEventName || "purchase"}`} icon={ShoppingCart} /></HoverTooltip>
                        <HoverTooltip tip="Average number of conversion events per day — useful for spotting seasonal trends or the impact of campaigns."><KpiCard label="Daily avg" value={convDaily.length > 0 ? Math.round(convDaily.reduce((s, r) => s + r.count, 0) / convDaily.length).toLocaleString() : "—"} sub="events/day" icon={TrendingUp} /></HoverTooltip>
                        <HoverTooltip tip="The single best-performing day for this event in the selected period — useful for identifying what drove a peak."><KpiCard label="Best day" value={convDaily.length > 0 ? convDaily.reduce((best, r) => r.count > best.count ? r : best).count.toLocaleString() : "—"} sub={convDaily.length > 0 ? convDaily.reduce((best, r) => r.count > best.count ? r : best).date : ""} icon={TrendingUp} /></HoverTooltip>
                        <HoverTooltip tip="Number of distinct pages where this conversion event was recorded — helps identify your highest-converting landing pages."><KpiCard label="Pages tracked" value={convByPage.length.toLocaleString()} sub="pages with event" icon={Eye} /></HoverTooltip>
                      </div>

                      <ChartCard title={`Event trend: ${convEventName.trim() || "purchase"}`} tip="Daily count of the selected conversion event. Look for drops after deploys or spikes after campaigns to validate tracking and impact.">
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={convDaily.map((r, i) => {
                            const row: Record<string, string | number> = { date: r.date, count: r.count };
                            const c = convDailyCmp[i];
                            if (c) row.count_cmp = c.count;
                            return row;
                          })} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ecfdf5" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={44} />
                            <Tooltip {...chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="count" name="Event count" stroke="#059669" strokeWidth={2} dot={false} />
                            {convDailyCmp.length > 0 && <Line type="monotone" dataKey="count_cmp" name="Compare" stroke="#6ee7b7" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />}
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      {/* Device + Channel pies */}
                      {(convByDevice.length > 0 || convByChannel.length > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {convByDevice.length > 0 && (
                            <ChartCard title="Events by device" tip="Conversion event breakdown by device type. If mobile conversions are low relative to traffic share, check your mobile UX and page load speed.">
                              <div className="flex gap-4 items-center">
                                <ResponsiveContainer width="50%" height={180}>
                                  <PieChart>
                                    <Pie data={convByDevice.map((d, i) => ({ name: d.device, value: d.count, fill: ["#059669","#0ea5e9","#8b5cf6"][i] }))}
                                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3}>
                                      {convByDevice.map((_, i) => <Cell key={i} fill={["#059669","#0ea5e9","#8b5cf6"][i]} />)}
                                    </Pie>
                                    <Tooltip {...chartTooltipStyle} />
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-1.5">
                                  {convByDevice.map((d, i) => {
                                    const total = convByDevice.reduce((s, x) => s + x.count, 0);
                                    return (
                                      <div key={d.device} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: ["#05966914","#0ea5e914","#8b5cf614"][i] }}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#059669","#0ea5e9","#8b5cf6"][i] }} />
                                          <span className="text-xs font-medium text-gray-700 capitalize">{d.device}</span>
                                        </div>
                                        <span className="text-xs font-bold">{total > 0 ? (d.count/total*100).toFixed(1) : 0}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </ChartCard>
                          )}
                          {convByChannel.length > 0 && (
                            <ChartCard title="Events by channel" tip="Which traffic channels are driving the most conversion events. Organic Search conversions here confirm that your SEO is generating genuine business value.">
                              <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={convByChannel} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                                  <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                  <YAxis type="category" dataKey="channel" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} width={90} />
                                  <Tooltip {...chartTooltipStyle} />
                                  <Bar dataKey="count" name="Events" radius={[0,4,4,0]}>
                                    {convByChannel.map((_, i) => <Cell key={i} fill={`hsl(${160 + i * 25}, 65%, ${45 + i * 3}%)`} />)}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </ChartCard>
                          )}
                        </div>
                      )}

                      {/* Day of week heatmap */}
                      {convByDayOfWeek.length > 0 && (
                        <ChartCard title="Events by day of week" tip="Aggregated conversion events by weekday. Useful for scheduling campaigns, emails, or content drops on your highest-converting days.">
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={convByDayOfWeek} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ecfdf5" vertical={false} />
                              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={40} />
                              <Tooltip {...chartTooltipStyle} />
                              <Bar dataKey="count" name="Events" radius={[4,4,0,0]}>
                                {convByDayOfWeek.map((d, i) => {
                                  const max = Math.max(...convByDayOfWeek.map((x) => x.count));
                                  const intensity = max > 0 ? d.count / max : 0;
                                  return <Cell key={i} fill={`rgba(5, 150, 105, ${0.25 + intensity * 0.75})`} />;
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartCard>
                      )}

                      {/* Top pages with event */}
                      {convByPage.length > 0 && (
                        <ChartCard title={`Top pages firing "${convEventName || "purchase"}"`} tip="The pages generating the most conversion events. These are your highest-value pages — protect their rankings and ensure they load fast.">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <ScrollTable maxH="260px">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                  <tr className="border-b border-gray-100">
                                    <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Page</th>
                                    <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Events</th>
                                    <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Users</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {convByPage.slice(0, 20).map((r) => (
                                    <tr key={r.page} className="border-b border-gray-50">
                                      <td className="py-1.5 max-w-[180px] truncate text-gray-600" title={r.page}><UrlLink url={r.page} /></td>
                                      <td className="py-1.5 font-semibold text-emerald-700">{r.count.toLocaleString()}</td>
                                      <td className="py-1.5 text-gray-400">{r.users.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </ScrollTable>
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart data={convByPage.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                                <XAxis type="number" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="page" tick={{ fontSize: 8, fill: "#6b7280" }} axisLine={false} tickLine={false} width={100}
                                  tickFormatter={(v: string) => { const s = slugifyUrl(v); return s.length > 18 ? s.slice(0, 18) + "…" : s; }} />
                                <Tooltip {...chartTooltipStyle} />
                                <Bar dataKey="count" name="Events" fill="#059669" radius={[0,4,4,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartCard>
                      )}

                      {/* Pages with low conversion rate — opportunity table */}
                      {convLowPages.length > 0 && (
                        <ChartCard title={`⚠️ Pages with low "${convEventName || "purchase"}" rate — fix opportunities`} tip="Pages receiving decent traffic but generating few conversions. These are your biggest CRO opportunities — review the content, CTAs, and user journey on each.">
                          <p className="text-xs text-gray-400 mb-3">Pages with ≥20 sessions but low event-to-session rate. These are your biggest conversion leakage points.</p>
                          <ScrollTable maxH="240px">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                <tr className="border-b border-gray-100">
                                  <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Page</th>
                                  <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Sessions</th>
                                  <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Events</th>
                                  <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Rate</th>
                                  <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Signal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {convLowPages.map((r) => (
                                  <tr key={r.page} className="border-b border-gray-50">
                                    <td className="py-1.5 max-w-[200px] truncate text-gray-600" title={r.page}><UrlLink url={r.page} /></td>
                                    <td className="py-1.5">{r.sessions.toLocaleString()}</td>
                                    <td className="py-1.5">{r.eventCount.toLocaleString()}</td>
                                    <td className="py-1.5 font-semibold text-red-600">{(r.rate * 100).toFixed(2)}%</td>
                                    <td className="py-1.5">
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.rate < 0.01 ? "bg-red-50 text-red-600" : r.rate < 0.03 ? "bg-amber-50 text-amber-600" : "bg-yellow-50 text-yellow-600"}`}>
                                        {r.rate < 0.01 ? "Critical" : r.rate < 0.03 ? "Low" : "Below avg"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollTable>
                        </ChartCard>
                      )}

                      <ChartCard title="Daily counts (table)">
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <SortableTh label="Date" sortKey="date" sort={convDailySort.sort} onToggle={convDailySort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />
                                <SortableTh label="Count" sortKey="count" sort={convDailySort.sort} onToggle={convDailySort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />
                                {convDailyCmp.length > 0 && <SortableTh label="Compare" sortKey="compare" sort={convDailySort.sort} onToggle={convDailySort.toggle} className="text-left py-2 text-gray-400 font-semibold text-[10px]" />}
                              </tr>
                            </thead>
                            <tbody>
                              {convDailySort.sorted.map((r) => (
                                <tr key={r.date} className="border-b border-gray-50">
                                  <td className="py-2">{r.date}</td>
                                  <td className="py-2 font-semibold">{r.count.toLocaleString()}</td>
                                  {convDailyCmp.length > 0 && <td className="py-2 text-gray-500">{(r.compare ?? 0).toLocaleString()}</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                    </div>
                  )}
                  {!convLoading && selectedGA4 && convDaily.length === 0 && (
                    <p className="text-sm text-gray-400 py-4">No event data for this name in the selected range.</p>
                  )}
                </section>
              </>
            )}

            {/* ── Product Categories ── */}
            {activeView === "productCategories" && (
              <>
                <SectionDivider label="PRODUCT CATEGORIES" />
                <section>
                  <ProductCategoriesView
                    catRows={catRows}
                    catLoading={catLoading}
                    catTab={catTab}
                    setCatTab={setCatTab}
                    catMetric={catMetric}
                    setCatMetric={setCatMetric}
                    catExpandedCategory={catExpandedCategory}
                    setCatExpandedCategory={setCatExpandedCategory}
                    catExpandedData={catExpandedData}
                    catExpandedLoading={catExpandedLoading}
                    fetchCatExpanded={fetchCatExpanded}
                    vccCategories={VCC_CATEGORIES}
                    selectedGA4={selectedGA4}
                    selectedGSC={selectedGSC}
                    dateLabel={(() => {
                      const { startDate, endDate } = gscDateWindows(gscFetchFilters);
                      return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
                    })()}
                    cmpLabel={(() => {
                      const { startDate, endDate } = gscDateWindows(gscFetchFilters);
                      const cmp = comparisonWindowBefore(startDate, endDate);
                      return `${formatDisplayDate(cmp.startDate)} – ${formatDisplayDate(cmp.endDate)}`;
                    })()}
                  />
                </section>
              </>
            )}

            {/* ── Brand vs Non-Brand ── */}
            {activeView === "brandVsNonBrand" && (
              <>
                <SectionDivider label="BRAND VS NON-BRAND" />
                <section>
                  <BrandVsNonBrandView
                    brandData={brandData}
                    brandLoading={brandLoading}
                    brandTab={brandTab}
                    setBrandTab={setBrandTab}
                    dateLabel={(() => {
                      const { startDate, endDate } = gscDateWindows(gscFetchFilters);
                      return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
                    })()}
                    cmpLabel={(() => {
                      const { startDate, endDate } = gscDateWindows(gscFetchFilters);
                      const cmp = comparisonWindowBefore(startDate, endDate);
                      return `${formatDisplayDate(cmp.startDate)} – ${formatDisplayDate(cmp.endDate)}`;
                    })()}
                    selectedGSC={selectedGSC}
                  />
                </section>
              </>
            )}

            {/* ── Non-Brand SEO Performance ───────────────────────────────── */}
            {activeView === "nbSeo" && (
              <>
                <SectionDivider label="NON-BRAND SEO PERFORMANCE" />
                <section className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-2"><TrendingUp size={16} className="text-[#5b4fa8]" /></div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Non-Brand SEO Performance</h2>
                        <p className="text-xs text-gray-400">For <code className="bg-gray-100 px-1 rounded">/items-we-buy/</code> landing pages — non-brand share of organic sessions that referred to <code className="bg-gray-100 px-1 rounded">/free-selling-pack</code>. Last 7 days vs previous 7 days.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void fetchNbsData()}
                        disabled={nbsLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#5b4fa8] text-white hover:bg-[#4a3f8e] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} className={nbsLoading ? "animate-spin" : ""} />
                        {nbsLoading ? "Loading…" : "Refresh"}
                      </button>
                    </div>
                  </div>

                  {/* Modelled-figure caveat */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={12} className="text-amber-600 mt-0.5 shrink-0" />
                    <span>
                      <strong>Modelled figures.</strong> The non-brand and brand referrer counts are estimates: each landing page's FSP referrer count multiplied by its impression-weighted non-brand query ratio from GSC. Tune the brand classifier below for accuracy.
                    </span>
                  </div>

                  {nbsLoading && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-sm text-gray-400">
                      <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-[#5b4fa8] rounded-full animate-spin mb-3" />
                      <p>Pulling GSC + GA4 data and modelling the split…</p>
                    </div>
                  )}

                  {!nbsLoading && !nbsData && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-sm text-gray-400">
                      <p>{selectedGSC && selectedGA4 ? "Click Refresh to load data." : "Connect both a GA4 and a GSC property to use this section."}</p>
                    </div>
                  )}

                  {!nbsLoading && nbsData && (() => {
                    const d = nbsData;
                    const periodLabel = `${formatDisplayDate(d.period.start)} – ${formatDisplayDate(d.period.end)}`;
                    const cmpPeriodLabel = `${formatDisplayDate(d.cmpPeriod.start)} – ${formatDisplayDate(d.cmpPeriod.end)}`;
                    const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : (a > 0 ? 100 : 0));
                    const Delta = ({ p }: { p: number | null }) => {
                      if (p == null || !isFinite(p)) return <span className="text-[10px] text-gray-400">—</span>;
                      const up = p >= 0;
                      return <span className={`text-[11px] font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>{up ? "+" : ""}{p.toFixed(1)}%</span>;
                    };
                    return (
                      <>
                        {/* Period label */}
                        <div className="text-[11px] text-gray-500 flex items-center gap-4 flex-wrap">
                          <span><strong>Current:</strong> {periodLabel}</span>
                          <span className="text-gray-300">vs</span>
                          <span><strong>Previous:</strong> {cmpPeriodLabel}</span>
                        </div>

                        {/* KPI cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Organic sessions</div>
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-2xl font-bold text-gray-900 tabular-nums">{Math.round(d.totals.orgSessions).toLocaleString()}</span>
                              <Delta p={pct(d.totals.orgSessions, d.totals.orgSessionsCmp)} />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{Math.round(d.totals.orgSessionsCmp).toLocaleString()} previously</div>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">FSP referrers</div>
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-2xl font-bold text-sky-700 tabular-nums">{Math.round(d.totals.fspReferrers).toLocaleString()}</span>
                              <Delta p={pct(d.totals.fspReferrers, d.totals.fspReferrersCmp)} />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{Math.round(d.totals.fspReferrersCmp).toLocaleString()} previously</div>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-brand referrers</div>
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-2xl font-bold text-emerald-600 tabular-nums">{Math.round(d.totals.nbReferrers).toLocaleString()}</span>
                              <Delta p={pct(d.totals.nbReferrers, d.totals.nbReferrersCmp)} />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{Math.round(d.totals.nbReferrersCmp).toLocaleString()} previously · site-wide NB ratio {(d.totals.siteWideNbRatio * 100).toFixed(1)}%</div>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Brand referrers</div>
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-2xl font-bold text-[#5b4fa8] tabular-nums">{Math.round(d.totals.brandReferrers).toLocaleString()}</span>
                              <Delta p={pct(d.totals.brandReferrers, d.totals.brandReferrersCmp)} />
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{Math.round(d.totals.brandReferrersCmp).toLocaleString()} previously</div>
                          </div>
                        </div>

                        {/* Landing pages table */}
                        <ChartCard
                          title="/items-we-buy/ landing pages"
                          tip="One row per landing page under /items-we-buy/. The NB/B ratio is impression-weighted from GSC: brand impressions vs non-brand impressions for queries that page ranked on. Non-brand and Brand FSP referrers split the GA4 FSP-referrer count by that ratio."
                        >
                          <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 540, WebkitOverflowScrolling: "touch" }}>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr className="text-left text-gray-400 border-b border-gray-100">
                                  <SortableTh label="Landing page" sortKey="page" sort={nbsSort.sort} onToggle={nbsSort.toggle} className="pb-2 pr-2 font-medium" />
                                  <SortableTh label="NB / B ratio" sortKey="nonBrandRatio" sort={nbsSort.sort} onToggle={nbsSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="Org. sessions" sortKey="orgSessions" sort={nbsSort.sort} onToggle={nbsSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="FSP referrers" sortKey="fspReferrers" sort={nbsSort.sort} onToggle={nbsSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="NB referrers" sortKey="nbReferrers" sort={nbsSort.sort} onToggle={nbsSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="Brand referrers" sortKey="brandReferrers" sort={nbsSort.sort} onToggle={nbsSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <th className="pb-2 font-medium text-right">Confidence</th>
                                </tr>
                              </thead>
                              <tbody>
                                {nbsSort.sorted.slice(0, 300).map((r, i) => {
                                  // Deltas vs previous period for inline display
                                  const orgPct = r.orgSessionsCmp > 0 ? ((r.orgSessions - r.orgSessionsCmp) / r.orgSessionsCmp) * 100 : null;
                                  const fspPct = r.fspReferrersCmp > 0 ? ((r.fspReferrers - r.fspReferrersCmp) / r.fspReferrersCmp) * 100 : null;
                                  const nbPct  = r.nbReferrersCmp > 0 ? ((r.nbReferrers - r.nbReferrersCmp) / r.nbReferrersCmp) * 100 : null;
                                  const bPct   = r.brandReferrersCmp > 0 ? ((r.brandReferrers - r.brandReferrersCmp) / r.brandReferrersCmp) * 100 : null;
                                  return (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/30">
                                      <td className="py-2 pr-2 max-w-[280px] truncate" title={r.page}><UrlLink url={r.page} className="text-gray-700" /></td>
                                      <td className="py-2 pr-2 text-right tabular-nums">
                                        <span className="text-emerald-700 font-semibold">{(r.nonBrandRatio * 100).toFixed(1)}%</span>
                                        <span className="text-gray-300"> / </span>
                                        <span className="text-[#5b4fa8] font-semibold">{((1 - r.nonBrandRatio) * 100).toFixed(1)}%</span>
                                        <div className="text-[10px] text-gray-400">{r.nonBrandImpressions.toLocaleString()} / {r.brandImpressions.toLocaleString()} impr.</div>
                                      </td>
                                      <td className="py-2 pr-2 text-right tabular-nums text-gray-900 font-semibold">
                                        {r.orgSessions.toLocaleString()}
                                        {orgPct != null && <div className={`text-[10px] font-bold ${orgPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>{orgPct >= 0 ? "+" : ""}{orgPct.toFixed(0)}%</div>}
                                      </td>
                                      <td className="py-2 pr-2 text-right tabular-nums text-sky-700 font-semibold">
                                        {r.fspReferrers.toLocaleString()}
                                        {fspPct != null && <div className={`text-[10px] font-bold ${fspPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fspPct >= 0 ? "+" : ""}{fspPct.toFixed(0)}%</div>}
                                      </td>
                                      <td className="py-2 pr-2 text-right tabular-nums text-emerald-700 font-semibold">
                                        {Math.round(r.nbReferrers).toLocaleString()}
                                        {nbPct != null && <div className={`text-[10px] font-bold ${nbPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>{nbPct >= 0 ? "+" : ""}{nbPct.toFixed(0)}%</div>}
                                      </td>
                                      <td className="py-2 pr-2 text-right tabular-nums text-[#5b4fa8] font-semibold">
                                        {Math.round(r.brandReferrers).toLocaleString()}
                                        {bPct != null && <div className={`text-[10px] font-bold ${bPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>{bPct >= 0 ? "+" : ""}{bPct.toFixed(0)}%</div>}
                                      </td>
                                      <td className="py-2 text-right">
                                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                          r.confidence === "high" ? "bg-emerald-50 text-emerald-700"
                                          : r.confidence === "medium" ? "bg-amber-50 text-amber-700"
                                          : "bg-red-50 text-red-600"
                                        }`}>
                                          {r.confidence}{r.usedSiteWideRatio ? "*" : ""}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {nbsSort.sorted.length === 0 && (
                                  <tr><td colSpan={7} className="py-6 text-center text-gray-400">No /items-we-buy/ landing pages with data in this window.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-2">* Page had no GSC impression data — site-wide non-brand ratio applied as fallback.</div>
                        </ChartCard>

                        {/* Transparency + classifier panel */}
                        <ChartCard
                          title={
                            <button onClick={() => setNbsShowTransparency((s) => !s)} className="flex items-center gap-2 text-left w-full">
                              <span>{nbsShowTransparency ? "▼" : "▶"} Brand classifier & data quality</span>
                              <span className="text-[10px] text-gray-400 font-normal">edit brand terms, see what's classified how</span>
                            </button>
                          }
                          tip="Edit the brand-term list, test how queries get classified, and check data quality. The classifier uses case-insensitive substring matching; for terms ≤3 chars it uses a word-boundary regex to avoid false positives like 'vcc' matching 'vccountry'."
                        >
                          {nbsShowTransparency && (
                            <div className="space-y-4">
                              {/* Quality stats */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Brand impressions</div>
                                  <div className="text-lg font-bold text-[#5b4fa8] tabular-nums">{d.totals.brandImpressions.toLocaleString()}</div>
                                  <div className="text-[10px] text-gray-400">across /items-we-buy/ pages this period</div>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-brand impressions</div>
                                  <div className="text-lg font-bold text-emerald-600 tabular-nums">{d.totals.nonBrandImpressions.toLocaleString()}</div>
                                  <div className="text-[10px] text-gray-400">{(d.totals.siteWideNbRatio * 100).toFixed(1)}% of impressions</div>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Last sync</div>
                                  <div className="text-sm font-bold text-gray-700">{new Date(d.fetchedAt).toLocaleTimeString()}</div>
                                  <div className="text-[10px] text-gray-400">{periodLabel}</div>
                                </div>
                              </div>

                              {/* Brand-term editor */}
                              <div className="bg-white border border-gray-100 rounded-xl p-4">
                                <div className="text-xs font-bold text-gray-700 mb-2">Brand-term list</div>
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {nbsBrandTerms.map((t) => (
                                    <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 border border-purple-100 text-[11px] text-[#5b4fa8] font-medium">
                                      {t}
                                      <button onClick={() => {
                                        const next = nbsBrandTerms.filter((x) => x !== t);
                                        setNbsBrandTerms(next);
                                        setNbsTermsHistory((h) => [{ ts: Date.now(), terms: next }, ...h].slice(0, 5));
                                      }} className="hover:text-red-500"><X size={10} /></button>
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={nbsTermInput}
                                    onChange={(e) => setNbsTermInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && nbsTermInput.trim() && !nbsBrandTerms.includes(nbsTermInput.trim())) {
                                        const next = [...nbsBrandTerms, nbsTermInput.trim()];
                                        setNbsBrandTerms(next);
                                        setNbsTermsHistory((h) => [{ ts: Date.now(), terms: next }, ...h].slice(0, 5));
                                        setNbsTermInput("");
                                      }
                                    }}
                                    placeholder="Add a brand term and press Enter…"
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#5b4fa8] focus:ring-1 focus:ring-purple-200"
                                  />
                                  <button
                                    onClick={() => {
                                      setNbsBrandTerms(NBSEO_DEFAULT_BRAND_TERMS);
                                      setNbsTermsHistory((h) => [{ ts: Date.now(), terms: NBSEO_DEFAULT_BRAND_TERMS }, ...h].slice(0, 5));
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-[#5b4fa8] border border-gray-200"
                                  >
                                    Reset to defaults
                                  </button>
                                </div>
                                {/* Live test */}
                                <div className="mt-3 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={nbsTestQuery}
                                    onChange={(e) => setNbsTestQuery(e.target.value)}
                                    placeholder="Test a query…"
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#5b4fa8] focus:ring-1 focus:ring-purple-200"
                                  />
                                  {nbsTestResult && (
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${nbsTestResult === "brand" ? "bg-purple-100 text-[#5b4fa8]" : "bg-emerald-100 text-emerald-700"}`}>
                                      → {nbsTestResult === "brand" ? "Brand" : "Non-brand"}
                                    </span>
                                  )}
                                </div>
                                {nbsTermsHistory.length > 0 && (
                                  <div className="mt-3 text-[10px] text-gray-400">
                                    Last {nbsTermsHistory.length} change{nbsTermsHistory.length === 1 ? "" : "s"}: {nbsTermsHistory.map((h) => new Date(h.ts).toLocaleString()).join(" · ")}
                                  </div>
                                )}
                                <div className="mt-2 text-[10px] text-amber-700">
                                  ⚠ Changing brand terms re-classifies the next fetch only. Click Refresh after editing.
                                </div>
                              </div>

                              {/* Classifier preview — Top 50 queries */}
                              <div className="bg-white border border-gray-100 rounded-xl p-4">
                                <div className="text-xs font-bold text-gray-700 mb-2">Top 50 queries — current classification</div>
                                <div className="text-[10px] text-gray-400 mb-2">Brand: {nbsClassifierPreviewSummary.brand} · Non-brand: {nbsClassifierPreviewSummary.nonBrand}</div>
                                <div className="overflow-y-auto overscroll-contain rounded-lg border border-gray-50" style={{ maxHeight: 240, WebkitOverflowScrolling: "touch" }}>
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white"><tr className="text-left text-gray-400 border-b border-gray-100"><th className="pb-1 pr-2 font-medium">Query</th><th className="pb-1 pr-2 font-medium text-right">Clicks</th><th className="pb-1 font-medium text-right">Class.</th></tr></thead>
                                    <tbody>
                                      {nbsClassifierPreview.map((p, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                          <td className="py-1 pr-2 text-gray-700">{p.query}</td>
                                          <td className="py-1 pr-2 text-right tabular-nums text-gray-600">{p.clicks.toLocaleString()}</td>
                                          <td className="py-1 text-right">
                                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${p.cls === "brand" ? "bg-purple-100 text-[#5b4fa8]" : "bg-emerald-100 text-emerald-700"}`}>
                                              {p.cls === "brand" ? "Brand" : "Non-brand"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </ChartCard>
                      </>
                    );
                  })()}
                </section>
              </>
            )}

            {/* ── Non-Brand Sign Ups ───────────────────────────────────────── */}
            {activeView === "nbSignUps" && (
              <>
                <SectionDivider label="NON-BRAND SIGN UPS" />
                <section className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2"><ShoppingCart size={16} className="text-emerald-600" /></div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">Non-Brand Sign Ups</h2>
                        <p className="text-xs text-gray-400">Whole-site landing pages — non-brand share of organic sessions that involved <code className="bg-gray-100 px-1 rounded">/free-selling-pack</code> and fired the <code className="bg-gray-100 px-1 rounded">generate_lead</code> key event. Click-weighted ratio per page.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void fetchNbsuData()}
                        disabled={nbsuLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} className={nbsuLoading ? "animate-spin" : ""} />
                        {nbsuLoading ? "Loading…" : "Refresh"}
                      </button>
                    </div>
                  </div>

                  {/* Date filter panel */}
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium">Date Range</label>
                        <Select
                          value={nbsuFilters.dateRange}
                          onChange={(v) => setNbsuFilters((f) => ({ ...f, dateRange: v as NbsuDateFilter["dateRange"] }))}
                          options={[
                            { value: "today",     label: "Today" },
                            { value: "yesterday", label: "Yesterday" },
                            { value: "thisWeek",  label: "This week (Sun–today)" },
                            { value: "7",         label: "Last 7 days" },
                            { value: "lastWeek",  label: "Last week (Sun–Sat)" },
                            { value: "28",        label: "Last 28 days" },
                            { value: "30",        label: "Last 30 days" },
                            { value: "thisMonth", label: "This month" },
                            { value: "lastMonth", label: "Last month" },
                            { value: "90",        label: "Last 90 days" },
                            { value: "qtd",       label: "Quarter to date" },
                            { value: "thisYear",  label: "This year (Jan–today)" },
                            { value: "lastYear",  label: "Last calendar year" },
                            { value: "custom",    label: "Custom range" },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium">Compare To</label>
                        <Select
                          value={nbsuFilters.comparison}
                          onChange={(v) => setNbsuFilters((f) => ({ ...f, comparison: v as NbsuDateFilter["comparison"] }))}
                          options={[
                            { value: "prev",     label: "Previous period" },
                            { value: "prevYear", label: "Same period last year" },
                            { value: "none",     label: "No comparison" },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5 font-medium">GA4 Property</label>
                        <Select
                          value={selectedGA4}
                          onChange={setSelectedGA4}
                          options={ga4Properties}
                          placeholder="Select GA4 Property"
                          disabled={ga4Properties.length === 0}
                        />
                      </div>
                    </div>
                    {nbsuFilters.dateRange === "custom" && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-emerald-100">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-medium">Start (current)</label>
                          <input type="date" value={nbsuFilters.customStart ?? ""} onChange={(e) => setNbsuFilters((f) => ({ ...f, customStart: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-medium">End (current)</label>
                          <input type="date" value={nbsuFilters.customEnd ?? ""} onChange={(e) => setNbsuFilters((f) => ({ ...f, customEnd: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
                        </div>
                        {nbsuFilters.comparison !== "none" && nbsuFilters.comparison !== "prevYear" && (
                          <>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1 font-medium">Compare start</label>
                              <input type="date" value={nbsuFilters.customCompareStart ?? ""} onChange={(e) => setNbsuFilters((f) => ({ ...f, customCompareStart: e.target.value }))}
                                className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1 font-medium">Compare end</label>
                              <input type="date" value={nbsuFilters.customCompareEnd ?? ""} onChange={(e) => setNbsuFilters((f) => ({ ...f, customCompareEnd: e.target.value }))}
                                className="w-full bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-700" />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modelled-figure caveat */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={12} className="text-amber-600 mt-0.5 shrink-0" />
                    <span>
                      <strong>Modelled figures.</strong> Non-brand and brand sign-up counts are estimates — each landing page's <code className="bg-amber-100 px-1 rounded">generate_lead</code> count from organic sessions multiplied by its <strong>click-weighted</strong> non-brand query ratio from GSC. Brand-term list lives in the Non-Brand SEO section.
                    </span>
                  </div>

                  {nbsuLoading && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-sm text-gray-400">
                      <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
                      <p>Pulling GSC + GA4 data and modelling the split…</p>
                    </div>
                  )}

                  {!nbsuLoading && !nbsuData && (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-sm text-gray-400">
                      <p>{selectedGSC && selectedGA4 ? "Click Refresh to load data." : "Connect both a GA4 and a GSC property to use this section."}</p>
                    </div>
                  )}

                  {!nbsuLoading && nbsuData && (() => {
                    const d = nbsuData;
                    const hasCmp = !!d.cmpPeriod.start && !!d.cmpPeriod.end;
                    const periodLabel = `${formatDisplayDate(d.period.start)} – ${formatDisplayDate(d.period.end)}`;
                    const cmpPeriodLabel = hasCmp ? `${formatDisplayDate(d.cmpPeriod.start)} – ${formatDisplayDate(d.cmpPeriod.end)}` : "—";
                    const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : (a > 0 ? 100 : 0));
                    const Delta = ({ p }: { p: number | null }) => {
                      if (p == null || !isFinite(p)) return <span className="text-[10px] text-gray-400">—</span>;
                      const up = p >= 0;
                      return <span className={`text-[11px] font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>{up ? "+" : ""}{p.toFixed(1)}%</span>;
                    };
                    return (
                      <>
                        {/* Period label */}
                        <div className="text-[11px] text-gray-500 flex items-center gap-4 flex-wrap">
                          <span><strong>Current:</strong> {periodLabel}</span>
                          {hasCmp && <span className="text-gray-300">vs</span>}
                          {hasCmp && <span><strong>{nbsuFetchFilters.comparison === "prevYear" ? "Last year:" : "Previous:"}</strong> {cmpPeriodLabel}</span>}
                        </div>

                        {/* KPI cards — row 1: sign-ups (totals → brand → nb) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Organic sessions</div>
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-2xl font-bold text-gray-900 tabular-nums">{Math.round(d.totals.orgSessions).toLocaleString()}</span>
                              {hasCmp && <Delta p={pct(d.totals.orgSessions, d.totals.orgSessionsCmp)} />}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${Math.round(d.totals.orgSessionsCmp).toLocaleString()} previously` : "whole site · organic"}</div>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Total SEO sign-ups</div>
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-2xl font-bold text-sky-700 tabular-nums">{Math.round(d.totals.fspLeads).toLocaleString()}</span>
                              {hasCmp && <Delta p={pct(d.totals.fspLeads, d.totals.fspLeadsCmp)} />}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${Math.round(d.totals.fspLeadsCmp).toLocaleString()} previously` : "generate_lead events"}</div>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Brand SEO sign-ups</div>
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-2xl font-bold text-[#5b4fa8] tabular-nums">{Math.round(d.totals.brandLeads).toLocaleString()}</span>
                              {hasCmp && <Delta p={pct(d.totals.brandLeads, d.totals.brandLeadsCmp)} />}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${Math.round(d.totals.brandLeadsCmp).toLocaleString()} previously` : "click-weighted brand share"}</div>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-brand SEO sign-ups</div>
                            <div className="flex items-end justify-between gap-2">
                              <span className="text-2xl font-bold text-emerald-600 tabular-nums">{Math.round(d.totals.nbLeads).toLocaleString()}</span>
                              {hasCmp && <Delta p={pct(d.totals.nbLeads, d.totals.nbLeadsCmp)} />}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${Math.round(d.totals.nbLeadsCmp).toLocaleString()} previously · ` : ""}site-wide NB ratio {(d.totals.siteWideNbRatio * 100).toFixed(1)}%</div>
                          </div>
                        </div>

                        {/* GSC query KPI cards — second row: clicks (totals → brand → nb) */}
                        {(() => {
                          const totalClicksCur = d.queryPageRowsCur.reduce((s, r) => s + r.clicks, 0);
                          const totalClicksCmp = d.queryPageRowsCmp.reduce((s, r) => s + r.clicks, 0);
                          const nbClicksCur = d.queryPageRowsCur.reduce((s, r) => s + (r.cls === "nonBrand" ? r.clicks : 0), 0);
                          const nbClicksCmp = d.queryPageRowsCmp.reduce((s, r) => s + (r.cls === "nonBrand" ? r.clicks : 0), 0);
                          const brandClicksCur = d.queryPageRowsCur.reduce((s, r) => s + (r.cls === "brand" ? r.clicks : 0), 0);
                          const brandClicksCmp = d.queryPageRowsCmp.reduce((s, r) => s + (r.cls === "brand" ? r.clicks : 0), 0);
                          const totalQueryCountCur = new Set(d.queryPageRowsCur.map((r) => r.query)).size;
                          const totalQueryCountCmp = new Set(d.queryPageRowsCmp.map((r) => r.query)).size;
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Total clicks</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-gray-900 tabular-nums">{totalClicksCur.toLocaleString()}</span>
                                  {hasCmp && <Delta p={pct(totalClicksCur, totalClicksCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${totalClicksCmp.toLocaleString()} previously` : "all GSC query clicks"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Total query count</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-gray-900 tabular-nums">{totalQueryCountCur.toLocaleString()}</span>
                                  {hasCmp && <Delta p={pct(totalQueryCountCur, totalQueryCountCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${totalQueryCountCmp.toLocaleString()} previously` : "unique queries"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Branded query clicks</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-[#5b4fa8] tabular-nums">{brandClicksCur.toLocaleString()}</span>
                                  {hasCmp && <Delta p={pct(brandClicksCur, brandClicksCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${brandClicksCmp.toLocaleString()} previously` : "brand classified queries"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-brand query clicks</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-emerald-600 tabular-nums">{nbClicksCur.toLocaleString()}</span>
                                  {hasCmp && <Delta p={pct(nbClicksCur, nbClicksCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${nbClicksCmp.toLocaleString()} previously` : "non-brand classified queries"}</div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* GSC query KPI cards — third row: query counts (brand → nb) + NB position movement */}
                        {(() => {
                          // Unique query counts by class
                          const nbQuerySetCur = new Set(d.queryPageRowsCur.filter((r) => r.cls === "nonBrand").map((r) => r.query));
                          const nbQuerySetCmp = new Set(d.queryPageRowsCmp.filter((r) => r.cls === "nonBrand").map((r) => r.query));
                          const brandQuerySetCur = new Set(d.queryPageRowsCur.filter((r) => r.cls === "brand").map((r) => r.query));
                          const brandQuerySetCmp = new Set(d.queryPageRowsCmp.filter((r) => r.cls === "brand").map((r) => r.query));
                          const nbQueryCountCur = nbQuerySetCur.size;
                          const nbQueryCountCmp = nbQuerySetCmp.size;
                          const brandQueryCountCur = brandQuerySetCur.size;
                          const brandQueryCountCmp = brandQuerySetCmp.size;

                          // Aggregate non-brand queries to impression-weighted average position per period.
                          // Lower position = better rank, so "up in position" = position decreased vs cmp.
                          const aggNbPositions = (rows: typeof d.queryPageRowsCur) => {
                            const acc = new Map<string, { posImpr: number; impr: number }>();
                            for (const r of rows) {
                              if (r.cls !== "nonBrand") continue;
                              const cur = acc.get(r.query) ?? { posImpr: 0, impr: 0 };
                              cur.posImpr += r.position * r.impressions;
                              cur.impr += r.impressions;
                              acc.set(r.query, cur);
                            }
                            const out = new Map<string, number>();
                            acc.forEach((v, k) => { if (v.impr > 0) out.set(k, v.posImpr / v.impr); });
                            return out;
                          };
                          const nbPosCur = aggNbPositions(d.queryPageRowsCur);
                          const nbPosCmp = aggNbPositions(d.queryPageRowsCmp);
                          let nbQueriesUpInPos = 0;
                          let nbQueriesDownInPos = 0;
                          // Only count queries present in both periods so the comparison is meaningful.
                          nbPosCur.forEach((curPos, q) => {
                            const cmpPos = nbPosCmp.get(q);
                            if (cmpPos == null) return;
                            if (curPos < cmpPos) nbQueriesUpInPos++;
                            else if (curPos > cmpPos) nbQueriesDownInPos++;
                          });

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Branded query count</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-[#5b4fa8] tabular-nums">{brandQueryCountCur.toLocaleString()}</span>
                                  {hasCmp && <Delta p={pct(brandQueryCountCur, brandQueryCountCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${brandQueryCountCmp.toLocaleString()} previously` : "unique brand queries"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-branded query count</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-emerald-600 tabular-nums">{nbQueryCountCur.toLocaleString()}</span>
                                  {hasCmp && <Delta p={pct(nbQueryCountCur, nbQueryCountCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${nbQueryCountCmp.toLocaleString()} previously` : "unique non-brand queries"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">NB queries up in position</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-emerald-600 tabular-nums">{hasCmp ? nbQueriesUpInPos.toLocaleString() : "—"}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? "ranked higher vs previous period" : "needs a comparison period"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">NB queries down in position</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-red-500 tabular-nums">{hasCmp ? nbQueriesDownInPos.toLocaleString() : "—"}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? "ranked lower vs previous period" : "needs a comparison period"}</div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* GSC query KPI cards — fourth row: conversion rates (totals → brand → nb) + NB avg position */}
                        {(() => {
                          // Conversion rates (current period)
                          const totalCvrCur     = d.totals.orgSessions    > 0 ? (d.totals.fspLeads    / d.totals.orgSessions)    * 100 : 0;
                          const brandCvrCur     = d.totals.brandClicks    > 0 ? (d.totals.brandLeads  / d.totals.brandClicks)    * 100 : 0;
                          const nbCvrCur        = d.totals.nonBrandClicks > 0 ? (d.totals.nbLeads     / d.totals.nonBrandClicks) * 100 : 0;

                          // Conversion rates (comparison period) — derive brand/nb click totals from queryPageRowsCmp,
                          // matching how the current period's brand/nonBrand clicks were summed in the data fetcher.
                          const brandClicksCmp    = d.queryPageRowsCmp.reduce((s, r) => s + (r.cls === "brand"    ? r.clicks : 0), 0);
                          const nonBrandClicksCmp = d.queryPageRowsCmp.reduce((s, r) => s + (r.cls === "nonBrand" ? r.clicks : 0), 0);
                          const totalCvrCmp = d.totals.orgSessionsCmp > 0 ? (d.totals.fspLeadsCmp   / d.totals.orgSessionsCmp) * 100 : 0;
                          const brandCvrCmp = brandClicksCmp          > 0 ? (d.totals.brandLeadsCmp / brandClicksCmp)          * 100 : 0;
                          const nbCvrCmp    = nonBrandClicksCmp       > 0 ? (d.totals.nbLeadsCmp    / nonBrandClicksCmp)       * 100 : 0;

                          // NB average position — impression-weighted over non-brand rows only.
                          const nbAvgPosFor = (rows: typeof d.queryPageRowsCur) => {
                            let posImpr = 0, impr = 0;
                            for (const r of rows) {
                              if (r.cls !== "nonBrand") continue;
                              posImpr += r.position * r.impressions;
                              impr    += r.impressions;
                            }
                            return impr > 0 ? posImpr / impr : 0;
                          };
                          const nbAvgPosCur = nbAvgPosFor(d.queryPageRowsCur);
                          const nbAvgPosCmp = nbAvgPosFor(d.queryPageRowsCmp);
                          // For position, lower = better, so invert delta sign so an improvement reads positive.
                          const posDeltaPct = nbAvgPosCmp > 0 ? ((nbAvgPosCmp - nbAvgPosCur) / nbAvgPosCmp) * 100 : 0;

                          const fmtPct = (v: number) => `${v.toFixed(2)}%`;

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Total conversion rate</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-sky-700 tabular-nums">{fmtPct(totalCvrCur)}</span>
                                  {hasCmp && <Delta p={pct(totalCvrCur, totalCvrCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${fmtPct(totalCvrCmp)} previously` : "sign-ups ÷ organic sessions"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Branded conversion rate</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-[#5b4fa8] tabular-nums">{fmtPct(brandCvrCur)}</span>
                                  {hasCmp && <Delta p={pct(brandCvrCur, brandCvrCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${fmtPct(brandCvrCmp)} previously` : "brand sign-ups ÷ brand clicks"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-branded conversion rate</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-emerald-600 tabular-nums">{fmtPct(nbCvrCur)}</span>
                                  {hasCmp && <Delta p={pct(nbCvrCur, nbCvrCmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${fmtPct(nbCvrCmp)} previously` : "NB sign-ups ÷ NB clicks"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-branded avg position</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-emerald-600 tabular-nums">{nbAvgPosCur > 0 ? nbAvgPosCur.toFixed(1) : "—"}</span>
                                  {hasCmp && nbAvgPosCmp > 0 && (
                                    <span className={`text-[11px] font-bold ${posDeltaPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                      {posDeltaPct >= 0 ? "+" : ""}{posDeltaPct.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp && nbAvgPosCmp > 0 ? `${nbAvgPosCmp.toFixed(1)} previously · lower = better` : "impression-weighted · lower = better"}</div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* GSC query KPI cards — fifth row: new non-branded queries won / lost */}
                        {(() => {
                          // "New" = got impressions this period but had zero in the comparison period (won).
                          // "Lost" = had impressions in the comparison period but zero this period.
                          // Aggregated at query level (sum impressions across all landing pages) to avoid
                          // counting the same query multiple times.
                          const aggNbImprByQuery = (rows: typeof d.queryPageRowsCur) => {
                            const m = new Map<string, number>();
                            for (const r of rows) {
                              if (r.cls !== "nonBrand") continue;
                              m.set(r.query, (m.get(r.query) ?? 0) + r.impressions);
                            }
                            return m;
                          };
                          const nbImprCur = aggNbImprByQuery(d.queryPageRowsCur);
                          const nbImprCmp = aggNbImprByQuery(d.queryPageRowsCmp);
                          let nbWonCount = 0;
                          let nbLostCount = 0;
                          nbImprCur.forEach((impr, q) => { if (impr > 0 && (nbImprCmp.get(q) ?? 0) === 0) nbWonCount++; });
                          nbImprCmp.forEach((impr, q) => { if (impr > 0 && (nbImprCur.get(q) ?? 0) === 0) nbLostCount++; });

                          // Best (lowest) position per NB query across all its landing pages,
                          // then count unique queries ranking in top 3 / top 10.
                          const nbBestPosByQuery = (rows: typeof d.queryPageRowsCur) => {
                            const out = new Map<string, number>();
                            for (const r of rows) {
                              if (r.cls !== "nonBrand") continue;
                              const prev = out.get(r.query);
                              if (prev == null || r.position < prev) out.set(r.query, r.position);
                            }
                            return out;
                          };
                          const nbPosByQueryCur = nbBestPosByQuery(d.queryPageRowsCur);
                          const nbPosByQueryCmp = nbBestPosByQuery(d.queryPageRowsCmp);
                          let nbTop3Cur = 0, nbTop10Cur = 0;
                          nbPosByQueryCur.forEach((pos) => {
                            if (pos <= 3)  nbTop3Cur++;
                            if (pos <= 10) nbTop10Cur++;
                          });
                          let nbTop3Cmp = 0, nbTop10Cmp = 0;
                          nbPosByQueryCmp.forEach((pos) => {
                            if (pos <= 3)  nbTop3Cmp++;
                            if (pos <= 10) nbTop10Cmp++;
                          });

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">NB keywords in top 3</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-emerald-600 tabular-nums">{nbTop3Cur.toLocaleString()}</span>
                                  {hasCmp && <Delta p={pct(nbTop3Cur, nbTop3Cmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${nbTop3Cmp.toLocaleString()} previously · best position ≤ 3` : "unique NB queries ranking ≤ 3"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">NB keywords in top 10</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-emerald-600 tabular-nums">{nbTop10Cur.toLocaleString()}</span>
                                  {hasCmp && <Delta p={pct(nbTop10Cur, nbTop10Cmp)} />}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? `${nbTop10Cmp.toLocaleString()} previously · best position ≤ 10` : "unique NB queries ranking ≤ 10"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">New non-branded queries won</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-emerald-600 tabular-nums">{hasCmp ? nbWonCount.toLocaleString() : "—"}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? "got impressions this period, none previously" : "needs a comparison period"}</div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-branded queries lost</div>
                                <div className="flex items-end justify-between gap-2">
                                  <span className="text-2xl font-bold text-red-500 tabular-nums">{hasCmp ? nbLostCount.toLocaleString() : "—"}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">{hasCmp ? "had impressions previously, none this period" : "needs a comparison period"}</div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* NB Sign Ups forecast calculator */}
                        {(() => {
                          const nbCvr = d.totals.nonBrandClicks > 0 ? d.totals.nbLeads / d.totals.nonBrandClicks : 0;
                          const currentNbLeads  = d.totals.nbLeads;
                          const currentNbClicks = d.totals.nonBrandClicks;
                          const pctVal = Number.isFinite(nbsuForecastPct) ? nbsuForecastPct : 0;
                          const additionalLeads = currentNbLeads * (pctVal / 100);
                          const targetLeads     = currentNbLeads + additionalLeads;
                          const additionalClicksNeeded = nbCvr > 0 ? additionalLeads / nbCvr : 0;
                          const targetClicks    = currentNbClicks + additionalClicksNeeded;
                          const canForecast = nbCvr > 0 && currentNbLeads > 0;

                          // ── Additional queries needed ──
                          // Average clicks per non-brand query for the current period. Assumes any new
                          // queries you'd rank for would perform at today's NB query average.
                          const nbQuerySet = new Set(d.queryPageRowsCur.filter((r) => r.cls === "nonBrand").map((r) => r.query));
                          const nbQueryCount = nbQuerySet.size;
                          const avgClicksPerNbQuery = nbQueryCount > 0 ? currentNbClicks / nbQueryCount : 0;
                          const additionalQueriesNeeded = avgClicksPerNbQuery > 0 ? additionalClicksNeeded / avgClicksPerNbQuery : 0;

                          // ── Position improvement needed ──
                          // Use a standard CTR-by-position curve (Advanced Web Ranking aggregated benchmark)
                          // to estimate what new average position would yield the target NB clicks at the
                          // same impression volume. Assumes impressions hold constant.
                          const ctrCurve: { pos: number; ctr: number }[] = [
                            { pos: 1,  ctr: 0.281 },
                            { pos: 2,  ctr: 0.157 },
                            { pos: 3,  ctr: 0.110 },
                            { pos: 4,  ctr: 0.080 },
                            { pos: 5,  ctr: 0.061 },
                            { pos: 6,  ctr: 0.047 },
                            { pos: 7,  ctr: 0.037 },
                            { pos: 8,  ctr: 0.030 },
                            { pos: 9,  ctr: 0.025 },
                            { pos: 10, ctr: 0.022 },
                            { pos: 15, ctr: 0.012 },
                            { pos: 20, ctr: 0.007 },
                            { pos: 30, ctr: 0.004 },
                            { pos: 50, ctr: 0.002 },
                            { pos: 100, ctr: 0.001 },
                          ];
                          const posAtCtr = (ctr: number) => {
                            if (ctr >= ctrCurve[0].ctr) return ctrCurve[0].pos;
                            if (ctr <= ctrCurve[ctrCurve.length - 1].ctr) return ctrCurve[ctrCurve.length - 1].pos;
                            for (let i = 0; i < ctrCurve.length - 1; i++) {
                              const a = ctrCurve[i], b = ctrCurve[i + 1];
                              if (ctr <= a.ctr && ctr >= b.ctr) {
                                const t = (a.ctr - ctr) / (a.ctr - b.ctr);
                                return a.pos + (b.pos - a.pos) * t;
                              }
                            }
                            return ctrCurve[ctrCurve.length - 1].pos;
                          };
                          // Current NB impression-weighted avg position + total impressions.
                          let nbPosImpr = 0, nbImpr = 0;
                          for (const r of d.queryPageRowsCur) {
                            if (r.cls !== "nonBrand") continue;
                            nbPosImpr += r.position * r.impressions;
                            nbImpr    += r.impressions;
                          }
                          const nbAvgPos = nbImpr > 0 ? nbPosImpr / nbImpr : 0;
                          const targetNbClicks = currentNbClicks + additionalClicksNeeded;
                          const targetCtr = nbImpr > 0 ? targetNbClicks / nbImpr : 0;
                          const targetPos = nbImpr > 0 && nbAvgPos > 0 ? posAtCtr(targetCtr) : 0;
                          const posImprovement = nbAvgPos > 0 && targetPos > 0 ? nbAvgPos - targetPos : 0;
                          const positionPathPossible = nbAvgPos > 0 && targetPos > 0 && targetPos >= 1 && targetCtr <= ctrCurve[0].ctr;

                          return (
                            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-1.5"><TrendingUp size={12} className="text-emerald-600" /></div>
                                  <div>
                                    <h3 className="text-xs font-bold text-gray-900">Non-brand sign-ups forecast</h3>
                                    <p className="text-[10px] text-gray-400">How many extra non-brand clicks you'd need at today's NB conversion rate to hit a target uplift.</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] text-gray-500 font-medium">Increase NB sign-ups by</label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={Number.isFinite(nbsuForecastPct) ? nbsuForecastPct : 0}
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setNbsuForecastPct(Number.isFinite(v) ? v : 0);
                                      }}
                                      step="1"
                                      className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                  </div>
                                </div>
                              </div>
                              {canForecast ? (
                                <>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Current NB CVR</div>
                                      <div className="text-lg font-bold text-emerald-600 tabular-nums">{(nbCvr * 100).toFixed(2)}%</div>
                                      <div className="text-[10px] text-gray-400 mt-0.5">held constant in forecast</div>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Target NB sign-ups</div>
                                      <div className="text-lg font-bold text-gray-900 tabular-nums">{Math.round(targetLeads).toLocaleString()}</div>
                                      <div className="text-[10px] text-gray-400 mt-0.5">from {Math.round(currentNbLeads).toLocaleString()} · +{Math.round(additionalLeads).toLocaleString()}</div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                                      <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-1">Additional NB clicks needed</div>
                                      <div className="text-lg font-bold text-emerald-700 tabular-nums">{Math.round(additionalClicksNeeded).toLocaleString()}</div>
                                      <div className="text-[10px] text-emerald-700/70 mt-0.5">at current NB CVR</div>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Target NB clicks total</div>
                                      <div className="text-lg font-bold text-gray-900 tabular-nums">{Math.round(targetClicks).toLocaleString()}</div>
                                      <div className="text-[10px] text-gray-400 mt-0.5">from {Math.round(currentNbClicks).toLocaleString()}</div>
                                    </div>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">How you could get those extra clicks</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Path A · Rank for more queries</div>
                                        {avgClicksPerNbQuery > 0 ? (
                                          <>
                                            <div className="text-lg font-bold text-gray-900 tabular-nums">+{Math.round(additionalQueriesNeeded).toLocaleString()} queries</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">at {avgClicksPerNbQuery.toFixed(1)} clicks/query (current NB average) · {nbQueryCount.toLocaleString()} → {(nbQueryCount + Math.round(additionalQueriesNeeded)).toLocaleString()}</div>
                                          </>
                                        ) : (
                                          <div className="text-[11px] text-gray-400">Not enough NB query data to estimate.</div>
                                        )}
                                      </div>
                                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Path B · Improve avg position</div>
                                        {positionPathPossible && posImprovement > 0 ? (
                                          <>
                                            <div className="text-lg font-bold text-gray-900 tabular-nums">{nbAvgPos.toFixed(1)} → {targetPos.toFixed(1)}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">improve avg NB position by {posImprovement.toFixed(1)} places · same impressions, higher CTR</div>
                                          </>
                                        ) : !positionPathPossible && nbAvgPos > 0 ? (
                                          <>
                                            <div className="text-lg font-bold text-amber-700 tabular-nums">Not achievable</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">target CTR exceeds position-1 CTR — would need more impressions or queries too</div>
                                          </>
                                        ) : (
                                          <div className="text-[11px] text-gray-400">Not enough NB impression data to estimate.</div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-2">
                                      Paths are independent illustrations of the same goal. Path A assumes new queries perform at today's NB average clicks/query. Path B uses a standard CTR-by-position curve and assumes NB impressions stay constant — in practice you'd usually combine both.
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  Need a non-zero NB conversion rate and sign-up count to forecast. Try a longer date range.
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Brand vs Non-brand trend chart ── shows daily clicks + sign-ups */}
                        {d.daily.length > 0 && (() => {
                          const chartData = d.daily.map((r) => ({
                            date: formatDisplayDate(r.date),
                            nonBrandClicks: r.nonBrandClicks,
                            brandClicks: r.brandClicks,
                            nonBrandLeads: Math.round(r.nonBrandLeads * 100) / 100,
                            brandLeads: Math.round(r.brandLeads * 100) / 100,
                          }));
                          const metricOptions: { key: "clicks" | "leads"; label: string }[] = [
                            { key: "clicks", label: "Organic traffic (clicks)" },
                            { key: "leads",  label: "Sign-ups (generate_lead)" },
                          ];
                          return (
                            <ChartCard
                              title={
                                <div className="flex items-center justify-between gap-3 flex-wrap w-full">
                                  <span>Brand vs Non-brand — daily trend</span>
                                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg p-0.5">
                                    {metricOptions.map((m) => (
                                      <button
                                        key={m.key}
                                        type="button"
                                        onClick={() => setNbsuTrendMetric(m.key)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${nbsuTrendMetric === m.key ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                                      >
                                        {m.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              }
                              tip="Daily split for the whole site over the selected period. Each day's clicks (or modelled sign-ups) is split brand vs non-brand using the site-wide click-weighted ratio — same approach as the headline KPIs. Toggle to switch metric. Sign-ups can be fractional because they're modelled."
                            >
                              <div style={{ width: "100%", height: 260 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                                    <CartesianGrid stroke="#f3f4f6" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                                    <Tooltip
                                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                                      formatter={((v: number) => Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : v) as never}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    {nbsuTrendMetric === "clicks" ? (
                                      <>
                                        <Line type="monotone" dataKey="nonBrandClicks" name="Non-brand clicks" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="brandClicks"    name="Brand clicks"     stroke="#5b4fa8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                      </>
                                    ) : (
                                      <>
                                        <Line type="monotone" dataKey="nonBrandLeads" name="Non-brand sign-ups" stroke="#059669" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="brandLeads"    name="Brand sign-ups"     stroke="#5b4fa8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                      </>
                                    )}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-2">
                                Daily split uses the site-wide click-weighted brand ratio of {(d.totals.siteWideNbRatio * 100).toFixed(1)}% non-brand for the selected period. Sign-ups are modelled (GA4 generate_lead × ratio).
                              </div>
                            </ChartCard>
                          );
                        })()}

                        {/* Landing pages table OR per-page query drill-down */}
                        {nbsuDrill ? (() => {
                          // Drill-down: list queries for the chosen landing page, filtered by class.
                          const pageRows = d.queryPageRowsCur.filter((r) => r.page === nbsuDrill.page && r.cls === nbsuDrill.cls);
                          const cmpRows = d.queryPageRowsCmp.filter((r) => r.page === nbsuDrill.page && r.cls === nbsuDrill.cls);
                          const cmpByQuery = new Map(cmpRows.map((r) => [r.query, r]));
                          const totalClicks = pageRows.reduce((s, r) => s + r.clicks, 0);
                          const totalImpr   = pageRows.reduce((s, r) => s + r.impressions, 0);
                          const totalClicksCmp = cmpRows.reduce((s, r) => s + r.clicks, 0);
                          const totalImprCmp   = cmpRows.reduce((s, r) => s + r.impressions, 0);
                          const sorted = [...pageRows].sort((a, b) => b.clicks - a.clicks);
                          const isBrand = nbsuDrill.cls === "brand";
                          const accent = isBrand ? "#5b4fa8" : "#059669";
                          const accentBg = isBrand ? "bg-purple-50" : "bg-emerald-50";
                          const accentBorder = isBrand ? "border-purple-100" : "border-emerald-100";
                          const pctDelta = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : (a > 0 ? 100 : 0));
                          return (
                            <ChartCard
                              title={
                                <div className="flex items-center justify-between gap-3 flex-wrap w-full">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => setNbsuDrill(null)}
                                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 shrink-0"
                                    >
                                      <span aria-hidden>←</span> Back to landing pages
                                    </button>
                                    <span className="text-gray-300">·</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBrand ? "bg-purple-100 text-[#5b4fa8]" : "bg-emerald-100 text-emerald-700"}`}>
                                      {isBrand ? "Brand queries" : "Non-brand queries"}
                                    </span>
                                    <span className="text-[12px] text-gray-700 font-mono truncate" title={nbsuDrill.page}>{nbsuDrill.page}</span>
                                  </div>
                                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg p-0.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setNbsuDrill({ page: nbsuDrill.page, cls: "nonBrand" })}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${!isBrand ? "bg-white text-emerald-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                                    >Non-brand</button>
                                    <button
                                      type="button"
                                      onClick={() => setNbsuDrill({ page: nbsuDrill.page, cls: "brand" })}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${isBrand ? "bg-white text-[#5b4fa8] shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                                    >Brand</button>
                                  </div>
                                </div>
                              }
                              tip="Queries that this landing page ranked on during the selected period, filtered by brand vs non-brand. Sorted by clicks. The comparison column shows movement vs the comparison period when available."
                            >
                              {/* Summary strip */}
                              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 ${accentBg} border ${accentBorder} rounded-xl p-3`}>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Queries</div>
                                  <div className="text-base font-bold tabular-nums" style={{ color: accent }}>{sorted.length.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Clicks</div>
                                  <div className="text-base font-bold tabular-nums" style={{ color: accent }}>
                                    {totalClicks.toLocaleString()}
                                    {hasCmp && totalClicksCmp > 0 && (() => {
                                      const p = pctDelta(totalClicks, totalClicksCmp);
                                      return <span className={`ml-1.5 text-[10px] font-bold ${p >= 0 ? "text-emerald-600" : "text-red-500"}`}>{p >= 0 ? "+" : ""}{p.toFixed(0)}%</span>;
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Impressions</div>
                                  <div className="text-base font-bold tabular-nums text-gray-700">
                                    {totalImpr.toLocaleString()}
                                    {hasCmp && totalImprCmp > 0 && (() => {
                                      const p = pctDelta(totalImpr, totalImprCmp);
                                      return <span className={`ml-1.5 text-[10px] font-bold ${p >= 0 ? "text-emerald-600" : "text-red-500"}`}>{p >= 0 ? "+" : ""}{p.toFixed(0)}%</span>;
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Avg CTR</div>
                                  <div className="text-base font-bold tabular-nums text-gray-700">{totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(2) + "%" : "—"}</div>
                                </div>
                              </div>

                              <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 540, WebkitOverflowScrolling: "touch" }}>
                                <table className="w-full text-xs">
                                  <thead className="sticky top-0 bg-white z-10">
                                    <tr className="text-left text-gray-400 border-b border-gray-100">
                                      <th className="pb-2 pr-2 font-medium">Query</th>
                                      <th className="pb-2 pr-2 font-medium text-right">Clicks</th>
                                      <th className="pb-2 pr-2 font-medium text-right">Impr.</th>
                                      <th className="pb-2 pr-2 font-medium text-right">CTR</th>
                                      <th className="pb-2 font-medium text-right">Pos.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sorted.slice(0, 500).map((r, i) => {
                                      const cmp = cmpByQuery.get(r.query);
                                      const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
                                      const clickDelta = cmp ? pctDelta(r.clicks, cmp.clicks) : null;
                                      return (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/60">
                                          <td className="py-1.5 pr-2 text-gray-800 max-w-[420px] truncate" title={r.query}>{r.query}</td>
                                          <td className="py-1.5 pr-2 text-right tabular-nums font-semibold" style={{ color: accent }}>
                                            {r.clicks.toLocaleString()}
                                            {hasCmp && clickDelta != null && cmp && cmp.clicks > 0 && (
                                              <span className={`ml-1 text-[10px] font-bold ${clickDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>{clickDelta >= 0 ? "+" : ""}{clickDelta.toFixed(0)}%</span>
                                            )}
                                            {hasCmp && cmp && cmp.clicks === 0 && r.clicks > 0 && <span className="ml-1 text-[10px] font-bold text-emerald-600">new</span>}
                                          </td>
                                          <td className="py-1.5 pr-2 text-right tabular-nums text-gray-600">{r.impressions.toLocaleString()}</td>
                                          <td className="py-1.5 pr-2 text-right tabular-nums text-gray-600">{ctr.toFixed(2)}%</td>
                                          <td className="py-1.5 text-right tabular-nums text-gray-600">{r.position > 0 ? r.position.toFixed(1) : "—"}</td>
                                        </tr>
                                      );
                                    })}
                                    {sorted.length === 0 && (
                                      <tr><td colSpan={5} className="py-6 text-center text-gray-400">No {isBrand ? "brand" : "non-brand"} queries recorded for this page in the selected period.</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              {sorted.length > 500 && (
                                <div className="text-[10px] text-gray-400 mt-2">Showing top 500 of {sorted.length.toLocaleString()} queries.</div>
                              )}
                            </ChartCard>
                          );
                        })() : (
                          <ChartCard
                            title="Landing pages (whole site)"
                            tip="One row per landing page. The NB/B ratio is click-weighted from GSC: brand clicks vs non-brand clicks for queries that page ranked on. NB and Brand sign-ups split the GA4 generate_lead key-event count from organic sessions by that ratio. Click a landing page URL to drill into its brand or non-brand queries."
                          >
                            <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 540, WebkitOverflowScrolling: "touch" }}>
                              <table className="w-full min-w-[1200px] text-xs">
                                <thead className="sticky top-0 bg-white z-10">
                                  <tr className="text-left text-gray-400 border-b border-gray-100">
                                    <SortableTh label="Landing page" sortKey="page" sort={nbsuSort.sort} onToggle={nbsuSort.toggle} className="pb-2 pr-2 font-medium" />
                                    <SortableTh label="NB / B ratio" sortKey="nonBrandRatio" sort={nbsuSort.sort} onToggle={nbsuSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                    <SortableTh label="Org. sessions" sortKey="orgSessions" sort={nbsuSort.sort} onToggle={nbsuSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                    <SortableTh label="Total SEO sign-ups" sortKey="fspLeads" sort={nbsuSort.sort} onToggle={nbsuSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                    <SortableTh label="NB SEO sign-ups" sortKey="nbLeads" sort={nbsuSort.sort} onToggle={nbsuSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                    <SortableTh label="Brand SEO sign-ups" sortKey="brandLeads" sort={nbsuSort.sort} onToggle={nbsuSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                    <SortableTh label={<>Total CVR<div className="text-[9px] font-normal text-gray-300">leads ÷ sessions</div></>} sortKey={null} sort={nbsuSort.sort} className="pb-2 pr-2 font-medium text-right" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {nbsuSort.sorted.slice(0, 300).map((r, i) => {
                                    // Inline change badge: show % when previous>0; show "new" tag when previous==0 but current>0; "—" when both zero
                                    const changeBadge = (cur: number, prev: number, isInt: boolean) => {
                                      const curR = isInt ? Math.round(cur) : cur;
                                      const prevR = isInt ? Math.round(prev) : prev;
                                      if (!hasCmp) return null;
                                      if (prevR <= 0 && curR <= 0) return null;
                                      if (prevR <= 0 && curR > 0) {
                                        return <div className="text-[10px] font-bold text-emerald-600">new</div>;
                                      }
                                      if (prevR > 0 && curR <= 0) {
                                        return <div className="text-[10px] font-bold text-red-500">−100%</div>;
                                      }
                                      const p = ((curR - prevR) / prevR) * 100;
                                      return <div className={`text-[10px] font-bold ${p >= 0 ? "text-emerald-600" : "text-red-500"}`}>{p >= 0 ? "+" : ""}{p.toFixed(0)}%</div>;
                                    };
                                    // Per-row total conversion rate (leads ÷ sessions).
                                    const totalCvr    = r.orgSessions    > 0 ? (r.fspLeads    / r.orgSessions)    * 100 : 0;
                                    const totalCvrCmp = r.orgSessionsCmp > 0 ? (r.fspLeadsCmp / r.orgSessionsCmp) * 100 : 0;
                                    return (
                                      <tr key={i} className="border-b border-gray-50 hover:bg-emerald-50/30">
                                        <td className="py-2 pr-2 max-w-[280px] truncate" title={r.page}>
                                          <div className="flex items-center gap-2 min-w-0">
                                            <UrlLink url={r.page} className="text-gray-700 truncate" />
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setNbsuDrill({ page: r.page, cls: "nonBrand" }); }}
                                                className="text-[9px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline px-1"
                                                title="See non-brand queries for this page"
                                              >see NB</button>
                                              <span className="text-gray-200 text-[9px]">·</span>
                                              <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setNbsuDrill({ page: r.page, cls: "brand" }); }}
                                                className="text-[9px] font-semibold text-[#5b4fa8] hover:text-[#3f3578] hover:underline px-1"
                                                title="See brand queries for this page"
                                              >see B</button>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-2 pr-2 text-right tabular-nums">
                                          <span className="text-emerald-700 font-semibold">{(r.nonBrandRatio * 100).toFixed(1)}%</span>
                                          <span className="text-gray-300"> / </span>
                                          <span className="text-[#5b4fa8] font-semibold">{((1 - r.nonBrandRatio) * 100).toFixed(1)}%</span>
                                          <div className="text-[10px] text-gray-400">{r.nonBrandClicks.toLocaleString()} / {r.brandClicks.toLocaleString()} clicks{r.usedSiteWideRatio ? " · fallback" : ""}</div>
                                        </td>
                                        <td className="py-2 pr-2 text-right tabular-nums text-gray-900 font-semibold">
                                          {r.orgSessions.toLocaleString()}
                                          {changeBadge(r.orgSessions, r.orgSessionsCmp, true)}
                                        </td>
                                        <td className="py-2 pr-2 text-right tabular-nums text-sky-700 font-semibold">
                                          {r.fspLeads.toLocaleString()}
                                          {changeBadge(r.fspLeads, r.fspLeadsCmp, true)}
                                        </td>
                                        <td className="py-2 pr-2 text-right tabular-nums text-emerald-700 font-semibold">
                                          {Math.round(r.nbLeads).toLocaleString()}
                                          {changeBadge(r.nbLeads, r.nbLeadsCmp, true)}
                                        </td>
                                        <td className="py-2 pr-2 text-right tabular-nums text-[#5b4fa8] font-semibold">
                                          {Math.round(r.brandLeads).toLocaleString()}
                                          {changeBadge(r.brandLeads, r.brandLeadsCmp, true)}
                                        </td>
                                        <td className="py-2 pr-2 text-right tabular-nums text-sky-700 font-semibold">
                                          {r.orgSessions > 0 ? `${totalCvr.toFixed(2)}%` : "—"}
                                          {r.orgSessions > 0 && hasCmp && r.orgSessionsCmp > 0 && changeBadge(totalCvr, totalCvrCmp, false)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {nbsuSort.sorted.length === 0 && (
                                    <tr><td colSpan={9} className="py-6 text-center text-gray-400">No landing pages with data in this window.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-2">"fallback" = page had no GSC click data for the period, so the site-wide click-weighted non-brand ratio was applied. Click <span className="font-semibold text-emerald-700">see NB</span> or <span className="font-semibold text-[#5b4fa8]">see B</span> next to any landing page to drill into its queries.</div>
                          </ChartCard>
                        )}

                        {/* Non-branded queries: Won (new) & Lost — only shown when a comparison period exists */}
                        {hasCmp && !nbsuDrill && (() => {
                          // Aggregate non-brand queries to query level (sum impressions/clicks across pages,
                          // impression-weighted position) so each query appears once. "Won" = present in
                          // current with impressions > 0 AND absent (zero impressions) in comparison. "Lost" = inverse.
                          type NbAgg = { query: string; impressions: number; clicks: number; position: number };
                          const aggregate = (rows: typeof d.queryPageRowsCur): Map<string, NbAgg> => {
                            const acc = new Map<string, { impressions: number; clicks: number; posImpr: number }>();
                            for (const r of rows) {
                              if (r.cls !== "nonBrand") continue;
                              const cur = acc.get(r.query) ?? { impressions: 0, clicks: 0, posImpr: 0 };
                              cur.impressions += r.impressions;
                              cur.clicks      += r.clicks;
                              cur.posImpr     += r.position * r.impressions;
                              acc.set(r.query, cur);
                            }
                            const out = new Map<string, NbAgg>();
                            acc.forEach((v, k) => out.set(k, {
                              query: k,
                              impressions: v.impressions,
                              clicks: v.clicks,
                              position: v.impressions > 0 ? v.posImpr / v.impressions : 0,
                            }));
                            return out;
                          };
                          const nbCur = aggregate(d.queryPageRowsCur);
                          const nbCmp = aggregate(d.queryPageRowsCmp);
                          const wonRows: NbAgg[] = [];
                          nbCur.forEach((agg, q) => { if (agg.impressions > 0 && (nbCmp.get(q)?.impressions ?? 0) === 0) wonRows.push(agg); });
                          const lostRows: NbAgg[] = [];
                          nbCmp.forEach((agg, q) => { if (agg.impressions > 0 && (nbCur.get(q)?.impressions ?? 0) === 0) lostRows.push(agg); });
                          wonRows.sort((a, b) => b.impressions - a.impressions);
                          lostRows.sort((a, b) => b.impressions - a.impressions);

                          const QueryTable = ({ rows, accent, periodLabel }: { rows: NbAgg[]; accent: "won" | "lost"; periodLabel: string }) => {
                            const isWon = accent === "won";
                            return (
                              <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 360, WebkitOverflowScrolling: "touch" }}>
                                <table className="w-full min-w-[520px] text-xs">
                                  <thead className="sticky top-0 bg-white z-10">
                                    <tr className="text-left text-gray-400 border-b border-gray-100">
                                      <th className="pb-2 pr-2 font-medium">Query</th>
                                      <th className="pb-2 pr-2 font-medium text-right">Impressions<div className="text-[9px] font-normal text-gray-300">{periodLabel}</div></th>
                                      <th className="pb-2 pr-2 font-medium text-right">Clicks</th>
                                      <th className="pb-2 pr-2 font-medium text-right">Avg pos</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.slice(0, 100).map((r, i) => (
                                      <tr key={i} className={`border-b border-gray-50 ${isWon ? "hover:bg-emerald-50/30" : "hover:bg-red-50/30"}`}>
                                        <td className="py-2 pr-2 truncate max-w-[260px]" title={r.query}>
                                          <span className="text-gray-700">{r.query}</span>
                                        </td>
                                        <td className="py-2 pr-2 text-right tabular-nums text-gray-900 font-semibold">{r.impressions.toLocaleString()}</td>
                                        <td className={`py-2 pr-2 text-right tabular-nums font-semibold ${isWon ? "text-emerald-700" : "text-red-500"}`}>{r.clicks.toLocaleString()}</td>
                                        <td className="py-2 pr-2 text-right tabular-nums text-gray-600">{r.position > 0 ? r.position.toFixed(1) : "—"}</td>
                                      </tr>
                                    ))}
                                    {rows.length === 0 && (
                                      <tr><td colSpan={4} className="py-6 text-center text-gray-400">No {isWon ? "new" : "lost"} non-branded queries in this window.</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            );
                          };
                          return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              <ChartCard
                                title={<span className="flex items-center gap-2"><span className="text-emerald-600">▲</span>New non-branded queries won</span>}
                                tip="Non-brand queries that received impressions this period but had zero impressions in the comparison period. Aggregated at query level across all landing pages, sorted by impressions."
                              >
                                <QueryTable rows={wonRows} accent="won" periodLabel="this period" />
                                <div className="text-[10px] text-gray-400 mt-2">{wonRows.length.toLocaleString()} non-branded queries appeared this period that weren't seen previously.</div>
                              </ChartCard>
                              <ChartCard
                                title={<span className="flex items-center gap-2"><span className="text-red-500">▼</span>Non-branded queries lost</span>}
                                tip="Non-brand queries that had impressions in the comparison period but zero this period. Aggregated at query level. Sorted by previous-period impressions to surface the most material losses first."
                              >
                                <QueryTable rows={lostRows} accent="lost" periodLabel="previous period" />
                                <div className="text-[10px] text-gray-400 mt-2">{lostRows.length.toLocaleString()} non-branded queries dropped out of the impression universe vs the comparison period.</div>
                              </ChartCard>
                            </div>
                          );
                        })()}

                        {/* Low hanging fruit — non-brand queries ranking 15–40 */}
                        {!nbsuDrill && (() => {
                          // Aggregate non-brand rows to query level so we don't double-count queries
                          // that rank on multiple pages. Position is impression-weighted, then we filter
                          // to queries whose aggregate position is 15-40 (page 2-4 territory).
                          type LhfAgg = { query: string; impressions: number; clicks: number; position: number; topPage: string };
                          const acc = new Map<string, { impressions: number; clicks: number; posImpr: number; pageClicks: Map<string, number> }>();
                          for (const r of d.queryPageRowsCur) {
                            if (r.cls !== "nonBrand") continue;
                            const cur = acc.get(r.query) ?? { impressions: 0, clicks: 0, posImpr: 0, pageClicks: new Map<string, number>() };
                            cur.impressions += r.impressions;
                            cur.clicks      += r.clicks;
                            cur.posImpr     += r.position * r.impressions;
                            cur.pageClicks.set(r.page, (cur.pageClicks.get(r.page) ?? 0) + r.clicks);
                            acc.set(r.query, cur);
                          }
                          const lhfRows: LhfAgg[] = [];
                          acc.forEach((v, q) => {
                            const pos = v.impressions > 0 ? v.posImpr / v.impressions : 0;
                            if (pos < 15 || pos > 40) return;
                            // Pick the landing page where the query gets the most clicks (or impressions if no clicks).
                            let topPage = "—";
                            let topMetric = -1;
                            v.pageClicks.forEach((clicks, page) => { if (clicks > topMetric) { topMetric = clicks; topPage = page; } });
                            lhfRows.push({ query: q, impressions: v.impressions, clicks: v.clicks, position: pos, topPage });
                          });
                          // Sort by impressions desc — highest-impression queries on page 2-4 have the
                          // biggest potential upside if pushed onto page 1.
                          lhfRows.sort((a, b) => b.impressions - a.impressions);

                          return (
                            <ChartCard
                              title={<span className="flex items-center gap-2"><span className="text-amber-500">★</span>Low hanging fruit — NB queries ranking 15–40</span>}
                              tip="Non-brand queries with an impression-weighted average position between 15 and 40 — typically page 2-4 of search results. These have demonstrated relevance (Google ranks the page for them and gives them impressions) but aren't yet driving meaningful clicks. Small position improvements here usually deliver outsized click gains. Sorted by impressions to surface the biggest opportunities first."
                            >
                              <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 480, WebkitOverflowScrolling: "touch" }}>
                                <table className="w-full min-w-[760px] text-xs">
                                  <thead className="sticky top-0 bg-white z-10">
                                    <tr className="text-left text-gray-400 border-b border-gray-100">
                                      <th className="pb-2 pr-2 font-medium">Query</th>
                                      <th className="pb-2 pr-2 font-medium">Top landing page</th>
                                      <th className="pb-2 pr-2 font-medium text-right">Impressions</th>
                                      <th className="pb-2 pr-2 font-medium text-right">Clicks</th>
                                      <th className="pb-2 pr-2 font-medium text-right">CTR</th>
                                      <th className="pb-2 pr-2 font-medium text-right">Avg pos</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lhfRows.slice(0, 200).map((r, i) => {
                                      const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
                                      return (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-amber-50/30">
                                          <td className="py-2 pr-2 truncate max-w-[240px]" title={r.query}>
                                            <span className="text-gray-700">{r.query}</span>
                                          </td>
                                          <td className="py-2 pr-2 truncate max-w-[220px]" title={r.topPage}>
                                            <UrlLink url={r.topPage} className="text-gray-500 text-[11px] truncate" />
                                          </td>
                                          <td className="py-2 pr-2 text-right tabular-nums text-gray-900 font-semibold">{r.impressions.toLocaleString()}</td>
                                          <td className="py-2 pr-2 text-right tabular-nums text-emerald-700 font-semibold">{r.clicks.toLocaleString()}</td>
                                          <td className="py-2 pr-2 text-right tabular-nums text-gray-600">{ctr.toFixed(2)}%</td>
                                          <td className="py-2 pr-2 text-right tabular-nums text-amber-700 font-semibold">{r.position.toFixed(1)}</td>
                                        </tr>
                                      );
                                    })}
                                    {lhfRows.length === 0 && (
                                      <tr><td colSpan={6} className="py-6 text-center text-gray-400">No non-brand queries ranking between positions 15 and 40 in this window.</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-2">{lhfRows.length.toLocaleString()} non-brand queries currently rank between positions 15 and 40. Showing top 200 by impressions. "Top landing page" = the page accumulating the most clicks for this query in the selected period.</div>
                            </ChartCard>
                          );
                        })()}

                        {/* Winners & Losers — only shown when a comparison period exists */}
                        {hasCmp && (() => {
                          // Build delta-augmented rows. Only consider pages that have some
                          // activity in either the current or previous period for the metric
                          // we're ranking, so we don't surface noise from zero-zero rows.
                          type DeltaRow = NbsuLandingPageRow & { nbDelta: number; orgDelta: number };
                          // Movement tables exclude URLs containing "?" (parameterised variants)
                          // so they don't dominate the rankings. Top table + KPIs keep them.
                          const withDeltas: DeltaRow[] = d.rows
                            .filter((r) => !r.page.includes("?"))
                            .map((r) => ({
                              ...r,
                              nbDelta: r.nbLeads - r.nbLeadsCmp,
                              orgDelta: r.orgSessions - r.orgSessionsCmp,
                            }));
                          const nbActivity = (r: DeltaRow) => r.nbLeads > 0 || r.nbLeadsCmp > 0;
                          const orgActivity = (r: DeltaRow) => r.orgSessions > 0 || r.orgSessionsCmp > 0;

                          const nbLosers   = withDeltas.filter(nbActivity).filter((r) => r.nbDelta < 0).sort((a, b) => a.nbDelta - b.nbDelta).slice(0, 15);
                          const nbWinners  = withDeltas.filter(nbActivity).filter((r) => r.nbDelta > 0).sort((a, b) => b.nbDelta - a.nbDelta).slice(0, 15);
                          const orgLosers  = withDeltas.filter(orgActivity).filter((r) => r.orgDelta < 0).sort((a, b) => a.orgDelta - b.orgDelta).slice(0, 15);
                          const orgWinners = withDeltas.filter(orgActivity).filter((r) => r.orgDelta > 0).sort((a, b) => b.orgDelta - a.orgDelta).slice(0, 15);

                          // Tiny shared renderer for a winners/losers table.
                          const MovementTable = ({
                            title, tip, rows, metricKey, accent,
                          }: {
                            title: string;
                            tip: string;
                            rows: DeltaRow[];
                            metricKey: "nb" | "org";
                            accent: "down" | "up";
                          }) => {
                            const isDown = accent === "down";
                            const headerColor = isDown ? "text-red-600" : "text-emerald-600";
                            const deltaColor  = isDown ? "text-red-500" : "text-emerald-600";
                            const sign = (n: number) => (n >= 0 ? "+" : "");
                            return (
                              <ChartCard title={<span className="flex items-center gap-2"><span className={headerColor}>{isDown ? "▼" : "▲"}</span>{title}</span>} tip={tip}>
                                <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 360, WebkitOverflowScrolling: "touch" }}>
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white z-10">
                                      <tr className="text-left text-gray-400 border-b border-gray-100">
                                        <th className="pb-2 pr-2 font-medium">Landing page</th>
                                        <th className="pb-2 pr-2 font-medium text-right">Current</th>
                                        <th className="pb-2 pr-2 font-medium text-right">Previous</th>
                                        <th className="pb-2 font-medium text-right">Change</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, i) => {
                                        const cur = metricKey === "nb" ? Math.round(r.nbLeads) : r.orgSessions;
                                        const prev = metricKey === "nb" ? Math.round(r.nbLeadsCmp) : r.orgSessionsCmp;
                                        const delta = metricKey === "nb" ? Math.round(r.nbDelta) : r.orgDelta;
                                        const pct = prev > 0 ? (delta / prev) * 100 : null;
                                        return (
                                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="py-2 pr-2 max-w-[280px] truncate" title={r.page}><UrlLink url={r.page} className="text-gray-700" /></td>
                                            <td className="py-2 pr-2 text-right tabular-nums text-gray-900 font-semibold">{cur.toLocaleString()}</td>
                                            <td className="py-2 pr-2 text-right tabular-nums text-gray-500">{prev.toLocaleString()}</td>
                                            <td className={`py-2 text-right tabular-nums font-bold ${deltaColor}`}>
                                              {sign(delta)}{delta.toLocaleString()}
                                              {pct != null && <div className="text-[10px] font-bold">{sign(pct)}{pct.toFixed(0)}%</div>}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {rows.length === 0 && (
                                        <tr><td colSpan={4} className="py-6 text-center text-gray-400">No movement to report in this window.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </ChartCard>
                            );
                          };

                          return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <MovementTable
                                title="NB SEO sign-ups — biggest drops"
                                tip="Landing pages where modelled non-brand SEO sign-ups fell the most vs the comparison period (absolute change, largest decline first)."
                                rows={nbLosers}
                                metricKey="nb"
                                accent="down"
                              />
                              <MovementTable
                                title="NB SEO sign-ups — biggest gains"
                                tip="Landing pages where modelled non-brand SEO sign-ups grew the most vs the comparison period (absolute change, largest gain first)."
                                rows={nbWinners}
                                metricKey="nb"
                                accent="up"
                              />
                              <MovementTable
                                title="Organic sessions — biggest drops"
                                tip="Landing pages where Organic Search sessions fell the most vs the comparison period (absolute change, largest decline first)."
                                rows={orgLosers}
                                metricKey="org"
                                accent="down"
                              />
                              <MovementTable
                                title="Organic sessions — biggest gains"
                                tip="Landing pages where Organic Search sessions grew the most vs the comparison period (absolute change, largest gain first)."
                                rows={orgWinners}
                                metricKey="org"
                                accent="up"
                              />
                            </div>
                          );
                        })()}

                        {/* Non-brand query-level and per-page query-count movement tables */}
                        {hasCmp && (() => {
                          const cur = d.queryPageRowsCur;
                          const cmp = d.queryPageRowsCmp;

                          // ── Per-query aggregates (non-brand only) ──────────────────────────
                          // For each query, sum clicks + impressions across pages, and compute
                          // impression-weighted average position. Track contributing pages so we
                          // can show them in the drilldown.
                          type QueryAgg = {
                            clicks: number;
                            impressions: number;
                            posWeightedSum: number; // Σ position × impressions
                            pages: Map<string, { clicks: number; impressions: number; position: number }>;
                          };
                          const aggByQuery = (rows: typeof cur, onlyNonBrand = true) => {
                            const m = new Map<string, QueryAgg>();
                            rows.forEach((r) => {
                              if (onlyNonBrand && r.cls !== "nonBrand") return;
                              let q = m.get(r.query);
                              if (!q) { q = { clicks: 0, impressions: 0, posWeightedSum: 0, pages: new Map() }; m.set(r.query, q); }
                              q.clicks += r.clicks;
                              q.impressions += r.impressions;
                              q.posWeightedSum += r.position * r.impressions;
                              q.pages.set(r.page, { clicks: r.clicks, impressions: r.impressions, position: r.position });
                            });
                            return m;
                          };
                          const queryCur = aggByQuery(cur);
                          const queryCmp = aggByQuery(cmp);
                          const allNbQueries = new Set<string>([...queryCur.keys(), ...queryCmp.keys()]);

                          // Build a unified per-query record with deltas
                          type QueryMovementRow = {
                            query: string;
                            clicks: number; clicksCmp: number;
                            impressions: number; impressionsCmp: number;
                            position: number; positionCmp: number; // 0 if no impressions
                            pages: Map<string, { clicks: number; impressions: number; position: number }>;
                            pagesCmp: Map<string, { clicks: number; impressions: number; position: number }>;
                          };
                          const queryMovements: QueryMovementRow[] = [];
                          allNbQueries.forEach((q) => {
                            const c = queryCur.get(q);
                            const p = queryCmp.get(q);
                            queryMovements.push({
                              query: q,
                              clicks: c?.clicks ?? 0,
                              clicksCmp: p?.clicks ?? 0,
                              impressions: c?.impressions ?? 0,
                              impressionsCmp: p?.impressions ?? 0,
                              position: (c && c.impressions > 0) ? c.posWeightedSum / c.impressions : 0,
                              positionCmp: (p && p.impressions > 0) ? p.posWeightedSum / p.impressions : 0,
                              pages: c?.pages ?? new Map(),
                              pagesCmp: p?.pages ?? new Map(),
                            });
                          });

                          // Click winners/losers — only meaningful where there were clicks in at least one period
                          const clickActivity = (r: QueryMovementRow) => r.clicks > 0 || r.clicksCmp > 0;
                          const clickLosers  = queryMovements.filter(clickActivity).map((r) => ({ ...r, delta: r.clicks - r.clicksCmp })).filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 15);
                          const clickWinners = queryMovements.filter(clickActivity).map((r) => ({ ...r, delta: r.clicks - r.clicksCmp })).filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 15);

                          // Position winners/losers — only where the query had impressions in BOTH periods
                          // (a query newly appearing has no "from" position to compare).
                          // Lower position number = better. "Dropping in position" (worse) = delta > 0.
                          const posActivity = (r: QueryMovementRow) => r.impressions > 0 && r.impressionsCmp > 0;
                          // Require some impression volume so noise queries with 1 impression don't dominate
                          const posMinImpr = 10;
                          const posCandidates = queryMovements
                            .filter(posActivity)
                            .filter((r) => r.impressions >= posMinImpr && r.impressionsCmp >= posMinImpr)
                            .map((r) => ({ ...r, delta: r.position - r.positionCmp }));
                          const posLosers   = posCandidates.filter((r) => r.delta > 0.5).sort((a, b) => b.delta - a.delta).slice(0, 15); // got WORSE
                          const posWinners  = posCandidates.filter((r) => r.delta < -0.5).sort((a, b) => a.delta - b.delta).slice(0, 15);  // got BETTER

                          // ── Per-URL distinct non-brand query counts ────────────────────────
                          const queriesByUrl = (rows: typeof cur) => {
                            const m = new Map<string, Set<string>>();
                            rows.forEach((r) => {
                              if (r.cls !== "nonBrand") return;
                              if (r.clicks <= 0 && r.impressions <= 0) return;
                              let s = m.get(r.page);
                              if (!s) { s = new Set<string>(); m.set(r.page, s); }
                              s.add(r.query);
                            });
                            return m;
                          };
                          const urlQueriesCur = queriesByUrl(cur);
                          const urlQueriesCmp = queriesByUrl(cmp);
                          const allUrls = new Set<string>([...urlQueriesCur.keys(), ...urlQueriesCmp.keys()]);
                          type UrlQueryCountRow = {
                            page: string;
                            count: number; countCmp: number; delta: number;
                            wonQueries: string[];   // in cur, not in cmp
                            lostQueries: string[];  // in cmp, not in cur
                          };
                          const urlMovements: UrlQueryCountRow[] = [];
                          allUrls.forEach((url) => {
                            const c = urlQueriesCur.get(url) ?? new Set<string>();
                            const p = urlQueriesCmp.get(url) ?? new Set<string>();
                            const won: string[] = [];
                            const lost: string[] = [];
                            c.forEach((q) => { if (!p.has(q)) won.push(q); });
                            p.forEach((q) => { if (!c.has(q)) lost.push(q); });
                            urlMovements.push({
                              page: url,
                              count: c.size, countCmp: p.size,
                              delta: c.size - p.size,
                              wonQueries: won,
                              lostQueries: lost,
                            });
                          });
                          const urlCountLosers  = urlMovements.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 15);
                          const urlCountWinners = urlMovements.filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 15);

                          // ── Shared helpers ────────────────────────────────────────────────
                          const toggleExpand = (id: string) => setNbsuExpanded((s) => {
                            const next = new Set(s);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                          });
                          const sign = (n: number) => (n >= 0 ? "+" : "");
                          const pctDelta = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

                          // ── Query click movement table ─────────────────────────────────────
                          const QueryClickMovement = ({ tableId, title, tip, rows, accent }: {
                            tableId: string; title: string; tip: string;
                            rows: (QueryMovementRow & { delta: number })[]; accent: "down" | "up";
                          }) => {
                            const isDown = accent === "down";
                            const headerColor = isDown ? "text-red-600" : "text-emerald-600";
                            const deltaColor = isDown ? "text-red-500" : "text-emerald-600";
                            return (
                              <ChartCard title={<span className="flex items-center gap-2"><span className={headerColor}>{isDown ? "▼" : "▲"}</span>{title}</span>} tip={tip}>
                                <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 380, WebkitOverflowScrolling: "touch" }}>
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white z-10">
                                      <tr className="text-left text-gray-400 border-b border-gray-100">
                                        <th className="pb-2 pr-2 font-medium w-6"></th>
                                        <th className="pb-2 pr-2 font-medium">Query (non-brand)</th>
                                        <th className="pb-2 pr-2 font-medium text-right">Current</th>
                                        <th className="pb-2 pr-2 font-medium text-right">Previous</th>
                                        <th className="pb-2 font-medium text-right">Change</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, i) => {
                                        const id = `${tableId}::${r.query}`;
                                        const open = nbsuExpanded.has(id);
                                        const p = pctDelta(r.clicks, r.clicksCmp);
                                        // Build union of pages from both periods for the drilldown
                                        const pageSet = new Set<string>([...r.pages.keys(), ...r.pagesCmp.keys()]);
                                        const pageRows = Array.from(pageSet).map((page) => {
                                          const a = r.pages.get(page);
                                          const b = r.pagesCmp.get(page);
                                          return {
                                            page,
                                            clicks: a?.clicks ?? 0,
                                            clicksCmp: b?.clicks ?? 0,
                                            position: a?.position ?? 0,
                                            positionCmp: b?.position ?? 0,
                                          };
                                        }).sort((x, y) => (y.clicks - y.clicksCmp) - (x.clicks - x.clicksCmp));
                                        return (
                                          <Fragment key={i}>
                                            <tr className="border-b border-gray-50 hover:bg-gray-50">
                                              <td className="py-2 pr-2 text-center">
                                                <button onClick={() => toggleExpand(id)} className="text-gray-400 hover:text-gray-700">
                                                  {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                              </td>
                                              <td className="py-2 pr-2 max-w-[260px] truncate text-gray-700" title={r.query}>{r.query}</td>
                                              <td className="py-2 pr-2 text-right tabular-nums text-gray-900 font-semibold">{r.clicks.toLocaleString()}</td>
                                              <td className="py-2 pr-2 text-right tabular-nums text-gray-500">{r.clicksCmp.toLocaleString()}</td>
                                              <td className={`py-2 text-right tabular-nums font-bold ${deltaColor}`}>
                                                {sign(r.delta)}{r.delta.toLocaleString()}
                                                {p != null && <div className="text-[10px] font-bold">{sign(p)}{p.toFixed(0)}%</div>}
                                              </td>
                                            </tr>
                                            {open && (
                                              <tr className="bg-gray-50/50">
                                                <td colSpan={5} className="py-2 px-3">
                                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Contributing URLs</div>
                                                  <table className="w-full text-[11px]">
                                                    <thead><tr className="text-left text-gray-400"><th className="py-1 pr-2 font-medium">URL</th><th className="py-1 pr-2 font-medium text-right">Clicks (cur / prev)</th><th className="py-1 font-medium text-right">Avg position (cur / prev)</th></tr></thead>
                                                    <tbody>
                                                      {pageRows.map((pr, j) => (
                                                        <tr key={j} className="border-t border-gray-100">
                                                          <td className="py-1 pr-2 max-w-[280px] truncate" title={pr.page}><UrlLink url={pr.page} className="text-gray-600" /></td>
                                                          <td className="py-1 pr-2 text-right tabular-nums text-gray-700">{pr.clicks.toLocaleString()} <span className="text-gray-400">/ {pr.clicksCmp.toLocaleString()}</span></td>
                                                          <td className="py-1 text-right tabular-nums text-gray-700">{pr.position > 0 ? pr.position.toFixed(1) : "—"} <span className="text-gray-400">/ {pr.positionCmp > 0 ? pr.positionCmp.toFixed(1) : "—"}</span></td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </td>
                                              </tr>
                                            )}
                                          </Fragment>
                                        );
                                      })}
                                      {rows.length === 0 && (
                                        <tr><td colSpan={5} className="py-6 text-center text-gray-400">No movement to report in this window.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </ChartCard>
                            );
                          };

                          // ── Query position movement table ──────────────────────────────────
                          const QueryPositionMovement = ({ tableId, title, tip, rows, accent }: {
                            tableId: string; title: string; tip: string;
                            rows: (QueryMovementRow & { delta: number })[]; accent: "down" | "up";
                          }) => {
                            const isDown = accent === "down"; // dropping = got WORSE = delta > 0
                            const headerColor = isDown ? "text-red-600" : "text-emerald-600";
                            const deltaColor = isDown ? "text-red-500" : "text-emerald-600";
                            return (
                              <ChartCard title={<span className="flex items-center gap-2"><span className={headerColor}>{isDown ? "▼" : "▲"}</span>{title}</span>} tip={tip}>
                                <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 380, WebkitOverflowScrolling: "touch" }}>
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white z-10">
                                      <tr className="text-left text-gray-400 border-b border-gray-100">
                                        <th className="pb-2 pr-2 font-medium w-6"></th>
                                        <th className="pb-2 pr-2 font-medium">Query (non-brand)</th>
                                        <th className="pb-2 pr-2 font-medium text-right">Current pos</th>
                                        <th className="pb-2 pr-2 font-medium text-right">Previous pos</th>
                                        <th className="pb-2 font-medium text-right">Change</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, i) => {
                                        const id = `${tableId}::${r.query}`;
                                        const open = nbsuExpanded.has(id);
                                        // For position display, negative delta is GOOD (improved). The sign on screen
                                        // mirrors the raw number so the user can read it as "moved from X to Y".
                                        const pageSet = new Set<string>([...r.pages.keys(), ...r.pagesCmp.keys()]);
                                        const pageRows = Array.from(pageSet).map((page) => {
                                          const a = r.pages.get(page);
                                          const b = r.pagesCmp.get(page);
                                          return {
                                            page,
                                            position: a?.position ?? 0,
                                            positionCmp: b?.position ?? 0,
                                            impressions: a?.impressions ?? 0,
                                            impressionsCmp: b?.impressions ?? 0,
                                          };
                                        }).sort((x, y) => y.impressions - x.impressions);
                                        return (
                                          <Fragment key={i}>
                                            <tr className="border-b border-gray-50 hover:bg-gray-50">
                                              <td className="py-2 pr-2 text-center">
                                                <button onClick={() => toggleExpand(id)} className="text-gray-400 hover:text-gray-700">
                                                  {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                              </td>
                                              <td className="py-2 pr-2 max-w-[260px] truncate text-gray-700" title={r.query}>{r.query}</td>
                                              <td className="py-2 pr-2 text-right tabular-nums text-gray-900 font-semibold">{r.position.toFixed(1)}</td>
                                              <td className="py-2 pr-2 text-right tabular-nums text-gray-500">{r.positionCmp.toFixed(1)}</td>
                                              <td className={`py-2 text-right tabular-nums font-bold ${deltaColor}`}>
                                                {sign(r.delta)}{r.delta.toFixed(1)}
                                                <div className="text-[10px] text-gray-400 font-normal">{r.impressions.toLocaleString()} impr.</div>
                                              </td>
                                            </tr>
                                            {open && (
                                              <tr className="bg-gray-50/50">
                                                <td colSpan={5} className="py-2 px-3">
                                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Contributing URLs</div>
                                                  <table className="w-full text-[11px]">
                                                    <thead><tr className="text-left text-gray-400"><th className="py-1 pr-2 font-medium">URL</th><th className="py-1 pr-2 font-medium text-right">Position (cur / prev)</th><th className="py-1 font-medium text-right">Impressions (cur / prev)</th></tr></thead>
                                                    <tbody>
                                                      {pageRows.map((pr, j) => (
                                                        <tr key={j} className="border-t border-gray-100">
                                                          <td className="py-1 pr-2 max-w-[280px] truncate" title={pr.page}><UrlLink url={pr.page} className="text-gray-600" /></td>
                                                          <td className="py-1 pr-2 text-right tabular-nums text-gray-700">{pr.position > 0 ? pr.position.toFixed(1) : "—"} <span className="text-gray-400">/ {pr.positionCmp > 0 ? pr.positionCmp.toFixed(1) : "—"}</span></td>
                                                          <td className="py-1 text-right tabular-nums text-gray-700">{pr.impressions.toLocaleString()} <span className="text-gray-400">/ {pr.impressionsCmp.toLocaleString()}</span></td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </td>
                                              </tr>
                                            )}
                                          </Fragment>
                                        );
                                      })}
                                      {rows.length === 0 && (
                                        <tr><td colSpan={5} className="py-6 text-center text-gray-400">No position movement of ≥0.5 with ≥{posMinImpr} impressions in both periods.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </ChartCard>
                            );
                          };

                          // ── URL query-count movement table ─────────────────────────────────
                          const UrlQueryCountMovement = ({ tableId, title, tip, rows, accent }: {
                            tableId: string; title: string; tip: string;
                            rows: UrlQueryCountRow[]; accent: "down" | "up";
                          }) => {
                            const isDown = accent === "down";
                            const headerColor = isDown ? "text-red-600" : "text-emerald-600";
                            const deltaColor = isDown ? "text-red-500" : "text-emerald-600";
                            return (
                              <ChartCard title={<span className="flex items-center gap-2"><span className={headerColor}>{isDown ? "▼" : "▲"}</span>{title}</span>} tip={tip}>
                                <div className="overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 380, WebkitOverflowScrolling: "touch" }}>
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white z-10">
                                      <tr className="text-left text-gray-400 border-b border-gray-100">
                                        <th className="pb-2 pr-2 font-medium w-6"></th>
                                        <th className="pb-2 pr-2 font-medium">URL</th>
                                        <th className="pb-2 pr-2 font-medium text-right">Current</th>
                                        <th className="pb-2 pr-2 font-medium text-right">Previous</th>
                                        <th className="pb-2 font-medium text-right">Change</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, i) => {
                                        const id = `${tableId}::${r.page}`;
                                        const open = nbsuExpanded.has(id);
                                        return (
                                          <Fragment key={i}>
                                            <tr className="border-b border-gray-50 hover:bg-gray-50">
                                              <td className="py-2 pr-2 text-center">
                                                <button onClick={() => toggleExpand(id)} className="text-gray-400 hover:text-gray-700">
                                                  {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                              </td>
                                              <td className="py-2 pr-2 max-w-[280px] truncate" title={r.page}><UrlLink url={r.page} className="text-gray-700" /></td>
                                              <td className="py-2 pr-2 text-right tabular-nums text-gray-900 font-semibold">{r.count.toLocaleString()}</td>
                                              <td className="py-2 pr-2 text-right tabular-nums text-gray-500">{r.countCmp.toLocaleString()}</td>
                                              <td className={`py-2 text-right tabular-nums font-bold ${deltaColor}`}>
                                                {sign(r.delta)}{r.delta.toLocaleString()}
                                              </td>
                                            </tr>
                                            {open && (
                                              <tr className="bg-gray-50/50">
                                                <td colSpan={5} className="py-2 px-3">
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                      <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-1">Newly ranking queries ({r.wonQueries.length})</div>
                                                      {r.wonQueries.length === 0 ? <div className="text-[11px] text-gray-400">None.</div> : (
                                                        <ul className="text-[11px] text-gray-700 list-disc pl-4 max-h-40 overflow-y-auto">
                                                          {r.wonQueries.map((q, j) => <li key={j}>{q}</li>)}
                                                        </ul>
                                                      )}
                                                    </div>
                                                    <div>
                                                      <div className="text-[10px] uppercase tracking-wider text-red-600 font-semibold mb-1">Lost queries ({r.lostQueries.length})</div>
                                                      {r.lostQueries.length === 0 ? <div className="text-[11px] text-gray-400">None.</div> : (
                                                        <ul className="text-[11px] text-gray-700 list-disc pl-4 max-h-40 overflow-y-auto">
                                                          {r.lostQueries.map((q, j) => <li key={j}>{q}</li>)}
                                                        </ul>
                                                      )}
                                                    </div>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </Fragment>
                                        );
                                      })}
                                      {rows.length === 0 && (
                                        <tr><td colSpan={5} className="py-6 text-center text-gray-400">No change in distinct non-brand query counts.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </ChartCard>
                            );
                          };

                          return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <QueryClickMovement
                                tableId="qclk-down"
                                title="Non-brand queries — biggest click drops"
                                tip="Non-brand queries that lost the most GSC clicks vs the comparison period. Expand a row to see which URLs contributed."
                                rows={clickLosers}
                                accent="down"
                              />
                              <QueryClickMovement
                                tableId="qclk-up"
                                title="Non-brand queries — biggest click gains"
                                tip="Non-brand queries that gained the most GSC clicks vs the comparison period. Expand a row to see which URLs contributed."
                                rows={clickWinners}
                                accent="up"
                              />
                              <QueryPositionMovement
                                tableId="qpos-down"
                                title="Non-brand queries — biggest position drops"
                                tip={`Non-brand queries whose average GSC position got WORSE (number went up) vs the comparison period. Filtered to queries with ≥${posMinImpr} impressions in both periods. Expand to see URL-level position changes.`}
                                rows={posLosers}
                                accent="down"
                              />
                              <QueryPositionMovement
                                tableId="qpos-up"
                                title="Non-brand queries — biggest position gains"
                                tip={`Non-brand queries whose average GSC position IMPROVED (number went down) vs the comparison period. Filtered to queries with ≥${posMinImpr} impressions in both periods. Expand to see URL-level position changes.`}
                                rows={posWinners}
                                accent="up"
                              />
                              <UrlQueryCountMovement
                                tableId="urlq-down"
                                title="URLs — biggest drop in non-brand query count"
                                tip="URLs that rank for fewer distinct non-brand queries than in the comparison period. Expand to see which queries were lost."
                                rows={urlCountLosers}
                                accent="down"
                              />
                              <UrlQueryCountMovement
                                tableId="urlq-up"
                                title="URLs — biggest gain in non-brand query count"
                                tip="URLs that now rank for more distinct non-brand queries than in the comparison period. Expand to see which queries were won."
                                rows={urlCountWinners}
                                accent="up"
                              />
                            </div>
                          );
                        })()}

                        {/* Transparency panel */}
                        <ChartCard
                          title={
                            <button onClick={() => setNbsuShowTransparency((s) => !s)} className="flex items-center gap-2 text-left w-full">
                              <span>{nbsuShowTransparency ? "▼" : "▶"} Data quality & methodology</span>
                              <span className="text-[10px] text-gray-400 font-normal">click totals, fallback share, methodology</span>
                            </button>
                          }
                          tip="Click totals split by brand/non-brand for the period, plus methodology notes. Edit brand terms in the Non-Brand SEO section."
                        >
                          {nbsuShowTransparency && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Brand clicks</div>
                                  <div className="text-lg font-bold text-[#5b4fa8] tabular-nums">{d.totals.brandClicks.toLocaleString()}</div>
                                  <div className="text-[10px] text-gray-400">across all pages this period</div>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Non-brand clicks</div>
                                  <div className="text-lg font-bold text-emerald-600 tabular-nums">{d.totals.nonBrandClicks.toLocaleString()}</div>
                                  <div className="text-[10px] text-gray-400">{(d.totals.siteWideNbRatio * 100).toFixed(1)}% of clicks</div>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Last sync</div>
                                  <div className="text-lg font-bold text-gray-700">{new Date(d.fetchedAt).toLocaleTimeString()}</div>
                                  <div className="text-[10px] text-gray-400">{nbsuSort.sorted.filter((r) => r.usedSiteWideRatio).length} pages on fallback ratio</div>
                                </div>
                              </div>
                              <div className="bg-white border border-gray-100 rounded-xl p-4 text-xs text-gray-600 space-y-2">
                                <div className="font-bold text-gray-700">Methodology</div>
                                <ol className="list-decimal pl-5 space-y-1">
                                  <li>GSC [page, query] pulled for the window — queries classified using the brand-term list from the Non-Brand SEO section.</li>
                                  <li>For each landing page, a <strong>click-weighted</strong> non-brand ratio is computed: NB clicks ÷ (NB clicks + Brand clicks).</li>
                                  <li>GA4 returns <code className="bg-gray-100 px-1 rounded">generate_lead</code> key-event counts from organic sessions, grouped by landing page. Because <code className="bg-gray-100 px-1 rounded">generate_lead</code> fires on the FSP form, every counted session by definition involved <code className="bg-gray-100 px-1 rounded">/free-selling-pack</code>.</li>
                                  <li>Each page's lead count is split by its NB ratio. Pages with no GSC clicks fall back to the site-wide ratio.</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </ChartCard>
                      </>
                    );
                  })()}
                </section>
              </>
            )}

            {/* ── SEO Issues ── */}
            {activeView === "seoIssues" && (
              <>
                <SectionDivider label="SEO ISSUES" />
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 border border-red-100 rounded-xl p-2"><AlertTriangle size={16} className="text-red-600" /></div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-900">SEO issues</h2>
                        <p className="text-xs text-gray-400">GA4 + GSC signals — surface what to fix, optimize, and rescue.</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <div className="max-w-[220px] w-full min-w-[180px]">
                        <Select value={selectedGA4} onChange={setSelectedGA4} options={ga4Properties} placeholder="Select GA4 Property" disabled={ga4Properties.length === 0} />
                      </div>
                      <div className="max-w-[220px] w-full min-w-[180px]">
                        <Select value={selectedGSC} onChange={setSelectedGSC} options={gscProperties} placeholder="Select GSC Property" disabled={gscProperties.length === 0} />
                      </div>
                    </div>
                  </div>
                  <GA4FilterPanel filters={ga4Filters} setFilters={setGa4Filters} channelOptions={channelOptions} />
                  {(seoIssuesLoading || gscLoading) && <Spinner />}
                  {!seoIssuesLoading && !gscLoading && (
                    <>
                    {/* Scorecards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <HoverTooltip tip="Total number of SEO signals flagged across all issue categories — a combined health score for your site."><KpiCard label="Total issues" value={totalSeoIssues.toLocaleString()} sub="across all signals" icon={AlertTriangle} /></HoverTooltip>
                      <HoverTooltip tip="Queries ranking at positions 11–20 — just off page one. Small optimisations here can unlock significant traffic gains."><KpiCard label="Striking distance" value={strikingDistanceQueries.length.toLocaleString()} sub="GSC pos 11–20" icon={TrendingUp} /></HoverTooltip>
                      <HoverTooltip tip="Queries with ≥100 impressions but a CTR below 2% — your titles and meta descriptions aren't compelling enough to earn clicks."><KpiCard label="Low CTR queries" value={lowCtrHighImpressions.length.toLocaleString()} sub="≥100 impr · CTR <2%" icon={MousePointerClick} /></HoverTooltip>
                      <HoverTooltip tip="Pages that appear in Google Search impressions but have never received a click — potentially under-promoted or poorly targeted."><KpiCard label="Orphan-ish pages" value={orphanGscPages.length.toLocaleString()} sub="impressions, no clicks" icon={Eye} /></HoverTooltip>
                      <HoverTooltip tip="Pages with virtually zero GA4 sessions — these may be orphaned from your site navigation or have very poor search visibility."><KpiCard label="No GA4 traffic" value={seoNoTraffic.length.toLocaleString()} sub="pages with ~0 sessions" icon={Users} /></HoverTooltip>
                      <HoverTooltip tip="Pages where '404' appears in the page title — a strong signal of broken or missing content that should be fixed or redirected."><KpiCard label="404 in title" value={seo404Titles.length.toLocaleString()} sub="potential dead pages" icon={X} /></HoverTooltip>
                    </div>

                    {/* Pies */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <ChartCard title="Issue breakdown">
                        <div className="flex gap-4 items-center">
                          <ResponsiveContainer width="45%" height={210}>
                            <PieChart>
                              <Pie data={issueBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={3}>
                                {issueBreakdown.map((d) => <Cell key={d.key} fill={d.color} />)}
                              </Pie>
                              <Tooltip {...chartTooltipStyle} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-1.5">
                            {issueBreakdown.map((d) => (
                              <div key={d.key} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: d.color + "14" }}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                  <span className="text-xs font-medium text-gray-700">{d.name}</span>
                                </div>
                                <span className="text-xs font-bold text-gray-900">{d.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ChartCard>
                      <ChartCard title="Query position health (GSC)">
                        <div className="flex gap-4 items-center">
                          <ResponsiveContainer width="45%" height={210}>
                            <PieChart>
                              <Pie data={queryHealthPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={44} paddingAngle={3}>
                                {queryHealthPie.map((d) => <Cell key={d.key} fill={d.color} />)}
                              </Pie>
                              <Tooltip {...chartTooltipStyle} formatter={(v: number, n: string) => [v.toLocaleString() + " queries", n]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-1.5">
                            {queryHealthPie.map((d) => (
                              <div key={d.key} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: d.color + "14" }}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                  <span className="text-xs font-medium text-gray-700">{d.name}</span>
                                </div>
                                <span className="text-xs font-bold text-gray-900">{d.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ChartCard>
                    </div>

                    {/* GSC opportunity tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <ChartCard title="Striking distance queries (pos 11–20)" tip="Queries ranking just off page one — positions 11 to 20. A small content improvement or link boost could push these onto page one and significantly increase clicks.">
                        <p className="text-[10px] text-gray-400 mb-2">Push these onto page 1 — small ranking gains, big traffic upside.</p>
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <SortableTh label="Query" sortKey="query" sort={strikingSort.sort} onToggle={strikingSort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Pos" sortKey="position" sort={strikingSort.sort} onToggle={strikingSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Impr." sortKey="impressions" sort={strikingSort.sort} onToggle={strikingSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Clicks" sortKey="clicks" sort={strikingSort.sort} onToggle={strikingSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                              </tr>
                            </thead>
                            <tbody>
                              {strikingSort.sorted.map((q, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/40">
                                  <td className="py-1.5 pr-2 max-w-[220px] truncate text-gray-700" title={q.query}>{q.query}</td>
                                  <td className="py-1.5 text-right"><PosBadge pos={q.position} /></td>
                                  <td className="py-1.5 text-right tabular-nums text-gray-500">{q.impressions.toLocaleString()}</td>
                                  <td className="py-1.5 text-right tabular-nums font-semibold text-gray-900">{q.clicks.toLocaleString()}</td>
                                </tr>
                              ))}
                              {strikingSort.sorted.length === 0 && (
                                <tr><td colSpan={4} className="py-3 text-center text-gray-400">No striking-distance queries — connect GSC or widen the date range.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                      <ChartCard title="High impressions, low CTR (rewrite titles & meta)">
                        <p className="text-[10px] text-gray-400 mb-2">Ranking but not getting clicks — improve titles, meta, and rich results.</p>
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <SortableTh label="Query" sortKey="query" sort={lowCtrSort.sort} onToggle={lowCtrSort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Impr." sortKey="impressions" sort={lowCtrSort.sort} onToggle={lowCtrSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="CTR" sortKey="ctr" sort={lowCtrSort.sort} onToggle={lowCtrSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Pos" sortKey="position" sort={lowCtrSort.sort} onToggle={lowCtrSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                              </tr>
                            </thead>
                            <tbody>
                              {lowCtrSort.sorted.map((q, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/40">
                                  <td className="py-1.5 pr-2 max-w-[220px] truncate text-gray-700" title={q.query}>{q.query}</td>
                                  <td className="py-1.5 text-right tabular-nums text-gray-900 font-semibold">{q.impressions.toLocaleString()}</td>
                                  <td className="py-1.5 text-right tabular-nums text-purple-700 font-semibold">{(q.ctr * 100).toFixed(2)}%</td>
                                  <td className="py-1.5 text-right"><PosBadge pos={q.position} /></td>
                                </tr>
                              ))}
                              {lowCtrSort.sorted.length === 0 && (
                                <tr><td colSpan={4} className="py-3 text-center text-gray-400">Nothing here — your CTR looks healthy.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                    </div>

                    {/* Orphan pages (GSC) */}
                    <ChartCard title="Pages with impressions but almost no clicks (GSC)">
                      <p className="text-[10px] text-gray-400 mb-2">Visible in search but invisible to users — likely a ranking, snippet, or intent mismatch.</p>
                      <ScrollTable>
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 z-10 bg-white shadow-sm">
                            <tr className="border-b border-gray-100">
                              <SortableTh label="Page" sortKey="page" sort={orphanPagesSort.sort} onToggle={orphanPagesSort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                              <SortableTh label="Impr." sortKey="impressions" sort={orphanPagesSort.sort} onToggle={orphanPagesSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                              <SortableTh label="Clicks" sortKey="clicks" sort={orphanPagesSort.sort} onToggle={orphanPagesSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                              <SortableTh label="CTR" sortKey="ctr" sort={orphanPagesSort.sort} onToggle={orphanPagesSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                              <SortableTh label="Avg Pos" sortKey="position" sort={orphanPagesSort.sort} onToggle={orphanPagesSort.toggle} className="text-right py-2 text-[10px] text-gray-400 font-semibold" />
                            </tr>
                          </thead>
                          <tbody>
                            {orphanPagesSort.sorted.map((p, i) => {
                              return (
                                <tr key={i} className="border-b border-gray-50 hover:bg-sky-50/40">
                                  <td className="py-1.5 pr-2 max-w-[300px] truncate text-gray-700" title={p.page}><UrlLink url={p.page} /></td>
                                  <td className="py-1.5 text-right tabular-nums text-gray-900 font-semibold">{p.impressions.toLocaleString()}</td>
                                  <td className="py-1.5 text-right tabular-nums text-gray-500">{p.clicks.toLocaleString()}</td>
                                  <td className="py-1.5 text-right tabular-nums text-gray-500">{(p.ctr * 100).toFixed(2)}%</td>
                                  <td className="py-1.5 text-right"><PosBadge pos={p.position} /></td>
                                </tr>
                              );
                            })}
                            {orphanPagesSort.sorted.length === 0 && (
                              <tr><td colSpan={5} className="py-3 text-center text-gray-400">No orphan-style pages found in the selected window.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </ScrollTable>
                    </ChartCard>

                    {/* GA4 issue tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <ChartCard title="Pages with almost no sessions">
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <SortableTh label="Page" sortKey="page" sort={seoNoTrafficSort.sort} onToggle={seoNoTrafficSort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Sessions" sortKey="sessions" sort={seoNoTrafficSort.sort} onToggle={seoNoTrafficSort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                              </tr>
                            </thead>
                            <tbody>
                              {seoNoTrafficSort.sorted.map((r, i) => (
                                <tr key={i} className="border-b border-gray-50 cursor-pointer hover:bg-red-50/40" onClick={() => { setPageDrillPath(r.page); setGscLinkQuery(null); setGscLinkPage(null); }}>
                                  <td className="py-2 pr-2 max-w-[180px] truncate" title={r.page}><UrlLink url={r.page} /></td>
                                  <td className="py-2 font-semibold">{r.sessions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                      <ChartCard title="Low engagement (≥10 sessions, &lt;35% engagement)" tip="Pages with meaningful traffic but poor engagement rates — users are landing but not interacting. Check content relevance, page speed, and whether the content matches search intent.">
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <SortableTh label="Page" sortKey="page" sort={seoLowEngSort.sort} onToggle={seoLowEngSort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Eng." sortKey="engagementRate" sort={seoLowEngSort.sort} onToggle={seoLowEngSort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Sess." sortKey="sessions" sort={seoLowEngSort.sort} onToggle={seoLowEngSort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                              </tr>
                            </thead>
                            <tbody>
                              {seoLowEngSort.sorted.map((r, i) => (
                                <tr key={i} className="border-b border-gray-50 cursor-pointer hover:bg-red-50/40" onClick={() => { setPageDrillPath(r.page); setGscLinkQuery(null); setGscLinkPage(null); }}>
                                  <td className="py-2 pr-2 max-w-[140px] truncate" title={r.page}><UrlLink url={r.page} /></td>
                                  <td className="py-2">{(r.engagementRate * 100).toFixed(1)}%</td>
                                  <td className="py-2">{r.sessions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                      <ChartCard title="404 in page title" tip="Pages where the HTML title tag contains '404' — these are broken pages that are still receiving traffic. Set up proper redirects or restore the content.">
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <SortableTh label="Title" sortKey="title" sort={seo404Sort.sort} onToggle={seo404Sort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Page" sortKey="page" sort={seo404Sort.sort} onToggle={seo404Sort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                                <SortableTh label="Sess." sortKey="sessions" sort={seo404Sort.sort} onToggle={seo404Sort.toggle} className="text-left py-2 text-[10px] text-gray-400 font-semibold" />
                              </tr>
                            </thead>
                            <tbody>
                              {seo404Sort.sorted.map((r, i) => (
                                <tr key={i} className="border-b border-gray-50 cursor-pointer hover:bg-red-50/40" onClick={() => { setPageDrillPath(r.page); setGscLinkQuery(null); setGscLinkPage(null); }}>
                                  <td className="py-2 pr-2 max-w-[120px] truncate" title={r.title}>{r.title}</td>
                                  <td className="py-2 pr-2 max-w-[120px] truncate" title={r.page}><UrlLink url={r.page} /></td>
                                  <td className="py-2">{r.sessions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                    </div>
                    </>
                  )}
                </section>
              </>
            )}


            {/* ── Performance Analysis ── */}
            {/* ── Performance Analysis ── */}
            {activeView === "performance" && (
              <>
                <SectionDivider label="PERFORMANCE ANALYSIS" />
                <section className="space-y-6">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { const sec = document.querySelector<HTMLElement>("[data-perf-section]"); if (sec) printElementAsPdf(sec, "Performance Analysis"); }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-purple-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-purple-300 bg-white transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download as PDF
                    </button>
                  </div>
                  <div data-perf-section="1" className="space-y-6">
                  {!selectedGSC && (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                      <p className="text-gray-400 text-sm">Select a GSC property to view performance data.</p>
                    </div>
                  )}
                  {selectedGSC && gscLoading && <Spinner />}
                  {selectedGSC && !gscLoading && gscPages.length === 0 && (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                      <p className="text-gray-400 text-sm">No page data available for the selected date range.</p>
                    </div>
                  )}
                  {selectedGSC && !gscLoading && gscPages.length > 0 && (
                    <>
                      {/* ── Element 1: URL performance ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ChartCard title="URL Performance by Clicks" tip="Scatter plot of your pages by GSC impressions vs clicks. Pages in the top-left (high impressions, low clicks) are priority CTR optimisation targets.">
                          <div className="flex gap-4 items-center">
                            <ResponsiveContainer width="45%" height={210}>
                              <PieChart>
                                <Pie
                                  data={perfUrlPieData}
                                  dataKey="value" nameKey="name"
                                  cx="50%" cy="50%"
                                  outerRadius={80} innerRadius={44}
                                  paddingAngle={3}
                                  onClick={(d: any) => setPerfPieFilter((c) => c === d.key ? null : d.key)}
                                  style={{ cursor: "pointer" }}
                                >
                                  {perfUrlPieData.map((d) => (
                                    <Cell
                                      key={d.key}
                                      fill={PERF_COLORS_MAP[d.key]}
                                      opacity={perfPieFilter && perfPieFilter !== d.key ? 0.3 : 1}
                                      stroke={perfPieFilter === d.key ? "#374151" : "none"}
                                      strokeWidth={perfPieFilter === d.key ? 2 : 0}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip {...chartTooltipStyle} formatter={(v: number, n: string) => [v.toLocaleString() + " URLs", n]} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                              {perfUrlPieData.map((d) => (
                                <button key={d.key}
                                  onClick={() => setPerfPieFilter((c) => c === d.key ? null : d.key)}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${perfPieFilter === d.key ? "border-gray-400 shadow-sm" : "border-transparent hover:border-gray-200"}`}
                                  style={{ backgroundColor: PERF_COLORS_MAP[d.key] + "18" }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PERF_COLORS_MAP[d.key] }} />
                                    <span className="text-xs font-medium text-gray-700">{URL_PERF_LABELS[d.key]}</span>
                                  </div>
                                  <span className="text-xs font-bold text-gray-900">{d.value.toLocaleString()} URLs</span>
                                </button>
                              ))}
                              {perfPieFilter && (
                                <button onClick={() => setPerfPieFilter(null)} className="w-full text-xs text-purple-600 hover:text-purple-800 pt-1 text-center">✕ Clear filter</button>
                              )}
                            </div>
                          </div>
                        </ChartCard>

                        <ChartCard title={`URLs — ${perfPieFilter ? URL_PERF_LABELS[perfPieFilter] : "All"} (${perfFilteredPages.length.toLocaleString()})`}>
                          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 230, WebkitOverflowScrolling: "touch" }}>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr className="text-left text-gray-400 border-b border-gray-100">
                                  <SortableTh label="URL" sortKey="page" sort={perfPagesSort.sort} onToggle={perfPagesSort.toggle} className="pb-2 pr-2 font-medium" />
                                  <SortableTh label="Clicks" sortKey="clicks" sort={perfPagesSort.sort} onToggle={perfPagesSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="Impr." sortKey="impressions" sort={perfPagesSort.sort} onToggle={perfPagesSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="Tier" sortKey="tier" sort={perfPagesSort.sort} onToggle={perfPagesSort.toggle} className="pb-2 font-medium" />
                                </tr>
                              </thead>
                              <tbody>
                                {perfPagesSort.sorted.map((p, i) => {
                                  const tier = getUrlPerf(p.clicks);
                                  return (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                      <td className="py-1.5 pr-2" style={{ maxWidth: 0, width: "52%" }}>
                                        <UrlLink url={p.page} className="text-gray-700 max-w-full" />
                                      </td>
                                      <td className="py-1.5 pr-2 text-right text-gray-900 font-semibold tabular-nums">{p.clicks.toLocaleString()}</td>
                                      <td className="py-1.5 pr-2 text-right text-gray-500 tabular-nums">{p.impressions.toLocaleString()}</td>
                                      <td className="py-1.5">
                                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${PERF_BG[tier]}`}>{tier}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </ChartCard>
                      </div>

                      {/* ── Element 2: Query performance ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ChartCard title="Query Performance by Position" tip="Your queries plotted by average position vs CTR. Queries ranking in positions 1–3 with low CTR suggest your title or snippet needs work — you're visible but not compelling.">
                          <div className="flex gap-4 items-center">
                            <ResponsiveContainer width="45%" height={210}>
                              <PieChart>
                                <Pie
                                  data={perfQueryPieData}
                                  dataKey="value" nameKey="name"
                                  cx="50%" cy="50%"
                                  outerRadius={80} innerRadius={44}
                                  paddingAngle={3}
                                  onClick={(d: any) => setPerfSubFilter((c) => c === d.key ? null : d.key)}
                                  style={{ cursor: "pointer" }}
                                >
                                  {perfQueryPieData.map((d) => (
                                    <Cell
                                      key={d.key}
                                      fill={PERF_COLORS_MAP[d.key]}
                                      opacity={perfSubFilter && perfSubFilter !== d.key ? 0.3 : 1}
                                      stroke={perfSubFilter === d.key ? "#374151" : "none"}
                                      strokeWidth={perfSubFilter === d.key ? 2 : 0}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip {...chartTooltipStyle} formatter={(v: number, n: string) => [v.toLocaleString() + " queries", n]} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                              {perfQueryPieData.map((d) => (
                                <button key={d.key}
                                  onClick={() => setPerfSubFilter((c) => c === d.key ? null : d.key)}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${perfSubFilter === d.key ? "border-gray-400 shadow-sm" : "border-transparent hover:border-gray-200"}`}
                                  style={{ backgroundColor: PERF_COLORS_MAP[d.key] + "18" }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PERF_COLORS_MAP[d.key] }} />
                                    <span className="text-xs font-medium text-gray-700">{PERF_LABELS[d.key]}</span>
                                  </div>
                                  <span className="text-xs font-bold text-gray-900">{d.value.toLocaleString()} queries</span>
                                </button>
                              ))}
                              {perfSubFilter && (
                                <button onClick={() => setPerfSubFilter(null)} className="w-full text-xs text-purple-600 hover:text-purple-800 pt-1 text-center">✕ Clear filter</button>
                              )}
                            </div>
                          </div>
                        </ChartCard>

                        <ChartCard title={`Queries — ${perfSubFilter ? PERF_LABELS[perfSubFilter] : "All"} (${perfFilteredQueries.length.toLocaleString()})`}>
                          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 230, WebkitOverflowScrolling: "touch" }}>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr className="text-left text-gray-400 border-b border-gray-100">
                                  <SortableTh label="Query" sortKey="query" sort={perfQueriesSort.sort} onToggle={perfQueriesSort.toggle} className="pb-2 pr-2 font-medium" />
                                  <SortableTh label="Clicks" sortKey="clicks" sort={perfQueriesSort.sort} onToggle={perfQueriesSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="Impr." sortKey="impressions" sort={perfQueriesSort.sort} onToggle={perfQueriesSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="Position" sortKey="position" sort={perfQueriesSort.sort} onToggle={perfQueriesSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  <SortableTh label="Tier" sortKey="tier" sort={perfQueriesSort.sort} onToggle={perfQueriesSort.toggle} className="pb-2 font-medium" />
                                </tr>
                              </thead>
                              <tbody>
                                {perfQueriesSort.sorted.map((q, i) => {
                                  const tier = getPerf(q.position);
                                  return (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                      <td className="py-1.5 pr-2" style={{ maxWidth: 0, width: "52%" }}>
                                        <span className="block truncate text-gray-700" title={q.query}>{q.query}</span>
                                      </td>
                                      <td className="py-1.5 pr-2 text-right text-gray-900 font-semibold tabular-nums">{q.clicks.toLocaleString()}</td>
                                      <td className="py-1.5 pr-2 text-right text-gray-500 tabular-nums">{q.impressions.toLocaleString()}</td>
                                      <td className="py-1.5 pr-2 text-right text-gray-700 tabular-nums">{q.position.toFixed(1)}</td>
                                      <td className="py-1.5">
                                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${PERF_BG[tier]}`}>{tier}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </ChartCard>
                      </div>

                      {/* ── Element 3: Query Intent (informational / transactional / commercial / navigational) ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ChartCard title="Query Intent Mix" tip="Distribution of your queries by search intent. Informational queries are top-of-funnel research; commercial queries are users comparing options; transactional queries are ready to buy/book/signup; navigational queries are users looking for a specific brand or page. A healthy mix depends on your business — eCommerce sites want more transactional and commercial; publishers want more informational.">
                          <div className="flex gap-4 items-center">
                            <ResponsiveContainer width="45%" height={210}>
                              <PieChart>
                                <Pie
                                  data={perfIntentPieData}
                                  dataKey="value" nameKey="name"
                                  cx="50%" cy="50%"
                                  outerRadius={80} innerRadius={44}
                                  paddingAngle={3}
                                  onClick={(d: any) => setPerfIntentFilter((c) => c === d.key ? null : d.key)}
                                  style={{ cursor: "pointer" }}
                                >
                                  {perfIntentPieData.map((d) => (
                                    <Cell
                                      key={d.key}
                                      fill={INTENT_COLORS[d.key as QueryIntent]}
                                      opacity={perfIntentFilter && perfIntentFilter !== d.key ? 0.3 : 1}
                                      stroke={perfIntentFilter === d.key ? "#374151" : "none"}
                                      strokeWidth={perfIntentFilter === d.key ? 2 : 0}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip {...chartTooltipStyle} formatter={(v: number, n: string) => [v.toLocaleString() + " queries", n]} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                              {perfIntentPieData.map((d) => (
                                <button key={d.key}
                                  onClick={() => setPerfIntentFilter((c) => c === d.key ? null : d.key as QueryIntent)}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left ${perfIntentFilter === d.key ? "border-gray-400 shadow-sm" : "border-transparent hover:border-gray-200"}`}
                                  style={{ backgroundColor: INTENT_COLORS[d.key as QueryIntent] + "18" }}
                                  title={INTENT_DESCRIPTIONS[d.key as QueryIntent]}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: INTENT_COLORS[d.key as QueryIntent] }} />
                                    <span className="text-xs font-medium text-gray-700">{INTENT_LABELS[d.key as QueryIntent]}</span>
                                  </div>
                                  <span className="text-xs font-bold text-gray-900">{d.value.toLocaleString()} queries</span>
                                </button>
                              ))}
                              {perfIntentFilter && (
                                <button onClick={() => setPerfIntentFilter(null)} className="w-full text-xs text-purple-600 hover:text-purple-800 pt-1 text-center">✕ Clear filter</button>
                              )}
                            </div>
                          </div>
                        </ChartCard>

                        <ChartCard title="Intent Breakdown" tip="Aggregated metrics by intent type. Compare clicks, impressions, CTR and average position across intent categories to see where your visibility is strongest.">
                          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 230, WebkitOverflowScrolling: "touch" }}>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr className="text-left text-gray-400 border-b border-gray-100">
                                  <th className="pb-2 pr-2 font-medium">Intent</th>
                                  <th className="pb-2 pr-2 font-medium text-right">Queries</th>
                                  <th className="pb-2 pr-2 font-medium text-right">Clicks</th>
                                  <th className="pb-2 pr-2 font-medium text-right">Impr.</th>
                                  <th className="pb-2 pr-2 font-medium text-right">CTR</th>
                                  <th className="pb-2 font-medium text-right">Avg Pos.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {perfIntentTableData.map((r) => (
                                  <tr key={r.key} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="py-1.5 pr-2">
                                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${INTENT_BG[r.key]}`}>{r.label}</span>
                                    </td>
                                    <td className="py-1.5 pr-2 text-right text-gray-900 font-semibold tabular-nums">{r.queries.toLocaleString()}</td>
                                    <td className="py-1.5 pr-2 text-right text-gray-900 font-semibold tabular-nums">{r.clicks.toLocaleString()}</td>
                                    <td className="py-1.5 pr-2 text-right text-gray-500 tabular-nums">{r.impressions.toLocaleString()}</td>
                                    <td className="py-1.5 pr-2 text-right text-gray-700 tabular-nums">{(r.ctr * 100).toFixed(2)}%</td>
                                    <td className="py-1.5 text-right text-gray-700 tabular-nums">{r.avgPosition ? r.avgPosition.toFixed(1) : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </ChartCard>
                      </div>

                      {/* ── Section: Query Counting (queries per URL + comparison) ── */}
                      <SectionDivider label="QUERY COUNTING" />
                      <ChartCard
                        title={`Queries per URL${hasGscCmp ? " — with comparison" : ""}`}
                        tip="Count of distinct queries each URL ranks for in the current period, compared with the previous period. A falling count usually means the page is losing topical coverage in Google; a rising count means it's earning visibility for new queries. Pair this with clicks/impressions to spot pages quietly shedding query coverage."
                      >
                        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                          <input
                            type="text"
                            placeholder="Filter URLs…"
                            value={queryCountSearch}
                            onChange={(e) => setQueryCountSearch(e.target.value)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 w-64"
                          />
                          <div className="text-xs text-gray-400">
                            {queryCountSort.sorted.length.toLocaleString()} URL{queryCountSort.sorted.length === 1 ? "" : "s"}
                            {!hasGscCmp && <span className="ml-2 text-amber-600">· Enable a comparison range to see deltas</span>}
                          </div>
                        </div>
                        <div className="overflow-y-auto overscroll-contain rounded-xl border border-gray-50" style={{ maxHeight: 460, WebkitOverflowScrolling: "touch" }}>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white z-10">
                              <tr className="text-left text-gray-400 border-b border-gray-100">
                                <SortableTh label="URL" sortKey="page" sort={queryCountSort.sort} onToggle={queryCountSort.toggle} className="pb-2 pr-2 font-medium" />
                                <SortableTh label="Queries" sortKey="queries" sort={queryCountSort.sort} onToggle={queryCountSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                {hasGscCmp && (
                                  <>
                                    <SortableTh label="Prev" sortKey="queriesCmp" sort={queryCountSort.sort} onToggle={queryCountSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                    <SortableTh label="Δ" sortKey="delta" sort={queryCountSort.sort} onToggle={queryCountSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                    <SortableTh label="% Chg" sortKey="pct" sort={queryCountSort.sort} onToggle={queryCountSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                  </>
                                )}
                                <SortableTh label="Clicks" sortKey="clicks" sort={queryCountSort.sort} onToggle={queryCountSort.toggle} className="pb-2 pr-2 font-medium text-right" />
                                <SortableTh label="Impr." sortKey="impressions" sort={queryCountSort.sort} onToggle={queryCountSort.toggle} className="pb-2 font-medium text-right" />
                              </tr>
                            </thead>
                            <tbody>
                              {queryCountSort.sorted.map((r, i) => {
                                return (
                                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="py-1.5 pr-2" style={{ maxWidth: 0, width: "44%" }}>
                                      <UrlLink url={r.page} className="text-gray-700 max-w-full" />
                                    </td>
                                    <td className="py-1.5 pr-2 text-right text-gray-900 font-semibold tabular-nums">{r.queries.toLocaleString()}</td>
                                    {hasGscCmp && (
                                      <>
                                        <td className="py-1.5 pr-2 text-right text-gray-500 tabular-nums">{r.queriesCmp.toLocaleString()}</td>
                                        <td className={`py-1.5 pr-2 text-right font-semibold tabular-nums ${r.delta > 0 ? "text-emerald-600" : r.delta < 0 ? "text-red-500" : "text-gray-400"}`}>
                                          {r.delta > 0 ? `+${r.delta.toLocaleString()}` : r.delta.toLocaleString()}
                                        </td>
                                        <td className={`py-1.5 pr-2 text-right font-bold text-[10px] tabular-nums ${r.queriesCmp === 0 ? "text-gray-400" : r.pct > 0 ? "text-emerald-600" : r.pct < 0 ? "text-red-500" : "text-gray-400"}`}>
                                          {r.queriesCmp === 0 && r.queries > 0 ? "NEW" : r.queriesCmp === 0 ? "—" : `${r.pct >= 0 ? "+" : ""}${r.pct.toFixed(1)}%`}
                                        </td>
                                      </>
                                    )}
                                    <td className="py-1.5 pr-2 text-right text-gray-700 tabular-nums">{r.clicks.toLocaleString()}</td>
                                    <td className="py-1.5 text-right text-gray-500 tabular-nums">{r.impressions.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                              {queryCountSort.sorted.length === 0 && (
                                <tr><td colSpan={hasGscCmp ? 7 : 4} className="py-6 text-center text-gray-400">No URLs match this filter.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </ChartCard>
                    </>
                  )}
                  </div>{/* end data-perf-section */}
                </section>
              </>
            )}

            {activeView === "intl" && (
              <IntlView
                gscCountryRows={gscCountryRows}
                gscCountryRowsCmp={gscCountryRowsCmp}
                ga4CountryRows={ga4CountryRows}
                ga4CountryRowsCmp={ga4CountryRowsCmp}
                gscLoading={gscLoading}
                ga4Loading={ga4Loading}
                hasCmp={hasCmp}
                hasGscCmp={hasGscCmp}
              />
            )}

            {activeView === "dailySnapshot" && (() => {
              const VCC_DAILY = { nbSignUps: 170, nbClicks: 1700, nbTop3: 17000, aioSessions: 40, aioSignUps: 3 };
              const AV_DAILY  = { nbSignUps: 100, nbClicks: 1700, nbTop3: 17000, aioSessions: 40, aioSignUps: 3 };
              const getDailyTargets = (abbr: string) => abbr === "VCC" ? VCC_DAILY : AV_DAILY;
              const periodDays = (s: SnapResult) => Math.max(1, Math.round((new Date(s.period.end).getTime() - new Date(s.period.start).getTime()) / 86400000) + 1);
              const hasCmp = (s: SnapResult) => !!s.cmpPeriod.start;
              const chg = (a: number, b: number) => b > 0 ? ` (${a >= b ? "+" : ""}${((a - b) / b * 100).toFixed(1)}% vs prev)` : "";
              const tgtPct = (val: number, t: number) => `${Math.round((val / t) * 100)}% of target`;

              const buildSlack = () => {
                const lines: string[] = [`📊 *Daily Snapshot — ${snapVCC?.period.start ?? snapAV?.period.start ?? ""}*`, ``];
                const addProp = (s: SnapResult | null, abbr: string) => {
                  if (!s) return;
                  const D = getDailyTargets(abbr);
                  const days = periodDays(s);
                  const T = { nbSignUps: D.nbSignUps * days, nbClicks: D.nbClicks * days, nbTop3: D.nbTop3, aioSessions: D.aioSessions * days, aioSignUps: D.aioSignUps * days };
                  const hc = hasCmp(s);
                  const dayLabel = days === 1 ? "/day" : `/${days}d`;
                  lines.push(`*${abbr} NB SEO DATA*`);
                  lines.push(`• NB Sign Ups: *${s.nbLeads.toLocaleString()}* — ${tgtPct(s.nbLeads, T.nbSignUps)} (target ${T.nbSignUps}${dayLabel})${hc ? chg(s.nbLeads, s.nbLeadsCmp) : ""}`);
                  lines.push(`• NB Clicks: *${s.nbClicks.toLocaleString()}* — ${tgtPct(s.nbClicks, T.nbClicks)} (target ${T.nbClicks.toLocaleString()}${dayLabel})${hc ? chg(s.nbClicks, s.nbClicksCmp) : ""}`);
                  lines.push(`• NB Keywords Top 3: *${s.nbTop3.toLocaleString()}* — ${tgtPct(s.nbTop3, T.nbTop3)} (target ${T.nbTop3.toLocaleString()})${hc ? chg(s.nbTop3, s.nbTop3Cmp) : ""}`);
                  lines.push(`• Organic Sessions: *${s.orgSessions.toLocaleString()}*${hc ? chg(s.orgSessions, s.orgSessionsCmp) : ""}`);
                  lines.push(``);
                  lines.push(`*${abbr} AIO DATA* (Q4 target ×10)`);
                  lines.push(`• AIO Sessions: *${s.aioSessions.toLocaleString()}* — ${tgtPct(s.aioSessions, T.aioSessions)} (target ${T.aioSessions}${dayLabel} · 1,000/mth)`);
                  lines.push(`• AIO Sign Ups: *${s.aioSignUps.toLocaleString()}* — ${tgtPct(s.aioSignUps, T.aioSignUps)} (target ${T.aioSignUps}${dayLabel} · 100/mth)`);
                  lines.push(``);
                };
                addProp(snapVCC, "VCC");
                addProp(snapAV, "AV");
                return lines.join("\n").trim();
              };

              const PropBlock = ({ s, abbr }: { s: SnapResult; abbr: string }) => {
                const D = getDailyTargets(abbr);
                const days = periodDays(s);
                const T = { nbSignUps: D.nbSignUps * days, nbClicks: D.nbClicks * days, nbTop3: D.nbTop3, aioSessions: D.aioSessions * days, aioSignUps: D.aioSignUps * days };
                const dayLabel = days === 1 ? "/day" : `/${days}d`;
                const hc = hasCmp(s);
                const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : (a > 0 ? 100 : 0));
                const Delta = ({ a, b }: { a: number; b: number }) => {
                  if (!hc || !b) return null;
                  const p = pct(a, b); const up = p >= 0;
                  return <span className={`text-[11px] font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>{up ? "+" : ""}{p.toFixed(1)}%</span>;
                };
                const TargetCard = ({ label, value, target, cmpValue, sublabel }: { label: string; value: number; target: number; cmpValue?: number; sublabel?: string }) => {
                  const p = Math.round((value / target) * 100);
                  const bar = Math.min(p, 100);
                  const barCol = p >= 100 ? "bg-emerald-500" : p >= 70 ? "bg-yellow-400" : "bg-red-400";
                  return (
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">{label}</div>
                      <div className="flex items-end justify-between gap-2 mb-2">
                        <span className="text-2xl font-bold text-emerald-600 tabular-nums">{value.toLocaleString()}</span>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold text-blue-900">{p}% <span className="text-[10px] font-semibold text-blue-700">out of target</span></span>
                          {hc && cmpValue != null && (
                            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${value >= cmpValue ? "text-emerald-600" : "text-red-500"}`}>
                              {value >= cmpValue ? "+" : ""}{(((value - cmpValue) / Math.max(cmpValue, 1)) * 100).toFixed(1)}% <span className="text-[9px] font-semibold text-gray-400">vs prev</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${barCol}`} style={{ width: `${bar}%` }} />
                      </div>
                      <div className="text-[10px] text-gray-400">target {target.toLocaleString()}{sublabel ? ` ${sublabel}` : ""}{hc && cmpValue != null ? ` · prev ${cmpValue.toLocaleString()}` : ""}</div>
                    </div>
                  );
                };
                const AioCard = ({ label, value, target, sublabel }: { label: string; value: number; target: number; sublabel: string }) => {
                  const p = Math.round((value / target) * 100);
                  const bar = Math.min(p, 100);
                  const barCol = p >= 100 ? "bg-emerald-500" : p >= 70 ? "bg-yellow-400" : "bg-red-400";
                  return (
                    <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-sky-400 font-semibold mb-1">{label}</div>
                      <div className="flex items-end justify-between gap-2 mb-2">
                        <span className="text-2xl font-bold text-sky-700 tabular-nums">{value.toLocaleString()}</span>
                        <span className="text-sm font-bold text-blue-900">{p}% <span className="text-[10px] font-semibold text-blue-700">out of target</span></span>
                      </div>
                      <div className="w-full bg-sky-100 rounded-full h-1.5 mb-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${barCol}`} style={{ width: `${bar}%` }} />
                      </div>
                      <div className="text-[10px] text-sky-400">target {target} {sublabel}</div>
                    </div>
                  );
                };
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700 bg-yellow-100 border border-yellow-200 rounded-lg px-2.5 py-1">{s.propLabel}</span>
                      {hc && <span className="text-[11px] text-gray-400">{formatDisplayDate(s.period.start)} – {formatDisplayDate(s.period.end)} vs {formatDisplayDate(s.cmpPeriod.start)} – {formatDisplayDate(s.cmpPeriod.end)}</span>}
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{abbr} — Non-Brand SEO</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Organic Sessions</div>
                        <div className="flex items-end justify-between gap-2">
                          <span className="text-2xl font-bold text-gray-900 tabular-nums">{s.orgSessions.toLocaleString()}</span>
                          <Delta a={s.orgSessions} b={s.orgSessionsCmp} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">{hc ? `${s.orgSessionsCmp.toLocaleString()} previously` : "organic"}</div>
                      </div>
                      <TargetCard label="NB Clicks" value={s.nbClicks} target={T.nbClicks} cmpValue={s.nbClicksCmp} sublabel={dayLabel} />
                      <TargetCard label="NB Sign Ups" value={s.nbLeads} target={T.nbSignUps} cmpValue={s.nbLeadsCmp} sublabel={dayLabel} />
                      <TargetCard label="NB Keywords Top 3" value={s.nbTop3} target={T.nbTop3} cmpValue={s.nbTop3Cmp} />
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{abbr} — AIO (AI-Influenced Organic) · Q4 target ×10</div>
                    <div className="grid grid-cols-2 gap-3">
                      <AioCard label="AIO Sessions" value={s.aioSessions} target={T.aioSessions} sublabel={`${dayLabel} · 1,000/mth`} />
                      <AioCard label="AIO Sign Ups" value={s.aioSignUps} target={T.aioSignUps} sublabel={`${dayLabel} · 100/mth`} />
                    </div>
                  </div>
                );
              };

              return (
                <>
                  <SectionDivider label="DAILY SNAPSHOT" />
                  <section className="space-y-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-100 border border-yellow-200 rounded-xl p-2"><Activity size={16} className="text-yellow-700" /></div>
                        <div>
                          <h2 className="text-sm font-bold text-gray-900">Daily Snapshot</h2>
                          <p className="text-xs text-gray-400">VCC + Arcavindi · NB SEO & AIO · copy for Slack</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(snapVCC || snapAV) && <SlackCopyButton buildMessage={buildSlack} />}
                        <button
                          onClick={() => void fetchDailySnapshot()}
                          disabled={snapVCCLoading || snapAVLoading}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-400 text-yellow-900 hover:bg-yellow-500 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <RefreshCw size={12} className={(snapVCCLoading || snapAVLoading) ? "animate-spin" : ""} />
                          {(snapVCCLoading || snapAVLoading) ? "Loading…" : "Refresh"}
                        </button>
                      </div>
                    </div>

                    {/* Date filter */}
                    <div className="bg-yellow-50/60 border border-yellow-100 rounded-2xl p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 font-medium">Date Range</label>
                          <Select
                            value={nbsuFilters.dateRange}
                            onChange={(v) => setNbsuFilters((f) => ({ ...f, dateRange: v as NbsuDateFilter["dateRange"] }))}
                            options={[
                              { value: "yesterday", label: "Yesterday" },
                              { value: "7",         label: "Last 7 days" },
                              { value: "28",        label: "Last 28 days" },
                              { value: "lastWeek",  label: "Last week" },
                              { value: "lastMonth", label: "Last month" },
                              { value: "30",        label: "Last 30 days" },
                            ]}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 font-medium">Compare To</label>
                          <Select
                            value={nbsuFilters.comparison}
                            onChange={(v) => setNbsuFilters((f) => ({ ...f, comparison: v as NbsuDateFilter["comparison"] }))}
                            options={[
                              { value: "prev",     label: "Previous period" },
                              { value: "prevYear", label: "Same period last year" },
                              { value: "none",     label: "No comparison" },
                            ]}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 font-medium">VCC GSC Property</label>
                          <Select value={selectedGSC} onChange={setSelectedGSC} options={gscProperties} placeholder="Select VCC GSC" disabled={gscProperties.length === 0} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 font-medium">AV GSC Property</label>
                          <Select value={avGscId} onChange={setAvGscId} options={gscProperties} placeholder="Select AV GSC" disabled={gscProperties.length === 0} />
                        </div>
                      </div>
                    </div>

                    {!snapVCCLoading && !snapAVLoading && !snapVCC && !snapAV && (
                      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-sm text-gray-400">
                        {(selectedGSC && avGscId) ? "Click Refresh to load data." : "Select both GSC properties to continue."}
                      </div>
                    )}

                    {(snapVCC || snapAV || snapVCCLoading || snapAVLoading) && (
                      <div className="space-y-8">
                        {snapVCCLoading && !snapVCC && (
                          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-400">
                            <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-yellow-400 rounded-full animate-spin mb-2" />
                            <p>Loading Vintage Cash Cow…</p>
                          </div>
                        )}
                        {snapVCC && <PropBlock s={snapVCC} abbr="VCC" />}
                        {(snapVCC || !snapVCCLoading) && (snapAV || snapAVLoading) && <div className="border-t border-gray-100" />}
                        {snapAVLoading && !snapAV && (
                          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-400">
                            <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-yellow-400 rounded-full animate-spin mb-2" />
                            <p>Loading Arcavindi…</p>
                          </div>
                        )}
                        {snapAV && <PropBlock s={snapAV} abbr="AV" />}
                        {(snapVCC || snapAV) && <SlackPreview buildMessage={buildSlack} />}
                      </div>
                    )}
                  </section>
                </>
              );
            })()}
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-6 border-t border-gray-100 mt-8">
        <p className="text-xs text-gray-300 text-center">Vintage Cash Cow · SEO & Analytics Dashboard · GA4 · Search Console · AI Channels</p>
      </footer>
    </div>
    </UrlBaseContext.Provider>
  );
}

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "28", label: "Last 28 days" },
  { value: "90", label: "Last 90 days" },
];
const DATE_RANGES_WITH_CUSTOM = [...DATE_RANGES, { value: "custom", label: "Custom range" }];

const LS_GOOGLE_TOKEN = "vcc_google_access_token";
const LS_GOOGLE_TOKEN_EXP = "vcc_google_token_expires_at";
const LS_SELECTED_GA4 = "vcc_selected_ga4";
const LS_SELECTED_GSC = "vcc_selected_gsc";
const LS_ACTIVE_VIEW = "vcc_active_view";

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

type ActiveView = "ga4" | "gsc" | "blend" | "intl" | "opportunities" | "conversions" | "seoIssues" | "performance";
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

type Ga4DateWin = { startDate: string; endDate: string };

function ga4DateWindows(f: GA4Filters): { current: Ga4DateWin; comparison: Ga4DateWin | null } {
  let current: Ga4DateWin;
  if (f.dateRange === "custom" && f.customStart && f.customEnd) {
    current = { startDate: f.customStart, endDate: f.customEnd };
  } else {
    const d = Math.max(1, parseInt(f.dateRange, 10) || 28);
    current = { startDate: `${d - 1}daysAgo`, endDate: "today" };
  }
  if (f.comparison === "none") return { current, comparison: null };
  if (f.dateRange === "custom" && f.customStart && f.customEnd) {
    if (f.customCompareStart && f.customCompareEnd) {
      return { current, comparison: { startDate: f.customCompareStart, endDate: f.customCompareEnd } };
    }
    return { current, comparison: comparisonWindowBefore(f.customStart, f.customEnd) };
  }
  const days = Math.max(1, parseInt(f.dateRange, 10) || 28);
  const cmp = getComparisonRange(days, f.comparison as "prevPeriod" | "prevYear");
  return { current, comparison: { startDate: cmp.startDate, endDate: cmp.endDate } };
}

function gscDateWindows(f: GSCFilters): { startDate: string; endDate: string; comparison: { startDate: string; endDate: string } | null } {
  const today = toISODate(new Date());
  let startDate: string;
  let endDate: string;
  if (f.dateRange === "custom" && f.customStart && f.customEnd) {
    startDate = f.customStart;
    endDate = f.customEnd;
  } else {
    const d = Math.max(1, parseInt(f.dateRange, 10) || 28);
    startDate = nDaysAgo(d - 1);
    endDate = today;
  }
  if (f.comparison === "none") return { startDate, endDate, comparison: null };
  if (f.dateRange === "custom" && f.customStart && f.customEnd) {
    if (f.customCompareStart && f.customCompareEnd) {
      return { startDate, endDate, comparison: { startDate: f.customCompareStart, endDate: f.customCompareEnd } };
    }
    return { startDate, endDate, comparison: comparisonWindowBefore(f.customStart, f.customEnd) };
  }
  const days = Math.max(1, parseInt(f.dateRange, 10) || 28);
  const cmp = getComparisonRange(days, f.comparison as "prevPeriod" | "prevYear");
  return { startDate, endDate, comparison: { startDate: cmp.startDate, endDate: cmp.endDate } };
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

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

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-1 text-xs text-purple-700 font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-purple-900 transition-colors ml-0.5"><X size={10} /></button>
    </span>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

/** Scrollable table body area (~10 table rows visible). */
function ScrollTable({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`max-h-[17.5rem] overflow-x-auto overflow-y-auto rounded-xl border border-gray-50 ${className}`}>
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
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full text-left">
        <SlidersHorizontal size={14} className="text-purple-500" />
        Filters & Controls
        <ChevronDown size={13} className={`ml-auto text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

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
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full text-left">
        <Filter size={14} className="text-purple-500" />
        Filters & Controls
        <ChevronDown size={13} className={`ml-auto text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

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
                <ChartCard title="Top 10 Countries by GSC Clicks">
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
                <ChartCard title="Top 10 Countries by GA4 Users">
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

export default function App() {
  const [accessToken, setAccessToken]   = useState("");
  const [isLoggingIn, setIsLoggingIn]   = useState(false);
  const [googleReady, setGoogleReady]   = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [activeView, setActiveView]     = useState<ActiveView>(() => (localStorage.getItem(LS_ACTIVE_VIEW) as ActiveView) ?? "ga4");
  const [perfPieFilter, setPerfPieFilter] = useState<"high"|"med"|"low"|null>(null);
  const [perfSubFilter, setPerfSubFilter] = useState<string|null>(null);
  const [perfPageSort, setPerfPageSort] = useState<{ col: "url"|"clicks"|"impressions"|"position"|"tier"; dir: "asc"|"desc" }>({ col: "clicks", dir: "desc" });
  const [perfQuerySort, setPerfQuerySort] = useState<{ col: "query"|"clicks"|"impressions"|"position"|"tier"; dir: "asc"|"desc" }>({ col: "clicks", dir: "desc" });

  const [ga4Properties, setGa4Properties] = useState<{ value: string; label: string }[]>([]);
  const [selectedGA4, setSelectedGA4]     = useState(() => localStorage.getItem(LS_SELECTED_GA4) ?? "");
  const [gscProperties, setGscProperties] = useState<{ value: string; label: string }[]>([]);
  const [selectedGSC, setSelectedGSC]     = useState(() => localStorage.getItem(LS_SELECTED_GSC) ?? "");

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
  const [oppSort, setOppSort] = useState<{ col: OppSortCol; dir: SortDir }>({ col: "impressions", dir: "desc" });
  const [gscDevices, setGscDevices]       = useState<DeviceRow[]>([]);
  const [gscCountries, setGscCountries]   = useState<string[]>([]);
  const [gscCountryRows, setGscCountryRows]     = useState<CountryRow[]>([]);
  const [gscCountryRowsCmp, setGscCountryRowsCmp] = useState<CountryRow[]>([]);
  const [ga4CountryRows, setGa4CountryRows]     = useState<Ga4CountryRow[]>([]);
  const [ga4CountryRowsCmp, setGa4CountryRowsCmp] = useState<Ga4CountryRow[]>([]);
  const [gscLoading, setGscLoading]       = useState(false);

  const [ga4Filters, setGa4Filters] = useState<GA4Filters>({
    dateRange: "28", metrics: ["users"], channelFilter: [], deviceFilter: [], comparison: "none",
  });
  const [gscFilters, setGscFilters] = useState<GSCFilters>({
    dateRange: "28", dimension: "query", queryFilter: "", queryFilterMode: "contains",
    countryFilter: [], deviceFilter: [],
    minClicks: "", minImpressions: "", minCtr: "", minPosition: "", maxPosition: "",
    sortBy: "clicks", sortDir: "desc", comparison: "none",
  });

  // Debounced versions of filters that actually trigger API fetches
  const [ga4FetchFilters, setGa4FetchFilters] = useState<GA4Filters>({
    dateRange: "28", metrics: ["users"], channelFilter: [], deviceFilter: [], comparison: "none",
  });
  const [gscFetchFilters, setGscFetchFilters] = useState<GSCFilters>({
    dateRange: "28", dimension: "query", queryFilter: "", queryFilterMode: "contains",
    countryFilter: [], deviceFilter: [],
    minClicks: "", minImpressions: "", minCtr: "", minPosition: "", maxPosition: "",
    sortBy: "clicks", sortDir: "desc", comparison: "none",
  });

  /** When set, GA4 + GSC requests are scoped to this page path (contains match). */
  const [pageDrillPath, setPageDrillPath] = useState("");
  const [ga4TrendMetricFocus, setGa4TrendMetricFocus] = useState<MetricKey | null>(null);
  const [convEventName, setConvEventName] = useState("purchase");
  const [convDaily, setConvDaily] = useState<{ date: string; count: number }[]>([]);
  const [convDailyCmp, setConvDailyCmp] = useState<{ date: string; count: number }[]>([]);
  const [seoNoTraffic, setSeoNoTraffic] = useState<{ page: string; sessions: number }[]>([]);
  const [seoLowEngagement, setSeoLowEngagement] = useState<{ page: string; engagementRate: number; sessions: number }[]>([]);
  const [seo404Titles, setSeo404Titles] = useState<{ title: string; page: string; sessions: number }[]>([]);
  const [gscLinkQuery, setGscLinkQuery] = useState<string | null>(null);
  const [gscLinkPage, setGscLinkPage] = useState<string | null>(null);
  const [gscCrossPages, setGscCrossPages] = useState<QueryRow[]>([]);
  const [gscCrossQueries, setGscCrossQueries] = useState<QueryRow[]>([]);
  const [seoIssuesLoading, setSeoIssuesLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(false);

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
    setGa4Properties(props);
    setGscProperties((gscData.siteEntry as SiteEntry[])?.map((s) => ({ value: s.siteUrl, label: s.siteUrl })) ?? []);
  }, []);

  useEffect(() => { if (accessToken) loadProperties(accessToken); }, [accessToken, loadProperties]);

  // ── Persist selected properties across refreshes ─────────────────────────
  useEffect(() => { if (selectedGA4) localStorage.setItem(LS_SELECTED_GA4, selectedGA4); else localStorage.removeItem(LS_SELECTED_GA4); }, [selectedGA4]);
  useEffect(() => { if (selectedGSC) localStorage.setItem(LS_SELECTED_GSC, selectedGSC); else localStorage.removeItem(LS_SELECTED_GSC); }, [selectedGSC]);
  useEffect(() => { localStorage.setItem(LS_ACTIVE_VIEW, activeView); }, [activeView]);

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
        : Math.max(1, parseInt(f.dateRange, 10) || 28);

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
              : (seriesMaps[i].get(date)?.[metric] ?? 0);
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
        : Math.max(1, parseInt(gf.dateRange, 10) || 28);
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
      ...(cmpRange ? [
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: ["date"], rowLimit: cmpDaySpan, ...singleFilter }) }),
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: [queryDim], rowLimit: 500, ...singleFilter }) }),
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: ["query"], rowLimit: 25000, ...singleFilter }) }),
        fetch(base, { method: "POST", headers, body: JSON.stringify({ startDate: cmpRange.startDate, endDate: cmpRange.endDate, dimensions: ["country"], rowLimit: 100, ...singleFilter }) }),
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
    const cmpDailyGsc   = cmpRange ? jsons[idx++] : null;
    const cmpQueryData  = cmpRange ? jsons[idx++] : null;
    const cmpOpportunityQueryData = cmpRange ? jsons[idx++] : null;
    const cmpCountryData = cmpRange ? jsons[idx++] : null;
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
    setGscPages((pageData?.rows as GSCApiRow[])?.map((r) => ({ page: r.keys[0], clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position })) ?? []);

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
    setConvLoading(false);
  }, [selectedGA4, accessToken, ga4FetchFilters]);

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

  useEffect(() => { if (activeView === "conversions" && selectedGA4 && accessToken) void fetchConversions(); }, [activeView, selectedGA4, accessToken, fetchConversions]);

  useEffect(() => {
    if (activeView !== "conversions" || !selectedGA4 || !accessToken) return;
    const t = setTimeout(() => void fetchConversions(), 450);
    return () => clearTimeout(t);
  }, [convEventName]); // eslint-disable-line react-hooks/exhaustive-deps -- conversions mount/refetch is handled by the effect above

  useEffect(() => { if (activeView === "seoIssues" && selectedGA4 && accessToken) void fetchSeoIssues(); }, [activeView, selectedGA4, accessToken, fetchSeoIssues]);

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

  function handlePerfPageSort(col: "url"|"clicks"|"impressions"|"position"|"tier") {
    setPerfPageSort((s) => (s.col !== col ? { col, dir: "desc" } : { col, dir: s.dir === "desc" ? "asc" : "desc" }));
  }

  function handlePerfQuerySort(col: "query"|"clicks"|"impressions"|"position"|"tier") {
    setPerfQuerySort((s) => (s.col !== col ? { col, dir: "desc" } : { col, dir: s.dir === "desc" ? "asc" : "desc" }));
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
      const cmpRow = cmpMap.get(i);
      if (cmpRow) {
        ALL_METRIC_KEYS.forEach((m) => {
          row[`${m}_cmp`] = m === "bounceRate" ? +(cmpRow.bounceRate * 100).toFixed(1) : cmpRow[m];
        });
      }
      return row;
    });
  }, [ga4Daily, ga4DailyCmp, ga4Series, isSingleSeries]);

  const chartGSCData = useMemo(() => {
    if (gscSeriesKeys.length > 0) return gscSeries;
    const cmpMap = new Map(gscDailyCmp.map((r, i) => [i, r]));
    return gscDaily.map((r, i) => {
      const row: SeriesRow = { date: r.date, clicks: r.clicks, impressions: r.impressions, ctr: +(r.ctr * 100).toFixed(2) };
      const cmpRow = cmpMap.get(i);
      if (cmpRow) {
        row["clicks_cmp"] = cmpRow.clicks;
        row["impressions_cmp"] = cmpRow.impressions;
        row["ctr_cmp"] = +(cmpRow.ctr * 100).toFixed(2);
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
      ga4Users:    ga4Map.get(date)?.users    ?? null,
      ga4Sessions: ga4Map.get(date)?.sessions ?? null,
      gscClicks:   gscMap.get(date)?.clicks   ?? null,
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

  const perfFilteredPages = useMemo(() => {
    const rows = perfPieFilter ? gscPages.filter((p) => getUrlPerf(p.clicks) === perfPieFilter) : gscPages;

    return [...rows].sort((a, b) => {
      const aTier = getUrlPerf(a.clicks);
      const bTier = getUrlPerf(b.clicks);

      const comparison = (() => {
        switch (perfPageSort.col) {
          case "url":
            return a.page.localeCompare(b.page);
          case "clicks":
            return a.clicks - b.clicks;
          case "impressions":
            return a.impressions - b.impressions;
          case "position":
            return a.position - b.position;
          case "tier":
            return aTier.localeCompare(bTier);
          default:
            return 0;
        }
      })();

      return perfPageSort.dir === "asc" ? comparison : -comparison;
    });
  }, [gscPages, perfPieFilter, perfPageSort]
  );

  // Query performance (bucketed by position)
  const perfQueryPieData = useMemo(() => {
    const counts = { high: 0, med: 0, low: 0, opportunity: 0 };
    gscOpportunityQueries.forEach((q) => { counts[getQueryPerf(q.position)]++; });
    return (["high","med","low","opportunity"] as const)
      .map((k) => ({ name: QUERY_PERF_LABELS[k], value: counts[k], key: k }))
      .filter((d) => d.value > 0);
  }, [gscOpportunityQueries]);

  const perfFilteredQueries = useMemo(() => {
    const rows = perfSubFilter ? gscOpportunityQueries.filter((q) => getQueryPerf(q.position) === perfSubFilter as "high"|"med"|"low"|"opportunity") : gscOpportunityQueries;

    return [...rows].sort((a, b) => {
      const aTier = getPerf(a.position);
      const bTier = getPerf(b.position);

      const comparison = (() => {
        switch (perfQuerySort.col) {
          case "query":
            return a.query.localeCompare(b.query);
          case "clicks":
            return a.clicks - b.clicks;
          case "impressions":
            return a.impressions - b.impressions;
          case "position":
            return a.position - b.position;
          case "tier":
            return aTier.localeCompare(bTier);
          default:
            return 0;
        }
      })();

      return perfQuerySort.dir === "asc" ? comparison : -comparison;
    });
  }, [gscOpportunityQueries, perfSubFilter, perfQuerySort]
  );

  const isoDateStr = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const ga4BannerHint = useMemo(() => {
    if (ga4Filters.comparison === "none") return undefined;
    if (ga4FetchFilters.dateRange !== "custom" || !ga4FetchFilters.customStart || !ga4FetchFilters.customEnd) return undefined;
    const w = ga4DateWindows(ga4FetchFilters);
    if (!w.comparison || !isoDateStr(w.current.startDate) || !isoDateStr(w.current.endDate)) return undefined;
    if (!isoDateStr(w.comparison.startDate) || !isoDateStr(w.comparison.endDate)) return undefined;
    const fmt = (a: string, b: string) => `${formatDisplayDate(a)} – ${formatDisplayDate(b)}`;
    return `${fmt(w.current.startDate, w.current.endDate)} vs ${fmt(w.comparison.startDate, w.comparison.endDate)}`;
  }, [ga4Filters.comparison, ga4FetchFilters]);

  const gscBannerHint = useMemo(() => {
    if (gscFilters.comparison === "none") return undefined;
    if (gscFetchFilters.dateRange !== "custom" || !gscFetchFilters.customStart || !gscFetchFilters.customEnd) return undefined;
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
    { key: "conversions", label: "Conversions", icon: ShoppingCart },
    { key: "seoIssues", label: "SEO Issues", icon: AlertTriangle },
    { key: "performance", label: "Performance", icon: BarChart2 },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-700 rounded-xl p-2">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">SEO/AIO Dashboard</h1>
              <p className="text-xs text-purple-500 mt-0.5">GA4 · Search Console · AI Channels</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <>
                {lastUpdated && <span className="text-xs text-gray-400 hidden sm:block">{lastUpdated.toLocaleTimeString()}</span>}
                <button onClick={handleRefresh} disabled={refreshing || ga4Loading || gscLoading || convLoading || seoIssuesLoading}
                  className="p-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-purple-700 hover:border-purple-300 disabled:opacity-40 transition-all">
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                </button>
                <button type="button" onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition-colors">
                  <LogOut size={12} /> Log out
                </button>
                <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-200">
                  <Activity size={12} /> Connected
                </div>
              </>
            )}
            {!isLoggedIn && (
              <button onClick={handleLogin} disabled={!googleReady || isLoggingIn}
                className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm">
                <LogIn size={14} />
                {isLoggingIn ? "Connecting…" : "Login with Google"}
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
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-5">
              <Globe size={28} className="text-purple-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">SEO/AIO Dashboard</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              Sign in with Google to access GA4 analytics, Search Console, and AI traffic channels — all in one place.
            </p>
            <button onClick={handleLogin} disabled={!googleReady || isLoggingIn}
              className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm">
              <LogIn size={16} />
              {isLoggingIn ? "Connecting…" : "Login with Google"}
            </button>
          </div>
        )}

        {isLoggedIn && (
          <>
            {/* ── View Switcher ── */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit flex-wrap max-w-full">
              {VIEWS.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveView(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeView === key ? "bg-purple-700 text-white shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
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
                    <ComparisonBanner days={parseInt(ga4FetchFilters.dateRange, 10) || 28} mode={ga4Filters.comparison} rangeHint={ga4BannerHint} />
                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <KpiCard label="Active Users"  value={ga4TotalUsers.toLocaleString()}    sub={ga4Filters.dateRange === "custom" ? "custom" : `${ga4Filters.dateRange}d`} icon={Users}       cmpValue={hasCmp ? ga4CmpUsers    : undefined} cmpLabel={ga4CmpLabel} onClick={() => setGa4TrendMetricFocus((c) => (c === "users" ? null : "users"))} active={ga4TrendMetricFocus === "users"} />
                      <KpiCard label="Sessions"      value={ga4TotalSessions.toLocaleString()} sub={ga4Filters.dateRange === "custom" ? "custom" : `${ga4Filters.dateRange}d`} icon={Activity}    cmpValue={hasCmp ? ga4CmpSessions : undefined} cmpLabel={ga4CmpLabel} onClick={() => setGa4TrendMetricFocus((c) => (c === "sessions" ? null : "sessions"))} active={ga4TrendMetricFocus === "sessions"} />
                      <KpiCard label="Pageviews"     value={ga4TotalPV.toLocaleString()}        sub={ga4Filters.dateRange === "custom" ? "custom" : `${ga4Filters.dateRange}d`} icon={Eye}          cmpValue={hasCmp ? ga4CmpPV       : undefined} cmpLabel={ga4CmpLabel} onClick={() => setGa4TrendMetricFocus((c) => (c === "pageviews" ? null : "pageviews"))} active={ga4TrendMetricFocus === "pageviews"} />
                      <KpiCard label="Avg Bounce"    value={`${ga4AvgBounce}%`}                 icon={TrendingUp}                                    cmpValue={hasCmp ? ga4CmpBounce   : undefined} cmpLabel={ga4CmpLabel} onClick={() => setGa4TrendMetricFocus((c) => (c === "bounceRate" ? null : "bounceRate"))} active={ga4TrendMetricFocus === "bounceRate"} />
                    </div>
                    {ga4TrendMetricFocus && (
                      <p className="text-xs text-purple-600">Trend chart shows <strong>{metricLabel[ga4TrendMetricFocus]}</strong> only. Click the same KPI again to show all selected metrics.</p>
                    )}

                    {/* Metric chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <ChartCard title={isSingleSeries ? `${ga4ChartMetrics.map((m) => metricLabel[m]).join(", ")} over time${ga4Filters.comparison !== "none" ? ` — ${ga4Filters.comparison === "prevPeriod" ? "vs Prev Period" : "vs Prev Year"}` : ""}` : `${ga4Filters.deviceFilter.length > 1 ? "Devices" : "Channels"} — ${ga4ChartMetrics.map((m) => metricLabel[m]).join(", ")}`} className="lg:col-span-2">
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
                                  <Line key={m} type="monotone" dataKey={m} name={metricLabel[m]} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />,
                                  ga4Filters.comparison !== "none" && ga4DailyCmp.length > 0
                                    ? <Line key={`${m}_cmp`} type="monotone" dataKey={`${m}_cmp`} name={`${metricLabel[m]} (cmp)`} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 2 }} />
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
                        <ChartCard title="Top Channels">
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
                      <ChartCard title="Top Landing Pages">
                        <div className="mb-3">
                          <TextInput value={landingPageFilter} onChange={setLandingPageFilter} placeholder="Filter by page path…" className="max-w-xs" />
                        </div>
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <th className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-4 text-[10px]">Page</th>
                                <th className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-4 text-[10px]">Users</th>
                                <th className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide pr-4 text-[10px]">Sessions</th>
                                <th className="pb-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Bounce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLandingPages.map((p, i) => {
                                const c = hasCmp ? ga4LandingPagesCmp.find((x) => x.page === p.page) : null;
                                const uDelta = c ? ((p.users - c.users) / Math.abs(c.users || 1)) * 100 : null;
                                const sDelta = c ? ((p.sessions - c.sessions) / Math.abs(c.sessions || 1)) * 100 : null;
                                return (
                                  <tr
                                    key={i}
                                    className="border-b border-gray-50 last:border-0 hover:bg-purple-50/40 transition-colors cursor-pointer"
                                    onClick={() => { setPageDrillPath(p.page); setGscLinkQuery(null); setGscLinkPage(null); }}
                                  >
                                    <td className="py-2 pr-4 text-gray-700 font-medium max-w-[200px] truncate" title={p.page}>{p.page}</td>
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
                      <ChartCard title="Sessions by AI Source">
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

                      <ChartCard title={`AI Share of Traffic${hasCmp ? ` — vs ${ga4CmpLabel}` : ""}`}>
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
                                <th className="pb-2 text-left text-gray-400 font-semibold pr-3 uppercase tracking-wide text-[10px]">Source</th>
                                <th className="pb-2 text-left text-gray-400 font-semibold pr-3 uppercase tracking-wide text-[10px]">Sessions</th>
                                {hasCmp && <th className="pb-2 text-left text-gray-400 font-semibold pr-3 uppercase tracking-wide text-[10px]">Prev</th>}
                                {hasCmp && <th className="pb-2 text-left text-gray-400 font-semibold pr-3 uppercase tracking-wide text-[10px]">Chg</th>}
                                <th className="pb-2 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px]">Users</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ga4AiSources.map((s, i) => {
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
                      <ComparisonBanner days={parseInt(gscFetchFilters.dateRange, 10) || 28} mode={gscFilters.comparison} rangeHint={gscBannerHint} />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <KpiCard label="Total Clicks"  value={gscTotalClicks.toLocaleString()}      sub={gscFilters.dateRange === "custom" ? "custom" : `${gscFilters.dateRange}d`} icon={MousePointerClick} cmpValue={hasGscCmp ? gscCmpClicks      : undefined} cmpLabel={gscCmpLabel} />
                        <KpiCard label="Impressions"   value={gscTotalImpressions.toLocaleString()} sub={gscFilters.dateRange === "custom" ? "custom" : `${gscFilters.dateRange}d`} icon={Eye}               cmpValue={hasGscCmp ? gscCmpImpressions : undefined} cmpLabel={gscCmpLabel} />
                        <KpiCard label="Avg CTR"       value={`${gscAvgCTR}%`}                      icon={TrendingUp}                                          cmpValue={hasGscCmp ? gscCmpCTR         : undefined} cmpLabel={gscCmpLabel} />
                        <KpiCard label="Avg Position"  value={gscAvgPosition}                       icon={ArrowUpRight}                                        cmpValue={hasGscCmp ? gscCmpPosition    : undefined} cmpLabel={gscCmpLabel} />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ChartCard title={`Daily Clicks${gscSeriesKeys.length > 1 ? " by " + (gscFilters.countryFilter.length > 1 ? "Country" : "Device") : ""}${gscFilters.comparison !== "none" && gscSeriesKeys.length === 0 ? ` — ${gscFilters.comparison === "prevPeriod" ? "vs Prev Period" : "vs Prev Year"}` : ""}`}>
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
                            <ChartCard title="Clicks by Device">
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

                          <ChartCard title="Daily CTR (%)">
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
                                      <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Page</th>
                                      <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Clicks</th>
                                      <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Impr.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {gscCrossPages.map((row, i) => (
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
                                      <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Query</th>
                                      <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Clicks</th>
                                      <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Impr.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {gscCrossQueries.map((row, i) => (
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
                        <KpiCard label="GA4 Users"    value={ga4TotalUsers.toLocaleString()}      sub="GA4" icon={Users}            cmpValue={hasCmp    ? ga4CmpUsers    : undefined} cmpLabel={ga4CmpLabel} />
                        <KpiCard label="GA4 Sessions" value={ga4TotalSessions.toLocaleString()}    sub="GA4" icon={Activity}         cmpValue={hasCmp    ? ga4CmpSessions : undefined} cmpLabel={ga4CmpLabel} />
                        <KpiCard label="GSC Clicks"   value={gscTotalClicks.toLocaleString()}      sub="GSC" icon={MousePointerClick} cmpValue={hasGscCmp ? gscCmpClicks   : undefined} cmpLabel={gscCmpLabel} />
                        <KpiCard label="GSC Impr."    value={gscTotalImpressions.toLocaleString()} sub="GSC" icon={Eye}               cmpValue={hasGscCmp ? gscCmpImpressions : undefined} cmpLabel={gscCmpLabel} />
                      </div>

                      <ChartCard title="GA4 Users · GA4 Sessions · GSC Clicks — Blended Timeline">
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
                        <ChartCard title="Top GA4 Channels">
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

                        <ChartCard title="Top GSC Queries">
                          <ScrollTable>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                <tr className="border-b border-gray-100">
                                  <th className="pb-2 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px] pr-3">Query</th>
                                  <th className="pb-2 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px] pr-3">Clicks</th>
                                  <th className="pb-2 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px]">Position</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gscQueries.slice(0, 5).map((q, i) => (
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
                      <ComparisonBanner days={parseInt(gscFetchFilters.dateRange, 10) || 28} mode={gscFilters.comparison} rangeHint={gscBannerHint} />
                      {gscOpportunityRows.length > 0 ? (
                        <ChartCard title={`Low clicks, high impressions${hasGscCmp ? ` — vs ${gscCmpLabel}` : ""}`}>
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

                  {!gscLoading && selectedGSC && gscOpportunityQueries.length === 0 && (
                    <p className="text-sm text-gray-400 py-4">No query data for this property / filter combination.</p>
                  )}
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
                    <div className="min-w-[200px]">
                      <label className="block text-xs text-gray-500 mb-1 font-medium">Event name</label>
                      <TextInput value={convEventName} onChange={setConvEventName} placeholder="e.g. purchase, generate_lead" />
                    </div>
                    <button type="button" onClick={() => void fetchConversions()} className="px-4 py-2 rounded-xl bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">Update</button>
                  </div>
                  {convLoading && convDaily.length === 0 && <Spinner />}
                  {convDaily.length > 0 && (
                    <div className={`space-y-4 ${convLoading ? "opacity-60" : ""}`}>
                      <ComparisonBanner days={parseInt(ga4FetchFilters.dateRange, 10) || 28} mode={ga4Filters.comparison} rangeHint={ga4BannerHint} />
                      <ChartCard title={`Event: ${convEventName.trim() || "purchase"}`}>
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
                      <ChartCard title="Daily counts (table)">
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Date</th>
                                <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Count</th>
                                {convDailyCmp.length > 0 && <th className="text-left py-2 text-gray-400 font-semibold text-[10px]">Compare</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {convDaily.map((r, i) => (
                                <tr key={r.date} className="border-b border-gray-50">
                                  <td className="py-2">{r.date}</td>
                                  <td className="py-2 font-semibold">{r.count.toLocaleString()}</td>
                                  {convDailyCmp.length > 0 && <td className="py-2 text-gray-500">{(convDailyCmp[i]?.count ?? 0).toLocaleString()}</td>}
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
                        <p className="text-xs text-gray-400">GA4 signals: low traffic, low engagement, &amp; pages whose title contains &quot;404&quot;.</p>
                      </div>
                    </div>
                    <div className="max-w-[220px] w-full min-w-[180px]">
                      <Select value={selectedGA4} onChange={setSelectedGA4} options={ga4Properties} placeholder="Select GA4 Property" disabled={ga4Properties.length === 0} />
                    </div>
                  </div>
                  <GA4FilterPanel filters={ga4Filters} setFilters={setGa4Filters} channelOptions={channelOptions} />
                  {seoIssuesLoading && <Spinner />}
                  {!seoIssuesLoading && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <ChartCard title="Pages with almost no sessions">
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100"><th className="text-left py-2 text-[10px] text-gray-400 font-semibold">Page</th><th className="text-left py-2 text-[10px] text-gray-400 font-semibold">Sessions</th></tr>
                            </thead>
                            <tbody>
                              {seoNoTraffic.map((r, i) => (
                                <tr key={i} className="border-b border-gray-50 cursor-pointer hover:bg-red-50/40" onClick={() => { setPageDrillPath(r.page); setGscLinkQuery(null); setGscLinkPage(null); }}>
                                  <td className="py-2 pr-2 max-w-[180px] truncate" title={r.page}>{r.page}</td>
                                  <td className="py-2 font-semibold">{r.sessions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                      <ChartCard title="Low engagement (≥10 sessions, &lt;35% engagement)">
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-2 text-[10px] text-gray-400 font-semibold">Page</th>
                                <th className="text-left py-2 text-[10px] text-gray-400 font-semibold">Eng.</th>
                                <th className="text-left py-2 text-[10px] text-gray-400 font-semibold">Sess.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {seoLowEngagement.map((r, i) => (
                                <tr key={i} className="border-b border-gray-50 cursor-pointer hover:bg-red-50/40" onClick={() => { setPageDrillPath(r.page); setGscLinkQuery(null); setGscLinkPage(null); }}>
                                  <td className="py-2 pr-2 max-w-[140px] truncate" title={r.page}>{r.page}</td>
                                  <td className="py-2">{(r.engagementRate * 100).toFixed(1)}%</td>
                                  <td className="py-2">{r.sessions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                      <ChartCard title="404 in page title">
                        <ScrollTable>
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-2 text-[10px] text-gray-400 font-semibold">Title</th>
                                <th className="text-left py-2 text-[10px] text-gray-400 font-semibold">Page</th>
                                <th className="text-left py-2 text-[10px] text-gray-400 font-semibold">Sess.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {seo404Titles.map((r, i) => (
                                <tr key={i} className="border-b border-gray-50 cursor-pointer hover:bg-red-50/40" onClick={() => { setPageDrillPath(r.page); setGscLinkQuery(null); setGscLinkPage(null); }}>
                                  <td className="py-2 pr-2 max-w-[120px] truncate" title={r.title}>{r.title}</td>
                                  <td className="py-2 pr-2 max-w-[120px] truncate" title={r.page}>{r.page}</td>
                                  <td className="py-2">{r.sessions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollTable>
                      </ChartCard>
                    </div>
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
                        <ChartCard title="URL Performance by Clicks">
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
                          <div className="overflow-y-auto" style={{ maxHeight: 230 }}>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr className="text-left text-gray-400 border-b border-gray-100">
                                  <th onClick={() => handlePerfPageSort("url")} className="pb-2 pr-2 font-medium cursor-pointer">URL {perfPageSort.col === "url" ? (perfPageSort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                  <th onClick={() => handlePerfPageSort("clicks")} className="pb-2 pr-2 font-medium text-right cursor-pointer">Clicks {perfPageSort.col === "clicks" ? (perfPageSort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                  <th onClick={() => handlePerfPageSort("impressions")} className="pb-2 pr-2 font-medium text-right cursor-pointer">Impr. {perfPageSort.col === "impressions" ? (perfPageSort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                  <th onClick={() => handlePerfPageSort("position")} className="pb-2 pr-2 font-medium text-right cursor-pointer">Position {perfPageSort.col === "position" ? (perfPageSort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                  <th onClick={() => handlePerfPageSort("tier")} className="pb-2 font-medium cursor-pointer">Tier {perfPageSort.col === "tier" ? (perfPageSort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {perfFilteredPages.map((p, i) => {
                                  const tier = getUrlPerf(p.clicks);
                                  let displayUrl = p.page;
                                  try { displayUrl = new URL(p.page).pathname || "/"; } catch {}
                                  return (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                      <td className="py-1.5 pr-2" style={{ maxWidth: 0, width: "52%" }}>
                                        <span className="block truncate text-gray-700" title={p.page}>{displayUrl}</span>
                                      </td>
                                      <td className="py-1.5 pr-2 text-right text-gray-900 font-semibold tabular-nums">{p.clicks.toLocaleString()}</td>
                                      <td className="py-1.5 pr-2 text-right text-gray-500 tabular-nums">{p.impressions.toLocaleString()}</td>
                                      <td className="py-1.5 pr-2 text-right text-gray-700 tabular-nums">{p.position.toFixed(1)}</td>
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
                        <ChartCard title="Query Performance by Position">
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
                          <div className="overflow-y-auto" style={{ maxHeight: 230 }}>
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white z-10">
                                <tr className="text-left text-gray-400 border-b border-gray-100">
                                  <th onClick={() => handlePerfQuerySort("query")} className="pb-2 pr-2 font-medium cursor-pointer">Query {perfQuerySort.col === "query" ? (perfQuerySort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                  <th onClick={() => handlePerfQuerySort("clicks")} className="pb-2 pr-2 font-medium text-right cursor-pointer">Clicks {perfQuerySort.col === "clicks" ? (perfQuerySort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                  <th onClick={() => handlePerfQuerySort("impressions")} className="pb-2 pr-2 font-medium text-right cursor-pointer">Impr. {perfQuerySort.col === "impressions" ? (perfQuerySort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                  <th onClick={() => handlePerfQuerySort("position")} className="pb-2 pr-2 font-medium text-right cursor-pointer">Position {perfQuerySort.col === "position" ? (perfQuerySort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                  <th onClick={() => handlePerfQuerySort("tier")} className="pb-2 font-medium cursor-pointer">Tier {perfQuerySort.col === "tier" ? (perfQuerySort.dir === "asc" ? "↑" : "↓") : ""}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {perfFilteredQueries.map((q, i) => {
                                  const tier = getPerf(q.position);
                                  return (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                      <td className="py-1.5 pr-2" style={{ maxWidth: 0, width: "52%" }}>
                                        <span className="block truncate text-gray-700" title={q.query}>{q.query}</span>
                                      </td>
                                      <td className="py-1.5 pr-2 text-right text-gray-900 font-semibold tabular-nums">{q.clicks.toLocaleString()}</td>
                                      <td className="py-1.5 pr-2 text-right text-gray-500 tabular-nums">{q.impressions.toLocaleString()}</td>
                                      <td className="py-1.5 pr-2 text-right text-gray-700 tabular-nums">{q.position.toFixed(1)}</td>
                                      <td className="py-1.5 pr-2 text-right text-gray-700 tabular-nums">{p.position.toFixed(1)}</td>
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
                    </>
                  )}
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
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-6 border-t border-gray-100 mt-8">
        <p className="text-xs text-gray-300 text-center">SEO/AIO Dashboard · GA4 · Search Console · AI Channels</p>
      </footer>
    </div>
  );
}

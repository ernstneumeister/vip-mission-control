import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Target, Users, Clock, TrendingUp, CheckSquare, Square, Megaphone, Mail, Camera, Zap, Radio, Presentation } from '../components/Icons';

interface WebinarStats {
  total: number;
  goal: number;
  daysLeft: number;
  dailyPaceNeeded: number;
  progressPct: number;
  projectedTotal: number;
  avgPerDay: number;
  dailyData: { date: string; count: number }[];
  milestones: { label: string; target: number; reached: boolean }[];
  webinar1: { total: number; label: string };
  pastWebinars: { label: string; total: number }[];
  webinarDate: string;
  lastUpdated: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

type ChartFilter = '7' | '14' | '30' | 'all';

function getTickStep(maxVal: number): number {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const ideal = maxVal / 4;
  return steps.find(s => s >= ideal) ?? Math.ceil(ideal / 100) * 100;
}

function fillDays(data: { date: string; count: number }[], days: number): { date: string; count: number }[] {
  const map = new Map(data.map(d => [d.date, d.count]));
  const result: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
  }
  return result;
}

function BarChart({ data }: { data: { date: string; count: number }[] }) {
  const [filter, setFilter] = useState<ChartFilter>('7');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = (() => {
    if (filter === 'all') return data;
    const days = Number(filter);
    return fillDays(data, days);
  })();

  const filterSelect = (
    <select
      value={filter}
      onChange={e => setFilter(e.target.value as ChartFilter)}
      className="text-xs bg-muted border border-border rounded-md px-2 py-1 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
    >
      <option value="7">Letzte 7 Tage</option>
      <option value="14">Letzte 14 Tage</option>
      <option value="30">Letzte 30 Tage</option>
      <option value="all">Alle</option>
    </select>
  );

  if (!data.length) {
    return (
      <div>
        <div className="flex justify-end mb-3">{filterSelect}</div>
        <div className="text-muted-foreground text-sm py-12 text-center">
          Noch keine Anmeldungen – wird nach dem ersten Tag sichtbar
        </div>
      </div>
    );
  }

  const maxCount = Math.max(1, ...chartData.map(d => d.count));
  const step = getTickStep(maxCount);
  const yMax = Math.ceil(maxCount / step) * step || step;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);

  const CHART_H = 200;
  const fewBars = chartData.length <= 2;

  return (
    <div>
      <div className="flex justify-end mb-3">{filterSelect}</div>
      <div className="relative" style={{ paddingLeft: '36px' }}>
        {/* Y-axis gridlines + labels */}
        {ticks.map(v => {
          const bottom = (v / yMax) * CHART_H;
          return (
            <div key={v} className="absolute left-0 right-0" style={{ bottom: `${bottom}px` }}>
              <span className="absolute text-[10px] text-muted-foreground font-mono" style={{ left: '-36px', width: '32px', textAlign: 'right', transform: 'translateY(50%)' }}>
                {v}
              </span>
              <div className="border-t border-border/50 w-full" />
            </div>
          );
        })}

        {/* Bars */}
        <div
          className={`flex items-end ${fewBars ? 'justify-center' : ''}`}
          style={{ height: `${CHART_H}px`, gap: chartData.length > 20 ? '2px' : '4px' }}
        >
          {chartData.map((d, i) => {
            const barH = d.count > 0 ? Math.max(4, (d.count / yMax) * CHART_H * 0.9) : 0;
            return (
              <div
                key={i}
                className={`relative flex flex-col items-center justify-end ${fewBars ? '' : 'flex-1'}`}
                style={fewBars ? { minWidth: '30px', maxWidth: '80px', flex: '1 1 auto' } : { minWidth: '10px' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Hover value */}
                {hoveredIdx === i && d.count > 0 && (
                  <span className="absolute -top-5 text-[11px] font-semibold text-foreground bg-card border border-border rounded px-1.5 py-0.5 shadow-sm z-10 whitespace-nowrap">
                    {d.count}
                  </span>
                )}
                <div
                  className="w-full rounded-t-sm bg-primary transition-all duration-300 hover:bg-primary/80 cursor-default"
                  style={{ height: `${barH}px`, minHeight: d.count > 0 ? '4px' : '0px' }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className={`flex mt-1.5 ${fewBars ? 'justify-center' : ''}`} style={{ gap: chartData.length > 20 ? '2px' : '4px' }}>
          {chartData.map((d, i) => {
            // Show every label for <=14 bars, every 2nd for <=30, every 3rd for more
            const showLabel = chartData.length <= 14 || (chartData.length <= 30 ? i % 2 === 0 : i % 3 === 0) || i === chartData.length - 1;
            return (
              <div
                key={i}
                className={`text-center ${fewBars ? '' : 'flex-1'}`}
                style={fewBars ? { minWidth: '30px', maxWidth: '80px', flex: '1 1 auto' } : { minWidth: '10px' }}
              >
                <span className="text-[9px] text-muted-foreground">
                  {showLabel ? formatDate(d.date) : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WebinarPage() {
  const [stats, setStats] = useState<WebinarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (fresh = false) => {
    try {
      setLoading(true);
      const qs = fresh ? '?fresh=1' : '';
      const res = await fetch(`/api/webinar/stats${qs}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), 120000); // auto-refresh every 2min
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Lade Webinar-Daten...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Fehler: {error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const paceStatus = stats.avgPerDay >= stats.dailyPaceNeeded ? 'on-track' :
    stats.avgPerDay >= stats.dailyPaceNeeded * 0.7 ? 'warning' : 'behind';

  const paceColor = paceStatus === 'on-track' ? 'text-green-600' :
    paceStatus === 'warning' ? 'text-yellow-600' : 'text-red-500';

  const progressColor = stats.progressPct >= 75 ? 'bg-green-500' :
    stats.progressPct >= 40 ? 'bg-yellow-500' : 'bg-primary';

  return (
    <div className="max-w-[1200px] mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Presentation size={24} className="text-muted-foreground" /> Webinar #3 Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live-Training am 2. April 2026, 10:00 Uhr · {stats.daysLeft} Tage verbleibend
          </p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-accent transition-colors"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Registrations */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Anmeldungen</span>
            <Users size={16} className="text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-muted-foreground mt-1">Ziel: {stats.goal}</div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
              style={{ width: `${stats.progressPct}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{stats.progressPct}% vom Ziel</div>
        </div>

        {/* Days Left */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Tage übrig</span>
            <Clock size={16} className="text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-foreground">{stats.daysLeft}</div>
          <div className="text-sm text-muted-foreground mt-1">bis 2. April</div>
          <div className="mt-3 text-xs text-muted-foreground">
            Noch <span className="font-semibold text-foreground">{Math.max(0, stats.goal - stats.total)}</span> Anmeldungen nötig
          </div>
        </div>

        {/* Daily Pace */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Pace / Tag</span>
            <Target size={16} className="text-muted-foreground" />
          </div>
          <div className={`text-3xl font-bold ${paceColor}`}>{stats.avgPerDay}</div>
          <div className="text-sm text-muted-foreground mt-1">Ø pro Tag (letzte 7d)</div>
          <div className="mt-3 text-xs text-muted-foreground">
            Nötig: <span className="font-semibold text-foreground">{stats.dailyPaceNeeded}/Tag</span>
          </div>
        </div>

        {/* Projection */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Prognose</span>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <div className={`text-3xl font-bold ${stats.projectedTotal >= stats.goal ? 'text-green-600' : 'text-yellow-600'}`}>
            {stats.projectedTotal}
          </div>
          <div className="text-sm text-muted-foreground mt-1">bei aktuellem Tempo</div>
          <div className="mt-3 text-xs text-muted-foreground">
            Webinar #1: <span className="font-semibold text-foreground">{stats.webinar1.total}</span> Anmeldungen
          </div>
        </div>
      </div>

      {/* Charts + Milestones Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Daily Chart */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Anmeldungen pro Tag</h3>
          </div>
          <BarChart data={stats.dailyData} />
        </div>

        {/* Milestones */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Meilensteine</h3>
          <div className="space-y-3">
            {stats.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                {m.reached ? (
                  <CheckSquare size={18} className="text-green-600" />
                ) : (
                  <Square size={18} className="text-muted-foreground/30" />
                )}
                <div className="flex-1">
                  <div className={`text-sm ${m.reached ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {m.label}
                  </div>
                  {!m.reached && stats.avgPerDay > 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      ~{Math.ceil((m.target - stats.total) / stats.avgPerDay)} Tage entfernt
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison + Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Webinar Comparison */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Webinar-Vergleich</h3>
          <div className="space-y-4">
            {(stats.pastWebinars || []).map((w, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{w.label}</span>
                  <span className="font-semibold text-foreground">{w.total}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(w.total / stats.goal) * 100}%` }} />
                </div>
              </div>
            ))}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Webinar #3 (2. Apr)</span>
                <span className="font-semibold text-foreground">{stats.total}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(stats.total / stats.goal) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Ziel Webinar #3</span>
                <span className="font-semibold text-foreground">200</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Key Dates */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Nächste Schritte</h3>
          <div className="space-y-3">
            {[
              { date: '21. März', label: 'Ads live schalten', icon: 'megaphone', done: false },
              { date: '24. März', label: 'Email 1 + LinkedIn + Skool', icon: 'mail', done: false },
              { date: '25. März', label: 'Instagram Karussell', icon: 'camera', done: false },
              { date: '27. März', label: 'Email 2 + LinkedIn', icon: 'mail', done: false },
              { date: '31. März', label: 'Email 3 (Social Proof)', icon: 'zap', done: false },
              { date: '1. April', label: 'Email 4 (Reminder)', icon: 'clock', done: false },
              { date: '2. April', label: 'WEBINAR LIVE', icon: 'target', done: false },
            ].map((item, i) => {
              const iconMap: Record<string, JSX.Element> = {
                megaphone: <Megaphone size={16} className="text-muted-foreground" />,
                mail: <Mail size={16} className="text-muted-foreground" />,
                camera: <Camera size={16} className="text-muted-foreground" />,
                zap: <Zap size={16} className="text-orange-500" />,
                clock: <Clock size={16} className="text-muted-foreground" />,
                target: <Target size={16} className="text-primary" />,
              };
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm w-[60px] text-muted-foreground font-mono">{item.date}</span>
                  {iconMap[item.icon]}
                  <span className={`text-sm flex-1 ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.label}
                    {item.icon === 'target' && <Radio size={14} className="text-red-500 inline ml-1.5" />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center">
        Letzte Aktualisierung: {stats.lastUpdated ? formatDateTime(stats.lastUpdated) : '—'} · Daten aus Kit (ConvertKit)
      </div>
    </div>
  );
}

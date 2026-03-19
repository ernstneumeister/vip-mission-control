import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Target, Users } from '../components/Icons';

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

function MiniBar({ data, maxVal }: { data: { date: string; count: number }[]; maxVal: number }) {
  if (!data.length) return <div className="text-muted-foreground text-sm py-8 text-center">Noch keine Anmeldungen</div>;
  const barMax = Math.max(maxVal, ...data.map(d => d.count));
  const fewBars = data.length < 7;
  return (
    <div className={`flex items-end gap-1 h-[160px] ${fewBars ? 'justify-center' : ''}`}>
      {data.map((d, i) => (
        <div
          key={i}
          className={`flex flex-col items-center gap-1 ${fewBars ? '' : 'flex-1'} min-w-0`}
          style={fewBars ? { minWidth: '40px', maxWidth: '60px', flex: '1 1 auto' } : undefined}
        >
          <span className="text-[10px] text-muted-foreground font-medium">{d.count}</span>
          <div
            className="w-full rounded-t bg-primary/80 transition-all duration-300 min-h-[2px]"
            style={{ height: `${Math.max(2, (d.count / barMax) * 100)}px` }}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">{formatDate(d.date)}</span>
        </div>
      ))}
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
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🎯 Webinar #3 Dashboard
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
      <div className="grid grid-cols-4 gap-4">
        {/* Registrations */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Anmeldungen</span>
            <Users size={16} className="text-primary" />
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
            <span className="text-lg">⏳</span>
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
            <Target size={16} className={paceColor} />
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
            <span className="text-lg">📈</span>
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
      <div className="grid grid-cols-3 gap-4">
        {/* Daily Chart */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Anmeldungen pro Tag</h3>
          <MiniBar data={stats.dailyData} maxVal={20} />
        </div>

        {/* Milestones */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Meilensteine</h3>
          <div className="space-y-3">
            {stats.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`text-lg ${m.reached ? '' : 'grayscale opacity-40'}`}>
                  {m.reached ? '✅' : '⬜'}
                </span>
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
      <div className="grid grid-cols-2 gap-4">
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
              { date: '21. März', label: 'Ads live schalten', emoji: '📣', done: false },
              { date: '24. März', label: 'Email 1 + LinkedIn + Skool', emoji: '📧', done: false },
              { date: '25. März', label: 'Instagram Karussell', emoji: '📸', done: false },
              { date: '27. März', label: 'Email 2 + LinkedIn', emoji: '📧', done: false },
              { date: '31. März', label: 'Email 3 (Social Proof)', emoji: '🔥', done: false },
              { date: '1. April', label: 'Email 4 (Reminder)', emoji: '⏰', done: false },
              { date: '2. April', label: 'WEBINAR LIVE 🔴', emoji: '🎯', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm w-[60px] text-muted-foreground font-mono">{item.date}</span>
                <span>{item.emoji}</span>
                <span className={`text-sm flex-1 ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.label}
                </span>
              </div>
            ))}
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

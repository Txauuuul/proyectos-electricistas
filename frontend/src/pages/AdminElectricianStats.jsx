import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart2, TrendingUp, Users, Euro, Clock, ArrowUpDown,
  ChevronUp, ChevronDown, Loader2, AlertTriangle
} from 'lucide-react';

const SORT_OPTIONS = [
  { key: 'nombre', label: 'Name' },
  { key: 'totalProyectos', label: 'Projects' },
  { key: 'tasaConversion', label: 'Conversion' },
  { key: 'ingresosTotales', label: 'Revenue' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'diasPromedioCierre', label: 'Avg. Days' },
];

function StatCard({ icon: Icon, label, value, color = 'text-blue-600', sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-gray-50 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-blue-500' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AdminElectricianStats() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [globales, setGlobales] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('ingresosTotales');
  const [sortDir, setSortDir] = useState('desc');
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!token || usuario?.rol !== 'administrador') { navigate('/dashboard'); return; }
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`${API}/admin/stats-electricistas`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/admin/stats-globales`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!r1.ok || !r2.ok) throw new Error('Failed to fetch stats');
        const [s, g] = await Promise.all([r1.json(), r2.json()]);
        setStats(s);
        setGlobales(g);
      } catch (e) {
        setError(e.message);
      } finally {
        setCargando(false);
      }
    })();
  }, [token]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...stats].sort((a, b) => {
    const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  const maxRevenue = Math.max(...stats.map(s => s.ingresosTotales || 0), 1);
  const maxProjects = Math.max(...stats.map(s => s.totalProyectos || 0), 1);

  const totalGlobalRevenue = stats.reduce((s, e) => s + (e.ingresosTotales || 0), 0);
  const totalGlobalPipeline = stats.reduce((s, e) => s + (e.pipeline || 0), 0);
  const avgConversion = stats.length > 0
    ? (stats.reduce((s, e) => s + (e.tasaConversion || 0), 0) / stats.length).toFixed(1)
    : 0;

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <BarChart2 size={28} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Electrician Performance</h1>
            <p className="text-xs text-gray-500">Admin dashboard · Team statistics</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {cargando ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={40} className="animate-spin text-indigo-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-3 py-24 text-red-500">
            <AlertTriangle size={24} />
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Global KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Active Electricians" value={stats.length} color="text-indigo-600" />
              <StatCard icon={Euro} label="Total Revenue" value={`€${(totalGlobalRevenue / 1000).toFixed(1)}k`} color="text-green-600"
                sub="from paid projects" />
              <StatCard icon={TrendingUp} label="Avg. Conversion" value={`${avgConversion}%`} color="text-blue-600"
                sub="offer → approved" />
              <StatCard icon={Euro} label="Active Pipeline" value={`€${(totalGlobalPipeline / 1000).toFixed(1)}k`} color="text-orange-500"
                sub="in progress" />
            </div>

            {/* Monthly trend (from globales) */}
            {globales?.mensual?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp size={16} className="text-green-600" />
                    Monthly Revenue Trend
                  </h2>
                  {globales.tasaCrecimiento != null && (
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${globales.tasaCrecimiento >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {globales.tasaCrecimiento >= 0 ? '▲' : '▼'} {Math.abs(globales.tasaCrecimiento)}% vs last month
                    </span>
                  )}
                </div>

                {(() => {
                  const maxM = Math.max(...globales.mensual.map(x => x.ingresos), 1);
                  const BAR_H = 160; // px, chart area height
                  return (
                    <div className="flex items-end justify-between gap-2" style={{ height: `${BAR_H + 56}px` }}>
                      {globales.mensual.map((m, i) => {
                        const barPct = m.ingresos / maxM;
                        const barH = Math.max(4, Math.round(barPct * BAR_H));
                        const isMax = m.ingresos === maxM;
                        const isCurrent = i === globales.mensual.length - 1;
                        return (
                          <div key={i} className="flex flex-col items-center flex-1 gap-0">
                            {/* Value label — always visible above bar */}
                            <span className={`text-xs font-bold mb-1 whitespace-nowrap ${isCurrent ? 'text-indigo-600' : 'text-gray-500'}`}>
                              {m.ingresos > 0
                                ? m.ingresos >= 1000
                                  ? `€${(m.ingresos / 1000).toFixed(1)}k`
                                  : `€${m.ingresos.toFixed(0)}`
                                : '—'}
                            </span>
                            {/* Spacer so all bars align to the same baseline */}
                            <div style={{ flex: 1 }} className="flex items-end w-full">
                              <div
                                className={`w-full rounded-t-lg transition-all duration-500
                                  ${isCurrent
                                    ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                                    : isMax
                                      ? 'bg-gradient-to-t from-green-600 to-green-400'
                                      : 'bg-gradient-to-t from-indigo-300 to-indigo-200'
                                  }`}
                                style={{ height: `${barH}px` }}
                                title={`€${m.ingresos.toLocaleString('nl-BE')}`}
                              />
                            </div>
                            {/* Month label */}
                            <span className={`text-xs mt-2 font-semibold ${isCurrent ? 'text-indigo-600' : 'text-gray-400'}`}>
                              {m.periodo}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Per-electrician table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <Users size={16} className="text-indigo-600" />
                  Electrician Rankings
                </h2>
                <span className="text-xs text-gray-400">{stats.length} members</span>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {SORT_OPTIONS.map(opt => (
                        <th
                          key={opt.key}
                          onClick={() => handleSort(opt.key)}
                          className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-1">
                            {opt.label}
                            <SortIcon col={opt.key} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((e, rank) => (
                      <tr key={e.id} className="hover:bg-indigo-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center
                              ${rank === 0 ? 'bg-yellow-400 text-white' : rank === 1 ? 'bg-gray-300 text-white' : rank === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              {rank + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900">{e.nombre}</p>
                              <p className="text-xs text-gray-400">{e.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{e.totalProyectos}</p>
                          <ProgressBar value={e.totalProyectos} max={maxProjects} color="bg-indigo-400" />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${e.tasaConversion >= 70 ? 'text-green-600' : e.tasaConversion >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {e.tasaConversion}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">€{(e.ingresosTotales || 0).toFixed(0)}</p>
                          <ProgressBar value={e.ingresosTotales} max={maxRevenue} color="bg-green-400" />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700 font-semibold">€{(e.pipeline || 0).toFixed(0)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-gray-400" />
                            <span className="text-gray-700">{e.diasPromedioCierre ?? '—'} days</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-4">
                {sorted.map((e, rank) => (
                  <div key={e.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                        ${rank === 0 ? 'bg-yellow-400 text-white' : rank === 1 ? 'bg-gray-300 text-white' : rank === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {rank + 1}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900">{e.nombre}</p>
                        <p className="text-xs text-gray-400">{e.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Projects</p>
                        <p className="font-bold">{e.totalProyectos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Conversion</p>
                        <p className={`font-bold ${e.tasaConversion >= 70 ? 'text-green-600' : e.tasaConversion >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {e.tasaConversion}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Revenue</p>
                        <p className="font-bold text-green-700">€{(e.ingresosTotales || 0).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Pipeline</p>
                        <p className="font-bold text-orange-600">€{(e.pipeline || 0).toFixed(0)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400">Avg. days to close</p>
                        <p className="font-bold">{e.diasPromedioCierre ?? '—'} days</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

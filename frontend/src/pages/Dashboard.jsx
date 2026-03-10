import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Eye, Search, FileText, Send, CheckCircle, DollarSign, Flag, RefreshCw, Download, TrendingUp,
} from 'lucide-react';

const CLIENT_CARD_PALETTE = [
  {
    card: 'bg-rose-100 border-rose-300 hover:border-rose-400',
    chip: 'bg-rose-200 text-rose-800',
  },
  {
    card: 'bg-orange-100 border-orange-300 hover:border-orange-400',
    chip: 'bg-orange-200 text-orange-800',
  },
  {
    card: 'bg-amber-100 border-amber-300 hover:border-amber-400',
    chip: 'bg-amber-200 text-amber-800',
  },
  {
    card: 'bg-emerald-100 border-emerald-300 hover:border-emerald-400',
    chip: 'bg-emerald-200 text-emerald-800',
  },
  {
    card: 'bg-teal-100 border-teal-300 hover:border-teal-400',
    chip: 'bg-teal-200 text-teal-800',
  },
  {
    card: 'bg-sky-100 border-sky-300 hover:border-sky-400',
    chip: 'bg-sky-200 text-sky-800',
  },
  {
    card: 'bg-indigo-100 border-indigo-300 hover:border-indigo-400',
    chip: 'bg-indigo-200 text-indigo-800',
  },
  {
    card: 'bg-violet-100 border-violet-300 hover:border-violet-400',
    chip: 'bg-violet-200 text-violet-800',
  },
  {
    card: 'bg-fuchsia-100 border-fuchsia-300 hover:border-fuchsia-400',
    chip: 'bg-fuchsia-200 text-fuchsia-800',
  },
];

export default function Dashboard() {
  const { usuario, token } = useAuth();
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [sortBy, setSortBy] = useState('fecha-desc'); // 'fecha-asc', 'fecha-desc', 'cliente'
  const [filtroCliente, setFiltroCliente] = useState(''); // para ordenar por cliente

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    const cargar = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        setProyectos(await res.json());
      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    };
    cargar();
  }, [token, navigate]);

  const esAdmin = usuario?.rol === 'administrador';

  // ─── CSV export (admin only) ───────────────────────────────
  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export mislukt');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Fout bij exporteren van CSV: ' + err.message);
    }
  };

  const getStatusInfo = (estado) => {
    const map = {
      created:         { bg: 'bg-blue-500',    label: 'Aangemaakt',        col: 'bg-white border-gray-200' },
      offer_ready:     { bg: 'bg-purple-500',  label: 'Offerte klaar',     col: 'bg-white border-gray-200' },
      offer_sent:      { bg: 'bg-indigo-500',  label: 'Offerte verzonden', col: 'bg-white border-gray-200' },
      approved:        { bg: 'bg-green-500',   label: 'Goedgekeurd',       col: 'bg-white border-gray-200' },
      working:         { bg: 'bg-yellow-500',  label: 'In uitvoering',     col: 'bg-white border-gray-200' },
      finished:        { bg: 'bg-teal-500',    label: 'Afgerond',          col: 'bg-white border-gray-200' },
      pending_payment: { bg: 'bg-orange-500',  label: 'Wacht op betaling', col: 'bg-white border-gray-200' },
      paid:            { bg: 'bg-green-700',   label: 'Betaald',           col: 'bg-white border-gray-200' },
      rejected:        { bg: 'bg-red-500',     label: 'Afgewezen',         col: 'bg-white border-gray-200' },
    };
    return map[estado] || { bg: 'bg-gray-500', label: estado, col: 'bg-white border-gray-200' };
  };

  const getPlanCount = (proyecto) => {
    const topLevelPlans = proyecto.planos?.length || 0;
    const roomPlans = proyecto.ruimtes?.filter(r => r.platteGrond).length || 0;
    return topLevelPlans + roomPlans;
  };

  const getPhotoCount = (proyecto) => {
    const topLevelPhotos = proyecto.fotosLocalizacion?.length || 0;
    const roomPhotos = proyecto.ruimtes?.reduce((sum, room) => sum + (room.fotos?.length || 0), 0) || 0;
    return topLevelPhotos + roomPhotos;
  };

  const getProjectAmount = (proyecto) => (
    proyecto.oferta?.precioTotalEstimado || proyecto.oferta?.precioTotal || 0
  );

  const getClientCardTheme = (proyecto) => {
    const seed = proyecto.usuarioId?._id || proyecto.usuarioId?.nombre || proyecto._id || 'default';
    const hash = [...String(seed)].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return CLIENT_CARD_PALETTE[hash % CLIENT_CARD_PALETTE.length];
  };

  // =======================
  // Admin workflow actions
  // =======================
  const handleAction = async (url, confirmMsg, successMsg, proyectoId) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      // Reload just the affected project from the API instead of full page refresh
      if (proyectoId) {
        const reloadRes = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${proyectoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (reloadRes.ok) {
          const updated = await reloadRes.json();
          setProyectos(prev => prev.map(p => p._id === proyectoId ? updated : p));
        }
      }
      alert(successMsg || 'Klaar!');
    } catch (err) { alert('Fout: ' + err.message); }
  };

  const API = import.meta.env.VITE_API_URL;

  // ============================
  // CLIENT VIEW — grid of cards
  // ============================
  if (!esAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mijn projecten</h1>
            <p className="text-gray-600">{proyectos.length} project{proyectos.length !== 1 ? 'en' : ''}</p>
          </div>
          <button
            onClick={() => navigate('/nuevo-proyecto')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            <Plus size={18} /> Nieuw project
          </button>
        </div>

        {cargando ? (
          <p className="text-gray-500 text-center py-12">Projecten laden...</p>
        ) : proyectos.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Nog geen projecten</h3>
            <button onClick={() => navigate('/nuevo-proyecto')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex gap-2">
              <Plus size={18} /> Eerste project aanmaken
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proyectos.map(p => {
              const si = getStatusInfo(p.estado);
              return (
                <div key={p._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      {p.tituloAutomatico || p.nombreCasa}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-white text-xs font-semibold ${si.bg}`}>{si.label}</span>
                  </div>
                  {p.tituloPersonalizado && (
                    <p className="text-sm text-gray-500 mb-1 italic">{p.tituloPersonalizado}</p>
                  )}
                  <p className="text-gray-600 text-sm mb-3">{p.direccion}</p>

                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    <p><strong>Start:</strong> {new Date(p.fechaInicio).toLocaleDateString()}</p>
                    <p><strong>Plannen:</strong> {getPlanCount(p)} &nbsp; <strong>Foto's:</strong> {getPhotoCount(p)}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate(`/proyecto/${p._id}`)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold text-sm flex gap-2 items-center justify-center"
                    >
                      <Eye size={16} /> Project bekijken
                    </button>
                    {p.estado === 'offer_sent' && (
                      <button
                        onClick={() => navigate(`/proyecto/${p._id}/ver-oferta`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-semibold text-sm flex gap-2 items-center justify-center"
                      >
                        <FileText size={16} /> Offerte bekijken en tekenen
                      </button>
                    )}
                    {['working', 'pending_payment', 'paid', 'finished'].includes(p.estado) && (
                      <button
                        onClick={() => navigate(`/proyecto/${p._id}/ver-oferta`)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold text-sm flex gap-2 items-center justify-center"
                      >
                        <CheckCircle size={16} /> Contract bekijken
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==============================================
  // ADMIN VIEW — Kanban board with columns by state
  // ==============================================
  const kanbanStates = [
    'created', 'offer_ready', 'offer_sent', 'working', 'pending_payment', 'paid', 'rejected',
  ];

  // Obtener lista única de clientes para el filtro
  const clientesUnicos = useMemo(() => {
    const clientes = new Set();
    proyectos.forEach(p => {
      if (p.usuarioId?.nombre) clientes.add(p.usuarioId.nombre);
    });
    return Array.from(clientes).sort();
  }, [proyectos]);

  const filtered = useMemo(() => {
    let result = proyectos.filter(p => {
      // Busqueda por texto
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const matchBusqueda = (p.tituloAutomatico || '').toLowerCase().includes(q) ||
          (p.nombreCasa || '').toLowerCase().includes(q) ||
          (p.direccion || '').toLowerCase().includes(q) ||
          (p.usuarioId?.nombre || '').toLowerCase().includes(q) ||
          (p.usuarioId?.email || '').toLowerCase().includes(q);
        if (!matchBusqueda) return false;
      }
      
      // Filtro por cliente (si está seleccionado)
      if (filtroCliente && p.usuarioId?.nombre !== filtroCliente) return false;
      
      return true;
    });

    // Aplicar ordenamiento
    if (sortBy === 'fecha-asc') {
      result.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
    } else if (sortBy === 'fecha-desc') {
      result.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
    } else if (sortBy === 'cliente') {
      result.sort((a, b) => (a.usuarioId?.nombre || '').localeCompare(b.usuarioId?.nombre || ''));
    }

    return result;
  }, [proyectos, busqueda, sortBy, filtroCliente]);

  const grouped = {};
  kanbanStates.forEach(s => { grouped[s] = []; });
  filtered.forEach(p => {
    const st = kanbanStates.includes(p.estado) ? p.estado : 'created';
    grouped[st].push(p);
  });

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Top bar: stats + search + filters ── */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-6 space-y-5 shadow-sm">

        <div className="flex flex-col items-center text-center gap-2 pb-2">
          <h1 className="text-3xl font-bold text-gray-900">Projectdashboard</h1>
          <p className="text-sm text-gray-500 max-w-2xl">
            Beheer alle actieve projecten, bekijk de pipeline en stuur het werk vooruit vanuit één plek.
          </p>
        </div>

        {/* Stats row */}
        {!cargando && proyectos.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-10 justify-center">
            <MiniStat label="Totaal" value={proyectos.length} color="text-gray-800" />
            <MiniStat label="In uitvoering" value={proyectos.filter(p => p.estado === 'working').length} color="text-yellow-600" />
            <MiniStat label="Wacht op betaling" value={proyectos.filter(p => p.estado === 'pending_payment').length} color="text-orange-600" />
            <MiniStat label="Betaald" value={proyectos.filter(p => p.estado === 'paid').length} color="text-green-700" />
            <MiniStat
              label="Omzet"
              value={`€${proyectos.filter(p => p.estado === 'paid').reduce((s, p) => s + (p.oferta?.precioTotal || 0), 0).toFixed(0)}`}
              color="text-green-700"
            />
            {/* Conversion rate: approved / offer_sent */}
            {(() => {
              const sent = proyectos.filter(p => ['offer_sent', 'approved', 'working', 'finished', 'pending_payment', 'paid', 'rejected'].includes(p.estado)).length;
              const approved = proyectos.filter(p => ['approved', 'working', 'finished', 'pending_payment', 'paid'].includes(p.estado)).length;
              const rate = sent > 0 ? Math.round((approved / sent) * 100) : null;
              return rate !== null ? (
                <MiniStat label="Conversie" value={`${rate}%`} color={rate >= 60 ? 'text-green-700' : rate >= 40 ? 'text-yellow-600' : 'text-red-600'} />
              ) : null;
            })()}
            {/* Avg project value (paid) */}
            {(() => {
              const pagados = proyectos.filter(p => p.estado === 'paid' && p.oferta?.precioTotal);
              if (pagados.length === 0) return null;
              const avg = pagados.reduce((s, p) => s + (p.oferta?.precioTotal || 0), 0) / pagados.length;
              return <MiniStat label="Gem. waarde" value={`€${avg.toFixed(0)}`} color="text-blue-700" />;
            })()}
            {/* Pipeline value (offer_sent + approved + working) */}
            {(() => {
              const pipeline = proyectos.filter(p => ['offer_sent', 'approved', 'working'].includes(p.estado));
              const val = pipeline.reduce((s, p) => s + (p.oferta?.precioTotal || 0), 0);
              return val > 0 ? <MiniStat label="Pipeline" value={`€${val.toFixed(0)}`} color="text-indigo-700" /> : null;
            })()}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 justify-center mt-2 mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek projecten..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-72"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600">Sorteren:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="fecha-desc">Nieuwste eerst</option>
              <option value="fecha-asc">Oudste eerst</option>
              <option value="cliente">Klant A-Z</option>
            </select>
          </div>

          {clientesUnicos.length > 0 && (
          <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-600">Klant:</label>
              <select
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Alle</option>
                {clientesUnicos.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <span className="text-xs text-gray-400">{filtered.length} project{filtered.length !== 1 ? 'en' : ''}</span>
        </div>
      </div>

      {/* ── Kanban board ── */}
      {cargando ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Projecten laden...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex justify-center items-start px-4 py-6">
          <div className="flex gap-5 h-full" style={{ minWidth: 'max-content' }}>
            {kanbanStates.map(state => {
              const si = getStatusInfo(state);
              const cards = grouped[state] || [];
              return (
                <div
                  key={state}
                  className={`w-72 flex-shrink-0 flex flex-col rounded-xl border ${si.col} overflow-hidden`}
                >
                  {/* Column header — fixed, never scrolls */}
                  <div className="flex-shrink-0 px-3 py-2.5 border-b bg-white/70 backdrop-blur-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${si.bg}`} />
                      <span className="font-semibold text-gray-800 text-sm">{si.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${si.bg}`}>
                      {cards.length}
                    </span>
                  </div>

                  {/* Card list — this column scrolls independently */}
                  <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
                    {cards.length === 0 && (
                      <p className="text-gray-400 text-xs text-center py-6 select-none">Geen projecten</p>
                    )}
                    {cards.map(p => (
                      <div
                        key={p._id}
                        className={`rounded-xl shadow-sm border p-4 hover:shadow-md transition cursor-pointer ${getClientCardTheme(p).card}`}
                        onClick={() => navigate(`/proyecto/${p._id}`)}
                      >
                        <div className="mb-3">
                          <span className={`inline-flex px-3 py-1 rounded-full font-bold text-sm ${getClientCardTheme(p).chip}`}>
                            {p.usuarioId?.nombre || '—'}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm mb-2 truncate">
                          {p.tituloAutomatico || p.nombreCasa}
                        </p>
                        {p.tituloPersonalizado && (
                          <p className="text-xs text-gray-400 italic truncate mb-2">{p.tituloPersonalizado}</p>
                        )}
                        <p className="text-xs text-gray-500 truncate mb-3">{p.direccion}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                          <span>{new Date(p.fechaInicio).toLocaleDateString()}</span>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                          {['created', 'offer_ready'].includes(state) && (
                            <button
                              onClick={() => navigate(`/proyecto/${p._id}/preparar-oferta`)}
                              className="text-[10px] px-2 py-1 bg-purple-100 text-purple-700 rounded font-semibold hover:bg-purple-200 flex items-center gap-1"
                            >
                              <FileText size={10} /> Offerte
                            </button>
                          )}
                          {state === 'offer_ready' && (
                            <button
                              onClick={() => handleAction(`${API}/proyectos/${p._id}/enviar-oferta`, 'Offerte naar klant verzenden?', 'Offerte verzonden!', p._id)}
                              className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold hover:bg-indigo-200 flex items-center gap-1"
                            >
                              <Send size={10} /> Verzenden
                            </button>
                          )}
                          {state === 'pending_payment' && (
                            <button
                              onClick={() => handleAction(`${API}/proyectos/${p._id}/marcar-pagado`, 'Markeren als betaald?', 'Gemarkeerd als betaald!', p._id)}
                              className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold hover:bg-emerald-200 flex items-center gap-1"
                            >
                              <DollarSign size={10} /> Betaald
                            </button>
                          )}
                          {['working', 'paid', 'pending_payment'].includes(state) && (
                            <button
                              onClick={() => navigate(`/proyecto/${p._id}`)}
                              className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded font-semibold hover:bg-amber-200 flex items-center gap-1"
                            >
                              <RefreshCw size={10} /> Heropenen
                            </button>
                          )}
                        </div>

                        {/* Amount due for pending payment projects */}
                        {state === 'pending_payment' && getProjectAmount(p) > 0 && (
                          <div className="mt-2 text-xs font-bold text-orange-700 bg-orange-50 rounded px-2 py-1 text-center">
                            Openstaand: €{getProjectAmount(p).toFixed(2)}
                          </div>
                        )}

                        {/* Revenue for paid projects */}
                        {state === 'paid' && p.oferta?.precioTotal && (
                          <div className="mt-2 text-xs font-bold text-green-700 bg-green-50 rounded px-2 py-1 text-center">
                            Omzet: €{getProjectAmount(p).toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-4 py-2">
      <span className="text-xs text-gray-500">{label}:</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

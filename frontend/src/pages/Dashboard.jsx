import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Eye, Search, FileText, Send, CheckCircle, DollarSign, Flag, RefreshCw,
} from 'lucide-react';

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

  const getStatusInfo = (estado) => {
    const map = {
      created:         { bg: 'bg-blue-500',    label: 'Created',         col: 'bg-blue-50 border-blue-200' },
      offer_ready:     { bg: 'bg-purple-500',   label: 'Offer Ready',     col: 'bg-purple-50 border-purple-200' },
      offer_sent:      { bg: 'bg-indigo-500',   label: 'Offer Sent',      col: 'bg-indigo-50 border-indigo-200' },
      approved:        { bg: 'bg-green-500',     label: 'Approved',        col: 'bg-green-50 border-green-200' },
      working:         { bg: 'bg-yellow-500',    label: 'Working',         col: 'bg-yellow-50 border-yellow-200' },
      finished:        { bg: 'bg-teal-500',      label: 'Finished',        col: 'bg-teal-50 border-teal-200' },
      pending_payment: { bg: 'bg-orange-500',    label: 'Pending Payment', col: 'bg-orange-50 border-orange-200' },
      paid:            { bg: 'bg-green-700',     label: 'Paid',            col: 'bg-green-50 border-green-300' },
      rejected:        { bg: 'bg-red-500',       label: 'Rejected',        col: 'bg-red-50 border-red-200' },
    };
    return map[estado] || { bg: 'bg-gray-500', label: estado, col: 'bg-gray-50 border-gray-200' };
  };

  // =======================
  // Admin workflow actions
  // =======================
  const handleAction = async (url, confirmMsg, successMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      alert(successMsg || 'Done!');
      window.location.reload();
    } catch (err) { alert('Error: ' + err.message); }
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
            <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600">{proyectos.length} project{proyectos.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => navigate('/nuevo-proyecto')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            <Plus size={18} /> New Project
          </button>
        </div>

        {cargando ? (
          <p className="text-gray-500 text-center py-12">Loading projects...</p>
        ) : proyectos.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">No projects yet</h3>
            <button onClick={() => navigate('/nuevo-proyecto')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex gap-2">
              <Plus size={18} /> Create First Project
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
                    <p><strong>Plans:</strong> {p.planos?.length || 0} &nbsp; <strong>Photos:</strong> {p.fotosLocalizacion?.length || 0}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => navigate(`/proyecto/${p._id}`)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold text-sm flex gap-2 items-center justify-center"
                    >
                      <Eye size={16} /> View Project
                    </button>
                    {p.estado === 'offer_sent' && (
                      <button
                        onClick={() => navigate(`/proyecto/${p._id}/ver-oferta`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-semibold text-sm flex gap-2 items-center justify-center"
                      >
                        <FileText size={16} /> View & Sign Offer
                      </button>
                    )}
                    {['working', 'pending_payment', 'paid', 'finished'].includes(p.estado) && (
                      <button
                        onClick={() => navigate(`/proyecto/${p._id}/ver-oferta`)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold text-sm flex gap-2 items-center justify-center"
                      >
                        <CheckCircle size={16} /> View Contract
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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Top bar: stats + search + filters ── */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-3 space-y-2">

        {/* Stats row */}
        {!cargando && proyectos.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-2 justify-center">
            <MiniStat label="Total" value={proyectos.length} color="text-gray-800" />
            <MiniStat label="Working" value={proyectos.filter(p => p.estado === 'working').length} color="text-yellow-600" />
            <MiniStat label="Pending Payment" value={proyectos.filter(p => p.estado === 'pending_payment').length} color="text-orange-600" />
            <MiniStat label="Paid" value={proyectos.filter(p => p.estado === 'paid').length} color="text-green-700" />
            <MiniStat
              label="Revenue"
              value={`€${proyectos.filter(p => p.estado === 'paid').reduce((s, p) => s + (p.oferta?.precioTotal || 0), 0).toFixed(0)}`}
              color="text-green-700"
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 justify-center">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-52"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="fecha-desc">Newest First</option>
              <option value="fecha-asc">Oldest First</option>
              <option value="cliente">Client A-Z</option>
            </select>
          </div>

          {clientesUnicos.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Client:</label>
              <select
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All</option>
                {clientesUnicos.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <span className="text-xs text-gray-400">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Kanban board ── */}
      {cargando ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading projects...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex justify-center items-center">
          <div className="flex gap-3 h-full py-4" style={{ minWidth: 'max-content' }}>
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
                  <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
                    {cards.length === 0 && (
                      <p className="text-gray-400 text-xs text-center py-6 select-none">No projects</p>
                    )}
                    {cards.map(p => (
                      <div
                        key={p._id}
                        className="bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition cursor-pointer"
                        onClick={() => navigate(`/proyecto/${p._id}`)}
                      >
                        <p className="font-semibold text-gray-900 text-sm mb-1 truncate">
                          {p.tituloAutomatico || p.nombreCasa}
                        </p>
                        {p.tituloPersonalizado && (
                          <p className="text-xs text-gray-400 italic truncate mb-1">{p.tituloPersonalizado}</p>
                        )}
                        <p className="text-xs text-gray-500 truncate mb-2">{p.direccion}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                          <span>{p.usuarioId?.nombre || '—'}</span>
                          <span>•</span>
                          <span>{new Date(p.fechaInicio).toLocaleDateString()}</span>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                          {['created', 'offer_ready'].includes(state) && (
                            <button
                              onClick={() => navigate(`/proyecto/${p._id}/preparar-oferta`)}
                              className="text-[10px] px-2 py-1 bg-purple-100 text-purple-700 rounded font-semibold hover:bg-purple-200 flex items-center gap-1"
                            >
                              <FileText size={10} /> Offer
                            </button>
                          )}
                          {state === 'offer_ready' && (
                            <button
                              onClick={() => handleAction(`${API}/proyectos/${p._id}/enviar-oferta`, 'Send offer to client?', 'Offer sent!')}
                              className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-semibold hover:bg-indigo-200 flex items-center gap-1"
                            >
                              <Send size={10} /> Send
                            </button>
                          )}
                          {state === 'pending_payment' && (
                            <button
                              onClick={() => handleAction(`${API}/proyectos/${p._id}/marcar-pagado`, 'Mark as paid?', 'Marked paid!')}
                              className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold hover:bg-emerald-200 flex items-center gap-1"
                            >
                              <DollarSign size={10} /> Paid
                            </button>
                          )}
                          {['working', 'paid', 'pending_payment'].includes(state) && (
                            <button
                              onClick={() => navigate(`/proyecto/${p._id}`)}
                              className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded font-semibold hover:bg-amber-200 flex items-center gap-1"
                            >
                              <RefreshCw size={10} /> Reopen
                            </button>
                          )}
                        </div>

                        {/* Revenue for paid projects */}
                        {state === 'paid' && p.oferta?.precioTotal && (
                          <div className="mt-2 text-xs font-bold text-green-700 bg-green-50 rounded px-2 py-1 text-center">
                            Revenue: €{(p.oferta.precioTotal || 0).toFixed(2)}
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
    <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5">
      <span className="text-xs text-gray-500">{label}:</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

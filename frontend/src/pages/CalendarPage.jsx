import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const ESTADO_COLORS = {
  created: 'bg-[#29ace3]',
  offer_ready: 'bg-purple-500',
  offer_sent: 'bg-indigo-500',
  approved: 'bg-green-500',
  working: 'bg-yellow-500',
  finished: 'bg-teal-500',
  pending_payment: 'bg-orange-500',
  paid: 'bg-green-700',
  rejected: 'bg-red-500',
};

const ESTADO_LABELS = {
  created: 'Aangemaakt', offer_ready: 'Offerte klaar', offer_sent: 'Offerte verzonden',
  approved: 'Goedgekeurd', working: 'In uitvoering', finished: 'Afgerond',
  pending_payment: 'Wacht op betaling', paid: 'Betaald', rejected: 'Afgewezen',
};

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTHS = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

export default function CalendarPage() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [hoy] = useState(new Date());
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/proyectos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setProyectos(await res.json());
      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    })();
  }, [token]);

  // Build calendar grid
  const { days, projectsByDay } = useMemo(() => {
    const firstDay = new Date(anio, mes, 1);
    const lastDay = new Date(anio, mes + 1, 0);

    // Monday-first offset
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

    const days = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      days.push(dayNum >= 1 && dayNum <= lastDay.getDate() ? dayNum : null);
    }

    // Map projects to day keys "YYYY-MM-DD" using fechaInicioInstalacion (from oferta) or fechaInicio
    const byDay = {};
    proyectos.forEach(p => {
      // Use installation start date if available, otherwise project start date
      const fecha = p.oferta?.fechaInicioInstalacion || p.fechaInicio;
      if (!fecha) return;
      const d = new Date(fecha);
      if (d.getFullYear() === anio && d.getMonth() === mes) {
        const key = d.getDate();
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(p);
      }
    });

    return { days, projectsByDay: byDay };
  }, [proyectos, mes, anio]);

  // Projects for the selected day
  const selectedProjects = selectedDay ? (projectsByDay[selectedDay] || []) : [];

  // Upcoming projects (next 30 days) for list view
  const upcoming = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return proyectos
      .filter(p => {
        const fecha = p.oferta?.fechaInicioInstalacion || p.fechaInicio;
        if (!fecha) return false;
        const d = new Date(fecha);
        return d >= now && d <= in30;
      })
      .sort((a, b) => {
        const da = new Date(a.oferta?.fechaInicioInstalacion || a.fechaInicio);
        const db = new Date(b.oferta?.fechaInicioInstalacion || b.fechaInicio);
        return da - db;
      });
  }, [proyectos]);

  const prevMonth = () => {
    if (mes === 0) { setMes(11); setAnio(a => a - 1); }
    else setMes(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (mes === 11) { setMes(0); setAnio(a => a + 1); }
    else setMes(m => m + 1);
    setSelectedDay(null);
  };
  const goToday = () => { setMes(hoy.getMonth()); setAnio(hoy.getFullYear()); setSelectedDay(hoy.getDate()); };

  const isToday = (day) => day === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      {/* Header */}
      <header className="shadow sticky top-0 z-10" style={{ background: '#1a1a1a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar size={24} style={{ color: '#29ace3' }} />
            <div>
              <h1 className="text-lg font-extrabold text-white uppercase tracking-wide">
                Installatie<span style={{ color: '#29ace3' }}>kalender</span>
              </h1>
              <p className="text-xs text-gray-400">Geplande projectdata</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-300 border border-gray-600 rounded hover:border-[#29ace3] hover:text-[#29ace3] transition"
            >
              {viewMode === 'calendar' ? 'Lijstweergave' : 'Kalenderweergave'}
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white rounded hover:bg-[#1d96cb] transition"
              style={{ background: '#29ace3' }}
            >
              Vandaag
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {cargando ? (
          <p className="text-center text-gray-500 py-12">Kalender laden...</p>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Binnenkort (volgende 30 dagen) — {upcoming.length} project{upcoming.length !== 1 ? 'en' : ''}</h2>
            {upcoming.length === 0 ? (
              <p className="text-gray-400 text-center py-12">Geen projecten gepland in de komende 30 dagen</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(p => {
                  const fecha = new Date(p.oferta?.fechaInicioInstalacion || p.fechaInicio);
                  const daysUntil = Math.ceil((fecha - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <div
                      key={p._id}
                      onClick={() => navigate(`/proyecto/${p._id}`)}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-[#eaf7fd] hover:border-[#a8dcf0] cursor-pointer transition"
                    >
                      <div className="text-center bg-[#eaf7fd] rounded-lg px-3 py-2 min-w-[60px]">
                        <p className="text-xs font-semibold text-[#29ace3] uppercase">{MONTHS[fecha.getMonth()].slice(0,3)}</p>
                        <p className="text-2xl font-bold text-[#1d8ab5] leading-none">{fecha.getDate()}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{p.tituloAutomatico || p.nombreCasa}</p>
                        <p className="text-sm text-gray-500">{p.direccion}</p>
                        {usuario?.rol === 'administrador' && <p className="text-xs text-gray-400">{p.usuarioId?.nombre}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs text-white px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado] || 'bg-gray-400'}`}>
                          {ESTADO_LABELS[p.estado] || p.estado}
                        </span>
                        <span className="text-xs text-gray-400">
                          {daysUntil === 0 ? 'Vandaag' : daysUntil === 1 ? 'Morgen' : `over ${daysUntil} dagen`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── CALENDAR VIEW ── */
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Month nav */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                  <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-lg transition">
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">
                    {MONTHS[mes]} {anio}
                  </h2>
                  <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-lg transition">
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-xs font-bold text-gray-500 py-2 uppercase tracking-wide">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {days.map((day, i) => {
                    const projs = day ? (projectsByDay[day] || []) : [];
                    const today = day && isToday(day);
                    const selected = day === selectedDay;
                    return (
                      <div
                        key={i}
                        onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                        className={`min-h-[80px] sm:min-h-[100px] border-b border-r p-1 transition
                          ${!day ? 'bg-gray-50' : 'cursor-pointer hover:bg-[#eaf7fd]'}
                          ${selected ? 'bg-[#d0eef9] ring-2 ring-blue-400 ring-inset' : ''}
                        `}
                      >
                        {day && (
                          <>
                            <div className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${today ? 'bg-[#29ace3] text-white' : 'text-gray-700'}`}>
                              {day}
                            </div>
                            <div className="space-y-0.5">
                              {projs.slice(0, 3).map((p, pi) => (
                                <div
                                  key={pi}
                                  className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${ESTADO_COLORS[p.estado] || 'bg-gray-400'}`}
                                  title={p.tituloAutomatico || p.nombreCasa}
                                >
                                  {p.tituloAutomatico || p.nombreCasa}
                                </div>
                              ))}
                              {projs.length > 3 && (
                                <p className="text-[10px] text-gray-400 font-semibold">+{projs.length - 3} meer</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-2 px-1">
                {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${ESTADO_COLORS[k]}`} />
                    <span className="text-xs text-gray-500">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Side panel */}
            <div className="lg:w-80">
              {selectedDay ? (
                <div className="bg-white rounded-xl shadow-md p-5">
                  <h3 className="font-bold text-gray-900 text-lg mb-4">
                    {selectedDay} {MONTHS[mes]} {anio}
                    <span className="ml-2 text-sm text-gray-400">({selectedProjects.length} project{selectedProjects.length !== 1 ? 'en' : ''})</span>
                  </h3>
                  {selectedProjects.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Geen projecten op deze dag</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedProjects.map(p => (
                        <div
                          key={p._id}
                          onClick={() => navigate(`/proyecto/${p._id}`)}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-[#eaf7fd] cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 text-sm">{p.tituloAutomatico || p.nombreCasa}</p>
                            <span className={`text-[10px] text-white px-2 py-0.5 rounded-full ${ESTADO_COLORS[p.estado] || 'bg-gray-400'}`}>
                              {ESTADO_LABELS[p.estado] || p.estado}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{p.direccion}</p>
                          {p.oferta?.precioTotal > 0 && (
                            <p className="text-xs text-green-700 font-semibold mt-1">€{p.oferta.precioTotal.toFixed(2)}</p>
                          )}
                          {usuario?.rol === 'administrador' && (
                            <p className="text-xs text-gray-400 mt-0.5">{p.usuarioId?.nombre}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md p-5">
                  <h3 className="font-bold text-gray-900 text-lg mb-3">Deze maand</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Totaal gepland</span>
                      <span className="font-bold">{Object.values(projectsByDay).flat().length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">In uitvoering</span>
                      <span className="font-bold text-yellow-600">
                        {Object.values(projectsByDay).flat().filter(p => p.estado === 'working').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Wacht op goedkeuring</span>
                      <span className="font-bold text-indigo-600">
                        {Object.values(projectsByDay).flat().filter(p => p.estado === 'offer_sent').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Omzet deze maand</span>
                      <span className="font-bold text-green-700">
                        €{Object.values(projectsByDay).flat()
                          .filter(p => p.estado === 'paid')
                          .reduce((s, p) => s + (p.oferta?.precioTotal || 0), 0)
                          .toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-4 text-center">Klik op een dag om de projecten te zien</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

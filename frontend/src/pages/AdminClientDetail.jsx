import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, CheckCircle, AlertCircle, Users, FolderOpen,
  Pencil, X, Save, StickyNote, ChevronRight,
} from 'lucide-react';

// Status metadata
const STATUS_META = {
  working:         { label: 'In uitvoering',      color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400',  order: 0 },
  pending_payment: { label: 'Betaling verwacht',  color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400',  order: 1 },
  offer_sent:      { label: 'Offerte verzonden',  color: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-400',  order: 2 },
  offer_ready:     { label: 'Offerte klaar',      color: 'bg-purple-100 text-purple-800', dot: 'bg-purple-400',  order: 3 },
  created:         { label: 'Nieuwe aanvraag',    color: 'bg-[#d0eef9] text-[#1a6a8a]',     dot: 'bg-blue-400',    order: 4 },
  paid:            { label: 'Betaald',            color: 'bg-green-100 text-green-800',   dot: 'bg-green-500',   order: 5 },
  finished:        { label: 'Afgerond',           color: 'bg-teal-100 text-teal-800',     dot: 'bg-teal-400',    order: 6 },
  rejected:        { label: 'Afgewezen',          color: 'bg-red-100 text-red-800',       dot: 'bg-red-400',     order: 7 },
};
const getStatusMeta = (estado) => STATUS_META[estado] || { label: estado, color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400', order: 99 };

const SIGNED_STATES = ['approved', 'working', 'finished', 'pending_payment', 'paid'];

const getPerformanceColor = (percentage) => {
  if (percentage >= 75) return 'bg-green-100 text-green-700 border-green-200';
  if (percentage >= 55) return 'bg-lime-100 text-lime-700 border-lime-200';
  if (percentage >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (percentage >= 25) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-red-100 text-red-700 border-red-200';
};

export default function AdminClientDetail() {
  const { id } = useParams();
  const { token, usuario } = useAuth();
  const navigate = useNavigate();

  const [perfil, setPerfil]               = useState(null);
  const [perfilEdit, setPerfilEdit]       = useState(null);
  const [proyectos, setProyectos]         = useState([]);
  const [clientes, setClientes]           = useState([]);
  const [cargando, setCargando]           = useState(true);
  const [editingPerfil, setEditingPerfil] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [notaAdmin, setNotaAdmin]         = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [mensaje, setMensaje]             = useState(null);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!token || usuario?.rol !== 'administrador') { navigate('/dashboard'); return; }
    cargarDatos();
  }, [id, token]);

  const showMsg = (type, text) => {
    setMensaje({ type, text });
    setTimeout(() => setMensaje(null), 3500);
  };

  const cargarDatos = async () => {
    try {
      const [perfilRes, proyRes, clientesRes] = await Promise.all([
        fetch(`${API}/profile/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/proyectos`,     { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/clientes?usuarioId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (perfilRes.ok) {
        const data = await perfilRes.json();
        setPerfil(data);
        setNotaAdmin(data.notaAdmin || '');
      }
      if (proyRes.ok) {
        const all = await proyRes.json();
        setProyectos(all.filter(p => (p.usuarioId?._id || p.usuarioId) === id));
      }
      if (clientesRes.ok) setClientes(await clientesRes.json());
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  // Profile edit
  const handleBewerken = () => { setPerfilEdit({ ...perfil }); setEditingPerfil(true); };
  const handleAnnuleren = () => { setPerfilEdit(null); setEditingPerfil(false); };
  const handleFieldChange = (field, value) => setPerfilEdit(prev => ({ ...prev, [field]: value }));

  const handleOpslaanPerfil = async () => {
    setGuardandoPerfil(true);
    try {
      const res = await fetch(`${API}/profile/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(perfilEdit),
      });
      if (!res.ok) throw new Error('Opslaan mislukt');
      const data = await res.json();
      setPerfil(data);
      setEditingPerfil(false);
      setPerfilEdit(null);
      showMsg('success', 'Elektriciengegevens opgeslagen.');
    } catch (err) { showMsg('error', err.message); }
    finally { setGuardandoPerfil(false); }
  };

  const handleSaveCommission = async () => {
    try {
      const res = await fetch(`${API}/profile/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(perfil),
      });
      if (!res.ok) throw new Error('Opslaan mislukt');
      const data = await res.json();
      setPerfil(data);
      showMsg('success', 'Commissies opgeslagen.');
    } catch (err) { showMsg('error', err.message); }
  };

  const handleOpslaanNota = async () => {
    setGuardandoNota(true);
    try {
      const res = await fetch(`${API}/profile/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...perfil, notaAdmin }),
      });
      if (!res.ok) throw new Error('Opslaan mislukt');
      const data = await res.json();
      setPerfil(data);
      showMsg('success', 'Notitie opgeslagen.');
    } catch (err) { showMsg('error', err.message); }
    finally { setGuardandoNota(false); }
  };

  const getProjectPrice = (p) => (p.oferta?.precioTotalEstimado ?? p.oferta?.precioTotal) || null;

  const sortedProyectos = [...proyectos].sort((a, b) => {
    const oA = getStatusMeta(a.estado).order;
    const oB = getStatusMeta(b.estado).order;
    if (oA !== oB) return oA - oB;
    return new Date(b.fechaInicio || b.fechaCreacion || 0) - new Date(a.fechaInicio || a.fechaCreacion || 0);
  });

  const totalStartedProjects = proyectos.length;
  const signedProjects = proyectos.filter(p => SIGNED_STATES.includes(p.estado)).length;
  const rejectedProjects = proyectos.filter(p => p.estado === 'rejected').length;
  const notCarriedOutProjects = Math.max(0, totalStartedProjects - signedProjects - rejectedProjects);
  const successPercentage = totalStartedProjects > 0
    ? Math.round((signedProjects / totalStartedProjects) * 100)
    : 0;

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' })
    : '�';

  if (cargando) return <p className="text-center py-12 text-gray-500">Laden...</p>;
  if (!perfil)  return <p className="text-center py-12 text-red-500">Elektricien niet gevonden</p>;

  const editData = editingPerfil ? perfilEdit : perfil;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Back */}
      <button onClick={() => navigate('/admin/clientes')}
        className="flex items-center gap-2 mb-5 text-xs font-bold uppercase tracking-widest transition"
        style={{ color: '#29ace3' }}>
        <ArrowLeft size={15} /> Terug naar elektriciens
      </button>

      {/* Toast */}
      {mensaje && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          mensaje.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {mensaje.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {mensaje.text}
        </div>
      )}

      {/* -- Profile card -- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">

        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 bg-gray-100 border border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              {perfil.logo
                ? <img src={perfil.logo} alt="bedrijfslogo" className="w-full h-full object-contain" />
                : <span className="text-gray-400 text-xs font-semibold">Logo</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {`${perfil.nombre || ''} ${perfil.apellidos || ''}`.trim() || perfil.email}
                </h1>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${perfil.profileCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                  {perfil.profileCompleted ? '? Profiel compleet' : '? Profiel onvolledig'}
                </span>
              </div>
              {perfil.empresa && <p className="text-sm text-gray-500">{perfil.empresa}</p>}
              <p className="text-xs text-gray-400 mt-0.5">{perfil.email}</p>
            </div>
          </div>

          <div className={`shrink-0 rounded-xl border px-4 py-3 min-w-[280px] ${getPerformanceColor(successPercentage)}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Succesratio</p>
                <p className="text-3xl font-bold leading-none mt-1">{successPercentage}%</p>
              </div>
              <div className="text-right text-xs font-semibold opacity-80">
                <p>{signedProjects}/{totalStartedProjects} geaccepteerd</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div className="bg-white/55 rounded-lg px-2 py-2">
                <p className="text-[11px] uppercase tracking-wide opacity-70">Deals</p>
                <p className="text-lg font-bold">{signedProjects}</p>
              </div>
              <div className="bg-white/55 rounded-lg px-2 py-2">
                <p className="text-[11px] uppercase tracking-wide opacity-70">Afgewezen</p>
                <p className="text-lg font-bold">{rejectedProjects}</p>
              </div>
              <div className="bg-white/55 rounded-lg px-2 py-2">
                <p className="text-[11px] uppercase tracking-wide opacity-70">Niet afgerond</p>
                <p className="text-lg font-bold">{notCarriedOutProjects}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-4">
          <FieldItem label="Voornaam"       value={editData.nombre    || ''} editing={editingPerfil} onChange={v => handleFieldChange('nombre', v)} />
          <FieldItem label="Achternaam"     value={editData.apellidos || ''} editing={editingPerfil} onChange={v => handleFieldChange('apellidos', v)} />
          <FieldItem label="Bedrijfsnaam"   value={editData.empresa   || ''} editing={editingPerfil} onChange={v => handleFieldChange('empresa', v)} />
          <FieldItem label="BTW / NIF"      value={editData.nif       || ''} editing={editingPerfil} onChange={v => handleFieldChange('nif', v)} />
          <FieldItem label="E-mailadres (account)" value={editData.email     || ''} editing={false} />
          <FieldItem label="E-mailadres 2"        value={editData.email2    || ''} editing={editingPerfil} onChange={v => handleFieldChange('email2', v)} />
          <FieldItem label="Telefoon"       value={editData.telefono  || ''} editing={editingPerfil} onChange={v => handleFieldChange('telefono', v)} />
          <FieldItem label="Mobiel"         value={editData.mobiel    || ''} editing={editingPerfil} onChange={v => handleFieldChange('mobiel', v)} />
          <FieldItem label="IBAN"           value={editData.iban      || ''} editing={editingPerfil} onChange={v => handleFieldChange('iban', v)} />
        </div>

        {/* Address */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="col-span-2">
            <FieldItem label="Straat" value={editData.direccion   || ''} editing={editingPerfil} onChange={v => handleFieldChange('direccion', v)} />
          </div>
          <FieldItem label="Nr." value={editData.huisnummer || ''} editing={editingPerfil} onChange={v => handleFieldChange('huisnummer', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <FieldItem label="Postcode" value={editData.codigoPostal || ''} editing={editingPerfil} onChange={v => handleFieldChange('codigoPostal', v)} />
          <FieldItem label="Stad"     value={editData.ciudad       || ''} editing={editingPerfil} onChange={v => handleFieldChange('ciudad', v)} />
        </div>

        {/* Bewerken / Opslaan / Annuleren */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          {!editingPerfil ? (
            <button onClick={handleBewerken}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition">
              <Pencil size={14} /> Bewerken
            </button>
          ) : (
            <>
              <button onClick={handleOpslaanPerfil} disabled={guardandoPerfil}
                className="flex items-center gap-2 px-4 py-2 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                <Save size={14} /> {guardandoPerfil ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button onClick={handleAnnuleren}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition">
                <X size={14} /> Annuleren
              </button>
            </>
          )}
        </div>

        {/* Admin note */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <StickyNote size={15} className="text-yellow-500" /> Interne notitie
          </label>
          <textarea
            rows={3}
            value={notaAdmin}
            onChange={e => setNotaAdmin(e.target.value)}
            placeholder="Voeg hier een interne notitie toe over deze elektricien..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#29ace3] outline-none resize-none transition"
          />
          <div className="flex justify-end mt-2">
            <button onClick={handleOpslaanNota} disabled={guardandoNota}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
              <Save size={14} /> {guardandoNota ? 'Opslaan...' : 'Notitie opslaan'}
            </button>
          </div>
        </div>
      </div>

      {/* -- Commission settings -- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
        <h2 className="text-sm font-bold text-[#1a6a8a] uppercase tracking-wide mb-1">
          Commissie-instellingen
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Stel het commissiepercentage in per kostencategorie. Alleen zichtbaar voor de beheerder.
        </p>
        <div className="space-y-1">
          <CommissionRow label="Type 1 � commissie op Inlabelbedrag"
            value={perfil.comisionTransporte ?? 0}
            onChange={v => setPerfil(p => ({ ...p, comisionTransporte: v }))}
            note="Van toepassing op het totale inlabelbedrag van het project" />
          <CommissionRow label="Type 2 � commissie hardware"
            value={perfil.comisionHardware ?? 0}
            onChange={v => setPerfil(p => ({ ...p, comisionHardware: v }))}
            note="Van toepassing op hardware- en materiaalkosten" />
          <CommissionRow label="Type 3 � commissie werkuren"
            value={perfil.comisionHorasTrabajo ?? 0}
            onChange={v => setPerfil(p => ({ ...p, comisionHorasTrabajo: v }))}
            note="Van toepassing op de arbeidskosten" />
          <CommissionRow label="Type 4 � 0% commissie (diensten, verzekeringen, ...)"
            value={0} readOnly
            note="Vastgesteld op 0% � diensten en verzekeringen altijd uitgesloten" />
          <CommissionRow label="Type 5 � speciale commissie"
            value={perfil.comisionEspecial ?? 0}
            onChange={v => setPerfil(p => ({ ...p, comisionEspecial: v }))}
            note="Speciale commissie individueel overeengekomen" />
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSaveCommission}
            className="flex items-center gap-2 px-4 py-2 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg text-sm font-semibold transition">
            <Save size={14} /> Commissies opslaan
          </button>
        </div>
      </div>

      {/* -- End clients -- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={18} className="text-indigo-500" /> Eindklanten ({clientes.length})
        </h2>
        {clientes.length === 0 ? (
          <p className="text-gray-400 text-sm">Nog geen eindklanten geregistreerd.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {clientes.map(c => (
              <div key={c._id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{c.nombre} {c.apellidos}</p>
                  <p className="text-xs text-gray-400">
                    {[c.email, c.telefono].filter(Boolean).join(' � ')}
                  </p>
                </div>
                {c.ciudad && <span className="text-xs text-gray-400">{c.ciudad}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -- Projects -- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FolderOpen size={18} className="text-blue-500" /> Projecten ({proyectos.length})
        </h2>
        {sortedProyectos.length === 0 ? (
          <p className="text-gray-400 text-sm">Nog geen projecten.</p>
        ) : (
          <div className="space-y-2">
            {sortedProyectos.map(p => {
              const meta  = getStatusMeta(p.estado);
              const price = getProjectPrice(p);
              const title = p.tituloAutomatico || p.nombreCasa || 'Project';
              const date  = formatDate(p.fechaInicio || p.fechaCreacion);
              return (
                <button key={p._id} onClick={() => navigate(`/proyecto/${p._id}`)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:border-[#a8dcf0] hover:bg-[#eaf7fd] transition group">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${meta.color}`}>
                      {meta.label}
                    </span>
                    {price !== null && (
                      <p className={`text-xs font-bold mt-1 ${p.estado === 'paid' ? 'text-green-600' : 'text-gray-500'}`}>
                        �{price.toLocaleString('nl-BE', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#29ace3] shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// -- Sub-components ------------------------------------------

function FieldItem({ label, value, editing, onChange }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      {editing && onChange ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none text-sm transition"
        />
      ) : (
        <p className={`text-sm py-1 px-1 ${value ? 'text-gray-900' : 'text-gray-400 italic'}`}>
          {value || '�'}
        </p>
      )}
    </div>
  );
}

function CommissionRow({ label, value, onChange, readOnly, note }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {readOnly ? (
          <span className="text-base font-bold text-gray-400 w-16 text-right">0%</span>
        ) : (
          <>
            <input
              type="number" min="0" max="100" step="0.5"
              value={value}
              onChange={e => onChange && onChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-[#29ace3] outline-none"
            />
            <span className="text-gray-600 font-bold text-sm">%</span>
          </>
        )}
      </div>
    </div>
  );
}

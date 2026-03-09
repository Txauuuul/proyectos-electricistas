import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Save, CheckCircle, AlertCircle, Users, FolderOpen,
} from 'lucide-react';

export default function AdminClientDetail() {
  const { id } = useParams();
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!token || usuario?.rol !== 'administrador') { navigate('/dashboard'); return; }
    cargarDatos();
  }, [id, token]);

  const cargarDatos = async () => {
    try {
      const [perfilRes, proyRes, clientesRes] = await Promise.all([
        fetch(`${API}/profile/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/proyectos`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/clientes?usuarioId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (perfilRes.ok) setPerfil(await perfilRes.json());
      if (proyRes.ok) {
        const all = await proyRes.json();
        setProyectos(all.filter(p => (p.usuarioId?._id || p.usuarioId) === id));
      }
      if (clientesRes.ok) setClientes(await clientesRes.json());
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const handleChange = (field, value) => {
    setPerfil(prev => ({ ...prev, [field]: value }));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API}/profile/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(perfil),
      });
      if (!res.ok) throw new Error('Error saving');
      const data = await res.json();
      setPerfil(data);
      setMensaje({ type: 'success', text: 'Client data saved!' });
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      setMensaje({ type: 'error', text: err.message });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="text-center py-12 text-gray-500">Loading...</p>;
  if (!perfil) return <p className="text-center py-12 text-red-500">Client not found</p>;

  const getStatusBadge = (estado) => {
    const colors = {
      created: 'bg-blue-100 text-blue-700', offer_ready: 'bg-purple-100 text-purple-700',
      offer_sent: 'bg-indigo-100 text-indigo-700', working: 'bg-yellow-100 text-yellow-700',
      pending_payment: 'bg-orange-100 text-orange-700', paid: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[estado] || 'bg-gray-100 text-gray-700'}`}>{estado}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Back */}
      <button onClick={() => navigate('/admin/clientes')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 text-sm">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      {/* Message */}
      {mensaje && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          mensaje.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {mensaje.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {mensaje.text}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">

        {/* Foto + Logo header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              {perfil.logo ? (
                <img src={perfil.logo} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-400 text-xs font-semibold">No logo</span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                My administration panel
                <span className="ml-2 inline-block w-3 h-3 rounded-full bg-purple-500 align-middle" />
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{perfil.email}</p>
              <p className={`text-xs mt-1 font-semibold ${perfil.profileCompleted ? 'text-green-600' : 'text-orange-500'}`}>
                {perfil.profileCompleted ? '✓ Profile complete' : '⚠ Profile incomplete'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-10 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs font-semibold">
              Logo
            </div>
            <button onClick={handleGuardar} disabled={guardando}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50">
              <Save size={15} /> {guardando ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Two-column field grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          {/* Left */}
          <div className="space-y-4">
            <Field label="Voornaam (First name)" value={perfil.nombre || ''} onChange={v => handleChange('nombre', v)} />
            <Field label="Achternaam (Last name)" value={perfil.apellidos || ''} onChange={v => handleChange('apellidos', v)} />
            <Field label="Bedrijfsnaam (Company)" value={perfil.empresa || ''} onChange={v => handleChange('empresa', v)} />
            <Field label="BTW nummer (VAT / NIF)" value={perfil.nif || ''} onChange={v => handleChange('nif', v)} />
          </div>
          {/* Right */}
          <div className="space-y-4">
            <Field label="Email 1 (login)" value={perfil.email || ''} disabled />
            <Field label="Email 2" value={perfil.email2 || ''} onChange={v => handleChange('email2', v)} />
            <Field label="Telefoon" value={perfil.telefono || ''} onChange={v => handleChange('telefono', v)} />
            <Field label="Mobiel" value={perfil.mobiel || ''} onChange={v => handleChange('mobiel', v)} />
            <Field label="IBAN nummer" value={perfil.iban || ''} onChange={v => handleChange('iban', v)} />
          </div>
        </div>

        {/* Address row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2">
            <Field label="Straat (Street)" value={perfil.direccion || ''} onChange={v => handleChange('direccion', v)} />
          </div>
          <Field label="Nr." value={perfil.huisnummer || ''} onChange={v => handleChange('huisnummer', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Postcode" value={perfil.codigoPostal || ''} onChange={v => handleChange('codigoPostal', v)} />
          <Field label="Stad (City)" value={perfil.ciudad || ''} onChange={v => handleChange('ciudad', v)} />
        </div>

        {/* Login */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Login: </span>
            <a href={`mailto:${perfil.email}`} className="text-blue-600 hover:underline">{perfil.email}</a>
          </p>
        </div>
      </div>

      {/* Commission settings — admin editable */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-1">
          Commission settings (ONLY admin can fill this in, fixed)
        </h2>
        <p className="text-xs text-gray-400 mb-5">Set the commission percentage for each cost category. Electrician sees these as read-only.</p>
        <div className="space-y-4">
          <CommissionRow
            label="Type 1 — commissie op Inlabelbedrag"
            value={perfil.comisionTransporte ?? 0}
            onChange={v => handleChange('comisionTransporte', v)}
            note="Applies to the total labeled amount of the project"
          />
          <CommissionRow
            label="Type 2 — commissie Hardware"
            value={perfil.comisionHardware ?? 0}
            onChange={v => handleChange('comisionHardware', v)}
            note="Applies to hardware and material costs"
          />
          <CommissionRow
            label="Type 3 — commissie werkuren"
            value={perfil.comisionHorasTrabajo ?? 0}
            onChange={v => handleChange('comisionHorasTrabajo', v)}
            note="Applies to labor / work hour costs"
          />
          <CommissionRow
            label="Type 4 — commission 0% (services, verzekeringen, ...)"
            value={0}
            readOnly
            note="Fixed at 0% — services and insurance are always excluded"
          />
          <CommissionRow
            label="Type 5 — speciale commissie"
            value={perfil.comisionEspecial ?? 0}
            onChange={v => handleChange('comisionEspecial', v)}
            note="Special commission agreed individually"
          />
        </div>
      </div>

      {/* List clients */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={18} /> List clients ({clientes.length})
        </h2>
        {clientes.length === 0 ? (
          <p className="text-gray-400 text-sm">No end-clients registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Phone</th>
                  <th className="pb-2">City</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-semibold text-gray-900">{c.nombre} {c.apellidos}</td>
                    <td className="py-2 pr-4 text-gray-500">{c.email || '—'}</td>
                    <td className="py-2 pr-4 text-gray-500">{c.telefono || '—'}</td>
                    <td className="py-2 text-gray-500">{c.ciudad || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FolderOpen size={18} /> Projects ({proyectos.length})
        </h2>
        {proyectos.length === 0 ? (
          <p className="text-gray-400 text-sm">No projects yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {proyectos.map(p => (
              <button key={p._id} onClick={() => navigate(`/proyecto/${p._id}`)}
                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition text-sm flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{p.tituloAutomatico || p.nombreCasa}</p>
                  <p className="text-xs text-gray-500">{new Date(p.fechaInicio).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(p.estado)}
                  {p.estado === 'paid' && p.oferta?.precioTotal && (
                    <p className="text-xs text-green-600 font-bold mt-1">€{p.oferta.precioTotal.toFixed(2)}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function Field({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled || !onChange}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-sm ${
          (disabled || !onChange) ? 'bg-gray-100 text-gray-500' : ''
        }`}
      />
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
              className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-gray-600 font-bold text-sm">%</span>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Save, CheckCircle, AlertCircle, Lock, Users, Upload, X, Euro, TrendingUp } from 'lucide-react';

export default function MyProfile() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Commission history
  const [proyectosPagados, setProyectosPagados] = useState([]);
  const [cargandoComisiones, setCargandoComisiones] = useState(false);

  // Password change
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [cambioPass, setCambioPass] = useState(false);
  const [mensajePass, setMensajePass] = useState(null);

  const API = import.meta.env.VITE_API_URL;
  const logoRef = useRef(null);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleChange('logo', ev.target.result);
    reader.readAsDataURL(file);
    if (logoRef.current) logoRef.current.value = '';
  };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    cargarPerfil();
    // Load paid projects for commission summary (electricistas only)
    if (usuario?.rol === 'electricista') {
      setCargandoComisiones(true);
      fetch(`${API}/proyectos`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const arr = Array.isArray(data) ? data : (data.proyectos || []);
          setProyectosPagados(arr.filter(p => p.estado === 'paid'));
        })
        .catch(console.error)
        .finally(() => setCargandoComisiones(false));
    }
  }, [token]);

  const cargarPerfil = async () => {
    try {
      const res = await fetch(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fout bij laden van profiel');
      const data = await res.json();
      setPerfil(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (field, value) => {
    setPerfil(prev => ({ ...prev, [field]: value }));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API}/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(perfil),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Fout bij opslaan van profiel'); }
      const data = await res.json();
      setPerfil(data);
      const stored = JSON.parse(localStorage.getItem('usuario') || '{}');
      localStorage.setItem('usuario', JSON.stringify({ ...stored, nombre: data.nombre }));
      setMensaje({ type: 'success', text: 'Profiel succesvol opgeslagen!' });
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      setMensaje({ type: 'error', text: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const handleCambioContrasena = async () => {
    setMensajePass(null);
    if (!contrasenaActual || !nuevaContrasena || !confirmarContrasena) {
      setMensajePass({ type: 'error', text: 'Vul alle wachtwoordvelden in.' }); return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setMensajePass({ type: 'error', text: 'Nieuwe wachtwoorden komen niet overeen.' }); return;
    }
    if (nuevaContrasena.length < 6) {
      setMensajePass({ type: 'error', text: 'Nieuw wachtwoord moet minstens 6 tekens bevatten.' }); return;
    }
    setCambioPass(true);
    try {
      const res = await fetch(`${API}/profile/change-password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrasenaActual, nuevaContrasena }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fout');
      setMensajePass({ type: 'success', text: 'Wachtwoord succesvol bijgewerkt!' });
      setContrasenaActual(''); setNuevaContrasena(''); setConfirmarContrasena('');
      setTimeout(() => setMensajePass(null), 4000);
    } catch (err) {
      setMensajePass({ type: 'error', text: err.message });
    } finally {
      setCambioPass(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-600">Profiel laden...</p>
      </div>
    );
  }

  if (!perfil) return null;

  const fields = [
    perfil.nombre, perfil.apellidos, perfil.empresa, perfil.nif,
    perfil.email, perfil.telefono, perfil.iban,
    perfil.direccion, perfil.huisnummer, perfil.codigoPostal, perfil.ciudad,
  ];
  const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="rounded shadow-sm p-5 mb-6" style={{ background: '#1a1a1a' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-white uppercase tracking-wide">
              Mijn<span style={{ color: '#29ace3' }}> administratiepaneel</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Houd uw persoonlijke en bedrijfsgegevens up-to-date.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Profielvolledigheid</p>
            <p className={`text-lg font-bold ${pct === 100 ? 'text-green-400' : 'text-orange-400'}`}>{pct}%</p>
            <div className="w-32 bg-gray-700 rounded-full h-2 mt-1">
              <div className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-[#29ace3]'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Save message */}
      {mensaje && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          mensaje.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {mensaje.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {mensaje.text}
        </div>
      )}

      {/* Profile form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">

        {/* Logo upload row (top of form) */}
        <div className="flex items-center justify-between mb-6 pb-5 border-b">
          <div className="flex items-center gap-4">
            <div
              onClick={() => logoRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#29ace3] hover:bg-[#eaf7fd] transition overflow-hidden shrink-0"
              title="Upload uw logo"
            >
              {perfil.logo ? (
                <img src={perfil.logo} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <>
                  <Upload size={20} className="text-gray-400 mb-0.5" />
                  <span className="text-xs text-gray-400">Logo</span>
                </>
              )}
            </div>
            {perfil.logo && (
              <button onClick={() => handleChange('logo', '')} className="text-red-500 hover:text-red-700 p-1" title="Logo verwijderen">
                <X size={16} />
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </div>
          <p className="text-xs text-gray-400 text-right max-w-xs">Klik op het logo-vak om uw bedrijfslogo te uploaden. Dit logo verschijnt op uw documenten.</p>
        </div>

        {/* Two-column info grid matching image layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          {/* Left: 4 identity fields */}
          <div className="space-y-4">
            <Field label="Voornaam *" value={perfil.nombre || ''} onChange={v => handleChange('nombre', v)} />
            <Field label="Achternaam *" value={perfil.apellidos || ''} onChange={v => handleChange('apellidos', v)} />
            <Field label="Bedrijfsnaam *" value={perfil.empresa || ''} onChange={v => handleChange('empresa', v)} />
            <Field label="BTW-nummer *" value={perfil.nif || ''} onChange={v => handleChange('nif', v)} />
          </div>
          {/* Right: 5 contact fields */}
          <div className="space-y-4">
            <Field label="Email 1 (login)" value={perfil.email || ''} disabled />
            <Field label="Email 2" value={perfil.email2 || ''} onChange={v => handleChange('email2', v)} />
            <Field label="Telefoon *" value={perfil.telefono || ''} onChange={v => handleChange('telefono', v)} />
            <Field label="Mobiel" value={perfil.mobiel || ''} onChange={v => handleChange('mobiel', v)} />
            <Field label="IBAN nummer *" value={perfil.iban || ''} onChange={v => handleChange('iban', v)} />
          </div>
        </div>

        {/* Address row: Straat + Nr */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2">
            <Field label="Straat *" value={perfil.direccion || ''} onChange={v => handleChange('direccion', v)} />
          </div>
          <div>
            <Field label="Nr." value={perfil.huisnummer || ''} onChange={v => handleChange('huisnummer', v)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Field label="Postcode *" value={perfil.codigoPostal || ''} onChange={v => handleChange('codigoPostal', v)} />
          <Field label="Stad *" value={perfil.ciudad || ''} onChange={v => handleChange('ciudad', v)} />
        </div>

        {/* Login display */}
        <div className="border-t pt-4 mb-2">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Login: </span>
            <a href={`mailto:${perfil.email}`} className="text-[#29ace3] hover:underline">{perfil.email}</a>
          </p>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 px-6 py-3 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg font-semibold disabled:opacity-50 transition"
          >
            <Save size={18} />
            {guardando ? 'Opslaan...' : 'Profiel opslaan'}
          </button>
        </div>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Lock size={18} /> Wachtwoord wijzigen
        </h2>
        {mensajePass && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            mensajePass.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {mensajePass.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {mensajePass.text}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Huidig wachtwoord</label>
            <input type="password" value={contrasenaActual} onChange={e => setContrasenaActual(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none text-sm" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nieuw wachtwoord</label>
            <input type="password" value={nuevaContrasena} onChange={e => setNuevaContrasena(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none text-sm" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Bevestig nieuw wachtwoord</label>
            <input type="password" value={confirmarContrasena} onChange={e => setConfirmarContrasena(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none text-sm" placeholder="••••••••" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleCambioContrasena} disabled={cambioPass}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold text-sm disabled:opacity-50 transition">
            <Lock size={16} />
            {cambioPass ? 'Bijwerken...' : 'Wachtwoord bijwerken'}
          </button>
        </div>
      </div>

      {/* My clients shortcut */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Users size={18} /> Klantenlijst
        </h2>
        <p className="text-sm text-gray-500 mb-4">Beheer de eindklanten die u op het platform hebt geregistreerd.</p>
        <button onClick={() => navigate('/mis-clientes')}
          className="px-5 py-2.5 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg font-semibold text-sm transition">
          Ga naar mijn klanten →
        </button>
      </div>

      {/* Commissions summary (electricistas only) */}
      {usuario?.rol === 'electricista' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Euro size={18} className="text-green-600" /> Mijn commissies
          </h2>
          {cargandoComisiones ? (
            <p className="text-sm text-gray-400 text-center py-6">Commissies laden...</p>
          ) : proyectosPagados.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nog geen betaalde projecten</p>
              <p className="text-xs text-gray-300 mt-1">Commissies verschijnen hier zodra projecten als betaald zijn gemarkeerd</p>
            </div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Betaalde projecten</p>
                  <p className="text-2xl font-bold text-green-700">{proyectosPagados.length}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Totale commissie</p>
                  <p className="text-2xl font-bold text-purple-700">
                    €{proyectosPagados.reduce((s, p) => s + (p.commissieResultaat?.totaleCommissie || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-500 uppercase">Project</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">Adres</th>
                      <th className="text-right px-3 py-2 text-xs font-bold text-gray-500 uppercase">Commissie</th>
                      <th className="text-right px-3 py-2 text-xs font-bold text-gray-500 uppercase hidden md:table-cell">Betaald op</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {proyectosPagados.map(p => {
                      const lastPaid = p.historialEstados?.find(h => h.estadoNuevo === 'paid');
                      return (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-semibold text-gray-900">{p.nombreCasa}</td>
                          <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{p.direccion}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-green-700">
                            €{(p.commissieResultaat?.totaleCommissie || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-400 hidden md:table-cell text-xs">
                            {lastPaid ? new Date(lastPaid.fecha).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}

function Field({ label, value, onChange, disabled, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none transition text-sm ${
          disabled ? 'bg-gray-100 text-gray-500' : ''
        }`}
      />
    </div>
  );
}

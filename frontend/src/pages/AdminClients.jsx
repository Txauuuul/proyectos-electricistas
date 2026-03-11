import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, User, ChevronRight, Mail, Phone, Building } from 'lucide-react';

export default function AdminClients() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  const [electricistas, setElectricistas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!token || usuario?.rol !== 'administrador') { navigate('/dashboard'); return; }
    cargar();
  }, [token]);

  const cargar = async () => {
    try {
      const res = await fetch(`${API}/profile/all/electricistas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setElectricistas(await res.json());
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const filtrados = electricistas.filter(e => {
    const q = busqueda.toLowerCase();
    return (e.nombre || '').toLowerCase().includes(q) ||
      (e.apellidos || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.empresa || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen" style={{ background: '#f4f6f8' }}>
      <header className="shadow mb-0" style={{ background: '#1a1a1a' }}>
        <div className="max-w-5xl mx-auto px-4 py-5">
          <h1 className="text-lg font-extrabold text-white uppercase tracking-wide">
            Klanten<span style={{ color: '#29ace3' }}>beheer</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Alle geregistreerde elektriciens en clienten.</p>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text" placeholder="Zoek op naam, e-mail of bedrijf..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none"
        />
      </div>

      {cargando ? (
        <p className="text-gray-500 text-center py-12">Laden...</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
          Geen klanten gevonden
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(e => (
            <div
              key={e._id}
              onClick={() => navigate(`/admin/clientes/${e._id}`)}
              className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#d0eef9] rounded-full flex items-center justify-center text-[#29ace3] font-bold text-lg">
                  {(e.nombre || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{e.nombre} {e.apellidos || ''}</p>
                  <div className="flex gap-4 text-sm text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1"><Mail size={12} /> {e.email}</span>
                    {e.telefono && <span className="flex items-center gap-1"><Phone size={12} /> {e.telefono}</span>}
                    {e.empresa && <span className="flex items-center gap-1"><Building size={12} /> {e.empresa}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <p className="text-gray-500">Projecten: <span className="font-bold text-gray-900">{e.totalContratosCompletados || 0}</span></p>
                  <p className={`text-xs ${e.profileCompleted ? 'text-green-600' : 'text-orange-500'}`}>
                    {e.profileCompleted ? 'Profiel compleet' : 'Profiel onvolledig'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

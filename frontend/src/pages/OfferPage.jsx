import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, Send, Upload, Euro, Calendar, FileText, Trash2 } from 'lucide-react';

export default function OfferPage() {
  const { id } = useParams();
  const { token, usuario } = useAuth();
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Form state
  const [precioTotalEstimado, setPrecioTotalEstimado] = useState('');
  const [fechaInicioInstalacion, setFechaInicioInstalacion] = useState('');
  const [duracionEstimadaDias, setDuracionEstimadaDias] = useState('');
  const [notasEmpresa, setNotasEmpresa] = useState('');
  const [documentoPDF, setDocumentoPDF] = useState(null);
  const [planosModificados, setPlanosModificados] = useState([]);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (usuario?.rol !== 'administrador') {
      navigate('/dashboard');
      return;
    }
    cargarDatos();
  }, [id, token]);

  const cargarDatos = async () => {
    try {
      // Load project
      const res = await fetch(`${API}/proyectos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProyecto(data);

      // Load existing offer if any
      if (data.oferta) {
        setPrecioTotalEstimado(data.oferta.precioTotalEstimado ?? data.oferta.precioTotal ?? '');
        setFechaInicioInstalacion(data.oferta.fechaInicioInstalacion ? data.oferta.fechaInicioInstalacion.split('T')[0] : '');
        setDuracionEstimadaDias(data.oferta.duracionEstimadaDias || '');
        setNotasEmpresa(data.oferta.notasEmpresa || '');
        setDocumentoPDF(data.oferta.documentoPDF || null);
        setPlanosModificados(data.oferta.planosModificados || []);
      }
    } catch (error) {
      console.error('Fout bij laden van gegevens:', error);
    } finally {
      setCargando(false);
    }
  };

  // Handle PDF upload
  const handlePDFUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Upload een PDF-bestand');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDocumentoPDF(reader.result);
    reader.readAsDataURL(file);
  };

  // Handle modified floor plan upload
  const handlePlanUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setPlanosModificados(prev => [...prev, {
          nombre: file.name.replace(/\.[^.]+$/, ''),
          imagenBase64: reader.result,
          comentarios: '',
          marcadores: [],
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Save offer (without sending)
  const handleSave = async () => {
    setGuardando(true);
    try {
      const body = {
        planosModificados,
        presupuestoItems: [],
        precioTotalEstimado: precioTotalEstimado !== '' ? parseFloat(precioTotalEstimado) : null,
        precioTotal: precioTotalEstimado !== '' ? parseFloat(precioTotalEstimado) : null,
        fechaInicioInstalacion: fechaInicioInstalacion || null,
        duracionEstimadaDias: duracionEstimadaDias ? parseInt(duracionEstimadaDias) : null,
        notasEmpresa,
        documentoPDF,
      };

      const res = await fetch(`${API}/proyectos/${id}/oferta`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${res.status}`);
      }
      alert('Offerte succesvol opgeslagen!');
      await cargarDatos();
    } catch (error) {
      alert('Fout bij opslaan van offerte: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  // Send offer to client
  const handleSend = async () => {
    if (!window.confirm('Weet u zeker dat u deze offerte naar de klant wilt verzenden? De klant ontvangt een e-mailmelding.')) return;

    // Save first
    await handleSave();

    setEnviando(true);
    try {
      const res = await fetch(`${API}/proyectos/${id}/enviar-oferta`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Offerte verzenden mislukt');
      }
      alert('Offerte naar de klant verzonden! De klant ontvangt een e-mailmelding.');
      navigate('/dashboard');
    } catch (error) {
      alert('Fout bij verzenden van offerte: ' + error.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <p className="text-gray-600 text-lg">Project laden...</p>
      </div>
    );
  }

  if (!proyecto) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <p className="text-red-600 text-lg">Project niet gevonden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      {/* Header */}
      <header className="shadow" style={{ background: '#1a1a1a' }}>
        <div className="max-w-5xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/proyecto/${id}`)} style={{ color: '#29ace3' }}>
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-white uppercase tracking-wide">
                Offerte<span style={{ color: '#29ace3' }}> voorbereiden</span>
              </h1>
              <p className="text-xs text-gray-400">{proyecto.nombreCasa} — {proyecto.direccion}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg font-semibold disabled:opacity-50 transition"
            >
              <Save size={18} /> {guardando ? 'Opslaan...' : 'Concept opslaan'}
            </button>
            <button
              onClick={handleSend}
              disabled={enviando}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
            >
              <Send size={18} /> {enviando ? 'Verzenden...' : 'Naar klant verzenden'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Client Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} /> Projectinformatie
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Klant</p>
              <p className="font-semibold">{proyecto.usuarioId?.nombre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">E-mail</p>
              <p className="font-semibold">{proyecto.usuarioId?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Adres</p>
              <p className="font-semibold">{proyecto.direccion}</p>
            </div>
            <div>
              <p className="text-gray-500">Plattegronden</p>
              <p className="font-semibold">{proyecto.planos?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Client's Original Floor Plans (read-only) */}
        {proyecto.planos && proyecto.planos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Plattegronden van de klant (origineel)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proyecto.planos.map((plano, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  <img src={plano.imagenBase64} alt={`Plan ${idx+1}`} className="w-full h-48 object-contain bg-gray-100" />
                  <div className="p-2 text-sm text-gray-600">
                    <p className="font-semibold">{plano.nombre || `Plattegrond ${idx+1}`}</p>
                    {plano.comentarios && <p className="text-xs">{plano.comentarios}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modified Floor Plans (company proposals) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Upload size={20} /> Gewijzigde plattegronden (uw voorstellen)
          </h2>
          <p className="text-sm text-gray-500 mb-4">Upload uw aangepaste plattegronden met de voorgestelde installaties</p>

          {planosModificados.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {planosModificados.map((plano, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden relative group">
                  <img src={plano.imagenBase64} alt={`Modified ${idx+1}`} className="w-full h-48 object-contain bg-gray-100" />
                  <div className="p-2">
                    <input
                      type="text"
                      value={plano.nombre}
                      onChange={(e) => {
                        const updated = [...planosModificados];
                        updated[idx].nombre = e.target.value;
                        setPlanosModificados(updated);
                      }}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="Naam van het plan"
                    />
                  </div>
                  <button
                    onClick={() => setPlanosModificados(planosModificados.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm font-semibold transition">
            <Upload size={16} /> Plannen uploaden
            <input type="file" accept="image/*" multiple onChange={handlePlanUpload} className="hidden" />
          </label>
        </div>

        {/* Estimated Total Price */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Euro size={20} /> Geschatte totaalprijs
          </h2>
          <p className="text-sm text-gray-500 mb-4">Indicatieve totaalprijs voor de klant. Het exacte bedrag wordt bepaald zodra het werk is voltooid.</p>
          <div className="max-w-xs">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Geschatte totaalprijs (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={precioTotalEstimado}
              onChange={(e) => setPrecioTotalEstimado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none text-lg font-semibold"
              placeholder="0.00"
            />
          </div>
          {precioTotalEstimado !== '' && parseFloat(precioTotalEstimado) > 0 && (
            <p className="mt-3 text-green-700 font-bold text-xl">€ {parseFloat(precioTotalEstimado).toLocaleString('nl-BE', { minimumFractionDigits: 2 })}</p>
          )}
        </div>

        {/* Installation Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} /> Installatiegegevens
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Voorgestelde startdatum</label>
              <input
                type="date"
                value={fechaInicioInstalacion}
                onChange={(e) => setFechaInicioInstalacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Geschatte duur (dagen)</label>
              <input
                type="number"
                min="1"
                value={duracionEstimadaDias}
                onChange={(e) => setDuracionEstimadaDias(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none"
                placeholder="bijv. 14"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Aanvullende notities</h2>
          <textarea
            value={notasEmpresa}
            onChange={(e) => setNotasEmpresa(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29ace3] outline-none resize-none"
            placeholder="Extra informatie voor de klant..."
          />
        </div>

        {/* Contract PDF Upload */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} /> Contractdocument (PDF)
          </h2>
          <p className="text-sm text-gray-500 mb-4">Upload het contract- of voorwaardenbestand dat de klant moet lezen en ondertekenen</p>

          {documentoPDF && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-green-700 font-semibold">✅ PDF-document geüpload</span>
              <button
                onClick={() => setDocumentoPDF(null)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Verwijderen
              </button>
            </div>
          )}

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm font-semibold transition">
            <Upload size={16} /> {documentoPDF ? 'PDF vervangen' : 'PDF uploaden'}
            <input type="file" accept="application/pdf" onChange={handlePDFUpload} className="hidden" />
          </label>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-4 pb-8">
          <button
            onClick={() => navigate(`/proyecto/${id}`)}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={guardando}
            className="flex items-center gap-2 px-6 py-3 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg font-semibold disabled:opacity-50 transition"
          >
            <Save size={18} /> {guardando ? 'Opslaan...' : 'Concept opslaan'}
          </button>
          <button
            onClick={handleSend}
            disabled={enviando}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
          >
            <Send size={18} /> {enviando ? 'Verzenden...' : 'Naar klant verzenden'}
          </button>
        </div>
      </main>
    </div>
  );
}

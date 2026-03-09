import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Save, Send, Upload, DollarSign, Calendar, FileText } from 'lucide-react';

export default function OfferPage() {
  const { id } = useParams();
  const { token, usuario } = useAuth();
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Form state
  const [presupuestoItems, setPresupuestoItems] = useState([]);
  const [fechaInicioInstalacion, setFechaInicioInstalacion] = useState('');
  const [duracionEstimadaDias, setDuracionEstimadaDias] = useState('');
  const [costeHardware, setCosteHardware] = useState(0);
  const [costeHorasTrabajo, setCosteHorasTrabajo] = useState(0);
  const [costeTransporte, setCosteTransporte] = useState(0);
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
        setPresupuestoItems(data.oferta.presupuestoItems || []);
        setFechaInicioInstalacion(data.oferta.fechaInicioInstalacion ? data.oferta.fechaInicioInstalacion.split('T')[0] : '');
        setDuracionEstimadaDias(data.oferta.duracionEstimadaDias || '');
        setCosteHardware(data.oferta.costeHardware || 0);
        setCosteHorasTrabajo(data.oferta.costeHorasTrabajo || 0);
        setCosteTransporte(data.oferta.costeTransporte || 0);
        setNotasEmpresa(data.oferta.notasEmpresa || '');
        setDocumentoPDF(data.oferta.documentoPDF || null);
        setPlanosModificados(data.oferta.planosModificados || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setCargando(false);
    }
  };

  // Budget calculations
  const subtotal = presupuestoItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const precioTotal = subtotal;

  // Add budget item
  const addItem = () => {
    setPresupuestoItems([...presupuestoItems, { descripcion: '', cantidad: 1, precioUnitario: 0, total: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...presupuestoItems];
    updated[index][field] = value;
    if (field === 'cantidad' || field === 'precioUnitario') {
      updated[index].total = updated[index].cantidad * updated[index].precioUnitario;
    }
    setPresupuestoItems(updated);
  };

  const removeItem = (index) => {
    setPresupuestoItems(presupuestoItems.filter((_, i) => i !== index));
  };

  // Handle PDF upload
  const handlePDFUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
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
        presupuestoItems,
        presupuestoEstimado: subtotal,
        precioTotal,
        costeHardware,
        costeHorasTrabajo,
        costeTransporte,
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
      alert('Offer saved successfully!');
      await cargarDatos();
    } catch (error) {
      alert('Error saving offer: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  // Send offer to client
  const handleSend = async () => {
    if (!window.confirm('Are you sure you want to send this offer to the client? They will receive an email notification.')) return;

    // Save first if needed
    if (proyecto.estado === 'created' || presupuestoItems.length > 0) {
      await handleSave();
    }

    setEnviando(true);
    try {
      const res = await fetch(`${API}/proyectos/${id}/enviar-oferta`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send offer');
      }
      alert('Offer sent to client! They will receive an email notification.');
      navigate('/dashboard');
    } catch (error) {
      alert('Error sending offer: ' + error.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 text-lg">Loading project...</p>
      </div>
    );
  }

  if (!proyecto) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600 text-lg">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/proyecto/${id}`)} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Prepare Offer</h1>
              <p className="text-gray-600">{proyecto.nombreCasa} — {proyecto.direccion}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={guardando}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
            >
              <Save size={18} /> {guardando ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSend}
              disabled={enviando || presupuestoItems.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
            >
              <Send size={18} /> {enviando ? 'Sending...' : 'Send to Client'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Client Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} /> Project Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Client</p>
              <p className="font-semibold">{proyecto.usuarioId?.nombre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-semibold">{proyecto.usuarioId?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Address</p>
              <p className="font-semibold">{proyecto.direccion}</p>
            </div>
            <div>
              <p className="text-gray-500">Floor Plans</p>
              <p className="font-semibold">{proyecto.planos?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* Client's Original Floor Plans (read-only) */}
        {proyecto.planos && proyecto.planos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Client's Floor Plans (Original)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proyecto.planos.map((plano, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  <img src={plano.imagenBase64} alt={`Plan ${idx+1}`} className="w-full h-48 object-contain bg-gray-100" />
                  <div className="p-2 text-sm text-gray-600">
                    <p className="font-semibold">{plano.nombre || `Floor Plan ${idx+1}`}</p>
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
            <Upload size={20} /> Modified Floor Plans (Your Proposals)
          </h2>
          <p className="text-sm text-gray-500 mb-4">Upload your modified floor plans with the proposed installations</p>

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
                      placeholder="Plan name"
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
            <Upload size={16} /> Upload Plans
            <input type="file" accept="image/*" multiple onChange={handlePlanUpload} className="hidden" />
          </label>
        </div>

        {/* Budget Items */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign size={20} /> Budget Breakdown
          </h2>

          {presupuestoItems.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Description</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700 w-24">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700 w-32">Unit Price (€)</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-700 w-32">Total (€)</th>
                    <th className="px-4 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {presupuestoItems.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                          className="w-full px-2 py-1 border rounded"
                          placeholder="e.g., Electrical wiring"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => updateItem(idx, 'cantidad', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1 border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => updateItem(idx, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        €{item.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition"
          >
            <Plus size={16} /> Add Item
          </button>

          {/* Totals */}
          {presupuestoItems.length > 0 && (
            <div className="mt-6 border-t pt-4 space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-green-700">€{precioTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign size={20} /> Cost Breakdown
          </h2>
          <p className="text-sm text-gray-500 mb-4">Breakdown of costs for commission calculation</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hardware Cost (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costeHardware}
                onChange={(e) => setCosteHardware(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Work Hours Cost (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costeHorasTrabajo}
                onChange={(e) => setCosteHorasTrabajo(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Transport Cost (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costeTransporte}
                onChange={(e) => setCosteTransporte(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Installation Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} /> Installation Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Proposed Start Date</label>
              <input
                type="date"
                value={fechaInicioInstalacion}
                onChange={(e) => setFechaInicioInstalacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Duration (days)</label>
              <input
                type="number"
                min="1"
                value={duracionEstimadaDias}
                onChange={(e) => setDuracionEstimadaDias(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., 14"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Additional Notes</h2>
          <textarea
            value={notasEmpresa}
            onChange={(e) => setNotasEmpresa(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Any additional information for the client..."
          />
        </div>

        {/* Contract PDF Upload */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} /> Contract Document (PDF)
          </h2>
          <p className="text-sm text-gray-500 mb-4">Upload the contract/terms document that the client will need to read and sign</p>

          {documentoPDF && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-green-700 font-semibold">✅ PDF document uploaded</span>
              <button
                onClick={() => setDocumentoPDF(null)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
          )}

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-sm font-semibold transition">
            <Upload size={16} /> {documentoPDF ? 'Replace PDF' : 'Upload PDF'}
            <input type="file" accept="application/pdf" onChange={handlePDFUpload} className="hidden" />
          </label>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-4 pb-8">
          <button
            onClick={() => navigate(`/proyecto/${id}`)}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={guardando}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
          >
            <Save size={18} /> {guardando ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSend}
            disabled={enviando || presupuestoItems.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
          >
            <Send size={18} /> {enviando ? 'Sending...' : 'Send to Client'}
          </button>
        </div>
      </main>
    </div>
  );
}

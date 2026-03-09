import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SignaturePad from '../components/SignaturePad';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
} from 'lucide-react';

export default function ClientOfferView() {
  const { id } = useParams();
  const { token, usuario } = useAuth();
  const navigate = useNavigate();

  const [proyecto, setProyecto] = useState(null);
  const [oferta, setOferta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Contract acceptance
  const [aceptaContrato, setAceptaContrato] = useState(false);
  const [haLeidoDocumentacion, setHaLeidoDocumentacion] = useState(false);
  const [firmaCliente, setFirmaCliente] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // PDF viewer
  const [mostrarPDF, setMostrarPDF] = useState(false);
  // Zoom plan modal
  const [zoomPlan, setZoomPlan] = useState(null);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    cargarOferta();
  }, [id, token]);

  const cargarOferta = async () => {
    try {
      const res = await fetch(`${API}/proyectos/${id}/oferta`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load offer');
      }

      const data = await res.json();
      setProyecto(data.proyecto);
      setOferta(data.oferta);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Check if the offer is still pending approval
  const isPendingApproval = proyecto?.estado === 'offer_sent';
  const isAlreadyApproved = ['working', 'finished', 'pending_payment', 'paid'].includes(proyecto?.estado);
  const isRejected = proyecto?.estado === 'rejected';

  const handleApprove = async () => {
    if (!aceptaContrato || !haLeidoDocumentacion) {
      alert('Please check both acceptance boxes before signing.');
      return;
    }
    if (!firmaCliente) {
      alert('Please provide your signature before approving.');
      return;
    }

    if (!window.confirm('Are you sure you want to approve this offer and sign the contract? This action cannot be undone.')) {
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`${API}/proyectos/${id}/aprobar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firmaCliente,
          aceptaContrato,
          haLeidoDocumentacion,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve');
      }

      alert('Contract approved and signed successfully! The project is now in progress.');
      navigate('/dashboard');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this offer?')) return;

    setEnviando(true);
    try {
      const res = await fetch(`${API}/proyectos/${id}/rechazar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ motivo: motivoRechazo }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject');
      }

      alert('Offer rejected.');
      navigate('/dashboard');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Project Offer</h1>
              <p className="text-gray-600">{proyecto?.nombreCasa} — {proyecto?.direccion}</p>
            </div>
          </div>

          {/* Status badge */}
          <span className={`px-4 py-2 rounded-full text-white text-sm font-bold ${
            isPendingApproval ? 'bg-indigo-600' :
            isAlreadyApproved ? 'bg-green-600' :
            isRejected ? 'bg-red-600' : 'bg-gray-600'
          }`}>
            {isPendingApproval ? '⏳ Pending Your Approval' :
             isAlreadyApproved ? '✅ Approved' :
             isRejected ? '❌ Rejected' : proyecto?.estado}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Already Approved Banner */}
        {isAlreadyApproved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-green-800">Contract Approved</h3>
            <p className="text-green-600 mt-1">
              You signed this contract on {oferta?.fechaFirma ? new Date(oferta.fechaFirma).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
            </p>
            {oferta?.firmaCliente && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Your signature:</p>
                <img src={oferta.firmaCliente} alt="Your signature" className="max-w-xs mx-auto border rounded-lg shadow-sm" />
              </div>
            )}
          </div>
        )}

        {/* Rejected Banner */}
        {isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle size={48} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-800">Offer Rejected</h3>
            <p className="text-red-600 mt-1">You declined this offer.</p>
          </div>
        )}

        {/* Project Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} /> Project Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">House Name</p>
              <p className="font-semibold">{proyecto?.nombreCasa}</p>
            </div>
            <div>
              <p className="text-gray-500">Address</p>
              <p className="font-semibold">{proyecto?.direccion}</p>
            </div>
            <div>
              <p className="text-gray-500">Project Created</p>
              <p className="font-semibold">{new Date(proyecto?.fechaInicio).toLocaleDateString('en-US')}</p>
            </div>
          </div>
        </div>

        {/* Modified Floor Plans */}
        {oferta?.planosModificados && oferta.planosModificados.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Proposed Floor Plans</h2>
            <p className="text-sm text-gray-500 mb-4">These are the modified plans showing the proposed electrical installations</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {oferta.planosModificados.map((plano, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition"
                  onClick={() => setZoomPlan(plano)}
                >
                  <img
                    src={plano.imagenBase64}
                    alt={plano.nombre || `Plan ${idx + 1}`}
                    className="w-full h-56 object-contain bg-gray-100"
                  />
                  <div className="p-3 bg-gray-50">
                    <p className="font-semibold text-sm">{plano.nombre || `Floor Plan ${idx + 1}`}</p>
                    <p className="text-xs text-gray-500 mt-1">Click to enlarge</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget Breakdown */}
        {oferta?.presupuestoItems && oferta.presupuestoItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign size={20} /> Budget Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Unit Price</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {oferta.presupuestoItems.map((item, idx) => (
                    <tr key={idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-3">{item.descripcion}</td>
                      <td className="px-4 py-3 text-center">{item.cantidad}</td>
                      <td className="px-4 py-3 text-right">€{(item.precioUnitario || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold">€{(item.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 border-t pt-4 space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">€{(oferta.presupuestoEstimado || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-3">
                <span>Total Price:</span>
                <span className="text-green-700">€{(oferta.precioTotal || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Installation Details */}
        {(oferta?.fechaInicioInstalacion || oferta?.duracionEstimadaDias) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} /> Installation Schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {oferta.fechaInicioInstalacion && (
                <div>
                  <p className="text-gray-500">Proposed Start Date</p>
                  <p className="text-lg font-bold text-blue-600">
                    {new Date(oferta.fechaInicioInstalacion).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {oferta.duracionEstimadaDias && (
                <div>
                  <p className="text-gray-500">Estimated Duration</p>
                  <p className="text-lg font-bold text-blue-600">{oferta.duracionEstimadaDias} days</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company Notes */}
        {oferta?.notasEmpresa && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={20} /> Additional Notes
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">{oferta.notasEmpresa}</p>
          </div>
        )}

        {/* Contract PDF */}
        {oferta?.documentoPDF && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} /> Contract Document
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Please read the contract document carefully before accepting the offer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMostrarPDF(!mostrarPDF)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
              >
                <Eye size={16} /> {mostrarPDF ? 'Hide Document' : 'View Document'}
              </button>
              <a
                href={oferta.documentoPDF}
                download="contract.pdf"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition"
              >
                <Download size={16} /> Download PDF
              </a>
            </div>
            {mostrarPDF && (
              <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100">
                <iframe
                  src={oferta.documentoPDF}
                  className="w-full"
                  style={{ height: '600px' }}
                  title="Contract Document"
                />
              </div>
            )}
          </div>
        )}

        {/* ===== APPROVAL SECTION (only when offer_sent) ===== */}
        {isPendingApproval && (
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Contract Approval
            </h2>

            {/* Acceptance Checkboxes */}
            <div className="space-y-4 mb-8">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={aceptaContrato}
                  onChange={(e) => setAceptaContrato(e.target.checked)}
                  className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  <strong>I accept the terms and conditions of this contract.</strong> I agree to the proposed budget,
                  installation schedule, and all conditions described in this offer and the attached documentation.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={haLeidoDocumentacion}
                  onChange={(e) => setHaLeidoDocumentacion(e.target.checked)}
                  className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  <strong>I have read and understood all documentation provided.</strong> I have reviewed the proposed
                  floor plans, budget breakdown, and any additional documents attached to this offer.
                </span>
              </label>
            </div>

            {/* Signature Pad */}
            <div className="mb-8">
              <SignaturePad
                onSign={(dataUrl) => setFirmaCliente(dataUrl)}
                width={600}
                height={200}
              />
              {firmaCliente && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <span className="text-sm text-green-700 font-semibold">Signature captured</span>
                  <button
                    onClick={() => setFirmaCliente(null)}
                    className="ml-auto text-sm text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleApprove}
                disabled={enviando || !aceptaContrato || !haLeidoDocumentacion || !firmaCliente}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
              >
                <CheckCircle2 size={22} />
                {enviando ? 'Processing...' : 'Approve & Sign Contract'}
              </button>

              <button
                onClick={() => setMostrarRechazo(!mostrarRechazo)}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold transition"
              >
                <XCircle size={22} /> Reject Offer
              </button>
            </div>

            {/* Reject form */}
            {mostrarRechazo && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Reason for rejection (optional):</h3>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none mb-4"
                  placeholder="Please let us know why you're declining this offer..."
                />
                <button
                  onClick={handleReject}
                  disabled={enviando}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
                >
                  <XCircle size={18} /> {enviando ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Back to dashboard */}
        <div className="text-center pb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
          >
            Back to Dashboard
          </button>
        </div>
      </main>

      {/* Plan Zoom Modal */}
      {zoomPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setZoomPlan(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{zoomPlan.nombre || 'Floor Plan'}</h3>
              <button
                onClick={() => setZoomPlan(null)}
                className="text-gray-400 hover:text-gray-900 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <img
                src={zoomPlan.imagenBase64}
                alt={zoomPlan.nombre}
                className="w-full object-contain"
                style={{ maxHeight: '75vh' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

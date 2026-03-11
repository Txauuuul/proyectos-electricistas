import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SignaturePad from '../components/SignaturePad';
import {
  ArrowLeft,
  FileText,
  Euro,
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
        throw new Error(data.error || 'Offerte laden mislukt');
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
      alert('Vink beide akkoordvakjes aan voordat u tekent.');
      return;
    }
    if (!firmaCliente) {
      alert('Voeg uw handtekening toe voordat u goedkeurt.');
      return;
    }

    if (!window.confirm('Weet u zeker dat u deze offerte wilt goedkeuren en het contract wilt ondertekenen? Deze actie kan niet ongedaan worden gemaakt.')) {
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
        throw new Error(data.error || 'Goedkeuren mislukt');
      }

      alert('Contract succesvol goedgekeurd en ondertekend! Het project is nu in uitvoering.');
      navigate('/dashboard');
    } catch (err) {
      alert('Fout: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Weet u zeker dat u deze offerte wilt afwijzen?')) return;

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
        throw new Error(data.error || 'Afwijzen mislukt');
      }

      alert('Offerte afgewezen.');
      navigate('/dashboard');
    } catch (err) {
      alert('Fout: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#29ace3] mx-auto mb-4"></div>
          <p className="text-gray-600">Offerte laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg font-semibold"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      {/* Header */}
      <header className="shadow" style={{ background: '#1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-white uppercase tracking-wide">
                Project<span style={{ color: '#29ace3' }}>offerte</span>
              </h1>
              <p className="text-xs text-gray-400">{proyecto?.nombreCasa} — {proyecto?.direccion}</p>
            </div>
          </div>

          {/* Status badge */}
          <span className={`px-4 py-2 rounded-full text-white text-sm font-bold ${
            isPendingApproval ? 'bg-indigo-600' :
            isAlreadyApproved ? 'bg-green-600' :
            isRejected ? 'bg-red-600' : 'bg-gray-600'
          }`}>
            {isPendingApproval ? '⏳ Wacht op uw goedkeuring' :
             isAlreadyApproved ? '✅ Goedgekeurd' :
             isRejected ? '❌ Afgewezen' : proyecto?.estado}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Already Approved Banner */}
        {isAlreadyApproved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-green-800">Contract goedgekeurd</h3>
            <p className="text-green-600 mt-1">
              U hebt dit contract ondertekend op {oferta?.fechaFirma ? new Date(oferta.fechaFirma).toLocaleDateString('nl-BE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N.v.t.'}
            </p>
            {oferta?.firmaCliente && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Uw handtekening:</p>
                <img src={oferta.firmaCliente} alt="Uw handtekening" className="max-w-xs mx-auto border rounded-lg shadow-sm" />
              </div>
            )}
          </div>
        )}

        {/* Rejected Banner */}
        {isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle size={48} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-800">Offerte afgewezen</h3>
            <p className="text-red-600 mt-1">U hebt deze offerte afgewezen.</p>
          </div>
        )}

        {/* Project Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} /> Projectgegevens
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Huisnaam</p>
              <p className="font-semibold">{proyecto?.nombreCasa}</p>
            </div>
            <div>
              <p className="text-gray-500">Adres</p>
              <p className="font-semibold">{proyecto?.direccion}</p>
            </div>
            <div>
              <p className="text-gray-500">Project aangemaakt</p>
              <p className="font-semibold">{new Date(proyecto?.fechaInicio).toLocaleDateString('nl-BE')}</p>
            </div>
          </div>
        </div>

        {/* Modified Floor Plans */}
        {oferta?.planosModificados && oferta.planosModificados.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Voorgestelde plattegronden</h2>
            <p className="text-sm text-gray-500 mb-4">Dit zijn de aangepaste plannen met de voorgestelde elektrische installaties</p>
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
                    <p className="font-semibold text-sm">{plano.nombre || `Plattegrond ${idx + 1}`}</p>
                    <p className="text-xs text-gray-500 mt-1">Klik om te vergroten</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estimated Total Price */}
        {(oferta?.precioTotalEstimado != null || oferta?.precioTotal > 0) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Euro size={20} /> Geschatte totaalprijs
            </h2>
            <p className="text-sm text-gray-500 mb-3">Indicatieve prijs. Het exacte bedrag wordt bevestigd zodra het werk is voltooid.</p>
            <p className="text-3xl font-bold text-green-700">
              €{((oferta.precioTotalEstimado ?? oferta.precioTotal) || 0).toLocaleString('nl-BE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Installation Details */}
        {(oferta?.fechaInicioInstalacion || oferta?.duracionEstimadaDias) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} /> Installatieplanning
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {oferta.fechaInicioInstalacion && (
                <div>
                  <p className="text-gray-500">Voorgestelde startdatum</p>
                  <p className="text-lg font-bold text-[#29ace3]">
                    {new Date(oferta.fechaInicioInstalacion).toLocaleDateString('nl-BE', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {oferta.duracionEstimadaDias && (
                <div>
                  <p className="text-gray-500">Geschatte duur</p>
                  <p className="text-lg font-bold text-[#29ace3]">{oferta.duracionEstimadaDias} dagen</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company Notes */}
        {oferta?.notasEmpresa && (
          <div className="bg-[#eaf7fd] border border-[#a8dcf0] rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={20} /> Aanvullende notities
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">{oferta.notasEmpresa}</p>
          </div>
        )}

        {/* Contract PDF */}
        {oferta?.documentoPDF && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} /> Contractdocument
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Lees het contractdocument aandachtig voordat u de offerte aanvaardt.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMostrarPDF(!mostrarPDF)}
                className="flex items-center gap-2 px-4 py-2 bg-[#29ace3] hover:bg-[#1d96cb] text-white rounded-lg font-semibold text-sm transition"
              >
                <Eye size={16} /> {mostrarPDF ? 'Document verbergen' : 'Document bekijken'}
              </button>
              <a
                href={oferta.documentoPDF}
                download="contract.pdf"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition"
              >
                <Download size={16} /> PDF downloaden
              </a>
            </div>
            {mostrarPDF && (
              <div className="mt-4 border rounded-lg overflow-hidden bg-gray-100">
                <iframe
                  src={oferta.documentoPDF}
                  className="w-full"
                  style={{ height: '600px' }}
                  title="Contractdocument"
                />
              </div>
            )}
          </div>
        )}

        {/* ===== APPROVAL SECTION (only when offer_sent) ===== */}
        {isPendingApproval && (
          <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-[#a8dcf0]">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Contractgoedkeuring
            </h2>

            {/* Acceptance Checkboxes */}
            <div className="space-y-4 mb-8">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={aceptaContrato}
                  onChange={(e) => setAceptaContrato(e.target.checked)}
                  className="mt-1 h-5 w-5 text-[#29ace3] rounded border-gray-300 focus:ring-[#29ace3]"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  <strong>Ik aanvaard de voorwaarden van dit contract.</strong> Ik ga akkoord met het voorgestelde budget,
                  de installatieplanning en alle voorwaarden die in deze offerte en de bijgevoegde documentatie zijn beschreven.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={haLeidoDocumentacion}
                  onChange={(e) => setHaLeidoDocumentacion(e.target.checked)}
                  className="mt-1 h-5 w-5 text-[#29ace3] rounded border-gray-300 focus:ring-[#29ace3]"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  <strong>Ik heb alle verstrekte documentatie gelezen en begrepen.</strong> Ik heb de voorgestelde
                  plattegronden, de geschatte prijs en alle extra documenten bij deze offerte nagekeken.
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
                  <span className="text-sm text-green-700 font-semibold">Handtekening opgeslagen</span>
                  <button
                    onClick={() => setFirmaCliente(null)}
                    className="ml-auto text-sm text-red-500 hover:text-red-700"
                  >
                    Wissen
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
                {enviando ? 'Verwerken...' : 'Contract goedkeuren en ondertekenen'}
              </button>

              <button
                onClick={() => setMostrarRechazo(!mostrarRechazo)}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold transition"
              >
                <XCircle size={22} /> Offerte afwijzen
              </button>
            </div>

            {/* Reject form */}
            {mostrarRechazo && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Reden van afwijzing (optioneel):</h3>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none mb-4"
                  placeholder="Laat ons weten waarom u deze offerte afwijst..."
                />
                <button
                  onClick={handleReject}
                  disabled={enviando}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 transition"
                >
                  <XCircle size={18} /> {enviando ? 'Verwerken...' : 'Afwijzing bevestigen'}
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
            Terug naar dashboard
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
              <h3 className="font-bold text-gray-900">{zoomPlan.nombre || 'Plattegrond'}</h3>
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

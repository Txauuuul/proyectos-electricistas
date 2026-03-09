import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Edit2, X, ZoomIn, ZoomOut, FileText, DollarSign, Flag, Send, CheckCircle, ExternalLink, Upload, MessageSquare, RotateCcw, PenTool, Receipt } from 'lucide-react';
import { fabric } from 'fabric';
import PlanoEditor from '../components/canvas/PlanoEditor';

// Marker coordinates are stored in the 1200x800 canvas coordinate space.
// The SVG viewBox="0 0 1200 800" with preserveAspectRatio="xMidYMid meet"
// handles the mapping automatically — no extra offset is needed.

export default function ProjectPage() {
  const { id } = useParams();
  const { token, usuario } = useAuth();
  const navigate = useNavigate();
  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [editandoEstado, setEditandoEstado] = useState(false);
  const [modalZoomAbierto, setModalZoomAbierto] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagenActivaIdx, setImagenActivaIdx] = useState(null);
  const [posicionPan, setPosicionPan] = useState({ x: 0, y: 0 });
  const [arrastrandoModalZoom, setArrastrandoModalZoom] = useState(false);
  const [posicionInicial, setPosicionInicial] = useState({ x: 0, y: 0 });
  const [modalFotoAbierto, setModalFotoAbierto] = useState(false);
  const [fotoActivaIdx, setFotoActivaIdx] = useState(null);
  const [zoomLevelFoto, setZoomLevelFoto] = useState(1);
  // Generic lightbox for ruimtes floor plans and photos
  const [modalLightbox, setModalLightbox] = useState(null); // { src, title, marcadores }
  const [zoomLightbox, setZoomLightbox] = useState(1);
  const modalFotoRef = useRef(null);
  const modalZoomRef = useRef(null);
  const canvasDrawingRefs = useRef({});
  const [planoEditorAbierto, setPlanoEditorAbierto] = useState(null);
  const [ruimteEditorAbierto, setRuimteEditorAbierto] = useState(null);
  const [guardandoPlano, setGuardandoPlano] = useState(false);
  // URLs de imágenes PNG generadas offscreen para mostrar dibujos
  const [drawingUrls, setDrawingUrls] = useState({});
  const [ruimteDrawingUrls, setRuimteDrawingUrls] = useState({});

  // Additional info form state (post-signature)
  const [mostrarFormInfo, setMostrarFormInfo] = useState(false);
  const [infoTexto, setInfoTexto] = useState('');
  const [infoPlanos, setInfoPlanos] = useState([]);
  const [infoFotos, setInfoFotos] = useState([]);
  const [enviandoInfo, setEnviandoInfo] = useState(false);

  // Reopen form state (admin)
  const [mostrarFormReapertura, setMostrarFormReapertura] = useState(false);
  const [reaperturaDescripcion, setReaperturaDescripcion] = useState('');
  const [reaperturaPresupuesto, setReaperturaPresupuesto] = useState([]);
  const [reaperturaPDF, setReaperturaPDF] = useState(null);
  const [enviandoReapertura, setEnviandoReapertura] = useState(false);
  const [firmandoReapertura, setFirmandoReapertura] = useState(null);
  const [firmaReaperturaData, setFirmaReaperturaData] = useState(null);

  // Client change proposal form state
  const [mostrarFormPropuesta, setMostrarFormPropuesta] = useState(false);
  const [propuestaDemandas, setPropuestaDemandas] = useState('');
  const [enviandoPropuesta, setEnviandoPropuesta] = useState(false);

  // Commission popup state (admin finalize)
  const [mostrarPopupFinalizar, setMostrarPopupFinalizar] = useState(false);
  const [electricistaPerfil, setElectristaPerfil] = useState(null);
  const [commissie, setCommissie] = useState({
    offerteTotaalbedrag: '',
    type1Pct: 0, type1Bedrag: '',
    type2Pct: 0, type2Bedrag: '',
    type3Pct: 0, type3Bedrag: '',
    type4Pct: 0, type4Bedrag: '',
    type5Pct: 0, type5Bedrag: '',
  });
  const [enviandoFinalizar, setEnviandoFinalizar] = useState(false);

  const recargarProyecto = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al cargar proyecto');
      const data = await response.json();
      setProyecto(data);
    } catch (err) {
      console.error(err);
    }
  };

  const abrirPopupFinalizar = async () => {
    // Fetch electrician commission rates
    try {
      const ownerId = proyecto?.usuarioId?._id || proyecto?.usuarioId;
      if (ownerId) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/profile/${ownerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const perfil = await res.json();
          setElectristaPerfil(perfil);
          setCommissie(prev => ({
            ...prev,
            type1Pct: perfil.comisionTransporte ?? 20,
            type2Pct: perfil.comisionHardware ?? 10,
            type3Pct: perfil.comisionHorasTrabajo ?? 30,
            type4Pct: 0,
            type5Pct: perfil.comisionEspecial ?? 0,
          }));
        }
      }
    } catch (e) { console.error(e); }
    setMostrarPopupFinalizar(true);
  };

  const handleSubmitFinalizar = async (enviarCorreo) => {
    setEnviandoFinalizar(true);
    try {
      const c = commissie;
      const calc = (pct, bedrag) => Math.round((parseFloat(pct) || 0) * (parseFloat(bedrag) || 0) / 100 * 100) / 100;
      const commissieResultaat = {
        offerteTotaalbedrag: parseFloat(c.offerteTotaalbedrag) || 0,
        type1Pct: parseFloat(c.type1Pct) || 0, type1Bedrag: parseFloat(c.type1Bedrag) || 0, type1Commissie: calc(c.type1Pct, c.type1Bedrag),
        type2Pct: parseFloat(c.type2Pct) || 0, type2Bedrag: parseFloat(c.type2Bedrag) || 0, type2Commissie: calc(c.type2Pct, c.type2Bedrag),
        type3Pct: parseFloat(c.type3Pct) || 0, type3Bedrag: parseFloat(c.type3Bedrag) || 0, type3Commissie: calc(c.type3Pct, c.type3Bedrag),
        type4Pct: 0, type4Bedrag: parseFloat(c.type4Bedrag) || 0, type4Commissie: 0,
        type5Pct: parseFloat(c.type5Pct) || 0, type5Bedrag: parseFloat(c.type5Bedrag) || 0, type5Commissie: calc(c.type5Pct, c.type5Bedrag),
        datumAfgewerkt: new Date().toISOString(),
      };
      commissieResultaat.totaleCommissie = commissieResultaat.type1Commissie + commissieResultaat.type2Commissie +
        commissieResultaat.type3Commissie + commissieResultaat.type4Commissie + commissieResultaat.type5Commissie;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}/finalizar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enviarCorreo, commissieResultaat }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setMostrarPopupFinalizar(false);
      await recargarProyecto();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setEnviandoFinalizar(false);
    }
  };

  const handleEliminarProyecto = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al eliminar proyecto'); }
      alert('Proyecto eliminado exitosamente');
      navigate('/dashboard');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    const cargarProyecto = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Error al cargar proyecto');
        }

        const data = await response.json();
        setProyecto(data);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setCargando(false);
      }
    };

    if (token) {
      cargarProyecto();
    }
  }, [id, token]);

  // Renderizar dibujos de ruimtes usando StaticCanvas offscreen
  useEffect(() => {
    if (!proyecto?.ruimtes) return;
    proyecto.ruimtes.forEach((ruimte, idx) => {
      if (!ruimte.dataDibujo) return;
      try {
        const tempEl = document.createElement('canvas');
        tempEl.width = 1200;
        tempEl.height = 800;
        const staticCanvas = new fabric.StaticCanvas(tempEl, { width: 1200, height: 800, backgroundColor: 'transparent' });
        staticCanvas.loadFromJSON(ruimte.dataDibujo, () => {
          staticCanvas.backgroundColor = 'transparent';
          staticCanvas.backgroundImage = null;
          staticCanvas.renderAll();
          const dataUrl = tempEl.toDataURL('image/png');
          setRuimteDrawingUrls(prev => ({ ...prev, [idx]: dataUrl }));
          staticCanvas.dispose();
        });
      } catch (err) {
        console.error(`Error rendering drawing for ruimte ${idx}:`, err);
      }
    });
  }, [proyecto]);

  // Renderizar dibujos usando StaticCanvas offscreen y exportar a PNG
  // Esto evita completamente los problemas del wrapper div de Fabric.js
  useEffect(() => {
    if (!proyecto?.planos) return;

    proyecto.planos.forEach((plano, idx) => {
      if (!plano.dataDibujo) return;

      try {
        // Crear elemento canvas temporal fuera del DOM
        const tempEl = document.createElement('canvas');
        tempEl.width = 1200;
        tempEl.height = 800;

        const staticCanvas = new fabric.StaticCanvas(tempEl, {
          width: 1200,
          height: 800,
          backgroundColor: 'transparent',
        });

        staticCanvas.loadFromJSON(plano.dataDibujo, () => {
          staticCanvas.backgroundColor = 'transparent';
          staticCanvas.backgroundImage = null;
          staticCanvas.renderAll();

          const dataUrl = tempEl.toDataURL('image/png');
          setDrawingUrls(prev => ({ ...prev, [idx]: dataUrl }));

          staticCanvas.dispose();
        });
      } catch (err) {
        console.error(`Error rendering drawing for plano ${idx}:`, err);
      }
    });
  }, [proyecto]);

  const cambiarEstado = async (nuevoEstado) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!response.ok) throw new Error('Error al cambiar estado');

      const data = await response.json();
      setProyecto(data);
      setEditandoEstado(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const guardarPlanoEditado = async (idxPlano, planoEditado) => {
    if (!proyecto) return;

    setGuardandoPlano(true);
    try {
      const planosActualizados = [...proyecto.planos];
      planosActualizados[idxPlano] = planoEditado;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planos: planosActualizados }),
      });

      if (!response.ok) throw new Error('Error al guardar plano');

      const data = await response.json();
      setProyecto(data);
      setPlanoEditorAbierto(null);
      alert('✓ Plano guardado correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setGuardandoPlano(false);
    }
  };

  const guardarRuimtePlanoEditado = async (idxRuimte, planoEditado) => {
    if (!proyecto) return;
    setGuardandoPlano(true);
    try {
      const ruimtesActualizadas = proyecto.ruimtes.map((r, i) =>
        i === idxRuimte
          ? { ...r, marcadores: planoEditado.marcadores, dataDibujo: planoEditado.dataDibujo }
          : r
      );

      console.log('💾 Saving ruimte', idxRuimte,
        '| markers to save:', planoEditado.marcadores?.length,
        '| has drawing:', !!planoEditado.dataDibujo);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruimtes: ruimtesActualizadas }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Server error:', data);
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log('✅ Saved. DB ruimte markers back:',
        data.ruimtes?.[idxRuimte]?.marcadores?.length);

      setProyecto(data);
      setRuimteEditorAbierto(null);
      alert('✓ Floor plan saved successfully');
    } catch (error) {
      console.error('❌ Save error:', error);
      alert(`Error saving: ${error.message}`);
    } finally {
      setGuardandoPlano(false);
    }
  };

  const getColorEstado = (estado) => {
    const colorMap = {
      created: 'bg-blue-600',
      offer_ready: 'bg-purple-600',
      offer_sent: 'bg-indigo-600',
      approved: 'bg-green-500',
      working: 'bg-yellow-500',
      finished: 'bg-green-600',
      pending_payment: 'bg-orange-500',
      billed: 'bg-teal-600',
      paid: 'bg-green-700',
      rejected: 'bg-red-600',
    };
    return colorMap[estado] || 'bg-gray-600';
  };

  const getNombreEstado = (estado) => {
    const nombres = {
      created: 'Created',
      offer_ready: 'Offer Ready',
      offer_sent: 'Offer Sent',
      approved: 'Approved',
      working: 'Working',
      finished: 'Finished',
      pending_payment: 'Pending Payment',
      billed: 'Billed',
      paid: 'Paid',
      rejected: 'Rejected',
    };
    return nombres[estado] || estado;
  };

  const abrirModalZoom = (idx) => {
    setImagenActivaIdx(idx);
    setZoomLevel(1);
    setPosicionPan({ x: 0, y: 0 });
    setModalZoomAbierto(true);
  };

  const cerrarModalZoom = () => {
    setModalZoomAbierto(false);
    setImagenActivaIdx(null);
    setZoomLevel(1);
    setPosicionPan({ x: 0, y: 0 });
  };

  const abrirModalFoto = (idx) => {
    setFotoActivaIdx(idx);
    setZoomLevelFoto(1);
    setModalFotoAbierto(true);
  };

  const cerrarModalFoto = () => {
    setModalFotoAbierto(false);
    setFotoActivaIdx(null);
    setZoomLevelFoto(1);
  };

  const manejarZoomFoto = (delta) => {
    const nuevoZoom = Math.max(1, Math.min(5, zoomLevelFoto + delta * 0.1));
    setZoomLevelFoto(nuevoZoom);
  };

  const manejarZoom = (delta) => {
    const nuevoZoom = Math.max(1, Math.min(5, zoomLevel + delta * 0.1));
    setZoomLevel(nuevoZoom);
  };

  const manejarRuedaZoom = (e) => {
    if (!modalZoomRef.current) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    manejarZoom(delta);
  };

  // Evento wheel no pasivo para permitir preventDefault()
  useEffect(() => {
    const modalDiv = modalZoomRef.current;
    if (!modalZoomAbierto || !modalDiv) return;

    modalDiv.addEventListener('wheel', manejarRuedaZoom, { passive: false });

    return () => {
      modalDiv.removeEventListener('wheel', manejarRuedaZoom);
    };
  }, [modalZoomAbierto, zoomLevel]);

  const manejarMouseDown = (e) => {
    // Arrastre desactivado - solo permitir zoom
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    return; // Desactivar pan/arrastre
  };

  const manejarMouseMove = (e) => {
    // Pan desactivado - solo zoom
    return;
  };

  const manejarMouseUp = () => {
    setArrastrandoModalZoom(false);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600 text-lg">Loading project...</p>
      </div>
    );
  }

  if (error || !proyecto) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-600 text-lg mb-4">{error || 'Project not found'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex gap-2 items-center font-semibold"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{proyecto.nombreCasa}</h1>
            <p className="text-gray-600 mt-1">{proyecto.direccion}</p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Información General */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(proyecto.fechaInicio).toLocaleDateString('en-US')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              {usuario?.rol === 'administrador' ? (
                <div className="flex gap-2 items-center">
                  {editandoEstado ? (
                    <select
                      value={proyecto.estado}
                      onChange={(e) => cambiarEstado(e.target.value)}
                      className="px-3 py-1 rounded border border-gray-300 text-sm"
                    >
                      <option value="created">Created</option>
                      <option value="offer_ready">Offer Ready</option>
                      <option value="offer_sent">Offer Sent</option>
                      <option value="approved">Approved</option>
                      <option value="working">Working</option>
                      <option value="finished">Finished</option>
                      <option value="pending_payment">Pending Payment</option>
                      <option value="billed">Billed</option>
                      <option value="paid">Paid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  ) : (
                    <>
                      <p className={`text-lg font-semibold px-3 py-1 rounded text-white w-fit ${getColorEstado(proyecto.estado)}`}>
                        {getNombreEstado(proyecto.estado)}
                      </p>
                      <button
                        onClick={() => setEditandoEstado(true)}
                        className="p-1 hover:bg-gray-100 rounded transition"
                        title="Cambiar estado"
                      >
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <p className={`text-lg font-semibold px-3 py-1 rounded text-white w-fit ${getColorEstado(proyecto.estado)}`}>
                  {getNombreEstado(proyecto.estado)}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Rooms</p>
              <p className="text-lg font-semibold text-gray-900">{proyecto.ruimtes?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Floor Plans</p>
              <p className="text-lg font-semibold text-gray-900">
                {(proyecto.ruimtes?.filter(r => r.platteGrond).length || 0) + (proyecto.planos?.length || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Photos</p>
              <p className="text-lg font-semibold text-gray-900">
                {(proyecto.ruimtes?.reduce((s, r) => s + (r.fotos?.length || 0), 0) || 0) + (proyecto.fotosLocalizacion?.length || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Action Buttons */}
        {usuario?.rol === 'administrador' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Flag size={22} /> Workflow Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              {/* Prepare Offer */}
              {['created', 'offer_ready'].includes(proyecto.estado) && (
                <button
                  onClick={() => navigate(`/proyecto/${id}/preparar-oferta`)}
                  className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                >
                  <FileText size={18} /> {proyecto.estado === 'offer_ready' ? 'Edit Offer' : 'Prepare Offer'}
                </button>
              )}
              {/* Mark Finished */}
              {proyecto.estado === 'working' && (
                <button
                  onClick={abrirPopupFinalizar}
                  className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                >
                  <CheckCircle size={18} /> Mark Finished
                </button>
              )}
              {/* Mark Paid */}
              {proyecto.estado === 'pending_payment' && (
                <button
                  onClick={async () => {
                    if (!window.confirm('Mark this project as paid?')) return;
                    try {
                      const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}/marcar-pagado`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      });
                      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                      await recargarProyecto();
                    } catch (err) { alert('Error: ' + err.message); }
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                >
                  <DollarSign size={18} /> Mark as Paid
                </button>
              )}
              {/* Delete Project */}
              <button
                onClick={handleEliminarProyecto}
                className="ml-auto flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                <X size={18} /> Delete Project
              </button>
            </div>
          </div>
        )}

        {/* Client: View/Sign Offer */}
        {usuario?.rol !== 'administrador' && proyecto.estado === 'offer_sent' && (
          proyecto.reaperturas?.some(r => !r.aceptado) ? (
            /* Reopen case: pending amendment signature */
            <div className="bg-orange-50 border border-orange-300 rounded-lg shadow-md p-6 mb-8 text-center">
              <h2 className="text-xl font-bold text-orange-800 mb-2">Amendment pending your signature!</h2>
              <p className="text-orange-700 mb-1">The administrator has made changes to your project.</p>
              <p className="text-orange-600 text-sm">Please scroll down to <strong>Amendments / Reopenings</strong> to review and sign the updated documents before work can continue.</p>
            </div>
          ) : (
            /* Initial offer */
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg shadow-md p-6 mb-8 text-center">
              <h2 className="text-xl font-bold text-indigo-800 mb-2">You have a pending offer!</h2>
              <p className="text-indigo-600 mb-4">Review the proposal and sign the contract to get started.</p>
              <button
                onClick={() => navigate(`/proyecto/${id}/ver-oferta`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-lg transition"
              >
                <FileText size={20} /> View & Sign Offer
              </button>
            </div>
          )
        )}

        {/* Offer Summary (when offer exists) */}
        {proyecto.oferta && proyecto.oferta.precioTotal > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign size={22} /> Offer Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total Price</p>
                <p className="text-2xl font-bold text-green-700">€{(proyecto.oferta.precioTotal || 0).toFixed(2)}</p>
              </div>
              {proyecto.oferta.fechaInicioInstalacion && (
                <div>
                  <p className="text-gray-500">Installation Start</p>
                  <p className="font-semibold">{new Date(proyecto.oferta.fechaInicioInstalacion).toLocaleDateString('en-US')}</p>
                </div>
              )}
              {proyecto.oferta.duracionEstimadaDias && (
                <div>
                  <p className="text-gray-500">Duration</p>
                  <p className="font-semibold">{proyecto.oferta.duracionEstimadaDias} days</p>
                </div>
              )}
            </div>
            {proyecto.oferta.firmaCliente && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Client Signature:</p>
                <img src={proyecto.oferta.firmaCliente} alt="Signature" className="max-w-xs border rounded-lg shadow-sm" />
                <p className="text-xs text-gray-400 mt-1">
                  Signed on {proyecto.oferta.fechaFirma ? new Date(proyecto.oferta.fechaFirma).toLocaleDateString('en-US') : 'N/A'}
                </p>
              </div>
            )}
            {/* Link to full offer view */}
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => navigate(`/proyecto/${id}/${usuario?.rol === 'administrador' ? 'preparar-oferta' : 'ver-oferta'}`)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm transition"
              >
                <ExternalLink size={16} /> View Full Offer Details
              </button>
            </div>
          </div>
        )}

        {/* Planos */}
        {proyecto.planos && proyecto.planos.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Floor Plans ({proyecto.planos.length})</h2>
            <div className="space-y-8">
              {proyecto.planos.map((plano, idx) => (
                <div key={idx} className="border-b pb-8 last:border-b-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Floor Plan {idx + 1}</h3>
                    <button
                      onClick={() => setPlanoEditorAbierto(idx)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex gap-2 items-center text-sm font-semibold transition"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                  </div>
                  
                  {/* Imagen del plano con marcadores - onClick en todo el contenedor para que funcione siempre */}
                  <div 
                    className="mb-4 bg-gray-100 rounded-lg overflow-hidden flex justify-center items-center relative cursor-pointer"
                    style={{ position: 'relative', maxHeight: '400px' }}
                    onClick={() => { setImagenActivaIdx(idx); setModalZoomAbierto(true); }}
                  >
                    <div 
                      style={{ 
                        position: 'relative', 
                        display: 'inline-block',
                        width: '100%',
                        paddingBottom: '66.67%'
                      }}
                    >
                      <img 
                        src={plano.imagenBase64} 
                        alt={`Plano ${idx + 1}`}
                        style={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          pointerEvents: 'none'
                        }}
                      />
                      
                      {/* Dibujos a mano alzada como imagen PNG (generado offscreen, sin wrapper Fabric) */}
                      {plano.dataDibujo && drawingUrls[idx] && (
                        <img
                          src={drawingUrls[idx]}
                          alt="drawing"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      
                      {/* Marcadores como iconos SVG - viewBox usa coordenadas del canvas editor (1200x800) */}
                      {plano.marcadores && plano.marcadores.length > 0 && (
                        <svg 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                          }}
                          viewBox="0 0 1200 800"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {plano.marcadores.map((marcador, midx) => {
                            const iconMap = {
                              'camara': '/icons/camara.png',
                              'wifi': '/icons/wifi.png',
                              'arbol': '/icons/arbol.png',
                            };
                            const iconPath = iconMap[marcador.tipo];
                            const markerSize = 90;
                            return (
                              <image
                                key={midx}
                                href={iconPath}
                                x={marcador.x - markerSize / 2}
                                y={marcador.y - markerSize / 2}
                                width={markerSize}
                                height={markerSize}
                              />
                            );
                          })}
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Comentarios */}
                  {plano.comentarios && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
                      <p className="text-gray-700">{plano.comentarios}</p>
                    </div>
                  )}

                  {/* Marcadores */}
                  {plano.marcadores && plano.marcadores.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Markers ({plano.marcadores.length}):</p>
                      <ul className="space-y-1">
                        {plano.marcadores.map((marcador, midx) => (
                          <li key={midx} className="text-sm text-gray-700">
                            • {marcador.tipo}: ({marcador.x.toFixed(0)}, {marcador.y.toFixed(0)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fotos */}
        {proyecto.fotosLocalizacion && proyecto.fotosLocalizacion.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Location Photos ({proyecto.fotosLocalizacion.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {proyecto.fotosLocalizacion.map((foto, idx) => (
                <div 
                  key={idx} 
                  className="bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer group relative"
                  onClick={() => abrirModalFoto(idx)}
                >
                  <img 
                    src={foto} 
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover transition group-hover:brightness-75"
                    draggable={false}
                  />
                  {/* Overlay para asegurar que el click funciona en toda la foto */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-black bg-opacity-20 flex items-center justify-center transition">
                    <ZoomIn size={32} className="text-white drop-shadow-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ruimtes (rooms from new wizard) */}
        {proyecto.ruimtes && proyecto.ruimtes.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Rooms ({proyecto.ruimtes.length})</h2>
            <div className="space-y-8">
              {proyecto.ruimtes.map((ruimte, idx) => (
                <div key={idx} className="border-b pb-8 last:border-b-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{ruimte.naam || `Room ${idx + 1}`}</h3>
                  {ruimte.omschrijving && (
                    <p className="text-gray-600 text-sm mb-3">{ruimte.omschrijving}</p>
                  )}

                  {/* Floor plan with markers overlay */}
                  {ruimte.platteGrond && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Floor Plan</p>
                        {usuario?.rol === 'administrador' && (
                          <button
                            onClick={() => setRuimteEditorAbierto(idx)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex gap-1 items-center text-xs font-semibold transition"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                        )}
                      </div>
                      <div
                        className="bg-gray-100 rounded-lg overflow-hidden flex justify-center items-center relative cursor-pointer group"
                        style={{ position: 'relative', maxHeight: '400px' }}
                        onClick={() => { setModalLightbox({ src: ruimte.platteGrond, title: `${ruimte.naam || `Room ${idx + 1}`} – Floor Plan`, marcadores: ruimte.marcadores, drawingSrc: ruimteDrawingUrls[idx] || null }); setZoomLightbox(1); }}
                        title="Click to enlarge"
                      >
                        <div style={{ position: 'relative', display: 'inline-block', width: '100%', paddingBottom: '66.67%' }}>
                          <img
                            src={ruimte.platteGrond}
                            alt={`Floor plan ${ruimte.naam}`}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                          />
                          {/* Freehand drawing overlay */}
                          {ruimte.dataDibujo && ruimteDrawingUrls[idx] && (
                            <img
                              src={ruimteDrawingUrls[idx]}
                              alt="drawing"
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                            />
                          )}
                          {/* Zoom hint overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center pointer-events-none">
                            <span className="opacity-0 group-hover:opacity-100 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded transition">🔍 Click to enlarge</span>
                          </div>
                          {/* Markers */}
                          {ruimte.marcadores && ruimte.marcadores.length > 0 && (
                            <svg
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                              viewBox="0 0 1200 800"
                              preserveAspectRatio="xMidYMid meet"
                            >
                              {ruimte.marcadores.map((marcador, midx) => {
                                const iconMap = { camara: '/icons/camara.png', wifi: '/icons/wifi.png', arbol: '/icons/arbol.png' };
                                const iconPath = iconMap[marcador.tipo];
                                const markerSize = 90;
                                return (
                                  <image
                                    key={midx}
                                    href={iconPath}
                                    x={marcador.x - markerSize / 2}
                                    y={marcador.y - markerSize / 2}
                                    width={markerSize}
                                    height={markerSize}
                                  />
                                );
                              })}
                            </svg>
                          )}
                        </div>
                      </div>
                      {ruimte.marcadores && ruimte.marcadores.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {ruimte.marcadores.length} marker{ruimte.marcadores.length !== 1 ? 's' : ''} placed
                        </p>
                      )}
                    </div>
                  )}

                  {/* Photos */}
                  {ruimte.fotos && ruimte.fotos.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Photos ({ruimte.fotos.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {ruimte.fotos.map((foto, fi) => (
                          <div
                            key={fi}
                            className="bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer group relative"
                            onClick={() => { setModalLightbox({ src: foto, title: `${ruimte.naam || `Room ${idx + 1}`} – Photo ${fi + 1}`, marcadores: [] }); setZoomLightbox(1); }}
                          >
                            <img
                              src={foto}
                              alt={`${ruimte.naam} photo ${fi + 1}`}
                              className="w-full h-full object-cover transition group-hover:brightness-75"
                            />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <ZoomIn size={28} className="text-white drop-shadow-lg" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post-Signature Additional Info (electricista only, when project is active) */}
        {usuario?.rol !== 'administrador' && ['working', 'pending_payment', 'paid'].includes(proyecto.estado) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={22} /> Additional Information
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Send additional details, plans, or photos to the team after signing the contract.
            </p>

            {/* Existing entries */}
            {proyecto.infoAdicional && proyecto.infoAdicional.length > 0 && (
              <div className="space-y-4 mb-6">
                {proyecto.infoAdicional.map((info, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-400">
                        {new Date(info.fecha).toLocaleString()}
                      </span>
                    </div>
                    {info.texto && <p className="text-gray-700 mb-2">{info.texto}</p>}
                    {info.planos && info.planos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                        {info.planos.map((p, pi) => (
                          <img key={pi} src={p} alt={`Additional plan ${pi+1}`} className="rounded border object-contain h-32 w-full bg-white" />
                        ))}
                      </div>
                    )}
                    {info.fotos && info.fotos.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {info.fotos.map((f, fi) => (
                          <img key={fi} src={f} alt={`Additional photo ${fi+1}`} className="rounded border object-cover h-24 w-full" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new entry */}
            {!mostrarFormInfo ? (
              <button
                onClick={() => setMostrarFormInfo(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition"
              >
                <Upload size={16} /> Add Information
              </button>
            ) : (
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
                <textarea
                  value={infoTexto}
                  onChange={(e) => setInfoTexto(e.target.value)}
                  rows={3}
                  placeholder="Describe the additional information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Plans</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        Array.from(e.target.files).forEach(file => {
                          const reader = new FileReader();
                          reader.onload = () => setInfoPlanos(prev => [...prev, reader.result]);
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="text-sm"
                    />
                    {infoPlanos.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{infoPlanos.length} plan(s) selected</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Photos</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        Array.from(e.target.files).forEach(file => {
                          const reader = new FileReader();
                          reader.onload = () => setInfoFotos(prev => [...prev, reader.result]);
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="text-sm"
                    />
                    {infoFotos.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{infoFotos.length} photo(s) selected</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (!infoTexto && infoPlanos.length === 0 && infoFotos.length === 0) {
                        alert('Please add text, plans or photos.');
                        return;
                      }
                      setEnviandoInfo(true);
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}/info-adicional`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ texto: infoTexto, planos: infoPlanos, fotos: infoFotos }),
                        });
                        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
                        alert('Additional information sent successfully!');
                        setMostrarFormInfo(false);
                        setInfoTexto('');
                        setInfoPlanos([]);
                        setInfoFotos([]);
                        window.location.reload();
                      } catch (err) { alert('Error: ' + err.message); }
                      finally { setEnviandoInfo(false); }
                    }}
                    disabled={enviandoInfo}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition"
                  >
                    <Send size={16} /> {enviandoInfo ? 'Sending...' : 'Send'}
                  </button>
                  <button
                    onClick={() => { setMostrarFormInfo(false); setInfoTexto(''); setInfoPlanos([]); setInfoFotos([]); }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin: view additional info entries */}
        {usuario?.rol === 'administrador' && proyecto.infoAdicional && proyecto.infoAdicional.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={22} /> Additional Information from Client
            </h2>
            <div className="space-y-4">
              {proyecto.infoAdicional.map((info, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <span className="text-xs text-gray-400">{new Date(info.fecha).toLocaleString()}</span>
                  {info.texto && <p className="text-gray-700 mt-1 mb-2">{info.texto}</p>}
                  {info.planos && info.planos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                      {info.planos.map((p, pi) => (
                        <img key={pi} src={p} alt={`Plan ${pi+1}`} className="rounded border object-contain h-32 w-full bg-white" />
                      ))}
                    </div>
                  )}
                  {info.fotos && info.fotos.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {info.fotos.map((f, fi) => (
                        <img key={fi} src={f} alt={`Photo ${fi+1}`} className="rounded border object-cover h-24 w-full" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client Change Proposals Section */}
        {usuario?.rol !== 'administrador' && ['working', 'pending_payment', 'paid'].includes(proyecto.estado) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PenTool size={22} /> Propose Changes
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Request changes or additional work from the management team.
            </p>

            {/* Display previous proposals */}
            {proyecto.propuestasCliente && proyecto.propuestasCliente.length > 0 && (
              <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-gray-700">Your previous proposals:</p>
                {proyecto.propuestasCliente.map((prop, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">{new Date(prop.fechaCreacion).toLocaleString()}</p>
                    <p className="text-sm text-gray-700">{prop.demandas}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Form to create new proposal */}
            {!mostrarFormPropuesta ? (
              <button
                onClick={() => setMostrarFormPropuesta(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold transition"
              >
                <PenTool size={16} /> Submit New Proposal
              </button>
            ) : (
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 space-y-4">
                <textarea
                  value={propuestaDemandas}
                  onChange={(e) => setPropuestaDemandas(e.target.value)}
                  rows={4}
                  placeholder="Describe the changes or additional work you need..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (!propuestaDemandas.trim()) {
                        alert('Please describe your proposal.');
                        return;
                      }
                      setEnviandoPropuesta(true);
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}/proponer-cambios`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ demandas: propuestaDemandas }),
                        });
                        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
                        alert('Proposal submitted! The management team will review it soon.');
                        setMostrarFormPropuesta(false);
                        setPropuestaDemandas('');
                        window.location.reload();
                      } catch (err) { alert('Error: ' + err.message); }
                      finally { setEnviandoPropuesta(false); }
                    }}
                    disabled={enviandoPropuesta}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition"
                  >
                    <Send size={16} /> {enviandoPropuesta ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                  <button
                    onClick={() => { setMostrarFormPropuesta(false); setPropuestaDemandas(''); }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin view of client proposals */}
        {usuario?.rol === 'administrador' && proyecto.propuestasCliente && proyecto.propuestasCliente.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PenTool size={22} /> Client Change Proposals
            </h2>
            <div className="space-y-3">
              {proyecto.propuestasCliente.map((prop, idx) => (
                <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">{new Date(prop.fechaCreacion).toLocaleString()}</p>
                  <p className="text-sm text-gray-700">{prop.demandas}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reopen / Amendments Section */}
        {['working', 'pending_payment', 'paid'].includes(proyecto.estado) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RotateCcw size={22} /> Amendments / Reopenings
            </h2>

            {/* Existing reopenings */}
            {proyecto.reaperturas && proyecto.reaperturas.length > 0 && (
              <div className="space-y-4 mb-6">
                {proyecto.reaperturas.map((rea, idx) => (
                  <div key={idx} className={`border rounded-lg p-4 ${rea.aceptado ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${rea.aceptado ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                          {rea.aceptado ? 'Signed' : 'Pending Signature'}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {new Date(rea.fechaCreacion).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{rea.descripcionCambios}</p>
                    {rea.presupuestoItems && rea.presupuestoItems.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-gray-600 mb-1">Additional Budget:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {rea.presupuestoItems.map((item, bi) => (
                            <li key={bi} className="flex justify-between">
                              <span>{item.descripcion} (x{item.cantidad})</span>
                              <span className="font-semibold">€{(item.total || 0).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {rea.documentoPDF && (
                      <a href={rea.documentoPDF} download className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-2">
                        <FileText size={14} /> Download Amendment PDF
                      </a>
                    )}
                    {rea.firmaCliente && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Client Signature:</p>
                        <img src={rea.firmaCliente} alt="Signature" className="max-w-[200px] border rounded shadow-sm mt-1" />
                        <p className="text-xs text-gray-400 mt-1">
                          Signed on {rea.fechaFirma ? new Date(rea.fechaFirma).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    )}

                    {/* Client sign button for unsigned amendments */}
                    {usuario?.rol !== 'administrador' && !rea.aceptado && (
                      <div className="mt-3 pt-3 border-t">
                        {firmandoReapertura === idx ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-gray-700">Sign this amendment:</p>
                            <canvas
                              id={`firma-reapertura-${idx}`}
                              width={400}
                              height={150}
                              className="border border-gray-300 rounded bg-white cursor-crosshair"
                              onMouseDown={(e) => {
                                const canvas = e.target;
                                const ctx = canvas.getContext('2d');
                                ctx.beginPath();
                                const rect = canvas.getBoundingClientRect();
                                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                                canvas._drawing = true;
                              }}
                              onMouseMove={(e) => {
                                const canvas = e.target;
                                if (!canvas._drawing) return;
                                const ctx = canvas.getContext('2d');
                                const rect = canvas.getBoundingClientRect();
                                ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                                ctx.stroke();
                              }}
                              onMouseUp={(e) => {
                                const canvas = e.target;
                                canvas._drawing = false;
                                setFirmaReaperturaData(canvas.toDataURL());
                              }}
                            />
                            <div className="flex gap-3">
                              <button
                                onClick={async () => {
                                  if (!firmaReaperturaData) { alert('Please sign first.'); return; }
                                  try {
                                    const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}/reapertura/${idx}/firmar`, {
                                      method: 'POST',
                                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ firmaCliente: firmaReaperturaData }),
                                    });
                                    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
                                    alert('Amendment signed successfully!');
                                    setFirmandoReapertura(null);
                                    setFirmaReaperturaData(null);
                                    window.location.reload();
                                  } catch (err) { alert('Error: ' + err.message); }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition"
                              >
                                <PenTool size={16} /> Confirm Signature
                              </button>
                              <button
                                onClick={() => { setFirmandoReapertura(null); setFirmaReaperturaData(null); }}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setFirmandoReapertura(idx)}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition"
                          >
                            <PenTool size={16} /> Sign Amendment
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Admin: Create new reopen */}
            {usuario?.rol === 'administrador' && (
              <>
                {!mostrarFormReapertura ? (
                  <button
                    onClick={() => setMostrarFormReapertura(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-sm font-semibold transition"
                  >
                    <RotateCcw size={16} /> Create Amendment
                  </button>
                ) : (
                  <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 space-y-4">
                    <h3 className="font-semibold text-gray-800">New Amendment</h3>
                    <textarea
                      value={reaperturaDescripcion}
                      onChange={(e) => setReaperturaDescripcion(e.target.value)}
                      rows={3}
                      placeholder="Describe the changes needed..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                    />

                    {/* Additional budget items */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Additional Budget Items</p>
                      {reaperturaPresupuesto.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                          <input
                            type="text"
                            value={item.descripcion}
                            onChange={(e) => {
                              const u = [...reaperturaPresupuesto];
                              u[idx].descripcion = e.target.value;
                              setReaperturaPresupuesto(u);
                            }}
                            placeholder="Description"
                            className="col-span-2 px-2 py-1 border rounded text-sm"
                          />
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => {
                              const u = [...reaperturaPresupuesto];
                              u[idx].cantidad = parseInt(e.target.value) || 1;
                              u[idx].total = u[idx].cantidad * u[idx].precioUnitario;
                              setReaperturaPresupuesto(u);
                            }}
                            placeholder="Qty"
                            className="px-2 py-1 border rounded text-sm text-center"
                          />
                          <div className="flex gap-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.precioUnitario}
                              onChange={(e) => {
                                const u = [...reaperturaPresupuesto];
                                u[idx].precioUnitario = parseFloat(e.target.value) || 0;
                                u[idx].total = u[idx].cantidad * u[idx].precioUnitario;
                                setReaperturaPresupuesto(u);
                              }}
                              placeholder="Price"
                              className="flex-1 px-2 py-1 border rounded text-sm text-right"
                            />
                            <button
                              onClick={() => setReaperturaPresupuesto(reaperturaPresupuesto.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 px-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setReaperturaPresupuesto([...reaperturaPresupuesto, { descripcion: '', cantidad: 1, precioUnitario: 0, total: 0 }])}
                        className="text-sm text-orange-600 hover:text-orange-800 font-semibold"
                      >
                        + Add Budget Item
                      </button>
                    </div>

                    {/* PDF upload */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Amendment PDF (optional)</label>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setReaperturaPDF(reader.result);
                          reader.readAsDataURL(file);
                        }}
                        className="text-sm"
                      />
                      {reaperturaPDF && <p className="text-xs text-green-600 mt-1">✅ PDF attached</p>}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (!reaperturaDescripcion.trim()) { alert('Please add a description.'); return; }
                          setEnviandoReapertura(true);
                          try {
                            const res = await fetch(`${import.meta.env.VITE_API_URL}/proyectos/${id}/reapertura`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                descripcionCambios: reaperturaDescripcion,
                                presupuestoItems: reaperturaPresupuesto,
                                presupuestoAdicional: reaperturaPresupuesto.reduce((sum, item) => sum + (item.total || 0), 0),
                                documentoPDF: reaperturaPDF,
                              }),
                            });
                            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
                            alert('Amendment created! The client will be notified.');
                            setMostrarFormReapertura(false);
                            setReaperturaDescripcion('');
                            setReaperturaPresupuesto([]);
                            setReaperturaPDF(null);
                            window.location.reload();
                          } catch (err) { alert('Error: ' + err.message); }
                          finally { setEnviandoReapertura(false); }
                        }}
                        disabled={enviandoReapertura}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition"
                      >
                        <Send size={16} /> {enviandoReapertura ? 'Creating...' : 'Create Amendment'}
                      </button>
                      <button
                        onClick={() => { setMostrarFormReapertura(false); setReaperturaDescripcion(''); setReaperturaPresupuesto([]); setReaperturaPDF(null); }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Commission overview for the electricista (client) — visible when admin has finalized */}
        {usuario?.rol !== 'administrador' &&
         proyecto.commissieResultaat &&
         proyecto.commissieResultaat.totaleCommissie > 0 &&
         ['finished', 'pending_payment', 'paid'].includes(proyecto.estado) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border-l-4 border-green-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Receipt size={22} className="text-green-600" /> Commissie Overzicht
            </h2>
            <p className="text-sm text-gray-500 mb-6">Gebruik dit overzicht om uw factuur op te maken aan onze vennootschap.</p>

            {/* Project info for the invoice */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm space-y-1 text-gray-700">
              <p><span className="font-semibold w-36 inline-block">Project naam:</span> {proyecto.tituloPersonalizado || proyecto.tituloAutomatico || proyecto.nombreCasa}</p>
              <p><span className="font-semibold w-36 inline-block">Project nummer:</span> {proyecto.tituloAutomatico}</p>
              {proyecto.commissieResultaat.datumAfgewerkt && (
                <p><span className="font-semibold w-36 inline-block">Datum afgewerkt:</span> {new Date(proyecto.commissieResultaat.datumAfgewerkt).toLocaleDateString('nl-BE')}</p>
              )}
              <p><span className="font-semibold w-36 inline-block">Offerte totaal:</span> € {(proyecto.commissieResultaat.offerteTotaalbedrag || 0).toFixed(2)}</p>
            </div>

            {/* Commission breakdown table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-600">Type</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-600">%</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-600">Bedrag excl. btw</th>
                    <th className="text-right py-2 pl-4 font-semibold text-gray-600">Commissie</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Type 1 — op totaalbedrag', pct: proyecto.commissieResultaat.type1Pct, bedrag: proyecto.commissieResultaat.type1Bedrag, commissie: proyecto.commissieResultaat.type1Commissie },
                    { label: 'Type 2 — hardware', pct: proyecto.commissieResultaat.type2Pct, bedrag: proyecto.commissieResultaat.type2Bedrag, commissie: proyecto.commissieResultaat.type2Commissie },
                    { label: 'Type 3 — werkuren', pct: proyecto.commissieResultaat.type3Pct, bedrag: proyecto.commissieResultaat.type3Bedrag, commissie: proyecto.commissieResultaat.type3Commissie },
                    { label: 'Type 4 — vervoer / verzendkosten (0%)', pct: 0, bedrag: proyecto.commissieResultaat.type4Bedrag, commissie: 0 },
                    { label: 'Type 5 — speciale commissie', pct: proyecto.commissieResultaat.type5Pct, bedrag: proyecto.commissieResultaat.type5Bedrag, commissie: proyecto.commissieResultaat.type5Commissie },
                  ].filter(row => row.bedrag > 0 || row.commissie > 0).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-700">{row.label}</td>
                      <td className="py-2 px-4 text-right text-gray-600">{row.pct}%</td>
                      <td className="py-2 px-4 text-right text-gray-700">€ {(row.bedrag || 0).toFixed(2)}</td>
                      <td className="py-2 pl-4 text-right font-semibold text-gray-900">€ {(row.commissie || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-green-50">
                    <td colSpan={3} className="py-3 pr-4 font-bold text-gray-800 text-right">Totale commissie (excl. btw)</td>
                    <td className="py-3 pl-4 text-right text-xl font-bold text-green-700">€ {(proyecto.commissieResultaat.totaleCommissie || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-4 text-xs text-gray-400 italic">Btw dient apart vermeld te worden op uw factuur. Dit overzicht is enkel informatief.</p>
          </div>
        )}

        {/* ── STATE HISTORY TIMELINE ── */}
        {proyecto.historialEstados && proyecto.historialEstados.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              <span className="text-gray-500">📋</span> Project Timeline
            </h2>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {[...proyecto.historialEstados].reverse().map((entry, idx) => {
                  const estadoColors = {
                    created: 'bg-blue-500', offer_ready: 'bg-purple-500', offer_sent: 'bg-indigo-500',
                    approved: 'bg-green-500', working: 'bg-yellow-500', finished: 'bg-teal-500',
                    pending_payment: 'bg-orange-500', paid: 'bg-green-700', rejected: 'bg-red-500',
                  };
                  const estadoLabels = {
                    created: 'Created', offer_ready: 'Offer Ready', offer_sent: 'Offer Sent',
                    approved: 'Approved', working: 'Working', finished: 'Finished',
                    pending_payment: 'Pending Payment', paid: 'Paid', rejected: 'Rejected',
                  };
                  const color = estadoColors[entry.estadoNuevo] || 'bg-gray-400';
                  const label = estadoLabels[entry.estadoNuevo] || entry.estadoNuevo;
                  return (
                    <div key={idx} className="flex items-start gap-4 pl-2">
                      {/* Dot */}
                      <div className={`relative z-10 w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${color} ring-2 ring-white shadow`} />
                      {/* Content */}
                      <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {entry.estadoAnterior && (
                              <>
                                <span className="text-xs text-gray-400">{estadoLabels[entry.estadoAnterior] || entry.estadoAnterior}</span>
                                <span className="text-gray-300 text-xs">→</span>
                              </>
                            )}
                            <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(entry.fecha).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {entry.comentario && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{entry.comentario}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sin contenido */}
        {(!proyecto.planos || proyecto.planos.length === 0) && 
         (!proyecto.fotosLocalizacion || proyecto.fotosLocalizacion.length === 0) &&
         (!proyecto.ruimtes || proyecto.ruimtes.length === 0) && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">This project does not contain floor plans or photos yet</p>
          </div>
        )}

        {/* Modal de Zoom para Planos */}
        {modalZoomAbierto && imagenActivaIdx !== null && proyecto.planos && proyecto.planos[imagenActivaIdx] && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex flex-col"
            onClick={cerrarModalZoom}
            onMouseMove={manejarMouseMove}
            onMouseUp={manejarMouseUp}
            onMouseLeave={manejarMouseUp}
          >
            {/* Encabezado del Modal */}
            <div className="bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-white font-semibold">
                Floor Plan {imagenActivaIdx + 1} - Zoom x{zoomLevel.toFixed(1)}
              </h3>
              <button
                onClick={cerrarModalZoom}
                className="text-gray-300 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Área de Zoom */}
            <div 
              ref={modalZoomRef}
              className="flex-1 overflow-hidden relative bg-black flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Contenedor que se transforma con zoom (sin pan) */}
              <div 
                style={{
                  position: 'relative',
                  width: 'min(90vw, calc(80vh * 1.5))',
                  aspectRatio: '3 / 2',
                  transformOrigin: 'center',
                  transform: `scale(${zoomLevel})`,
                  transition: arrastrandoModalZoom ? 'none' : 'transform 0.1s ease-out'
                }}
                onMouseDown={manejarMouseDown}
              >
                <img
                  src={proyecto.planos[imagenActivaIdx].imagenBase64}
                  alt={`Plano ${imagenActivaIdx + 1} Zoom`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />

                {/* Dibujos a mano alzada en modal zoom - misma imagen PNG del preview */}
                {proyecto.planos[imagenActivaIdx]?.dataDibujo && drawingUrls[imagenActivaIdx] && (
                  <img
                    src={drawingUrls[imagenActivaIdx]}
                    alt="drawing"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Marcadores como SVG - DENTRO del div escalado para que se muevan con el zoom */}
                {proyecto.planos[imagenActivaIdx]?.marcadores && proyecto.planos[imagenActivaIdx].marcadores.length > 0 && (
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 20
                    }}
                    viewBox="0 0 1200 800"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {proyecto.planos[imagenActivaIdx].marcadores.map((marcador, midx) => {
                      const iconMap = {
                        'camara': '/icons/camara.png',
                        'wifi': '/icons/wifi.png',
                        'arbol': '/icons/arbol.png',
                      };
                      const markerSize = 90;
                      return (
                        <image
                          key={midx}
                          href={iconMap[marcador.tipo] || '/icons/camara.png'}
                          x={marcador.x - markerSize / 2}
                          y={marcador.y - markerSize / 2}
                          width={markerSize}
                          height={markerSize}
                        />
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-gray-800 p-3 text-gray-300 text-sm text-center">
              💡 Mouse wheel to zoom · Click X to close
            </div>
          </div>
        )}

        {/* Editor de plano */}
        {/* Modal de Zoom para Fotos */}
        {modalFotoAbierto && fotoActivaIdx !== null && proyecto.fotosLocalizacion && proyecto.fotosLocalizacion[fotoActivaIdx] && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex flex-col"
            onClick={cerrarModalFoto}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -1 : 1;
              manejarZoomFoto(delta);
            }}
          >
            {/* Encabezado del Modal */}
            <div className="bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-white font-semibold">
                Photo {fotoActivaIdx + 1} - Zoom x{zoomLevelFoto.toFixed(1)}
              </h3>
              <button
                onClick={cerrarModalFoto}
                className="text-gray-300 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Área de Zoom */}
            <div 
              ref={modalFotoRef}
              className="flex-1 overflow-hidden relative bg-black flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Contenedor con zoom */}
              <div 
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  transformOrigin: 'center',
                  transform: `scale(${zoomLevelFoto})`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <img
                  src={proyecto.fotosLocalizacion[fotoActivaIdx]}
                  alt={`Foto ${fotoActivaIdx + 1}`}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    height: 'auto'
                  }}
                />
              </div>
            </div>

            {/* Controles de Zoom */}
            <div className="bg-gray-900 p-4 flex justify-center gap-4 border-t border-gray-700">
              <button
                onClick={() => manejarZoomFoto(-1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
              >
                <ZoomOut size={20} /> Zoom Out
              </button>
              <button
                onClick={() => setZoomLevelFoto(1)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
              >
                Reset
              </button>
              <button
                onClick={() => manejarZoomFoto(1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
              >
                <ZoomIn size={20} /> Zoom In
              </button>
            </div>
          </div>
        )}

        {/* Generic Lightbox for Ruimtes images */}
        {modalLightbox && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex flex-col"
            onClick={() => setModalLightbox(null)}
            onWheel={(e) => {
              e.preventDefault();
              setZoomLightbox(z => Math.max(0.5, Math.min(5, z + (e.deltaY > 0 ? -0.2 : 0.2))));
            }}
          >
            <div className="bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-white font-semibold">{modalLightbox.title} – Zoom x{zoomLightbox.toFixed(1)}</h3>
              <button onClick={() => setModalLightbox(null)} className="text-gray-300 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            <div
              className="flex-1 overflow-hidden relative bg-black flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  transformOrigin: 'center',
                  transform: `scale(${zoomLightbox})`,
                  transition: 'transform 0.1s ease-out',
                }}
              >
                <img
                  src={modalLightbox.src}
                  alt={modalLightbox.title}
                  style={{ display: 'block', maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain' }}
                />
                {/* Freehand drawing overlay in lightbox */}
                {modalLightbox.drawingSrc && (
                  <img
                    src={modalLightbox.drawingSrc}
                    alt="drawing"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                  />
                )}
                {modalLightbox.marcadores && modalLightbox.marcadores.length > 0 && (
                  <svg
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    viewBox="0 0 1200 800"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {modalLightbox.marcadores.map((m, i) => {
                      const iconMap = { camara: '/icons/camara.png', wifi: '/icons/wifi.png', arbol: '/icons/arbol.png' };
                      return <image key={i} href={iconMap[m.tipo]} x={m.x - 45} y={m.y - 45} width={90} height={90} />;
                    })}
                  </svg>
                )}
              </div>
            </div>
            <div className="bg-gray-900 p-4 flex justify-center gap-4 border-t border-gray-700">
              <button
                onClick={() => setZoomLightbox(z => Math.max(0.5, z - 0.5))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
              >
                <ZoomOut size={20} /> Zoom Out
              </button>
              <button
                onClick={() => setZoomLightbox(1)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
              >
                Reset
              </button>
              <button
                onClick={() => setZoomLightbox(z => Math.min(5, z + 0.5))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
              >
                <ZoomIn size={20} /> Zoom In
              </button>
            </div>
            <div className="bg-gray-800 p-3 text-gray-300 text-sm text-center">
              💡 Mouse wheel to zoom · Click outside image to close
            </div>
          </div>
        )}

        {/* Modal Editor Plano (old planos format) */}
        {planoEditorAbierto !== null && proyecto?.planos[planoEditorAbierto] && (
          <PlanoEditor
            plano={proyecto.planos[planoEditorAbierto]}
            idxPlano={planoEditorAbierto}
            onSave={guardarPlanoEditado}
            onCancel={() => setPlanoEditorAbierto(null)}
          />
        )}

        {/* Modal Editor for Ruimte floor plans */}
        {ruimteEditorAbierto !== null && proyecto?.ruimtes?.[ruimteEditorAbierto] && (
          <PlanoEditor
            plano={{
              imagenBase64: proyecto.ruimtes[ruimteEditorAbierto].platteGrond,
              marcadores: proyecto.ruimtes[ruimteEditorAbierto].marcadores || [],
              dataDibujo: proyecto.ruimtes[ruimteEditorAbierto].dataDibujo || null,
              comentarios: proyecto.ruimtes[ruimteEditorAbierto].omschrijving || '',
              nombre: proyecto.ruimtes[ruimteEditorAbierto].naam || `Room ${ruimteEditorAbierto + 1}`,
            }}
            idxPlano={ruimteEditorAbierto}
            onSave={guardarRuimtePlanoEditado}
            onCancel={() => setRuimteEditorAbierto(null)}
          />
        )}

        {/* ── COMMISSIE POPUP ── */}
        {mostrarPopupFinalizar && proyecto && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">
              {/* Header */}
              <div className="px-8 pt-8 pb-4 border-b">
                <h2 className="text-3xl font-light text-blue-600 mb-4">Commissie</h2>
                <div className="space-y-0.5 text-sm text-gray-700">
                  <p><span className="font-semibold">Project naam:</span> {proyecto.tituloPersonalizado || proyecto.tituloAutomatico || proyecto.nombreCasa}</p>
                  <p><span className="font-semibold">Project nummer:</span> {proyecto.tituloAutomatico}</p>
                  <p><span className="font-semibold">Klantnaam:</span> {electricistaPerfil?.nombre || ''} {electricistaPerfil?.apellidos || ''}</p>
                  <p><span className="font-semibold">Datum afgewerkt:</span> {new Date().toLocaleDateString('nl-BE')}</p>
                </div>
              </div>

              <div className="px-8 py-5 space-y-5">
                {/* Offerte Totaalbedrag */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-semibold text-gray-700 w-52 shrink-0">Offerte (s) Totaalbedrag:</label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-semibold">€</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={commissie.offerteTotaalbedrag}
                      onChange={e => setCommissie(prev => ({ ...prev, offerteTotaalbedrag: e.target.value }))}
                      className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Commission table */}
                <div>
                  <div className="grid grid-cols-[1fr_70px_130px_130px] gap-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span></span><span></span>
                    <span className="text-center">totaal bedrag<br/>gefactureerd</span>
                    <span className="text-center">totale commissie</span>
                  </div>
                  {[
                    { key: 'type1', label: 'Type 1 commissie op totaalbedrag' },
                    { key: 'type2', label: 'Type 2 commissie hardware' },
                    { key: 'type3', label: 'Type 3 commissie werkuren' },
                    { key: 'type4', label: 'Type 4 commission 0%\n(vervoer, verzendkosten,…)' },
                    { key: 'type5', label: 'Type 5 speciale commissie' },
                  ].map(({ key, label }) => {
                    const pct = parseFloat(commissie[`${key}Pct`]) || 0;
                    const bedrag = parseFloat(commissie[`${key}Bedrag`]) || 0;
                    const commissieCalc = Math.round(pct * bedrag / 100 * 100) / 100;
                    const isType4 = key === 'type4';
                    return (
                      <div key={key} className="grid grid-cols-[1fr_70px_130px_130px] gap-2 items-center py-1.5 border-b last:border-0">
                        <span className="text-sm text-gray-700 whitespace-pre-line">{label}</span>
                        <div className="flex items-center">
                          {isType4 ? (
                            <span className="text-sm font-semibold text-gray-500 pl-1">0%</span>
                          ) : (
                            <div className="flex items-center">
                              <input
                                type="number" step="0.1" min="0" max="100"
                                value={commissie[`${key}Pct`]}
                                onChange={e => setCommissie(prev => ({ ...prev, [`${key}Pct`]: e.target.value }))}
                                className="w-12 px-1.5 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                              <span className="ml-0.5 text-sm text-gray-500">%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 text-sm">€</span>
                          <input
                            type="number" step="0.01" min="0"
                            value={commissie[`${key}Bedrag`]}
                            onChange={e => setCommissie(prev => ({ ...prev, [`${key}Bedrag`]: e.target.value }))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 italic">
                          {bedrag > 0 || pct > 0 ? (
                            <>{commissieCalc > 0 ? <span className="font-semibold text-gray-800 not-italic">€ {commissieCalc.toFixed(2)}</span> : <span>€ 0.00</span>}</>
                          ) : (
                            <span>€ is amount calculated</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                {(() => {
                  const calc = (k) => Math.round((parseFloat(commissie[`${k}Pct`]) || 0) * (parseFloat(commissie[`${k}Bedrag`]) || 0) / 100 * 100) / 100;
                  const total = ['type1','type2','type3','type4','type5'].reduce((s, k) => s + calc(k), 0);
                  return (
                    <div className="flex items-center justify-end gap-4 pt-2 border-t">
                      <span className="text-sm font-semibold text-gray-700">Totale commissie (excl. btw)</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-700">€</span>
                        <div className="w-32 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-800">
                          {total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer buttons */}
              <div className="px-8 pb-8 flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={() => setMostrarPopupFinalizar(false)}
                  className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmitFinalizar(false)}
                  disabled={enviandoFinalizar}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition"
                >
                  {enviandoFinalizar ? 'Opslaan…' : 'Finalizar (geen e-mail)'}
                </button>
                <button
                  onClick={() => handleSubmitFinalizar(true)}
                  disabled={enviandoFinalizar}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold text-sm transition"
                >
                  {enviandoFinalizar ? 'Opslaan…' : 'Finalizar + e-mail client'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

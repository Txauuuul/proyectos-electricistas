import { useState, useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { Camera, Wifi, TreePine, Save, X, RotateCcw, Trash2, CheckCircle } from 'lucide-react';

const ICON_TYPES = [
  { id: 'camara', label: 'Camera', icon: Camera, color: '#FF6B6B' },
  { id: 'wifi', label: 'WiFi', icon: Wifi, color: '#4ECDC4' },
  { id: 'arbol', label: 'Tree', icon: TreePine, color: '#95E1D3' },
];

export default function PlanoEditor({ plano, idxPlano, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const canvasInstanceRef = useRef(null);
  const [herramientaActiva, setHerramientaActiva] = useState(null);
  const [marcadores, setMarcadores] = useState(plano?.marcadores || []);
  const [comentarios, setComentarios] = useState(plano?.comentarios || '');
  const [nombrePlano, setNombrePlano] = useState(plano?.nombre || `Plano ${idxPlano + 1}`);
  const [guardando, setGuardando] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Auto-dismiss the save toast after 3 seconds
  useEffect(() => {
    if (!savedToast) return;
    const t = setTimeout(() => setSavedToast(false), 3000);
    return () => clearTimeout(t);
  }, [savedToast]);

  // Función para recrear marcadores PNG desde el array guardado
  const recrearMarcadores = (canvas, marcadoresData) => {
    if (!marcadoresData || marcadoresData.length === 0) return;

    marcadoresData.forEach((marcador) => {
      // Mapeo de iconos PNG personalizados
      const iconMap = {
        'camara': '/icons/camara.png',
        'wifi': '/icons/wifi.png',
        'arbol': '/icons/arbol.png',
      };
      
      const iconPath = iconMap[marcador.tipo];
      if (!iconPath) {
        console.warn(`Icon path not found for marker type: ${marcador.tipo}`);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Escalar el icono para que ocupe exactamente MARKER_SIZE píxeles lógicos (= tamaño usado en SVG preview)
          const MARKER_SIZE = 90;
          const scaleX = MARKER_SIZE / img.naturalWidth;
          const scaleY = MARKER_SIZE / img.naturalHeight;
          const fabricImage = new fabric.Image(img, {
            left: marcador.x,
            top: marcador.y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
            metadata: { type: 'marker', markerType: marcador.tipo },
            scaleX,
            scaleY,
          });
          canvas.add(fabricImage);
          canvas.renderAll();
          console.log(`✅ Marcador ${marcador.tipo} recreado en (${marcador.x}, ${marcador.y})`);
        } catch (error) {
          console.error('Error recreating marker:', error);
        }
      };
      
      img.onerror = () => {
        console.error(`Error loading marker image: ${iconPath}`);
      };
      
      img.src = iconPath;
    });
  };

  // Inicializar canvas
  useEffect(() => {
    if (!plano || !canvasRef.current) return;

    try {
      console.log('🎨 Inicializando canvas para editor');

      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 1200,
        height: 800,
        backgroundColor: '#e5e7eb',
        renderOnAddRemove: false,
        uniformScaling: true,
      });

      canvasInstanceRef.current = fabricCanvas;
      setMarcadores(plano.marcadores || []);

      // Establece la imagen del plano como fondo de Fabric (siempre centrada y escalada a 1200x800).
      // DEBE llamarse DESPUÉS de loadFromJSON porque loadFromJSON borra el backgroundImage.
      const setearFondoFabric = (callback) => {
        if (!plano.imagenBase64) { callback && callback(); return; }
        fabric.Image.fromURL(
          plano.imagenBase64,
          (img) => {
            const scale = Math.min(1200 / img.width, 800 / img.height);
            const offsetLeft = (1200 - img.width * scale) / 2;
            const offsetTop  = (800  - img.height * scale) / 2;
            fabricCanvas.setBackgroundImage(img, () => {
              fabricCanvas.renderAll();
              callback && callback();
            }, { scaleX: scale, scaleY: scale, left: offsetLeft, top: offsetTop,
                 originX: 'left', originY: 'top' });
          },
          { crossOrigin: 'anonymous' }
        );
      };

      const cargarFondoYContenido = () => {
        const despuesDeFondo = () => {
          if (plano.marcadores && plano.marcadores.length > 0) {
            setTimeout(() => recrearMarcadores(fabricCanvas, plano.marcadores), 100);
          }
        };

        if (plano.dataDibujo) {
          // Primero cargar dibujos; luego el fondo (loadFromJSON resetea backgroundImage)
          fabricCanvas.loadFromJSON(plano.dataDibujo, () => {
            console.log('✅ Dibujos cargados en editor');
            setearFondoFabric(despuesDeFondo);
          });
        } else {
          setearFondoFabric(despuesDeFondo);
        }
      };

      cargarFondoYContenido();

      return () => {
        if (fabricCanvas) {
          fabricCanvas.dispose();
        }
      };
    } catch (error) {
      console.error('❌ Error inicializando canvas:', error);
    }
  }, [plano]);

  const handleGuardar = async () => {
    if (guardando) return;
    if (!canvasInstanceRef.current) {
      alert('❌ Error: Canvas is not initialized');
      return;
    }

    setGuardando(true);
    try {
      const canvas = canvasInstanceRef.current;

      // Always exit drawing mode first so the current in-progress stroke is committed
      canvas.isDrawingMode = false;
      canvas.discardActiveObject();
      canvas.renderAll();

      const todosLosObjetos = canvas.getObjects() || [];
      // Drawings = everything that is NOT a fabric.Image (markers are fabric.Image)
      const dibujos = todosLosObjetos.filter(obj => obj.type !== 'image');

      console.log('💾 Save | total objects:', todosLosObjetos.length, '| drawings:', dibujos.length, '| markers:', marcadores.length);

      let dataDibujo = null;

      if (dibujos.length > 0) {
        // Serialize the whole canvas WITHOUT mutating it —
        // then strip marker images from the JSON data layer.
        const fullJSON = canvas.toJSON(['stroke', 'strokeWidth', 'fill', 'radius', 'type', 'metadata', 'path']);
        dataDibujo = {
          ...fullJSON,
          objects: (fullJSON.objects || []).filter(obj => obj.type !== 'image'),
          background: 'transparent',
          backgroundImage: null,
        };
        console.log('📦 Drawing objects serialized:', dataDibujo.objects.length);
      }

      // Extract actual marker positions from the Fabric canvas (supports drag-to-reposition)
      const marcadoresActualizados = [];
      const imagenes = todosLosObjetos.filter(obj => obj.type === 'image');
      imagenes.forEach((img) => {
        const meta = img.metadata || img.get('metadata');
        if (meta && meta.type === 'marker' && meta.markerType) {
          marcadoresActualizados.push({
            tipo: meta.markerType,
            x: img.left,
            y: img.top,
          });
        }
      });

      // Use canvas-extracted positions if available, otherwise fall back to state
      const marcadoresFinales = marcadoresActualizados.length > 0 ? marcadoresActualizados : marcadores;

      const planoGuardar = {
        ...plano,
        nombre: nombrePlano,
        comentarios: comentarios,
        marcadores: marcadoresFinales,
        dataDibujo: dataDibujo,
      };

      console.log('🔄 Calling onSave | hasDrawing:', !!dataDibujo, '| markers:', marcadores.length);
      await onSave(idxPlano, planoGuardar);
      console.log('✅ Save completed');
      setSavedToast(true);
    } catch (error) {
      console.error('❌ Error saving:', error);
      alert(`❌ Error saving: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const activarLapiz = () => {
    if (!canvasInstanceRef.current) return;
    setHerramientaActiva('lapiz');
    const canvas = canvasInstanceRef.current;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = 3;
    canvas.freeDrawingBrush.color = '#000000';
    console.log('✏️ Modo lápiz activado');
  };

  const desactivarLapiz = () => {
    if (!canvasInstanceRef.current) return;
    canvasInstanceRef.current.isDrawingMode = false;
    setHerramientaActiva(null);
    console.log('✏️ Modo lápiz desactivado');
  };

  const agregarMarcador = (tipoId) => {
    if (!canvasInstanceRef.current) return;

    console.log(`📍 Intentando añadir marcador: ${tipoId}`);
    const canvas = canvasInstanceRef.current;
    setHerramientaActiva(tipoId);

    const handleMouseDown = (event) => {
      const pointer = canvas.getPointer(event.e);
      
      console.log(`📍 Marcador colocado en: ${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)}`);

      // Mapeo de iconos PNG personalizados
      const iconMap = {
        'camara': '/icons/camara.png',
        'wifi': '/icons/wifi.png',
        'arbol': '/icons/arbol.png',
      };
      
      const iconPath = iconMap[tipoId];
      if (!iconPath) {
        console.warn(`Icon path not found for marker type: ${tipoId}`);
        canvas.off('mouse:down', handleMouseDown);
        setHerramientaActiva(null);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          // Escalar el icono para que ocupe exactamente MARKER_SIZE píxeles lógicos (= tamaño usado en SVG preview)
          const MARKER_SIZE = 90;
          const scaleX = MARKER_SIZE / img.naturalWidth;
          const scaleY = MARKER_SIZE / img.naturalHeight;
          const fabricImage = new fabric.Image(img, {
            left: pointer.x,
            top: pointer.y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
            metadata: { type: 'marker', markerType: tipoId },
            scaleX,
            scaleY,
          });

          canvas.add(fabricImage);
          canvas.renderAll();

          // Guardar marcador con coordenadas del canvas lógico (1200x800)
          // pointer.x/y ya son coordenadas lógicas gracias a getPointer() de Fabric.js
          setMarcadores(prev => [...prev, { tipo: tipoId, x: pointer.x, y: pointer.y }]);
          console.log(`✅ Marcador ${tipoId} añadido en (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`);
        } catch (error) {
          console.error('Error adding marker:', error);
        }
      };

      img.onerror = () => {
        console.error(`Error loading marker image: ${iconPath}`);
      };

      img.src = iconPath;

      canvas.off('mouse:down', handleMouseDown);
      setHerramientaActiva(null);
    };

    canvas.on('mouse:down', handleMouseDown);
  };

  const deshacer = () => {
    if (!canvasInstanceRef.current) return;
    const canvas = canvasInstanceRef.current;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
      console.log('↶ Deshacer');
    }
  };

  const limpiarTodo = () => {
    if (!canvasInstanceRef.current) return;
    if (window.confirm('Are you sure you want to clear everything?')) {
      const canvas = canvasInstanceRef.current;
      // Eliminar objetos uno a uno para preservar el fondo transparente
      // canvas.clear() puede resetear backgroundColor a negro en Fabric.js
      const objects = canvas.getObjects().slice();
      objects.forEach(obj => canvas.remove(obj));
      canvas.backgroundColor = 'transparent';
      canvas.backgroundImage = null;
      canvas.renderAll();
      setMarcadores([]);
      console.log('🗑️ Canvas cleared');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[9999] flex items-center justify-center p-4">
      {/* Save toast */}
      {savedToast && (
        <div className="fixed top-6 right-6 z-[10000] flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl animate-fade-in">
          <CheckCircle size={20} />
          <span className="font-semibold text-sm">Floor plan saved successfully!</span>
        </div>
      )}
      <div className="bg-white rounded-lg w-full h-full max-w-6xl flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">✎ {nombrePlano || `Floor Plan ${idxPlano + 1}`}</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Herramientas */}
        <div className="bg-gray-100 p-4 flex gap-2 flex-wrap items-center border-b justify-between">
          <div className="flex gap-2 flex-wrap">
            {/* Botones principales: Dibujar, Deshacer, Limpiar, Guardar */}
            {herramientaActiva !== 'lapiz' ? (
              <button
                onClick={activarLapiz}
                className="px-4 py-2 rounded text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex gap-2 items-center"
                title="Draw on the canvas"
              >
                ✏️ Draw
              </button>
            ) : (
              <button
                onClick={desactivarLapiz}
                className="px-4 py-2 rounded text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition flex gap-2 items-center"
              >
                ✓ Done Drawing
              </button>
            )}

            <button
              onClick={deshacer}
              className="px-4 py-2 rounded text-sm font-semibold bg-gray-600 text-white hover:bg-gray-700 transition flex gap-2 items-center"
              title="Undo last action"
            >
              <RotateCcw size={16} /> Undo
            </button>

            <button
              onClick={limpiarTodo}
              className="px-4 py-2 rounded text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition flex gap-2 items-center"
              title="Clear all drawings"
            >
              <Trash2 size={16} /> Clear
            </button>

            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="px-4 py-2 rounded text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition flex gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save changes"
            >
              <Save size={16} />
              {guardando ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Marcadores a la derecha */}
          <div className="flex gap-2 flex-wrap">
            {ICON_TYPES.map(tipo => (
              <button
                key={tipo.id}
                onClick={() => agregarMarcador(tipo.id)}
                disabled={herramientaActiva !== null && herramientaActiva !== tipo.id}
                className={`px-3 py-2 rounded text-sm font-semibold flex gap-1 items-center transition ${
                  herramientaActiva === tipo.id
                    ? 'bg-yellow-500 text-white'
                    : herramientaActiva !== null && herramientaActiva !== tipo.id
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-white hover:bg-gray-200'
                }`}
                title={`Add ${tipo.label}`}
              >
                <tipo.icon size={16} /> {tipo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenedor principal */}
        <div className="flex-1 flex gap-4 overflow-hidden p-4">
          {/* Canvas */}
          <div className="flex-1 flex flex-col">
            <div 
              ref={containerRef}
              className="flex-1 bg-gray-200 rounded-lg relative"
              style={{ 
                overflow: 'hidden',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                maxHeight: '70vh',
                aspectRatio: '3/2',
              }}
              onWheel={(e) => e.preventDefault()}
            >
              <canvas 
                ref={canvasRef} 
                className="rounded shadow-lg"
                style={{
                  display: 'block',
                  touchAction: 'none',
                  cursor: herramientaActiva === 'lapiz' ? 'crosshair' : 'default',
                  width: '100%',
                  height: '100%',
                }}
              />
            </div>
          </div>

          {/* Panel lateral */}
          <div className="w-80 flex flex-col gap-4 overflow-y-auto">
            {/* Nombre del Plano */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📌 Floor Plan Name
              </label>
              <input
                type="text"
                value={nombrePlano}
                onChange={(e) => setNombrePlano(e.target.value)}
                placeholder="E.g.: Ground Floor, 1st Floor, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            {/* Comentarios */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📝 Notes
              </label>
              <textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                rows="4"
                placeholder="Special notes about this floor plan..."
              />
            </div>

            {/* Marcadores */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📍 Markers ({marcadores.length})
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {marcadores.length === 0 ? (
                  <p className="text-sm text-gray-500">No markers added</p>
                ) : (
                  marcadores.map((m, idx) => {
                    const tipoLabel = ICON_TYPES.find(t => t.id === m.tipo)?.label || m.tipo;
                    return (
                      <div key={idx} className="text-xs text-gray-600 bg-gray-100 p-2 rounded flex items-center gap-2">
                        <span className="font-semibold">{tipoLabel}</span>
                        <span className="text-gray-500">({m.x.toFixed(0)}, {m.y.toFixed(0)})</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cancel button */}
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={onCancel}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

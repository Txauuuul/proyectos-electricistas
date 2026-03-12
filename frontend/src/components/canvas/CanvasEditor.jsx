import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { fabric } from 'fabric';
import { Camera, Wifi, TreePine } from 'lucide-react';

const ICON_TYPES = [
  { id: 'camara', label: 'Cámara', icon: Camera, color: '#FF6B6B' },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi, color: '#4ECDC4' },
  { id: 'arbol', label: 'Árbol', icon: TreePine, color: '#95E1D3' },
];

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const MARKER_SIZE = 90;

export default forwardRef(function CanvasEditor({ imagenBase64 }, ref) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [herramientaActiva, setHerramientaActiva] = useState(null);
  const [marcadores, setMarcadores] = useState([]);

  const extractMarkersFromCanvas = (canvasInstance) => {
    if (!canvasInstance) return [];

    return (canvasInstance.getObjects() || [])
      .filter(obj => obj.type === 'image')
      .map((img) => {
        const meta = img.metadata || img.get('metadata');
        if (!meta || meta.type !== 'marker' || !meta.markerType) return null;

        return {
          tipo: meta.markerType,
          x: img.left,
          y: img.top,
        };
      })
      .filter(Boolean);
  };

  useImperativeHandle(ref, () => ({
    getCanvasData: () => {
      if (!canvas) return { marcadores: [], dataDibujo: null };

      const canvasJSON = canvas.toJSON(['metadata', 'path', 'stroke', 'strokeWidth', 'fill']);
      const dibujos = (canvasJSON.objects || []).filter(obj => obj.type !== 'image');

      return {
        marcadores: extractMarkersFromCanvas(canvas).map(marker => ({
          ...marker,
          aspectRatio: CANVAS_WIDTH / CANVAS_HEIGHT,
        })),
        dataDibujo: dibujos.length > 0
          ? {
              ...canvasJSON,
              objects: dibujos,
              canvasWidth: CANVAS_WIDTH,
              canvasHeight: CANVAS_HEIGHT,
              background: 'transparent',
              backgroundImage: null,
            }
          : null,
      };
    },
  }), [canvas]);

  useEffect(() => {
    if (!imagenBase64 || !canvasRef.current || !containerRef.current) return;

    try {
      const newCanvas = new fabric.Canvas(canvasRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 'transparent',
        renderOnAddRemove: false,
        uniformScaling: true,
      });

      const applyResponsiveSize = () => {
        if (!containerRef.current || !newCanvas.wrapperEl) return;

        const availableWidth = Math.min(containerRef.current.clientWidth - 24, CANVAS_WIDTH);
        const displayWidth = Math.max(320, availableWidth);
        const displayHeight = displayWidth * (CANVAS_HEIGHT / CANVAS_WIDTH);

        newCanvas.wrapperEl.style.width = `${displayWidth}px`;
        newCanvas.wrapperEl.style.height = `${displayHeight}px`;
        newCanvas.wrapperEl.style.position = 'relative';

        [newCanvas.lowerCanvasEl, newCanvas.upperCanvasEl].forEach((el) => {
          el.style.width = `${displayWidth}px`;
          el.style.height = `${displayHeight}px`;
          el.style.background = 'transparent';
        });

        newCanvas.calcOffset();
        newCanvas.requestRenderAll();
      };

      fabric.Image.fromURL(
        imagenBase64,
        (img) => {
          const scale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
          const offsetLeft = (CANVAS_WIDTH - img.width * scale) / 2;
          const offsetTop = (CANVAS_HEIGHT - img.height * scale) / 2;

          newCanvas.setBackgroundImage(
            img,
            () => {
              applyResponsiveSize();
              newCanvas.renderAll();
            },
            {
              scaleX: scale,
              scaleY: scale,
              left: offsetLeft,
              top: offsetTop,
              originX: 'left',
              originY: 'top',
            }
          );
        },
        { crossOrigin: 'anonymous' }
      );

      const resizeObserver = new ResizeObserver(() => applyResponsiveSize());
      resizeObserver.observe(containerRef.current);

      setCanvas(newCanvas);

      return () => {
        resizeObserver.disconnect();
        if (newCanvas) {
          newCanvas.dispose();
        }
      };
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }, [imagenBase64]);

  const agregarMarcador = (tipo) => {
    if (!canvas) {
      console.warn('Canvas not ready');
      return;
    }

    canvas.isDrawingMode = false;
    setHerramientaActiva(tipo);

    const handleMouseDown = (event) => {
      const pointer = canvas.getPointer(event.e);

      const iconMap = {
        'camara': '/icons/camara.png',
        'wifi': '/icons/wifi.png',
        'arbol': '/icons/arbol.png',
      };
      const iconPath = iconMap[tipo];

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const scaleX = MARKER_SIZE / img.naturalWidth;
          const scaleY = MARKER_SIZE / img.naturalHeight;
          const fabricImage = new fabric.Image(img, {
            left: pointer.x,
            top: pointer.y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
            metadata: { type: 'marker', markerType: tipo },
            excludeFromExport: true,
            scaleX,
            scaleY,
          });

          canvas.add(fabricImage);
          canvas.renderAll();

          setMarcadores(
            extractMarkersFromCanvas(canvas).map(marker => ({
              ...marker,
              aspectRatio: CANVAS_WIDTH / CANVAS_HEIGHT,
            }))
          );
          console.log(`✅ Marcador ${tipo} añadido`);
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

  const activarLapiz = () => {
    if (!canvas) return;

    setHerramientaActiva('lapiz');
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush.width = 3;
    canvas.freeDrawingBrush.color = '#000000';
  };

  const desactivarLapiz = () => {
    if (canvas) {
      canvas.isDrawingMode = false;
    }
    setHerramientaActiva(null);
  };

  const deshacer = () => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length > 0) {
      const lastObject = objects[objects.length - 1];
      canvas.remove(lastObject);
      canvas.renderAll();
      setMarcadores(
        extractMarkersFromCanvas(canvas).map(marker => ({
          ...marker,
          aspectRatio: CANVAS_WIDTH / CANVAS_HEIGHT,
        }))
      );
    }
  };

  const limpiarTodo = () => {
    if (!canvas) return;

    const objects = canvas.getObjects().slice();
    objects.forEach(obj => canvas.remove(obj));
    canvas.isDrawingMode = false;
    canvas.renderAll();
    setMarcadores([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-900 text-white p-4 flex gap-2 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {ICON_TYPES.map(tipo => (
            <button
              key={tipo.id}
              onClick={() => agregarMarcador(tipo.id)}
              disabled={herramientaActiva !== null}
              className={`px-3 py-2 rounded text-sm font-semibold flex gap-1 items-center transition ${
                herramientaActiva === tipo.id
                  ? 'bg-[#29ace3]'
                  : herramientaActiva !== null
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <tipo.icon size={16} /> {tipo.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2 flex-wrap">
          {herramientaActiva !== 'lapiz' ? (
            <button
              onClick={activarLapiz}
              className="px-3 py-2 rounded text-sm font-semibold bg-gray-700 hover:bg-gray-600 transition"
            >
              ✏️ Dibujar
            </button>
          ) : (
            <button
              onClick={desactivarLapiz}
              className="px-3 py-2 rounded text-sm font-semibold bg-[#29ace3] hover:bg-[#1d96cb] transition"
            >
              ✓ Listo
            </button>
          )}

          <button
            onClick={deshacer}
            className="px-3 py-2 rounded text-sm font-semibold bg-gray-700 hover:bg-gray-600 transition"
          >
            ↶ Deshacer
          </button>

          <button
            onClick={limpiarTodo}
            className="px-3 py-2 rounded text-sm font-semibold bg-red-600 hover:bg-red-700 transition"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {/* Canvas Container with Background Image */}
      <div 
        ref={containerRef}
        className="bg-gray-100 p-6 flex justify-center overflow-auto relative"
        style={{ 
          minHeight: '760px',
        }}
      >
        <canvas 
          ref={canvasRef} 
          className="rounded shadow-lg cursor-crosshair bg-white" 
        />
      </div>

      {/* Info */}
      <div className="bg-gray-50 px-6 py-3 border-t text-sm text-gray-600">
        <p>✓ {marcadores.length} marcador{marcadores.length !== 1 ? 'es' : ''} • {herramientaActiva === 'lapiz' ? 'Dibujando' : 'Listo'}</p>
      </div>
    </div>
  );
});

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { fabric } from 'fabric';
import { Camera, Wifi, TreePine } from 'lucide-react';

const ICON_TYPES = [
  { id: 'camara', label: 'Cámara', icon: Camera, color: '#FF6B6B' },
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi, color: '#4ECDC4' },
  { id: 'arbol', label: 'Árbol', icon: TreePine, color: '#95E1D3' },
];

export default forwardRef(function CanvasEditor({ imagenBase64 }, ref) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [herramientaActiva, setHerramientaActiva] = useState(null);
  const [marcadores, setMarcadores] = useState([]);

  // Exponer función para obtener datos del canvas
  useImperativeHandle(ref, () => ({
    getCanvasData: () => {
      if (!canvas) return { marcadores: [], dataDibujo: null };

      // Obtener datos JSON del canvas (para dibujos)
      const canvasJSON = canvas.toJSON();

      // Filtrar solo los objetos de dibujo (excluyendo marcadores)
      const dibujos = canvasJSON.objects.filter(obj => !obj.metadata || obj.metadata.type !== 'marker');

      return {
        marcadores: marcadores,
        dataDibujo: dibujos.length > 0 ? canvasJSON : null,
      };
    },
  }), [canvas, marcadores]);

  useEffect(() => {
    if (!imagenBase64 || !canvasRef.current || !containerRef.current) return;

    try {
      // Crear canvas de Fabric con fondo transparente
      const newCanvas = new fabric.Canvas(canvasRef.current, {
        width: 1200,
        height: 800,
        backgroundColor: 'transparent',
      });

      console.log('Canvas created with transparent background - Size: 1200x800');

      // Poner imagen como fondo del contenedor
      if (containerRef.current) {
        containerRef.current.style.backgroundImage = `url(${imagenBase64})`;
        containerRef.current.style.backgroundSize = 'contain';
        containerRef.current.style.backgroundRepeat = 'no-repeat';
        containerRef.current.style.backgroundPosition = 'center';
      }

      setCanvas(newCanvas);
      console.log('Canvas initialized successfully');

      // Cleanup
      return () => {
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

    setHerramientaActiva(tipo);

    const handleMouseDown = (event) => {
      const pointer = canvas.getPointer(event.e);

      // Mapeo de iconos PNG personalizados
      let iconPath = '';
      const iconMap = {
        'camara': '/icons/camara.png',
        'wifi': '/icons/wifi.png',
        'arbol': '/icons/arbol.png',
      };
      
      iconPath = iconMap[tipo];

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const fabricImage = new fabric.Image(img, {
            left: pointer.x,
            top: pointer.y,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: true,
            metadata: { type: 'marker', markerType: tipo },
            scaleX: 0.35,
            scaleY: 0.35,
          });

          canvas.add(fabricImage);
          canvas.renderAll();

          setMarcadores(prev => [...prev, { tipo, x: pointer.x, y: pointer.y }]);
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
    }
  };

  const limpiarTodo = () => {
    if (!canvas) return;

    canvas.clear();
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
          minHeight: '650px',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      >
        <canvas 
          ref={canvasRef} 
          className="rounded shadow-lg cursor-crosshair" 
        />
      </div>

      {/* Info */}
      <div className="bg-gray-50 px-6 py-3 border-t text-sm text-gray-600">
        <p>✓ {marcadores.length} marcador{marcadores.length !== 1 ? 'es' : ''} • {herramientaActiva === 'lapiz' ? 'Dibujando' : 'Listo'}</p>
      </div>
    </div>
  );
});

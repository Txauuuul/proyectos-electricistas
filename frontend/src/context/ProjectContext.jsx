import React, { createContext, useState, useContext, useEffect } from 'react';

const ProjectContext = createContext();

const STORAGE_KEY = 'wizard_draft';

const defaultData = {
  nombreCasa: '',
  direccion: '',
  straat: '',
  nr: '',
  postcode: '',
  stad: '',
  ofertaDirectaCliente: true,
  extraInfo: '',
  fechaInicio: '',
  planos: [],
  ruimtes: [],
  fotosLocalizacion: [],
  clienteId: '',
  tituloPersonalizado: '',
};

export const ProjectProvider = ({ children }) => {
  // Restore draft from localStorage on mount (if any)
  const [projectData, setProjectData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultData, ...parsed.data };
      }
    } catch (_) {}
    return { ...defaultData };
  });

  const [pasoActual, setPasoActual] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.paso || 1;
      }
    } catch (_) {}
    return 1;
  });

  // Persist draft to localStorage whenever data changes
  useEffect(() => {
    // Only persist if the user has actually started filling in data
    if (projectData.nombreCasa || projectData.straat || projectData.ruimtes.length > 0 || projectData.fotosLocalizacion.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: projectData, paso: pasoActual, ts: Date.now() }));
      } catch (_) {}
    }
  }, [projectData, pasoActual]);

  const actualizarInfoProyecto = (datos) => {
    setProjectData(prev => ({ ...prev, ...datos }));
  };

  const agregarPlano = (plano) => {
    setProjectData(prev => ({
      ...prev,
      planos: [...prev.planos, plano],
    }));
  };

  const agregarFotos = (fotos) => {
    setProjectData(prev => ({
      ...prev,
      fotosLocalizacion: [...prev.fotosLocalizacion, ...fotos],
    }));
  };

  const agregarRuimte = (ruimte) => {
    setProjectData(prev => ({
      ...prev,
      ruimtes: [...prev.ruimtes, ruimte],
    }));
  };

  const resetear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProjectData({ ...defaultData });
    setPasoActual(1);
  };

  return (
    <ProjectContext.Provider
      value={{
        projectData,
        pasoActual,
        setPasoActual,
        actualizarInfoProyecto,
        agregarPlano,
        agregarRuimte,
        agregarFotos,
        resetear,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject debe usarse dentro de ProjectProvider');
  }
  return context;
};

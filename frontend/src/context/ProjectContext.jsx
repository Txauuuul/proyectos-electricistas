import React, { createContext, useState, useContext } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projectData, setProjectData] = useState({
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
  });

  const [pasoActual, setPasoActual] = useState(1);

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
    setProjectData({
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
    });
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

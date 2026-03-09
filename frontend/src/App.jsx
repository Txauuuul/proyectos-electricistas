import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import WizardPage from './pages/WizardPage';
import ProjectPage from './pages/ProjectPage';
import OfferPage from './pages/OfferPage';
import ClientOfferView from './pages/ClientOfferView';
import MyProfile from './pages/MyProfile';
import MyClients from './pages/MyClients';
import AdminClients from './pages/AdminClients';
import AdminClientDetail from './pages/AdminClientDetail';
import Navbar from './components/Navbar';

function AuthLayout() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" />;
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated routes with Navbar */}
            <Route element={<AuthLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/nuevo-proyecto" element={<WizardPage />} />
              <Route path="/proyecto/:id" element={<ProjectPage />} />
              <Route path="/proyecto/:id/preparar-oferta" element={<OfferPage />} />
              <Route path="/proyecto/:id/ver-oferta" element={<ClientOfferView />} />
              <Route path="/mi-perfil" element={<MyProfile />} />
              <Route path="/mis-clientes" element={<MyClients />} />
              <Route path="/admin/clientes" element={<AdminClients />} />
              <Route path="/admin/clientes/:id" element={<AdminClientDetail />} />
            </Route>

            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;

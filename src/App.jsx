import React, { useState, useEffect } from 'react';
import FolderSelectionApp from './components/FolderSelectionApp';
import LoginApp from './components/Auth/LoginApp';
import authService from './services/authService';
import { DataProvider } from './contexts/DataContext';
import './App.css';
import InterfacePrincipal from './components/Home/InterfacePrincipal';

function App() {
  // États pour gérer les vues et l'authentification
  const [currentView, setCurrentView] = useState('folder-selection');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const user = authService.getUser();
        setCurrentUser(user);
        
        // Optionnel : Vérifier avec le serveur
        const authCheck = await authService.checkAuth();
        if (!authCheck.authenticated) {
          // Token invalide, nettoyer
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Navigation entre les vues
  const handleContinueToSearch = () => {
    setCurrentView('interface-principal');
  };

  const handleBackToSelection = () => {
    setCurrentView('folder-selection');
  };

  // Gestion de l'authentification
  const handleLoginRequest = () => {
    if (isAuthenticated) {
      // Si déjà connecté, aller au dashboard
      setCurrentView('dashboard');
    } else {
      // Sinon, aller à la page de login
      setCurrentView('login');
    }
  };

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView('interface-principal'); // Retour à la recherche après déconnexion
    }
  };

  const handleBackToApp = () => {
    setCurrentView('interface-principal');
  };

  const handleBackFromLogin = () => {
    setCurrentView('interface-principal');
  };

  // Affichage de chargement de l'app
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Vue sélection de dossier - Pas de DataProvider nécessaire */}
      {currentView === 'folder-selection' && (
        <FolderSelectionApp onContinue={handleContinueToSearch} />
      )}
      
      {/* Vue recherche d'articles - AVEC DataProvider */}
      {currentView === 'interface-principal' && (
        <DataProvider>
          <InterfacePrincipal
            onBack={handleBackToSelection}
            onLogin={handleLoginRequest}
          />
        </DataProvider>
      )}
      
      {/* Vue login - Pas de DataProvider nécessaire */}
      {currentView === 'login' && (
        <LoginApp 
          onLoginSuccess={handleLoginSuccess}
          onBack={handleBackFromLogin}
        />
      )}
      
      {/* Vue dashboard après connexion - AVEC DataProvider 
      {currentView === 'dashboard' && (
        <DataProvider>
          <DashboardPrincipal 
            user={currentUser}
            onLogout={handleLogout}
            onBackToApp={handleBackToApp}
          />
        </DataProvider>
      )}*/}
    </div>
  );
}

export default App;
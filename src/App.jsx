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
  
  // ✅ NOUVEAU: État pour gérer le chargement post-sélection
  const [folderSelected, setFolderSelected] = useState(false);
  const [folderLoadingProgress, setFolderLoadingProgress] = useState({
    stage: '',
    progress: 0,
    message: ''
  });

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
        
        // Optionnel : Vérifier avec le serveur (seulement si nécessaire)
        try {
          const authCheck = await authService.checkAuth();
          if (!authCheck.authenticated) {
            // Token invalide, nettoyer
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } catch (error) {
          console.warn('Vérification auth échouée, continuer en local');
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

  // ✅ NOUVEAU: Navigation optimisée avec chargement intelligent
  const handleContinueToSearch = async (folderInfo) => {
    console.log('📁 Dossier sélectionné:', folderInfo);
    setFolderSelected(true);
    
    // Étape 1: Préparer l'interface
    setFolderLoadingProgress({
      stage: 'preparing',
      progress: 10,
      message: 'Préparation de l\'interface...'
    });
    
    // Attendre un peu pour que l'interface se mette en place
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCurrentView('interface-principal');
    
    // Étape 2: Le chargement des données se fera dans InterfacePrincipal
    setFolderLoadingProgress({
      stage: 'ready',
      progress: 100,
      message: 'Interface prête'
    });
  };

  const handleBackToSelection = () => {
    setCurrentView('folder-selection');
    setFolderSelected(false);
    setFolderLoadingProgress({
      stage: '',
      progress: 0,
      message: ''
    });
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

  // ✅ NOUVEAU: Affichage du chargement post-sélection si nécessaire
  if (folderSelected && folderLoadingProgress.stage === 'preparing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium mb-2">{folderLoadingProgress.message}</p>
          
          {/* Barre de progression */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${folderLoadingProgress.progress}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-gray-500">
            Initialisation du dossier sélectionné...
          </p>
          
          {/* Bouton retour en cas de problème */}
          <button 
            onClick={handleBackToSelection}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Retour à la sélection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Vue sélection de dossier - Pas de DataProvider nécessaire */}
      {currentView === 'folder-selection' && (
        <FolderSelectionApp 
          onContinue={handleContinueToSearch}
          loadingProgress={folderLoadingProgress}
        />
      )}
      
      {/* Vue recherche d'articles - AVEC DataProvider optimisé */}
      {currentView === 'interface-principal' && (
        <DataProvider>
          <InterfacePrincipalOptimized
            onBack={handleBackToSelection}
            onLogin={handleLoginRequest}
            folderSelected={folderSelected}
            onLoadingProgress={setFolderLoadingProgress}
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

// ✅ NOUVEAU: Wrapper optimisé pour InterfacePrincipal
const InterfacePrincipalOptimized = ({ onBack, onLogin, folderSelected, onLoadingProgress }) => {
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);
  
  useEffect(() => {
    if (folderSelected && !initialLoadCompleted) {
      initializeAfterFolderSelection();
    }
  }, [folderSelected, initialLoadCompleted]);

  const initializeAfterFolderSelection = async () => {
    console.log('🚀 Initialisation post-sélection dossier...');
    
    try {
      // Étape 1: Signaler le début du chargement
      onLoadingProgress({
        stage: 'loading_data',
        progress: 20,
        message: 'Chargement des données...'
      });
      
      // Le chargement réel se fait maintenant dans DataContext.loadEssentialDataAfterFolder()
      // On simule juste le timing ici
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onLoadingProgress({
        stage: 'loading_families',
        progress: 60,
        message: 'Chargement des familles des articles...'
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onLoadingProgress({
        stage: 'finalizing',
        progress: 90,
        message: 'Finalisation...'
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Étape finale: Marquer comme terminé
      onLoadingProgress({
        stage: 'completed',
        progress: 100,
        message: 'Prêt !'
      });
      
      setInitialLoadCompleted(true);
      
      console.log('✅ Initialisation post-sélection terminée');
      
    } catch (error) {
      console.error('❌ Erreur initialisation post-sélection:', error);
      onLoadingProgress({
        stage: 'error',
        progress: 0,
        message: 'Erreur lors du chargement'
      });
    }
  };

  return (
    <InterfacePrincipal
      onBack={onBack}
      onLogin={onLogin}
      initialLoadCompleted={initialLoadCompleted}
    />
  );
};

export default App;
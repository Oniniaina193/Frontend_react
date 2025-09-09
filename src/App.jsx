import React, { useState, useEffect } from 'react';
import FolderSelectionApp from './components/FolderSelectionApp';
import LoginApp from './components/Auth/LoginApp';
import authService from './services/authService';
import { DataProvider, useData } from './contexts/DataContext';
import './App.css';
import InterfacePrincipal from './components/Home/InterfacePrincipal';

function App() {
  // États pour gérer les vues et l'authentification
  const [currentView, setCurrentView] = useState('folder-selection');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // État pour gérer le chargement post-sélection
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
        
        try {
          const authCheck = await authService.checkAuth();
          if (!authCheck.authenticated) {
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

  // Navigation optimisée avec chargement intelligent
  const handleContinueToSearch = async (folderInfo) => {
    console.log('📁 Dossier sélectionné:', folderInfo);
    setFolderSelected(true);
    
    // Étape 1: Préparer l'interface
    setFolderLoadingProgress({
      stage: 'preparing',
      progress: 10,
      message: 'Préparation de l\'interface...'
    });
    
    // Attendre que l'interface se charge
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Passer à la vue principale
    setCurrentView('interface-principal');
    
    // Le chargement des données se fera automatiquement dans InterfacePrincipalOptimized
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
      setCurrentView('dashboard');
    } else {
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
      setCurrentView('interface-principal');
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
      {/* Vue sélection de dossier */}
      {currentView === 'folder-selection' && (
        <FolderSelectionApp 
          onContinue={handleContinueToSearch}
          loadingProgress={folderLoadingProgress}
        />
      )}
      
      {/* Vue recherche d'articles - AVEC DataProvider */}
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
      
      {/* Vue login */}
      {currentView === 'login' && (
        <LoginApp 
          onLoginSuccess={handleLoginSuccess}
          onBack={handleBackFromLogin}
        />
      )}
    </div>
  );
}

// Wrapper optimisé pour InterfacePrincipal
const InterfacePrincipalOptimized = ({ onBack, onLogin, folderSelected, onLoadingProgress }) => {
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);
  const { loadEssentialDataAfterFolder } = useData();
  
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
        message: 'Connexion à la base de données...'
      });
      
      // Étape 2: Chargement des familles
      onLoadingProgress({
        stage: 'loading_families',
        progress: 40,
        message: 'Chargement des familles des articles...'
      });
      
      // Le chargement réel via DataContext
      const result = await loadEssentialDataAfterFolder();
      
      if (result.success) {
        console.log('✅ Données chargées:', {
          families: result.families?.length || 0,
          initialArticles: result.initialArticles?.length || 0
        });
        
        // Étape 3: Articles chargés
        onLoadingProgress({
          stage: 'loading_articles',
          progress: 80,
          message: `${result.initialArticles?.length || 0} articles chargés...`
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Finalisation
        onLoadingProgress({
          stage: 'completed',
          progress: 100,
          message: 'Interface prête !'
        });
        
        setInitialLoadCompleted(true);
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
      onLoadingProgress({
        stage: 'error',
        progress: 0,
        message: 'Erreur lors du chargement des données'
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
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, ArrowLeft, Folder, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Accueil from './Accueil';
import Consultation from './Consultation';
import DashboardAdmin from './DashboardAdmin';
import statistiquesService from '../../services/StatistiquesService';
import dataRefreshService from '../../services/DatRefreshService';
import { useData } from '../../contexts/DataContext';

const InterfacePrincipal = ({ onBack, onLogin, initialLoadCompleted }) => {
  const [currentView, setCurrentView] = useState('accueil');
  const [dossierActuel, setDossierActuel] = useState('');
  const [loadingDossier, setLoadingDossier] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState(null); // 'success', 'error', ou null

  // ✅ NOUVEAU: États pour le chargement intelligent post-sélection
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationProgress, setInitializationProgress] = useState({
    stage: '',
    progress: 0,
    message: ''
  });

  // Références pour maintenir les composants en vie
  const accueilRef = useRef(null);
  const consultationRef = useRef(null);
  const adminRef = useRef(null);

  // ✅ NOUVEAU: Hook DataContext optimisé
  const { loadEssentialDataAfterFolder, families, loading } = useData();

  // ✅ NOUVEAU: Initialisation intelligente après sélection du dossier
  const initializeAfterFolderSelection = useCallback(async () => {
    if (!initialLoadCompleted) return;
    
    console.log('🚀 Initialisation intelligente post-sélection...');
    setIsInitializing(true);
    
    try {
      // Étape 1: Chargement des données essentielles
      setInitializationProgress({
        stage: 'loading_essential',
        progress: 20,
        message: 'Chargement des données essentielles...'
      });

      const result = await loadEssentialDataAfterFolder();

      if (result.success) {
        // Étape 2: Chargement du nom du dossier
        setInitializationProgress({
          stage: 'loading_folder_name',
          progress: 60,
          message: 'Récupération du nom du dossier...'
        });

        await loadDossierActuel();

        // Étape 3: Finalisation
        setInitializationProgress({
          stage: 'finalizing',
          progress: 90,
          message: 'Finalisation...'
        });

        await new Promise(resolve => setTimeout(resolve, 300));

        setInitializationProgress({
          stage: 'completed',
          progress: 100,
          message: 'Interface prête !'
        });

        console.log('✅ Initialisation intelligente terminée');
        
        // Masquer le chargement après un court délai
        setTimeout(() => {
          setIsInitializing(false);
        }, 500);

      } else {
        throw new Error(result.error || 'Erreur lors du chargement des données essentielles');
      }

    } catch (error) {
      console.error('❌ Erreur initialisation:', error);
      setInitializationProgress({
        stage: 'error',
        progress: 0,
        message: 'Erreur lors du chargement'
      });
      
      // En cas d'erreur, permettre quand même l'accès après 2 secondes
      setTimeout(() => {
        setIsInitializing(false);
      }, 2000);
    }
  }, [initialLoadCompleted, loadEssentialDataAfterFolder]);

  // ✅ OPTIMISÉ: Fonction pour charger le nom du dossier (sans statistiques lourdes)
  const loadDossierActuel = useCallback(async () => {
    setLoadingDossier(true);
    try {
      console.log('Chargement du nom du dossier...');
      
      // Au lieu d'appeler getAllStatistiques (lourd), récupérer depuis le storage local
      const sessionDossier = sessionStorage.getItem('current_dossier_vente');
      const localDossier = localStorage.getItem('current_dossier_vente');
      
      const nomDossier = sessionDossier || localDossier || 'Dossier non identifié';
      setDossierActuel(nomDossier);
      console.log('Nom du dossier chargé:', nomDossier);
      
    } catch (error) {
      console.warn('Erreur lors du chargement du nom du dossier:', error);
      setDossierActuel('Dossier non identifié');
    } finally {
      setLoadingDossier(false);
    }
  }, []);

  // ✅ NOUVEAU: Effect pour déclencher l'initialisation intelligente
  useEffect(() => {
    if (initialLoadCompleted) {
      initializeAfterFolderSelection();
    }
  }, [initialLoadCompleted, initializeAfterFolderSelection]);

  // ✅ OPTIMISÉ: Effect simplifié pour les listeners
  useEffect(() => {
    // Configurer le listener pour les mises à jour (seulement si nécessaire)
    const unsubscribeRefresh = dataRefreshService.onRefresh((event, data) => {
      if (event === 'success') {
        console.log('Données mises à jour avec succès:', data);
        // Recharger les informations du dossier après mise à jour
        setTimeout(() => {
          loadDossierActuel();
        }, 500);
      }
    });
    
    return () => {
      unsubscribeRefresh();
    };
  }, [loadDossierActuel]);

  // Navigation entre les vues SANS démontage des composants
  const handleNavigation = (view) => {
    setCurrentView(view);
  };

  // ✅ OPTIMISÉ: Fonction pour gérer la mise à jour des données
  const handleRefreshData = async () => {
    if (isRefreshing) {
      console.log('Mise à jour déjà en cours');
      return;
    }

    try {
      setIsRefreshing(true);
      setRefreshStatus(null);
      
      console.log('Démarrage de la mise à jour des données...');
      
      // Lancer la mise à jour complète
      const result = await dataRefreshService.refreshAllData();
      
      if (result.success) {
        setRefreshStatus('success');
        console.log('Mise à jour terminée avec succès');
        
        // Masquer le statut de succès après 3 secondes
        setTimeout(() => {
          setRefreshStatus(null);
        }, 3000);
        
      } else {
        setRefreshStatus('error');
        console.error('Erreur lors de la mise à jour:', result.message);
        
        // Masquer le statut d'erreur après 5 secondes
        setTimeout(() => {
          setRefreshStatus(null);
        }, 5000);
      }
      
    } catch (error) {
      setRefreshStatus('error');
      console.error('Erreur lors de la mise à jour:', error);
      
      // Masquer le statut d'erreur après 5 secondes
      setTimeout(() => {
        setRefreshStatus(null);
      }, 5000);
      
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ NOUVEAU: Composant de chargement intelligent
  const renderInitializationScreen = () => {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Animation de chargement */}
          <div className="relative mb-6">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          
          {/* Message de progression */}
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Initialisation de l'interface
          </h3>
          <p className="text-gray-600 mb-4">
            {initializationProgress.message}
          </p>
          
          {/* Barre de progression */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${initializationProgress.progress}%` }}
            ></div>
          </div>
          
          {/* Détails de progression */}
          <div className="text-sm text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Étape actuelle:</span>
              <span className="font-medium">{initializationProgress.stage}</span>
            </div>
            <div className="flex justify-between">
              <span>Progression:</span>
              <span className="font-medium">{initializationProgress.progress}%</span>
            </div>
            {families.length > 0 && (
              <div className="flex justify-between">
                <span>Familles chargées:</span>
                <span className="font-medium text-green-600">{families.length}</span>
              </div>
            )}
          </div>
          
          {/* Bouton retour en cas de problème */}
          {initializationProgress.stage === 'error' && (
            <div className="mt-6">
              <button 
                onClick={onBack}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Retour à la sélection
              </button>
            </div>
          )}
          
          {/* Info supplémentaire */}
          <p className="text-xs text-gray-400 mt-4">
            Chargement optimisé - Données essentielles seulement
          </p>
        </div>
      </div>
    );
  };

  // Rendu conditionnel avec maintien en mémoire
  const renderContent = () => {
    return (
      <div className="relative w-full h-full bg-white">
        {/* Accueil - toujours monté, visible/invisible */}
        <div 
          ref={accueilRef}
          className={`absolute inset-0 w-full h-full bg-white transition-opacity duration-200 ${
            currentView === 'accueil' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <Accueil />
        </div>

        {/* Consultation - toujours monté, visible/invisible */}
        <div 
          ref={consultationRef}
          className={`absolute inset-0 w-full h-full bg-white transition-opacity duration-200 ${
            currentView === 'consultation' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <Consultation onBack={onBack} />
        </div>

        {/* Administration - toujours monté, visible/invisible */}
        <div 
          ref={adminRef}
          className={`absolute inset-0 w-full h-full bg-white transition-opacity duration-200 ${
            currentView === 'admin' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <DashboardAdmin />
        </div>
      </div>
    );
  };

  // ✅ NOUVEAU: Afficher l'écran d'initialisation si nécessaire
  if (isInitializing) {
    return renderInitializationScreen();
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-white overflow-hidden">
      <div className="w-full h-full flex flex-col bg-gray-100">
        {/* Header avec logos, titre et navigation */}
        <div className="bg-gray shadow-lg relative z-20 flex-shrink-0">
          <div className="px-1 py-1">
            <div className="flex items-center justify-between">
              {/* Section gauche avec logo et titre */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <img 
                    src="/images/logoPharmacie.png" 
                    alt="Logo Pharmacie" 
                    className="w-10 h-10 object-contain"
                  />
                </div>
                
                {/* Titre à côté du logo */}
                <h1 className="text-2xl font-bold text-black font-serif">Gestion Pharmaceutique</h1>
              </div>
              
              {/* Navigation avec bouton retour et indicateur de dossier */}
              <nav className="flex items-center space-x-6 mr-6">
                {/* Bouton retour avant les liens */}
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  title="Retour à la sélection de dossier"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                {/* Liens de navigation simples */}
                <a
                  onClick={() => handleNavigation('accueil')}
                  className={`font-serif text-base font-medium cursor-pointer transition-colors duration-200 ${
                    currentView === 'accueil'
                      ? 'text-blue-600 underline underline-offset-4'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Accueil
                </a>
                
                <a
                  onClick={() => handleNavigation('consultation')}
                  className={`font-serif text-base font-medium cursor-pointer transition-colors duration-200 ${
                    currentView === 'consultation'
                      ? 'text-blue-600 underline underline-offset-4'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Consultation
                </a>
                
                <a
                  onClick={() => handleNavigation('admin')}
                  className={`font-serif text-base font-medium cursor-pointer transition-colors duration-200 ${
                    currentView === 'admin'
                      ? 'text-blue-600 underline underline-offset-4'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Administration
                </a>

                {/* ✅ OPTIMISÉ: Indicateur du dossier avec info de chargement */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-full border border-blue-200">
                    <Folder className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      {loadingDossier ? (
                        <span className="flex items-center space-x-1">
                          <Loader className="w-3 h-3 animate-spin" />
                          <span>Chargement...</span>
                        </span>
                      ) : (
                        dossierActuel || 'Aucun dossier'
                      )}
                    </span>
                  </div>

                  {/* ✅ OPTIMISÉ: Bouton de mise à jour avec meilleurs indicateurs */}
                  <button
                    onClick={handleRefreshData}
                    disabled={isRefreshing || loadingDossier || loading.families}
                    className={`
                      flex items-center space-x-1 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200
                      ${isRefreshing 
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300 cursor-not-allowed'
                        : refreshStatus === 'success'
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : refreshStatus === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 hover:text-gray-800'
                      }
                    `}
                    title="Mettre à jour les données depuis les fichiers Access"
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mise à jour...</span>
                      </>
                    ) : refreshStatus === 'success' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Mise à jour terminé</span>
                      </>
                    ) : refreshStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>Erreur</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Actualiser</span>
                      </>
                    )}
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </div>

        {/* Contenu principal avec navigation sans rechargement */}
        <div className="flex-1 relative bg-white overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InterfacePrincipal;
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, ArrowLeft, Folder } from 'lucide-react';
import Accueil from './Accueil';
import Consultation from './Consultation';
import DashboardAdmin from './DashboardAdmin';
import statistiquesService from '../../services/StatistiquesService';

const InterfacePrincipal = ({ onBack, onLogin }) => {
  const [currentView, setCurrentView] = useState('accueil');
  const [dossierActuel, setDossierActuel] = useState('');
  const [loadingDossier, setLoadingDossier] = useState(true);

  // Références pour maintenir les composants en vie
  const accueilRef = useRef(null);
  const consultationRef = useRef(null);
  const adminRef = useRef(null);

  // Fonction pour charger le nom du dossier actuel
  const loadDossierActuel = useCallback(async () => {
    setLoadingDossier(true);
    try {
      console.log('🔄 Chargement du nom du dossier...');
      const result = await statistiquesService.getAllStatistiques();
      
      if (result.dashboard && result.dashboard.success) {
        const nomDossier = result.dashboard.data.dossier_actuel || '';
        setDossierActuel(nomDossier);
        console.log('✅ Nom du dossier chargé:', nomDossier);
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors du chargement du nom du dossier:', error);
      setDossierActuel('Dossier non identifié');
    } finally {
      setLoadingDossier(false);
    }
  }, []);

  // Charger le nom du dossier au montage du composant
  useEffect(() => {
    loadDossierActuel();
  }, [loadDossierActuel]);

  // Navigation entre les vues SANS démontage des composants
  const handleNavigation = (view) => {
    setCurrentView(view);
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

                {/* Indicateur du dossier actuel */}
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-full border border-blue-200">
                  <Folder className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {loadingDossier ? (
                      <span className="flex items-center space-x-1">
                        <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Chargement...</span>
                      </span>
                    ) : (
                      dossierActuel || 'Aucun dossier'
                    )}
                  </span>
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
import React, { useState, useEffect } from 'react';
import { User, ArrowLeft } from 'lucide-react';
import Accueil from './Accueil';
import Consultation from './Consultation';
import DashboardAdmin from './DashboardAdmin';

const InterfacePrincipal = ({ onBack, onLogin }) => {
  const [currentView, setCurrentView] = useState('accueil');

  // Navigation entre les vues
  const handleNavigation = (view) => {
    setCurrentView(view);
  };

  // Rendu du contenu selon la vue active
  const renderContent = () => {
    switch (currentView) {
      case 'accueil':
        return <Accueil />;
      case 'consultation':
        return <Consultation onBack={onBack} />;
      case 'admin':
        return <DashboardAdmin />;
      default:
        return <Accueil />;
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-auto">
      <div className="w-full max-w-none h-full">
        {/* Header avec logos, titre et navigation */}
        <div className="bg-gray shadow-lg">
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
              
              {/* Navigation avec bouton retour */}
              <nav className="flex items-center space-x-6 mr-6">
                {/* Bouton retour avant les liens */}
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  title="Retour à la sélection de dossier"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <span
                  onClick={() => handleNavigation('accueil')}
                  className={`font-serif text-base font-medium cursor-pointer transition-colors duration-200 ${
                    currentView === 'accueil'
                      ? 'text-blue-600 underline underline-offset-4'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Accueil
                </span>
                
                <span
                  onClick={() => handleNavigation('consultation')}
                  className={`font-serif text-base font-medium cursor-pointer transition-colors duration-200 ${
                    currentView === 'consultation'
                      ? 'text-blue-600 underline underline-offset-4'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Consultation
                </span>
                
                <span
                  onClick={() => handleNavigation('admin')}
                  className={`font-serif text-base font-medium cursor-pointer transition-colors duration-200 ${
                    currentView === 'admin'
                      ? 'text-blue-600 underline underline-offset-4'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Administration
                </span>
              </nav>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InterfacePrincipal;
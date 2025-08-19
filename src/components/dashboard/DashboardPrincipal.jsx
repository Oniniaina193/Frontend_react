import React, { useState, useEffect } from 'react';
import { LogOut, User, ArrowLeft } from 'lucide-react';
import authService from '../../services/authService';
import Statistiques from './Statistiques';
import Medicaments from './Medicaments';
import Medecins from './Medecins';
import Ordonnances from './Ordonnances';
import Historique from './Historique';

const DashboardPrincipal = ({ user: initialUser, onLogout, onBackToApp }) => {
  const [activeTab, setActiveTab] = useState('statistiques');
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);

  // Rafraîchir les données utilisateur
  const refreshUserData = async () => {
    setLoading(true);
    try {
      const updatedUser = await authService.getCurrentUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Erreur rafraîchissement utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialUser) {
      refreshUserData();
    }
  }, [initialUser]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      onLogout();
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      onLogout(); 
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'statistiques':
        return <Statistiques />;
      case 'medicaments':
        return <Medicaments />;
      case 'medecins':
        return <Medecins />;
      case 'ordonnances':
        return <Ordonnances />;
      case 'historique':
        return <Historique />;
      default:
        return <Statistiques />;
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-auto">
      <div className="w-full max-w-none h-full">
        {/* Header avec Navbar */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-0">
            <div className="flex items-center justify-between h-20">
              {/* Logo et Titre */}
              <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <img 
                  src="/images/logoPharmacie.png" 
                  alt="Logo Pharmacie" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="text-green-600 font-bold">Rx</div>';
                  }}
                />
              </div>
              <h1 className="text-2xl font-bold text-blue-600">
                PharmaDash
              </h1>
            </div>
              {/* Navigation */}
              <nav className="flex items-center space-x-0">
                {[
                  { key: 'statistiques', label: 'Statistiques' },
                  { key: 'medicaments', label: 'Médicaments' },
                  { key: 'medecins', label: 'Médecins' },
                  { key: 'ordonnances', label: 'Ordonnances' },
                  { key: 'historique', label: 'Historique' }
                ].map((item) => (
                  <span
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`relative px-6 py-6 text-sm font-medium cursor-pointer transition-colors duration-200 hover:text-red-500 ${
                      activeTab === item.key
                        ? 'text-red-500'
                        : 'text-gray-700 hover:text-red-500'
                    }`}
                  >
                    {item.label}
                    {activeTab === item.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>
                    )}
                  </span>
                ))}
              </nav>
              
              <div className="flex items-center space-x-3">
                {/* Bouton retour app si fonction fournie */}
                {onBackToApp && (
                  <button
                    onClick={onBackToApp}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Retour</span>
                  </button>
                )}

                {/* Bouton déconnexion */}
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {loading ? 'Déconnexion...' : 'Déconnexion'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu Principal */}
        <main className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
          <div className="px-4 py-2 sm:px-0">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPrincipal;
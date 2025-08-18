
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
      onLogout(); // Se déconnecter quand même côté client
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
        <header className="bg-white shadow-lg">
          <div className="px-4 py-2">
          <div className="flex items-center justify-between h-16">
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
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('statistiques')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'statistiques'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Statistiques
              </button>
              <button
                onClick={() => setActiveTab('medicaments')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'medicaments'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Médicaments
              </button>
              <button
                onClick={() => setActiveTab('medecins')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'medecins'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Médecins
              </button>
              <button
                onClick={() => setActiveTab('ordonnances')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'ordonnances'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Ordonnances
              </button>
              <button
                onClick={() => setActiveTab('historique')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'historique'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Historique
              </button>
            </nav>
            
            {/* User Menu avec déconnexion */}
            <div className="flex items-center space-x-3">
              {/* Informations utilisateur 
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {user?.name || 'Utilisateur'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </div>
                </div>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>*/}

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
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderContent()}
        </div>
      </main>
    </div>
    </div>
  );
};

export default DashboardPrincipal;
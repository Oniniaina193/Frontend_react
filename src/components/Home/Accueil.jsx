import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, Loader, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const Accueil = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  // Utiliser le cache global au lieu d'états locaux
  const {
    connectionStatus,
    loading,
    errors,
    searchArticles,
    testConnection
  } = useData();

  // Recherche avec debounce pour performance - UTILISE LE CACHE
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim() && connectionStatus === 'ok') {
        performSearch();
        setHasSearched(true);
      } else if (!searchTerm.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        setSearchError('');
      }
    }, 300); // Délai optimisé pour la rapidité

    return () => clearTimeout(timer);
  }, [searchTerm, connectionStatus]);

  // Fonction de recherche qui utilise le cache
  const performSearch = useCallback(async () => {
    if (!searchTerm.trim() || connectionStatus !== 'ok') {
      return;
    }

    setSearchError('');

    try {
      // Cette fonction utilise automatiquement le cache si disponible
      const result = await searchArticles(searchTerm, '', 1, 50);
      setSearchResults(result.articles);
    } catch (error) {
      setSearchError(error.message || 'Erreur lors de la recherche');
      setSearchResults([]);
    }
  }, [searchTerm, connectionStatus, searchArticles]);

  // Formatage du prix
  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '0,00 Ar';
    return `${numPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} Ar`;
  };

  // Déterminer la disponibilité simple
  const getAvailability = (stock) => {
    const stockNum = parseInt(stock) || 0;
    if (stockNum >= 1) {
      return {
        available: true,
        text: `Disponible (${stockNum})`,
        className: 'text-green-600 font-medium'
      };
    } else {
      return {
        available: false,
        text: 'Non disponible',
        className: 'text-red-600 font-medium'
      };
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Section de recherche */}
      <div className="px-6 py-8 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center font-serif">
            Recherche rapide des articles
          </h2>
          
          {/* Champ de recherche */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Saisissez le nom de l'article (ex: Doliprane, Aspirine...)"
              disabled={connectionStatus !== 'ok'}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-lg"
            />
            {loading.initial && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          {/* Indicateur de statut de connexion */}
          <div className="mt-4 text-center">
            {connectionStatus === 'testing' && (
              <p className="text-blue-600">Test de connexion...</p>
            )}
            {connectionStatus === 'ok' && !loading.initial && (
              <p className="text-green-600">✓ Prêt pour la recherche</p>
            )}
            {connectionStatus === 'error' && (
              <div className="text-red-600">
                <p>✗ Erreur de connexion</p>
                <button 
                  onClick={testConnection}
                  className="mt-2 text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}
            {loading.initial && (
              <p className="text-blue-600">Chargement initial des données...</p>
            )}
          </div>
        </div>
      </div>

      {/* Message d'erreur de recherche */}
      {searchError && (
        <div className="px-6 py-4 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Erreur de recherche</h3>
                <p className="text-sm text-red-700 mt-1">{searchError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message d'erreur de connexion */}
      {errors.connection && (
        <div className="px-6 py-4 max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Problème de connexion</h3>
                <p className="text-sm text-red-700 mt-1">{errors.connection}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Résultats de recherche */}
      <div className="px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {loading.articles && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Recherche en cours...</span>
            </div>
          )}

          {!loading.articles && hasSearched && searchResults.length === 0 && searchTerm && !searchError && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-2">Aucun article trouvé</p>
              <p className="text-gray-400">
                Aucun résultat pour "{searchTerm}"
              </p>
            </div>
          )}

          {!hasSearched && !searchTerm && !loading.initial && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-2">Commencez votre recherche</p>
              <p className="text-gray-400">
                Saisissez le nom d'un article pour voir les résultats
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                </h3>
              </div>

              {/* Grille des résultats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((article, index) => {
                  const availability = getAvailability(article.stock);
                  
                  return (
                    <div key={`${article.code}-${index}`} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg leading-tight">
                          {article.libelle || 'Sans nom'}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Code: {article.code || 'N/A'}
                        </p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xl font-bold text-blue-600">
                          {formatPrice(article.prix_ttc)}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className={availability.className}>
                          {availability.text}
                        </span>
                        {article.famille && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {article.famille}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Accueil;
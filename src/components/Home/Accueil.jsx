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
        className: 'text-green-600 font-medium',
        badgeClass: 'bg-green-100 text-green-800'
      };
    } else {
      return {
        available: false,
        text: 'Non disponible',
        className: 'text-red-600 font-medium',
        badgeClass: 'bg-red-100 text-red-800'
      };
    }
  };

  return (
    <div className="bg-white min-h-screen overflow-y-auto">
      {/* Section de recherche */}
      <div className="px-6 py-8 border-b border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center font-serif">
            Recherche rapide des articles
          </h2>
          
          {/* Champ de recherche et nombre de résultats */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 space-y-4 lg:space-y-0 max-w-4xl mx-auto">
            <div className="relative flex-1 max-w-2xl">
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
            
            {/* Nombre de résultats à côté de la barre de recherche */}
            {searchResults.length > 0 && !loading.articles && (
              <div className="text-sm font-medium text-gray-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Indicateur de statut de connexion - masqué si des résultats sont trouvés */}
          <div className="mt-4 text-center">
            {connectionStatus === 'testing' && (
              <p className="text-blue-600">Test de connexion...</p>
            )}
            {connectionStatus === 'ok' && !loading.initial && searchResults.length === 0 && (
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
        <div className="px-6 py-4 max-w-6xl mx-auto">
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
        <div className="px-6 py-4 max-w-6xl mx-auto">
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

      {/* Résultats de recherche - très près de la barre de recherche */}
      <div className={`px-6 ${searchResults.length > 0 ? 'py-0' : 'py-2'}`}>
        <div className="max-w-6xl mx-auto">
          {loading.articles && (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Recherche en cours...</span>
            </div>
          )}

          {!loading.articles && hasSearched && searchResults.length === 0 && searchTerm && !searchError && (
            <div className="text-center py-6">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-2">Aucun article trouvé</p>
              <p className="text-gray-400">
                Aucun résultat pour "{searchTerm}"
              </p>
            </div>
          )}

          {!hasSearched && !searchTerm && !loading.initial && (
            <div className="text-center py-6">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl mb-2">Commencez votre recherche</p>
              <p className="text-gray-400">
                Saisissez le nom d'un article pour voir les résultats
              </p>
            </div>
          )}

          {searchResults.length > 0 && (
            <>
              {/* Tableau des résultats - directement sous la barre de recherche */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm max-h-96 overflow-y-auto mt-1">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Nom du médicament
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Famille
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Prix
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Disponibilité
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {searchResults.map((article, index) => {
                        const availability = getAvailability(article.stock);
                        
                        return (
                          <tr key={`${article.code}-${index}`} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {article.libelle || 'Sans nom'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {article.famille ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {article.famille}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">Non définie</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-blue-600">
                                {formatPrice(article.prix_ttc)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${availability.badgeClass}`}>
                                {availability.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Accueil;
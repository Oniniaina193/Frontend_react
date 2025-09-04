import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Search, Package, Loader, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const Accueil = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Référence pour l'input
  const inputRef = useRef(null);
  
  // Cache local optimisé pour les résultats instantanés
  const [searchCache, setSearchCache] = useState(new Map());

  const {
    connectionStatus,
    loading,
    errors,
    searchArticles,
    testConnection
  } = useData();

  // Fonction de recherche optimisée avec cache local
  const performSearch = useCallback(async (term) => {
    const trimmedTerm = term.trim();
    
    if (!trimmedTerm || connectionStatus !== 'ok') {
      return;
    }

    // Vérifier le cache local d'abord pour des résultats instantanés
    if (searchCache.has(trimmedTerm.toLowerCase())) {
      const cachedResult = searchCache.get(trimmedTerm.toLowerCase());
      setSearchResults(cachedResult.articles);
      setHasSearched(true);
      setSearchError('');
      console.log('🚀 Résultat instantané du cache:', trimmedTerm);
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      // Appel API avec limite plus élevée pour un meilleur cache
      const result = await searchArticles(trimmedTerm, '', 1, 100);
      
      setSearchResults(result.articles);
      setHasSearched(true);
      
      // Mettre à jour le cache local avec limitation à 50 entrées
      setSearchCache(prev => {
        const newCache = new Map(prev);
        
        // Limiter la taille du cache
        if (newCache.size >= 50) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        
        // Ajouter le nouveau résultat
        newCache.set(trimmedTerm.toLowerCase(), {
          articles: result.articles,
          timestamp: Date.now()
        });
        
        return newCache;
      });
      
      console.log('💾 Résultat mis en cache:', trimmedTerm);
      
    } catch (error) {
      setSearchError(error.message || 'Erreur lors de la recherche');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [connectionStatus, searchArticles, searchCache]);

  // Gestionnaire de la touche Entrée
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      performSearch(searchTerm);
    }
  }, [searchTerm, performSearch]);

  // Gestionnaire du changement de texte (pas de recherche automatique)
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Réinitialiser les résultats si le champ est vidé
    if (!value.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError('');
    }
  }, []);

  // Fonction pour nettoyer le cache (optionnel)
  const clearSearchCache = useCallback(() => {
    setSearchCache(new Map());
    console.log('🗑️ Cache de recherche vidé');
  }, []);

  // Formatage du prix mémorisé
  const formatPrice = useCallback((price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '0,00 Ar';
    return `${numPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} Ar`;
  }, []);

  // Calcul de disponibilité mémorisé
  const getAvailability = useCallback((stock) => {
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
  }, []);

  // Mémorisation des lignes de résultats pour éviter les re-rendus
  const resultRows = useMemo(() => {
    return searchResults.map((article, index) => {
      const availability = getAvailability(article.stock);
      
      return (
        <tr 
          key={`${article.code || 'no-code'}-${index}`} 
          className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
        >
          <td className="px-4 py-3">
            <div className="text-sm font-medium text-gray-900">
              {article.libelle || 'Sans nom'}
            </div>
          </td>
          <td className="px-4 py-3">
            {article.famille ? (
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium text-black-800">
                {article.famille}
              </span>
            ) : (
              <span className="text-gray-400 text-sm">Non définie</span>
            )}
          </td>
          <td className="px-4 py-3">
            <div className="text-sm font-semibold text-black-600">
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
    });
  }, [searchResults, getAvailability, formatPrice]);

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
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Saisissez le nom de l'article et appuyez sur Entrée..."
                disabled={connectionStatus !== 'ok'}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-lg"
                autoComplete="off"
              />
              {(isSearching || loading.initial) && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              )}
            </div>
            
            {/* Nombre de résultats */}
            {searchResults.length > 0 && !isSearching && (
              <div className="flex items-center space-x-3">
                <div className="text-sm font-medium text-gray-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
                </div>
                {searchCache.has(searchTerm.trim().toLowerCase()) && (
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                    Cache
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions d'utilisation 
          <div className="mt-4 text-center">
            {searchCache.size > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-400 mr-2">
                  {searchCache.size} recherches en cache
                </span>
                <button 
                  onClick={clearSearchCache}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Vider le cache
                </button>
              </div>
            )}
          </div>*/}

          {/* Indicateur de statut de connexion */}
          <div className="mt-4 text-center">
            {connectionStatus === 'testing' && (
              <p className="text-blue-600">Test de connexion...</p>
            )}
            {connectionStatus === 'ok' && !loading.initial && searchResults.length === 0 && !hasSearched && (
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

      {/* Résultats de recherche */}
      <div className={`px-6 ${searchResults.length > 0 ? 'py-0' : 'py-2'}`}>
        <div className="max-w-6xl mx-auto">
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-6 h-6 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-600">Recherche en cours...</span>
            </div>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && searchTerm && !searchError && (
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
              <p className="text-gray-500 text-xl mb-2">Recherche sur Entrée</p>
              <p className="text-gray-400">
                Saisissez le nom d'un article et appuyez sur Entrée pour voir les résultats instantanés
              </p>
            </div>
          )}

          {searchResults.length > 0 && !isSearching && (
            <div className="bg-white rounded-lg overflow-hidden shadow-sm max-h-96 overflow-y-auto mt-1">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Nom du médicament
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Famille
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Prix
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Disponibilité
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {resultRows}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Accueil;
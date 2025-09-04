import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Filter, ChevronLeft, ChevronRight, Loader, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const Consultation = ({ onBack }) => {
  const [selectedFamily, setSelectedFamily] = useState('');
  const [currentResults, setCurrentResults] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20
  });
  const [isSearching, setIsSearching] = useState(false);
  const [allArticles, setAllArticles] = useState([]);

  // Cache local pour les résultats par famille
  const [familyCache, setFamilyCache] = useState(new Map());

  const {
    families,
    connectionStatus,
    loading,
    errors,
    searchArticles,
    testConnection
  } = useData();

  // CHARGEMENT INITIAL : Afficher TOUS les articles dès l'entrée
  useEffect(() => {
    if (connectionStatus === 'ok' && allArticles.length === 0) {
      loadAllArticles();
    }
  }, [connectionStatus]);

  // Fonction pour charger TOUS les articles au démarrage
  const loadAllArticles = async () => {
    setIsSearching(true);
    
    try {
      console.log('🔄 Chargement de tous les articles...');
      
      // Recherche sans terme et sans famille = tous les articles
      const result = await searchArticles('', '', 1, 100); // Limite plus élevée
      
      if (result && result.articles) {
        setAllArticles(result.articles);
        setCurrentResults(result.articles);
        
        if (result.pagination) {
          setPagination(result.pagination);
        } else {
          setPagination({
            current_page: 1,
            total_pages: Math.ceil(result.articles.length / 20),
            total_items: result.articles.length,
            items_per_page: 20
          });
        }
        
        console.log(`✅ ${result.articles.length} articles chargés`);
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement articles:', error);
      setCurrentResults([]);
      setAllArticles([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Effet pour filtrage par famille (immédiat)
  useEffect(() => {
    if (!selectedFamily) {
      // Aucune famille sélectionnée = afficher tous les articles
      setCurrentResults(allArticles);
      setPagination({
        current_page: 1,
        total_pages: Math.ceil(allArticles.length / 20),
        total_items: allArticles.length,
        items_per_page: 20
      });
    } else {
      // Famille sélectionnée = filtrer immédiatement
      filterByFamily(selectedFamily);
    }
  }, [selectedFamily, allArticles]);

  // Filtrage immédiat par famille
  const filterByFamily = useCallback(async (family) => {
    if (!family) return;

    // Vérifier le cache d'abord
    if (familyCache.has(family)) {
      const cachedData = familyCache.get(family);
      setCurrentResults(cachedData.articles);
      setPagination(cachedData.pagination);
      console.log('⚡ Famille depuis cache:', family);
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('🔍 Filtrage par famille:', family);
      
      const result = await searchArticles('', family, 1, 100);
      
      if (result && result.articles) {
        setCurrentResults(result.articles);
        
        const newPagination = result.pagination || {
          current_page: 1,
          total_pages: Math.ceil(result.articles.length / 20),
          total_items: result.articles.length,
          items_per_page: 20
        };
        
        setPagination(newPagination);
        
        // Mettre en cache pour les prochaines fois
        setFamilyCache(prev => {
          const newCache = new Map(prev);
          
          if (newCache.size >= 10) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          
          newCache.set(family, {
            articles: result.articles,
            pagination: newPagination,
            timestamp: Date.now()
          });
          
          return newCache;
        });
        
        console.log(`💾 Famille ${family} mise en cache (${result.articles.length} articles)`);
      }
      
    } catch (error) {
      console.error('❌ Erreur filtrage famille:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchArticles, familyCache]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages && !isSearching) {
      console.log('📄 Changement de page vers:', newPage);
      
      // Si on est sur une famille spécifique, recharger cette famille pour cette page
      if (selectedFamily) {
        searchFamilyPage(selectedFamily, newPage);
      } else {
        // Sinon, recharger tous les articles pour cette page
        searchAllArticlesPage(newPage);
      }
    }
  };

  const searchFamilyPage = async (family, page) => {
    setIsSearching(true);
    
    try {
      const result = await searchArticles('', family, page, 20);
      
      if (result && result.articles) {
        setCurrentResults(result.articles);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (error) {
      console.error('❌ Erreur changement page famille:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const searchAllArticlesPage = async (page) => {
    setIsSearching(true);
    
    try {
      const result = await searchArticles('', '', page, 20);
      
      if (result && result.articles) {
        setCurrentResults(result.articles);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (error) {
      console.error('❌ Erreur changement page tous articles:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Gestionnaire de changement de famille
  const handleFamilyChange = useCallback((e) => {
    const newFamily = e.target.value;
    setSelectedFamily(newFamily);
    
    // Réinitialiser à la première page
    setPagination(prev => ({ ...prev, current_page: 1 }));
  }, []);

  // Fonction pour actualiser les données
  const handleRefresh = useCallback(() => {
    setAllArticles([]);
    setFamilyCache(new Map());
    loadAllArticles();
  }, []);

  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '0,00 Ar';
    return `${numPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} Ar`;
  };

  const getStockIcon = (status) => {
    switch (status) {
      case 'bon':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'moyen':
        return <Minus className="w-4 h-4 text-yellow-600" />;
      case 'faible':
        return <TrendingDown className="w-4 h-4 text-orange-600" />;
      case 'rupture':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStockClasses = (status) => {
    switch (status) {
      case 'bon':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'moyen':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'faible':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'rupture':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Mémoriser les lignes du tableau
  const tableRows = useMemo(() => {
    return currentResults.map((article, index) => (
      <tr key={`${article.code}-${index}`} className="hover:bg-gray-50 transition-colors">
        <td className="px-2 py-1 whitespace-nowrap text-sm font-medium text-black-600 border border-black">
          {article.code || 'N/A'}
        </td>
        <td className="px-2 py-1 text-sm text-gray-900 border border-black">
          <div className="max-w-xs">
            <p className="font-medium truncate" title={article.libelle}>
              {article.libelle || 'Sans nom'}
            </p>
          </div>
        </td>
        <td className="px-2 py-1 text-sm text-gray-900 border border-black">
          <div className="max-w-xs">
            <p className="font-medium truncate" title={article.famille}>
              {article.famille || 'N/A'}
            </p>
          </div>
        </td>
        <td className="px-2 py-1 whitespace-nowrap text-sm font-semibold text-black-600 border border-black">
          {formatPrice(article.prix_ttc)}
        </td>
        <td className="px-2 py-1 whitespace-nowrap text-sm border border-black">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStockClasses(article.stock_status)}`}>
            {getStockIcon(article.stock_status)}
            <span className="ml-1.5 font-semibold">
              {article.stock || 0}
            </span>
            <span className="ml-1">
              {(article.stock || 0) > 1 ? 'unités' : 'unité'}
            </span>
          </div>
        </td>
      </tr>
    ));
  }, [currentResults]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* En-tête avec filtres */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="px-6 py-2">
          <div className="flex items-center gap-4 mb-0">
            <div className="flex items-center space-x-3 flex-1">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Filtrage par famille des articles :
              </label>

              <div className="relative w-80">
                <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <select
                  value={selectedFamily}
                  onChange={handleFamilyChange}
                  disabled={connectionStatus !== 'ok' || loading.families}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <option value="">Toutes les familles ({allArticles.length} articles)</option>
                  {families.map((family, index) => (
                    <option key={index} value={family}>
                      {family}
                      {familyCache.has(family) && ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isSearching || connectionStatus !== 'ok'}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSearching ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>

            <div className={`rounded-lg px-4 py-2 transition-colors min-w-48 ${
              connectionStatus === 'ok' ? 'bg-blue-50' : 
              connectionStatus === 'error' ? 'bg-red-50' : 'bg-gray-50'
            }`}>
              <p className={`text-sm font-medium ${
                connectionStatus === 'ok' ? 'text-blue-700' : 
                connectionStatus === 'error' ? 'text-red-700' : 'text-gray-500'
              }`}>
                {isSearching ? 'Chargement...' : 
                 loading.initial ? 'Chargement initial...' :
                 connectionStatus === 'ok' ? `${pagination.total_items} article(s) ${selectedFamily ? `(${selectedFamily})` : ''}` : 
                 connectionStatus === 'error' ? 'Connexion échouée' :
                 'Connexion en cours...'}
              </p>
              <p className={`text-xs ${
                connectionStatus === 'ok' ? 'text-blue-600' : 
                connectionStatus === 'error' ? 'text-red-600' : 'text-gray-400'
              }`}>
                {connectionStatus === 'ok' ? 
                  `Page ${pagination.current_page} sur ${pagination.total_pages}` :
                  connectionStatus === 'error' ? 'Accès indisponible' :
                  'Initialisation ODBC...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {errors.connection && (
        <div className="flex-shrink-0 px-6 py-4 bg-white">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Problème de connexion</h3>
                <p className="text-sm text-red-700 mt-1">{errors.connection}</p>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={testConnection}
                    className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                  >
                    Retenter
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
 )}

      {/* Titre du tableau */}
      <div className="flex-shrink-0 px-6 py-2 border-b border-gray-200 bg-white">
        <div className="flex justify-center items-center">
          <h3 className="text-2xl font-semibold text-gray-800 font-serif">
            Liste des articles
          </h3>
        </div>
      </div>

      {/* Zone de contenu */}
      <div className="flex-1 overflow-y-auto bg-white">
        {connectionStatus === 'unknown' || loading.initial ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-16 h-16 text-blue-600 mb-4 animate-spin" />
            <p className="text-gray-500 text-xl mb-2">
              {loading.initial ? 'Chargement initial des données' : 'Initialisation de la connexion ODBC'}
            </p>
            <p className="text-gray-400">
              {loading.initial ? 'Préparation du cache...' : 'Test de la connexion à la base Access...'}
            </p>
          </div>
        ) : connectionStatus === 'error' ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-gray-500 text-xl mb-2">Connexion Access indisponible</p>
            <div className="space-y-2">
              <button
                onClick={testConnection}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-lg"
              >
                Retenter la connexion
              </button>
            </div>
          </div>
        ) : isSearching && currentResults.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 text-lg">Chargement des articles...</span>
          </div>
        ) : currentResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-xl mb-2">Aucun article trouvé</p>
            <p className="text-gray-400">
              {selectedFamily ? 
                `Aucun article dans la famille "${selectedFamily}"` : 
                'Aucun article disponible'}
            </p>
          </div>
        ) : (
          <div className="pb-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-sm font-medium text-gray-500 uppercase tracking-wider border border-black text-center">
                      Code
                    </th>
                    <th className="px-3 py-2 text-sm font-medium text-gray-500 uppercase tracking-wider border border-black text-center">
                      Libellé
                    </th>
                    <th className="px-3 py-2 text-sm font-medium text-gray-500 uppercase tracking-wider border border-black text-center">
                      Famille
                    </th>
                    <th className="px-3 py-2 text-sm font-medium text-gray-500 uppercase tracking-wider border border-black text-center">
                      Prix
                    </th>
                    <th className="px-3 py-2 text-sm font-medium text-gray-500 uppercase tracking-wider border border-black">
                      <div className="flex items-center justify-center space-x-1">  
                        <span>Stock</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {tableRows}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Affichage de{' '}
              <span className="font-medium">
                {((pagination.current_page - 1) * pagination.items_per_page) + 1}
              </span>{' '}
              à{' '}
              <span className="font-medium">
                {Math.min(pagination.current_page * pagination.items_per_page, pagination.total_items)}
              </span>{' '}
              sur{' '}
              <span className="font-medium">{pagination.total_items}</span> résultats
            </p>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page <= 1 || isSearching}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  const pageNum = i + Math.max(1, pagination.current_page - 2);
                  if (pageNum <= pagination.total_pages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={isSearching}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          pageNum === pagination.current_page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100 disabled:opacity-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page >= pagination.total_pages || isSearching}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultation;
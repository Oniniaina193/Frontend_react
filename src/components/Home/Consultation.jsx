import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, Filter, ChevronLeft, ChevronRight, Loader, AlertCircle, Database, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const Consultation = ({ onBack }) => {
  const [articles, setArticles] = useState([]);
  const [families, setFamilies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20
  });

  // Tester la connexion au démarrage
  useEffect(() => {
    testDirectConnection();
  }, []);

  // Charger les familles une fois la connexion établie
  useEffect(() => {
    if (connectionStatus === 'ok') {
      loadFamilies();
    }
  }, [connectionStatus]);

  // Effectuer la recherche avec un délai (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (connectionStatus === 'ok') {
        searchArticles(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedFamily, connectionStatus]);

  // Test de connexion Access
  const testDirectConnection = async () => {
    setConnectionStatus('unknown');
    
    try {
      const response = await fetch('/api/direct-access/test-connection', {
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus('ok');
        setConnectionInfo(result.data);
        setError('');
      } else {
        setConnectionStatus('error');
        setError(result.message);
      }
    } catch (error) {
      setConnectionStatus('error');
      setError('Impossible de se connecter au serveur');
    }
  };

  // Charger les familles disponibles
  const loadFamilies = async () => {
    try {
      const response = await fetch('/api/direct-access/families', {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFamilies(result.data);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des familles:', error);
    }
  };

  // Rechercher des articles 
  const searchArticles = useCallback(async (page = 1) => {
    if (connectionStatus !== 'ok') {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (selectedFamily) {
        params.append('family', selectedFamily);
      }

      const response = await fetch(`/api/direct-access/search?${params}`, {
        headers: { 'Accept': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setArticles(result.data.articles);
        setPagination(result.data.pagination);
        setError('');
      } else {
        setError(result.message || 'Erreur lors de la recherche');
        setArticles([]);
        setPagination({
          current_page: 1,
          total_pages: 1,
          total_items: 0,
          items_per_page: 20
        });
      }
    } catch (error) {
      setError('Erreur de communication avec le serveur');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedFamily, connectionStatus]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages && !loading) {
      searchArticles(newPage);
    }
  };

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

  return (
    <div className="bg-white min-h-screen">
      {/* Contenu principal */}
      <div className="px-6 py-2 border-b border-gray-200">
        {/* Filtres de recherche */}
        <div className="flex items-center gap-4 mb-0">
          {/* Recherche par nom */}
          <div className="flex items-center space-x-3 flex-1">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Filtrage par famille des articles :
            </label>
              {/*<div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ex: Doliprane, Aspirine..."
                disabled={connectionStatus !== 'ok'}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm"
              />
            </div>*/}

             {/* Filtre par famille - taille réduite */}
          <div className="relative w-80">
            <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              disabled={connectionStatus !== 'ok'}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <option value="">Toutes les familles</option>
              {families.map((family, index) => (
                <option key={index} value={family}>
                  {family}
                </option>
              ))}
            </select>
          </div>
          </div>

          {/* Statistiques */}
          <div className={`rounded-lg px-4 py-2 transition-colors min-w-48 ${
            connectionStatus === 'ok' ? 'bg-blue-50' : 
            connectionStatus === 'error' ? 'bg-red-50' : 'bg-gray-50'
          }`}>
            <p className={`text-sm font-medium ${
              connectionStatus === 'ok' ? 'text-blue-700' : 
              connectionStatus === 'error' ? 'text-red-700' : 'text-gray-500'
            }`}>
              {loading ? 'Recherche...' : 
               connectionStatus === 'ok' ? `${pagination.total_items} article(s)` : 
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

      {/* Message d'erreur */}
      {error && (
        <div className="px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Problème de connexion</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={testDirectConnection}
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

      {/* Résultats de recherche - Header du tableau */}
      <div className="px-6 py-2 border-b border-gray-200">
        <div className="flex justify-center items-center">
          <h3 className="text-2xl font-semibold text-gray-800 font-serif">
            Liste des articles
          </h3>
        </div>
      </div>

      {/* Contenu du tableau */}
      {connectionStatus === 'unknown' ? (
        <div className="text-center py-16">
          <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500 text-xl mb-2">Initialisation de la connexion ODBC</p>
          <p className="text-gray-400">
            Test de la connexion à la base Access...
          </p>
        </div>
      ) : connectionStatus === 'error' ? (
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-gray-500 text-xl mb-2">Connexion Access indisponible</p>
          <div className="space-y-2">
            <button
              onClick={testDirectConnection}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mr-4 text-lg"
            >
              Retenter la connexion
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 text-lg">Recherche en cours...</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-xl mb-2">Aucun article trouvé</p>
          <p className="text-gray-400">
            {searchTerm || selectedFamily ? 
              'Essayez de modifier vos critères de recherche' : 
              'Saisissez un terme de recherche pour commencer'}
          </p>
        </div>
      ) : (
        <>
          {/* Tableau des résultats */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
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
                {articles.map((article, index) => (
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
                          {article.stock}
                        </span>
                        <span className="ml-1">
                          {article.stock > 1 ? 'unités' : 'unité'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
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
                    disabled={!pagination.has_prev || loading}
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
                            disabled={loading}
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
                    disabled={!pagination.has_next || loading}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Consultation;
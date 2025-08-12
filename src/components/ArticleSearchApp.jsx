import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, Filter, ChevronLeft, ChevronRight, Loader, AlertCircle, ArrowLeft, Database, CheckCircle, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ArticleSearchApp = ({ onBack }) => {
  const [articles, setArticles] = useState([]);
  const [families, setFamilies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('unknown'); // 'ok', 'error', 'unknown'
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20
  });
  const [debugInfo, setDebugInfo] = useState('');

  // Tester la connexion Access au démarrage
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

  // Test de connexion directe Access
  const testDirectConnection = async () => {
    setDebugInfo('Test de connexion Access...');
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
        
        // Mise à jour du debug avec les infos de stock
        const stockInfo = result.data.facturation_db;
        let debugMessage = `✅ Connexion OK - ${result.data.total_articles} articles`;
        
        if (stockInfo && stockInfo.available) {
          debugMessage += ` + ${stockInfo.total_movements} mouvements de stock`;
        } else {
          debugMessage += ' (stocks non disponibles)';
        }
        
        setDebugInfo(debugMessage);
        setError('');
      } else {
        setConnectionStatus('error');
        setDebugInfo(`❌ Erreur connexion: ${result.message}`);
        setError(result.message);
        
        // Si c'est un problème de sélection de dossier, suggérer de retourner
        if (result.message.includes('Aucun dossier sélectionné')) {
          setError(result.message + ' Cliquez sur "Retour" pour sélectionner un dossier.');
        }
      }
    } catch (error) {
      setConnectionStatus('error');
      setDebugInfo(`❌ Erreur réseau: ${error.message}`);
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
        } else {
          console.warn('Erreur familles:', result.message);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des familles:', error);
    }
  };

  // Rechercher des articles avec accès direct
  const searchArticles = useCallback(async (page = 1) => {
    if (connectionStatus !== 'ok') {
      return;
    }

    setLoading(true);
    setError('');
    setDebugInfo(`Recherche en cours... Page ${page}`);

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

      // UTILISER direct-access au lieu de articles
      const response = await fetch(`/api/direct-access/search?${params}`, {
        headers: { 'Accept': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setArticles(result.data.articles);
        setPagination(result.data.pagination);
        setDebugInfo(`${result.data.search_info.results_count} résultat(s) trouvé(s) - Accès direct avec stocks`);
        setError('');
      } else {
        if (result.redirect) {
          setError(result.message);
          setDebugInfo('Redirection vers sélection de dossier requise');
          setConnectionStatus('error');
        } else {
          setError(result.message || 'Erreur lors de la recherche');
          setDebugInfo(`Erreur API: ${result.message}`);
        }
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
      setDebugInfo(`Erreur réseau: ${error.message}`);
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

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleFamilyChange = (family) => {
    setSelectedFamily(family);
  };

  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '0,00 Ar';
    return `${numPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} Ar`;
  };

  //Obtenir l'icône et la couleur selon le stock
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

  // Obtenir les classes CSS selon le statut du stock
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

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'ok':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full">
        {/* Header */}
        <div className="bg-white shadow-lg">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  title="Retour à la sélection"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
                      <span>Recherche d'Articles</span>
                      {getConnectionStatusIcon()}
                    </h1>
      
                  </div>
                </div>
              </div>
              
              {/* Bouton refresh */}
              <button
                onClick={testDirectConnection}
                disabled={connectionStatus === 'unknown'}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                title="Retester la connexion"
              >
                <RefreshCw className={`w-5 h-5 ${connectionStatus === 'unknown' ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Status de connexion */}
            <div className={`mb-4 p-3 border rounded-lg text-sm flex justify-between items-center ${getStatusColor()}`}>
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span><strong>Status:</strong> {debugInfo}</span>
              </div>
              {connectionStatus === 'ok' && connectionInfo && (
                <div className="text-xs">
                  📁 {connectionInfo.file_path ? connectionInfo.file_path.split('\\').pop() || connectionInfo.file_path.split('/').pop() : 'Base Access'}
                  {connectionInfo.facturation_db && connectionInfo.facturation_db.available && (
                    <span className="ml-2 text-green-600">📊 Stocks disponibles</span>
                  )}
                </div>
              )}
            </div>

            {/* Filtres de recherche */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recherche par nom */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche par nom
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Ex: Doliprane, Aspirine..."
                    disabled={connectionStatus !== 'ok'}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-lg"
                  />
                </div>
              </div>

              {/* Filtre par famille */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Famille du médicament
                </label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={selectedFamily}
                    onChange={(e) => handleFamilyChange(e.target.value)}
                    disabled={connectionStatus !== 'ok'}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-lg"
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
              <div className="flex items-end">
                <div className={`rounded-lg p-4 w-full transition-colors ${
                  connectionStatus === 'ok' ? 'bg-blue-50' : 
                  connectionStatus === 'error' ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  <p className={`text-lg font-medium ${
                    connectionStatus === 'ok' ? 'text-blue-700' : 
                    connectionStatus === 'error' ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    {loading ? 'Recherche...' : 
                     connectionStatus === 'ok' ? `${pagination.total_items} article(s)` : 
                     connectionStatus === 'error' ? 'Connexion échouée' :
                     'Connexion en cours...'}
                  </p>
                  <p className={`text-sm ${
                    connectionStatus === 'ok' ? 'text-blue-600' : 
                    connectionStatus === 'error' ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {connectionStatus === 'ok' ? 
                      `Page ${pagination.current_page} sur ${pagination.total_pages}` :
                      connectionStatus === 'error' ? 'Accès direct indisponible' :
                      'Initialisation ODBC...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="px-8 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Problème de connexion</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <div className="mt-3 flex space-x-2">
                    {error.includes('Aucun dossier sélectionné') && (
                      <button
                        onClick={onBack}
                        className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                      >
                        ← Retour à la sélection
                      </button>
                    )}
                    <button
                      onClick={testDirectConnection}
                      className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                    >
                      🔄 Retenter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Résultats */}
        <div className="px-8 py-4">
          <div className="bg-white rounded-xl shadow-lg">
            {/* Header du tableau */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  Résultats de recherche
                  {connectionStatus === 'ok' && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      (Accès direct ODBC + Stocks)
                    </span>
                  )}
                </h2>
                {connectionStatus === 'ok' && connectionInfo && (
                  <div className="text-xs text-gray-500">
                    Base: {connectionInfo.file_path ? 
                      connectionInfo.file_path.split('\\').pop() || connectionInfo.file_path.split('/').pop() : 
                      'Access Database'}
                    {connectionInfo.facturation_db && connectionInfo.facturation_db.available && (
                      <span className="ml-2 text-green-600">+ Facturation</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contenu du tableau */}
            {connectionStatus === 'unknown' ? (
              <div className="text-center py-16">
                <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-500 text-xl mb-2">Initialisation de la connexion ODBC</p>
                <p className="text-gray-400">
                  Test de la connexion directe à la base Access...
                </p>
              </div>
            ) : connectionStatus === 'error' ? (
              <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-gray-500 text-xl mb-2">Connexion Access indisponible</p>
                <p className="text-gray-400 mb-6">
                  Impossible d'établir une connexion directe à la base Access
                </p>
                <div className="space-y-2">
                  <button
                    onClick={testDirectConnection}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mr-4 text-lg"
                  >
                    🔄 Retenter la connexion
                  </button>
                  <button
                    onClick={onBack}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors text-lg"
                  >
                    ← Changer de dossier
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
                {/* Tableau des résultats AVEC COLONNE STOCK */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Libellé
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Famille
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Prix TTC
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center space-x-1">
                            <Package className="w-4 h-4" />
                            <span>Stock</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {articles.map((article, index) => (
                        <tr key={`${article.code}-${index}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {article.code || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs">
                              <p className="font-medium truncate" title={article.libelle}>
                                {article.libelle || 'Sans nom'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {article.famille || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                            {formatPrice(article.prix_ttc)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                        <span className="ml-2 text-xs text-blue-600">(Accès direct + Stocks)</span>
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
        </div>
      </div>
    </div>
  );
};

export default ArticleSearchApp;
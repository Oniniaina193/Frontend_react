import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import statistiquesService from '../../services/StatistiquesService';
import { useStatisticsRefresh } from '../../../central/hooks/useStatisticsRefresh';

const Statistiques = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardStats, setDashboardStats] = useState([]);
  const [ventesData, setVentesData] = useState([]);
  const [topMedicaments, setTopMedicaments] = useState([]);
  const [dossierActuel, setDossierActuel] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fonction de rechargement des statistiques
  const loadStatistiques = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Chargement des statistiques...');
      const result = await statistiquesService.getAllStatistiques();

      // Dashboard
      if (result.dashboard && result.dashboard.success) {
        const cards = statistiquesService.formatDashboardCards(result.dashboard);
        setDashboardStats(cards);
        setDossierActuel(result.dashboard.data.dossier_actuel || '');
      }

      // Ventes mensuelles
      if (result.ventes && result.ventes.success) {
        const chartData = statistiquesService.formatVentesForChart(result.ventes);
        setVentesData(chartData);
      }

      // Top médicaments 
      if (result.topMedicaments && result.topMedicaments.success) {
        const topData = statistiquesService.formatTopMedicamentsForChart(result.topMedicaments);
        const barData = topData.slice(0, 10).map((medicament, index) => ({
          rang: index + 1,
          name: medicament.name,
          value: medicament.value,
          pourcentage: medicament.pourcentage
        }));
        setTopMedicaments(barData);
      }

      // Gérer les erreurs partielles
      if (result.errors && result.errors.length > 0) {
        console.warn('Erreurs lors du chargement des statistiques:', result.errors);
      }

      // Mettre à jour l'heure du dernier refresh
      setLastRefresh(new Date());
      console.log('✅ Statistiques rechargées avec succès');

    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  // Utiliser le hook personnalisé pour écouter les événements
  useStatisticsRefresh(loadStatistiques);

  // Chargement initial
  useEffect(() => {
    loadStatistiques();
  }, [loadStatistiques]);

  const handleRetry = () => {
    loadStatistiques();
  };

  // Tooltip personnalisé pour le diagramme en barres
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-900 text-sm truncate">{`${data.name}`}</p>
          <p className="text-blue-600 text-xs">{`Quantité: ${data.value.toLocaleString()}`}</p>
          <p className="text-gray-600 text-xs">{`${data.pourcentage}%`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">Tableau de bord</h2>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="text-gray-600">Chargement des statistiques...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">Tableau de bord</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur de chargement</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <div className="mt-3">
                <button
                  onClick={handleRetry}
                  className="bg-red-100 px-3 py-1 rounded text-red-800 text-sm hover:bg-red-200 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">Tableau de bord</h2>
        <div className="flex items-center space-x-4">    
          {/* Indicateur de dernière mise à jour + bouton refresh manuel */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Mis à jour: {lastRefresh.toLocaleTimeString()}</span>
            <button
              onClick={handleRetry}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Actualiser les statistiques"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                    <span className="text-white text-sm">{stat.icon}</span>
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Graphique des ventes mensuelles */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Ventes mensuelles</h3>
            <div className="text-sm text-gray-500">
              {ventesData.length} mois
            </div>
          </div>
          
          {ventesData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ventesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [value.toLocaleString(), 'Médicaments vendus']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ventes" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#1D4ED8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 bg-gray-50 rounded flex items-center justify-center">
              <span className="text-gray-500">Aucune donnée de vente disponible</span>
            </div>
          )}
        </div>

        {/* Top médicaments - Diagramme en barres */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Top 10 médicaments</h3>
            <div className="text-sm text-gray-500">
              Les plus vendus
            </div>
          </div>

          {topMedicaments.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={topMedicaments}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="rang" 
                    stroke="#6B7280"
                    fontSize={12}
                    label={{ value: 'Rang', position: 'insideBottom', offset: -10 }}
                    tick={{ dy: 10 }}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    label={{ value: 'Quantité vendue', angle: -90, position: 'insideLeft' }}
                    width={80}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    position={{ x: 200, y: 50 }}
                    isAnimationActive={false}
                    wrapperStyle={{ 
                      position: 'absolute',
                      pointerEvents: 'none',
                      zIndex: 1000
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 bg-gray-50 rounded flex items-center justify-center">
              <span className="text-gray-500">Aucune donnée de médicament disponible</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Statistiques;
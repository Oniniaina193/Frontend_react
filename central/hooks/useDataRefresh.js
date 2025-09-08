// hooks/useDataRefresh.js
import { useEffect, useCallback, useState } from 'react';
import dataRefreshService from '../services/DataRefreshService';

/**
 * Hook personnalisé pour gérer les mises à jour de données
 * Permet aux composants de réagir automatiquement aux refresh
 */
export const useDataRefresh = (options = {}) => {
  const {
    // Callback appelé lors d'un refresh réussi
    onRefreshSuccess = null,
    // Callback appelé lors d'une erreur de refresh
    onRefreshError = null,
    // Callback appelé au début d'un refresh
    onRefreshStart = null,
    // Auto-refresh des données du composant après mise à jour
    autoReload = true,
    // Fonction de rechargement personnalisée
    reloadFunction = null,
    // Délai avant rechargement automatique (ms)
    reloadDelay = 500
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  // Gérer les événements de refresh
  const handleRefreshEvent = useCallback((event, data) => {
    switch (event) {
      case 'start':
        setIsRefreshing(true);
        setLastRefreshTime(null);
        if (onRefreshStart) {
          onRefreshStart(data);
        }
        break;

      case 'success':
        setIsRefreshing(false);
        setLastRefreshTime(new Date());
        
        if (onRefreshSuccess) {
          onRefreshSuccess(data);
        }

        // Rechargement automatique des données du composant
        if (autoReload && reloadFunction) {
          setTimeout(() => {
            console.log('🔄 Rechargement automatique des données du composant');
            reloadFunction();
          }, reloadDelay);
        }
        break;

      case 'error':
        setIsRefreshing(false);
        
        if (onRefreshError) {
          onRefreshError(data);
        }
        break;

      default:
        console.warn('Événement de refresh non géré:', event);
    }
  }, [onRefreshSuccess, onRefreshError, onRefreshStart, autoReload, reloadFunction, reloadDelay]);

  // S'abonner aux événements de refresh
  useEffect(() => {
    const unsubscribe = dataRefreshService.onRefresh(handleRefreshEvent);
    
    // Obtenir l'état initial
    const refreshState = dataRefreshService.getRefreshState();
    setIsRefreshing(refreshState.isRefreshing);
    setLastRefreshTime(refreshState.lastRefreshTime);

    return () => {
      unsubscribe();
    };
  }, [handleRefreshEvent]);

  // Fonction pour déclencher une mise à jour manuelle
  const triggerRefresh = useCallback(async () => {
    return await dataRefreshService.refreshAllData();
  }, []);

  // Fonction pour un refresh rapide
  const triggerQuickRefresh = useCallback(async () => {
    return await dataRefreshService.quickRefresh();
  }, []);

  return {
    // État du refresh
    isRefreshing,
    lastRefreshTime,
    lastRefreshTimeFormatted: lastRefreshTime 
      ? lastRefreshTime.toLocaleTimeString() 
      : null,
    
    // Fonctions
    triggerRefresh,
    triggerQuickRefresh,
    
    // Service direct (pour utilisations avancées)
    dataRefreshService
  };
};

/**
 * Hook simplifié pour les composants qui ont juste besoin de recharger leurs données
 */
export const useAutoReload = (reloadFunction, dependencies = []) => {
  const { isRefreshing } = useDataRefresh({
    autoReload: true,
    reloadFunction,
    onRefreshSuccess: (data) => {
      console.log('✅ Données mises à jour, rechargement du composant');
    }
  });

  // Recharger si les dépendances changent
  useEffect(() => {
    if (reloadFunction && !isRefreshing) {
      reloadFunction();
    }
  }, dependencies);

  return { isRefreshing };
};

/**
 * Hook pour les composants qui affichent des statistiques
 */
export const useStatsRefresh = (statistiquesService) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await statistiquesService.getAllStatistiques();
      setStats(result);
    } catch (err) {
      setError(err);
      console.error('Erreur chargement statistiques:', err);
    } finally {
      setLoading(false);
    }
  }, [statistiquesService]);

  // Utiliser le hook de refresh avec rechargement automatique des stats
  const { isRefreshing, lastRefreshTime } = useDataRefresh({
    autoReload: true,
    reloadFunction: loadStats,
    onRefreshSuccess: () => {
      console.log('📊 Statistiques actualisées après refresh');
    }
  });

  // Charger les stats au montage
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading: loading || isRefreshing,
    error,
    lastRefreshTime,
    reloadStats: loadStats,
    isRefreshing
  };
};

export default useDataRefresh;
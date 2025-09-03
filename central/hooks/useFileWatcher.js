import { useEffect, useRef, useCallback } from 'react';

const useFileWatcher = (onDataChange) => {
  const intervalRef = useRef(null);
  const isActiveRef = useRef(false);
  
  const checkChanges = useCallback(async () => {
    if (!isActiveRef.current) return;
    
    try {
      const response = await fetch('/api/file-watcher/check-changes', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.has_changes) {
        console.log('🔄 Changements détectés:', data.affected_areas);
        
        // Notifier les composants des changements
        if (onDataChange && typeof onDataChange === 'function') {
          onDataChange(data.affected_areas || [], data.changes || []);
        }
        
        // Déclencher les événements personnalisés pour chaque zone affectée
        data.affected_areas?.forEach(area => {
          window.dispatchEvent(new CustomEvent('dataChanged', { 
            detail: { area, timestamp: Date.now() }
          }));
        });
      }
      
    } catch (error) {
      // Erreur silencieuse pour éviter de polluer l'interface
      console.warn('Erreur surveillance fichiers:', error.message);
    }
  }, [onDataChange]);
  
  const startWatching = useCallback(() => {
    if (isActiveRef.current) return;
    
    isActiveRef.current = true;
    console.log('🔍 Démarrage surveillance fichiers');
    
    // Première vérification immédiate
    checkChanges();
    
    // Puis vérification toutes les 3 secondes
    intervalRef.current = setInterval(checkChanges, 3000);
  }, [checkChanges]);
  
  const stopWatching = useCallback(() => {
    isActiveRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ Arrêt surveillance fichiers');
    }
  }, []);
  
  const resetWatcher = useCallback(async () => {
    try {
      const response = await fetch('/api/file-watcher/reset', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (response.ok) {
        console.log('🔄 Surveillance réinitialisée');
      }
    } catch (error) {
      console.warn('Erreur réinitialisation:', error.message);
    }
  }, []);
  
  // Démarrer automatiquement la surveillance
  useEffect(() => {
    startWatching();
    
    // Nettoyage à la désactivation
    return () => {
      stopWatching();
    };
  }, [startWatching, stopWatching]);
  
  // Arrêter la surveillance si l'onglet devient inactif
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopWatching();
      } else {
        startWatching();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startWatching, stopWatching]);
  
  return {
    startWatching,
    stopWatching,
    resetWatcher,
    isActive: () => isActiveRef.current
  };
};

export default useFileWatcher;
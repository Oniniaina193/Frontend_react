// contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import directAccessService from '../services/directAccessService';
import medicamentService from '../services/medicamentService';
import medecinService from '../services/medecinService';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData doit être utilisé dans un DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  // ==================== ÉTATS PRINCIPAUX ====================
  
  // États pour chaque type de données
  const [articles, setArticles] = useState([]);
  const [families, setFamilies] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [medecins, setMedecins] = useState([]);
  
  // États de chargement
  const [loading, setLoading] = useState({
    articles: false,
    families: false,
    medicaments: false,
    medecins: false,
    initial: true
  });

  // États d'erreur
  const [errors, setErrors] = useState({});
  
  // État de connexion
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [connectionInfo, setConnectionInfo] = useState(null);

  // Cache optimisé avec nettoyage automatique
  const [cache, setCache] = useState({
    articlesSearches: new Map(),
    lastSearch: '',
    lastFamily: ''
  });

  // Références pour éviter les appels multiples simultanés
  const searchAbortControllerRef = useRef(null);
  const lastSearchRef = useRef('');

  // ==================== EFFECTS ET INITIALISATION ====================

  useEffect(() => {
    loadInitialData();
    
    // Nettoyage du cache toutes les 10 minutes
    const cacheCleanInterval = setInterval(() => {
      cleanOldCache();
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(cacheCleanInterval);
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
    };
  }, []);

  // ==================== FONCTIONS UTILITAIRES ====================

  // Nettoyage automatique du cache ancien (>30 minutes)
  const cleanOldCache = useCallback(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    setCache(prev => {
      const newSearches = new Map();
      
      for (const [key, value] of prev.articlesSearches) {
        if (now - value.timestamp < maxAge) {
          newSearches.set(key, value);
        }
      }
      
      if (newSearches.size !== prev.articlesSearches.size) {
        console.log(`🧹 Cache nettoyé: ${prev.articlesSearches.size - newSearches.size} entrées supprimées`);
      }
      
      return {
        ...prev,
        articlesSearches: newSearches
      };
    });
  }, []);

  const clearCache = useCallback(() => {
    setCache({
      articlesSearches: new Map(),
      lastSearch: '',
      lastFamily: ''
    });
    console.log('🗑️ Cache vidé');
  }, []);

  // Statistiques du cache pour debugging
  const getCacheStats = useCallback(() => {
    return {
      size: cache.articlesSearches.size,
      entries: Array.from(cache.articlesSearches.keys()),
      oldestEntry: cache.articlesSearches.size > 0 
        ? Math.min(...Array.from(cache.articlesSearches.values()).map(v => v.timestamp))
        : null,
      newestEntry: cache.articlesSearches.size > 0 
        ? Math.max(...Array.from(cache.articlesSearches.values()).map(v => v.timestamp))
        : null
    };
  }, [cache.articlesSearches]);

  // ==================== CHARGEMENT INITIAL ====================

  const loadInitialData = async () => {
    console.log('🚀 Chargement initial des données...');
    
    try {
      // 1. Tester la connexion d'abord
      await testConnection();
      
      // 2. Charger toutes les données en parallèle
      await Promise.allSettled([
        loadFamilies(),
        loadMedicaments(),
        loadMedecins()
      ]);
      
      console.log('✅ Chargement initial terminé');
    } catch (error) {
      console.error('❌ Erreur chargement initial:', error);
      setErrors(prev => ({ ...prev, initial: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  };

  // ==================== GESTION DE LA CONNEXION ====================

  const testConnection = async () => {
    setConnectionStatus('testing');
    
    try {
      const result = await directAccessService.testConnection();
      
      if (result.success) {
        setConnectionStatus('ok');
        setConnectionInfo(result.data);
        setErrors(prev => ({ ...prev, connection: null }));
      } else {
        setConnectionStatus('error');
        setErrors(prev => ({ ...prev, connection: result.message }));
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrors(prev => ({ ...prev, connection: 'Impossible de se connecter au serveur' }));
    }
  };

  const refreshConnection = useCallback(async () => {
    await testConnection();
  }, []);

  // ==================== CHARGEMENT DES DONNÉES ====================

  // Charger les familles
  const loadFamilies = async () => {
    if (families.length > 0) return families; // Déjà chargé
    
    setLoading(prev => ({ ...prev, families: true }));
    
    try {
      const result = await directAccessService.getFamilies();
      
      if (result.success) {
        setFamilies(result.data);
        setErrors(prev => ({ ...prev, families: null }));
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, families: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, families: false }));
    }
  };

  // Charger les médicaments
  const loadMedicaments = async (forceReload = false) => {
    if (medicaments.length > 0 && !forceReload) return medicaments;
    
    setLoading(prev => ({ ...prev, medicaments: true }));
    
    try {
      const result = await medicamentService.getMedicaments({ per_page: 1000 });
      
      if (result.success) {
        setMedicaments(result.data.medicaments);
        setErrors(prev => ({ ...prev, medicaments: null }));
        return result.data.medicaments;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, medicaments: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, medicaments: false }));
    }
  };

  // Charger les médecins
  const loadMedecins = async (forceReload = false) => {
    if (medecins.length > 0 && !forceReload) return medecins;
    
    setLoading(prev => ({ ...prev, medecins: true }));
    
    try {
      const result = await medecinService.getMedecins({ per_page: 1000 });
      
      if (result.success) {
        setMedecins(result.data.medecins);
        setErrors(prev => ({ ...prev, medecins: null }));
        return result.data.medecins;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, medecins: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, medecins: false }));
    }
  };

  // ==================== RECHERCHE D'ARTICLES OPTIMISÉE ====================

  const searchArticles = useCallback(async (searchTerm = '', selectedFamily = '', page = 1, limit = 100) => {
    const trimmedTerm = searchTerm.trim();
    
    // Créer une clé de cache
    const cacheKey = `${trimmedTerm.toLowerCase()}-${selectedFamily}-${page}-${limit}`;
    
    // Annuler la recherche précédente si elle existe
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    // Vérifier le cache d'abord pour des résultats instantanés
    if (cache.articlesSearches.has(cacheKey)) {
      const cachedResult = cache.articlesSearches.get(cacheKey);
      console.log('⚡ Résultat instantané du cache DataContext:', cacheKey);
      return cachedResult;
    }

    if (connectionStatus !== 'ok') {
      throw new Error('Connexion non établie');
    }

    // Éviter les doublons de recherche
    if (lastSearchRef.current === cacheKey) {
      return { articles: [], pagination: {} };
    }
    lastSearchRef.current = cacheKey;

    setLoading(prev => ({ ...prev, articles: true }));
    
    // Créer un nouveau AbortController pour cette recherche
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;
    
    try {
      const result = await directAccessService.searchArticles({
        search: trimmedTerm,
        family: selectedFamily,
        page,
        limit
      });

      // Vérifier si la recherche n'a pas été annulée
      if (abortController.signal.aborted) {
        return { articles: [], pagination: {} };
      }

      if (result.success) {
        const searchResult = {
          articles: result.data.articles || [],
          pagination: result.data.pagination || {},
          timestamp: Date.now()
        };

        // Mise en cache optimisée avec limitation intelligente
        setCache(prev => {
          const newSearches = new Map(prev.articlesSearches);
          
          // Limiter à 100 entrées avec suppression des plus anciennes
          if (newSearches.size >= 100) {
            // Supprimer les 20 entrées les plus anciennes
            const entries = Array.from(newSearches.entries())
              .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (let i = 0; i < 20; i++) {
              newSearches.delete(entries[i][0]);
            }
          }
          
          newSearches.set(cacheKey, searchResult);
          
          return {
            ...prev,
            articlesSearches: newSearches
          };
        });
        
        setErrors(prev => ({ ...prev, articles: null }));
        console.log('💾 Mise en cache DataContext:', cacheKey, `(${result.data.articles?.length || 0} résultats)`);
        
        return searchResult;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🚫 Recherche annulée:', cacheKey);
        return { articles: [], pagination: {} };
      }
      
      setErrors(prev => ({ ...prev, articles: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, articles: false }));
      // Nettoyer la référence
      if (searchAbortControllerRef.current === abortController) {
        searchAbortControllerRef.current = null;
      }
      lastSearchRef.current = '';
    }
  }, [connectionStatus, cache.articlesSearches]);

  // ==================== CRUD MÉDICAMENTS ====================

  const addMedicament = async (medicamentData) => {
    try {
      const result = await medicamentService.createMedicament(medicamentData);
      
      if (result.success) {
        const newMedicament = {
          id: result.data.id || Date.now(),
          nom: medicamentData.nom,
          famille: medicamentData.famille
        };
        
        setMedicaments(prev => [newMedicament, ...prev]);
        
        // Ajouter la famille si nouvelle
        if (!families.includes(medicamentData.famille)) {
          setFamilies(prev => [...prev, medicamentData.famille]);
        }
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur ajout médicament:', error);
      throw error;
    }
  };

  const updateMedicament = async (id, medicamentData) => {
    try {
      const result = await medicamentService.updateMedicament(id, medicamentData);
      
      if (result.success) {
        setMedicaments(prev => prev.map(med => 
          med.id === id 
            ? { ...med, nom: medicamentData.nom, famille: medicamentData.famille }
            : med
        ));
        
        // Ajouter la famille si nouvelle
        if (!families.includes(medicamentData.famille)) {
          setFamilies(prev => [...prev, medicamentData.famille]);
        }
        
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur modification médicament:', error);
      throw error;
    }
  };

  const deleteMedicament = async (id) => {
    try {
      const result = await medicamentService.deleteMedicament(id);
      
      if (result.success) {
        setMedicaments(prev => prev.filter(med => med.id !== id));
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur suppression médicament:', error);
      throw error;
    }
  };

  // ==================== CRUD MÉDECINS ====================

  const addMedecin = async (medecinData) => {
    try {
      const result = await medecinService.createMedecin(medecinData);
      
      if (result.success) {
        const newMedecin = {
          id: result.data.id || Date.now(),
          ...medecinData
        };
        
        setMedecins(prev => [newMedecin, ...prev]);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur ajout médecin:', error);
      throw error;
    }
  };

  const updateMedecin = async (id, medecinData) => {
    try {
      const result = await medecinService.updateMedecin(id, medecinData);
      
      if (result.success) {
        setMedecins(prev => prev.map(med => 
          med.id === id ? { ...med, ...medecinData } : med
        ));
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur modification médecin:', error);
      throw error;
    }
  };

  const deleteMedecin = async (id) => {
    try {
      const result = await medecinService.deleteMedecin(id);
      
      if (result.success) {
        setMedecins(prev => prev.filter(med => med.id !== id));
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Erreur suppression médecin:', error);
      throw error;
    }
  };

  // ==================== FONCTIONS DE RAFRAÎCHISSEMENT ====================

  const refreshAllData = useCallback(async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    clearCache();
    
    // Annuler les recherches en cours
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    await Promise.allSettled([
      loadFamilies(),
      loadMedicaments(true),
      loadMedecins(true)
    ]);
    
    setLoading(prev => ({ ...prev, initial: false }));
  }, [clearCache]);

  // ==================== VALEUR DU CONTEXTE ====================

  const contextValue = {
    // Données
    articles,
    families,
    medicaments,
    medecins,
    
    // États
    loading,
    errors,
    connectionStatus,
    connectionInfo,
    
    // Fonction de recherche optimisée
    searchArticles,
    
    // Fonctions CRUD médicaments
    addMedicament,
    updateMedicament,
    deleteMedicament,
    
    // Fonctions CRUD médecins
    addMedecin,
    updateMedecin,
    deleteMedecin,
    
    // Fonctions utilitaires
    testConnection: refreshConnection,
    loadFamilies,
    loadMedicaments,
    loadMedecins,
    clearCache,
    refreshAllData,
    
    // Informations sur le cache
    cacheSize: cache.articlesSearches.size,
    getCacheStats
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};
// contexts/DataContext.js - VERSION OPTIMISÉE
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
  
  const [articles, setArticles] = useState([]);
  const [families, setFamilies] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [medecins, setMedecins] = useState([]);
  
  const [loading, setLoading] = useState({
    articles: false,
    families: false,
    medicaments: false,
    medecins: false,
    initial: false 
  });

  const [errors, setErrors] = useState({});
  
  // Cache optimisé avec nettoyage automatique
  const [cache, setCache] = useState({
    articlesSearches: new Map(),
    lastSearch: '',
    lastFamily: ''
  });

  // Références pour éviter les appels multiples simultanés
  const searchAbortControllerRef = useRef(null);
  const lastSearchRef = useRef('');
  
  // ✅ NOUVEAU: Flag pour éviter les chargements multiples
  const isLoadingRef = useRef({
    families: false,
    medicaments: false,
    medecins: false
  });

  // ==================== CHARGEMENT INTELLIGENT POST-SÉLECTION ====================

  // ✅ NOUVEAU: Chargement optimisé après sélection du dossier
  const loadEssentialDataAfterFolder = useCallback(async () => {
    console.log('🚀 Chargement essentiel après sélection dossier...');
    
    try {
      // 1. CRITIQUE: Charger seulement les familles (rapide)
      const families = await loadFamilies();
      
      // 2. IMPORTANT: Différer les autres chargements
      setTimeout(() => {
        loadMedicamentsLazy(50); // Seulement 50 au lieu de 1000
      }, 500);
      
      setTimeout(() => {
        loadMedecinsLazy(30); // Seulement 30 au lieu de 1000  
      }, 1000);
      
      console.log('✅ Chargement essentiel terminé');
      return { success: true, families };
      
    } catch (error) {
      console.error('❌ Erreur chargement essentiel:', error);
      setErrors(prev => ({ ...prev, essential: error.message }));
      return { success: false, error: error.message };
    }
  }, []);

  // ==================== CHARGEMENT LAZY DES DONNÉES ====================

  // Charger les familles (le plus critique)
  const loadFamilies = useCallback(async () => {
    if (families.length > 0) return families; // Déjà chargé
    if (isLoadingRef.current.families) return []; // Éviter doublons
    
    isLoadingRef.current.families = true;
    setLoading(prev => ({ ...prev, families: true }));
    
    try {
      const result = await directAccessService.getFamilies();
      
      if (result.success) {
        setFamilies(result.data);
        setErrors(prev => ({ ...prev, families: null }));
        console.log('✅ Familles chargées:', result.data.length);
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, families: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, families: false }));
      isLoadingRef.current.families = false;
    }
  }, [families.length]);

  // ✅ NOUVEAU: Chargement lazy des médicaments (limité)
  const loadMedicamentsLazy = useCallback(async (limit = 50) => {
    if (medicaments.length > 0) return medicaments; 
    if (isLoadingRef.current.medicaments) return []; 
    
    isLoadingRef.current.medicaments = true;
    setLoading(prev => ({ ...prev, medicaments: true }));
    
    try {
      const result = await medicamentService.getMedicaments({ 
        per_page: limit 
      });
      
      if (result.success) {
        setMedicaments(result.data.medicaments);
        setErrors(prev => ({ ...prev, medicaments: null }));
        console.log('✅ Médicaments chargés (lazy):', result.data.medicaments.length);
        return result.data.medicaments;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, medicaments: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, medicaments: false }));
      isLoadingRef.current.medicaments = false;
    }
  }, [medicaments.length]);

  // ✅ NOUVEAU: Chargement lazy des médecins (limité)
  const loadMedecinsLazy = useCallback(async (limit = 30) => {
    if (medecins.length > 0) return medecins; 
    if (isLoadingRef.current.medecins) return [];
    
    isLoadingRef.current.medecins = true;
    setLoading(prev => ({ ...prev, medecins: true }));
    
    try {
      const result = await medecinService.getMedecins({ 
        per_page: limit
      });
      
      if (result.success) {
        setMedecins(result.data.medecins);
        setErrors(prev => ({ ...prev, medecins: null }));
        console.log('✅ Médecins chargés (lazy):', result.data.medecins.length);
        return result.data.medecins;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, medecins: error.message }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, medecins: false }));
      isLoadingRef.current.medecins = false;
    }
  }, [medecins.length]);

  // ✅ NOUVEAU: Chargement complet à la demande
  const loadFullMedicaments = useCallback(async () => {
    return loadMedicamentsLazy(1000);
  }, [loadMedicamentsLazy]);

  const loadFullMedecins = useCallback(async () => {
    return loadMedecinsLazy(1000); 
  }, [loadMedecinsLazy]);

  // ==================== NETTOYAGE AUTOMATIQUE ====================

  useEffect(() => {
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

  // Nettoyage automatique du cache ancien (>30 minutes)
  const cleanOldCache = useCallback(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; 

    setCache(prev => {
      const newSearches = new Map();
      
      for (const [key, value] of prev.articlesSearches) {
        if (now - value.timestamp < maxAge) {
          newSearches.set(key, value);
        }
      }
      
      if (newSearches.size !== prev.articlesSearches.size) {
        console.log('🧹 Cache nettoyé:', prev.articlesSearches.size - newSearches.size, 'entrées supprimées');
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
  }, [cache.articlesSearches]);

  // ==================== CRUD OPTIMISÉ ====================

  // CRUD médicaments 
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

  // CRUD médecins (identique)
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

  // ==================== RAFRAÎCHISSEMENT OPTIMISÉ ====================

  const refreshAllData = useCallback(async () => {
    clearCache();
    
    // Annuler les recherches en cours
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    // Reset des flags
    isLoadingRef.current = {
      families: false,
      medicaments: false,
      medecins: false
    };
    
    // Reset des états
    setFamilies([]);
    setMedicaments([]);
    setMedecins([]);
    
    // Recharger seulement l'essentiel
    await loadEssentialDataAfterFolder();
  }, [clearCache, loadEssentialDataAfterFolder]);

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
    
    // ✅ NOUVEAU: Fonction de chargement intelligent
    loadEssentialDataAfterFolder,
    
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
    loadFamilies,
    loadMedicamentsLazy,
    loadMedecinsLazy,
    loadFullMedicaments,
    loadFullMedecins,   
    clearCache,
    refreshAllData,
    
    // Informations sur le cache
    cacheSize: cache.articlesSearches.size,
    getCacheStats: () => ({
      size: cache.articlesSearches.size,
      entries: Array.from(cache.articlesSearches.keys()),
      oldestEntry: cache.articlesSearches.size > 0 
        ? Math.min(...Array.from(cache.articlesSearches.values()).map(v => v.timestamp))
        : null,
      newestEntry: cache.articlesSearches.size > 0 
        ? Math.max(...Array.from(cache.articlesSearches.values()).map(v => v.timestamp))
        : null
    })
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};
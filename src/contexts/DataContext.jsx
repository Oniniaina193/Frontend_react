// contexts/DataContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Cache des requêtes pour éviter les doublons
  const [cache, setCache] = useState({
    articlesSearches: new Map(), // search term -> résultats
    lastSearch: '',
    lastFamily: ''
  });

  // CHARGEMENT INITIAL - UNE SEULE FOIS
  useEffect(() => {
    loadInitialData();
  }, []);

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

  // Test de connexion
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
    if (medicaments.length > 0 && !forceReload) return medicaments; // Déjà chargé
    
    setLoading(prev => ({ ...prev, medicaments: true }));
    
    try {
      const result = await medicamentService.getMedicaments({ per_page: 1000 }); // Charger tout
      
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
    if (medecins.length > 0 && !forceReload) return medecins; // Déjà chargé
    
    setLoading(prev => ({ ...prev, medecins: true }));
    
    try {
      const result = await medecinService.getMedecins({ per_page: 1000 }); // Charger tout
      
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

  // Rechercher des articles avec cache intelligent
  const searchArticles = async (searchTerm = '', selectedFamily = '', page = 1, limit = 50) => {
    // Créer une clé de cache
    const cacheKey = `${searchTerm.trim()}-${selectedFamily}-${page}-${limit}`;
    
    // Vérifier le cache d'abord
    if (cache.articlesSearches.has(cacheKey)) {
      console.log('📦 Utilisation du cache pour:', cacheKey);
      return cache.articlesSearches.get(cacheKey);
    }

    if (connectionStatus !== 'ok') {
      throw new Error('Connexion non établie');
    }

    setLoading(prev => ({ ...prev, articles: true }));
    
    try {
      const result = await directAccessService.searchArticles({
        search: searchTerm.trim(),
        family: selectedFamily,
        page,
        limit
      });

      if (result.success) {
        const searchResult = {
          articles: result.data.articles,
          pagination: result.data.pagination,
          timestamp: Date.now()
        };

        // Mettre en cache (limiter à 50 entrées max)
        const newCache = new Map(cache.articlesSearches);
        if (newCache.size >= 50) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        newCache.set(cacheKey, searchResult);
        
        setCache(prev => ({ ...prev, articlesSearches: newCache }));
        setErrors(prev => ({ ...prev, articles: null }));
        
        console.log('💾 Mise en cache:', cacheKey);
        return searchResult;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, articles: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, articles: false }));
    }
  };

  // CRUD MÉDICAMENTS avec mise à jour du cache
  const addMedicament = async (medicamentData) => {
    try {
      const result = await medicamentService.createMedicament(medicamentData);
      
      if (result.success) {
        // Mettre à jour le cache local
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
        // Mettre à jour le cache local
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
        // Mettre à jour le cache local
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

  // CRUD MÉDECINS avec mise à jour du cache
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

  // Fonctions utilitaires
  const clearCache = () => {
    setCache({
      articlesSearches: new Map(),
      lastSearch: '',
      lastFamily: ''
    });
    console.log('🗑️ Cache vidé');
  };

  const refreshConnection = async () => {
    await testConnection();
  };

  const refreshAllData = async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    clearCache();
    
    await Promise.allSettled([
      loadFamilies(),
      loadMedicaments(true), // Force reload
      loadMedecins(true)      // Force reload
    ]);
    
    setLoading(prev => ({ ...prev, initial: false }));
  };

  // Valeur du contexte
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
    
    // Fonctions de recherche
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
    
    // Cache info
    cacheSize: cache.articlesSearches.size
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};
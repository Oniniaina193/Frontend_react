// contexts/DataContext.js - VERSION ÉTENDUE AVEC ORDONNANCES
import React, { createContext, useContext, useState, useEffect } from 'react';
import directAccessService from '../services/directAccessService';
import medicamentService from '../services/medicamentService';
import medecinService from '../services/medecinService';
import ordonnanceService, { ValidationError, RedirectError } from '../services/ordonnanceService';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData doit être utilisé dans un DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  // ===============================================
  // ÉTATS EXISTANTS
  // ===============================================
  const [articles, setArticles] = useState([]);
  const [families, setFamilies] = useState([]);
  const [medicaments, setMedicaments] = useState([]);
  const [medecins, setMedecins] = useState([]);
  
  // ===============================================
  // NOUVEAUX ÉTATS POUR ORDONNANCES
  // ===============================================
  const [ordonnances, setOrdonnances] = useState([]);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);
  const [ordonnancesStats, setOrdonnancesStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  
  // États de chargement étendus
  const [loading, setLoading] = useState({
    articles: false,
    families: false,
    medicaments: false,
    medecins: false,
    ordonnances: false,
    ordonnanceDetail: false,
    tickets: false,
    stats: false,
    initial: true
  });

  // États d'erreur étendus
  const [errors, setErrors] = useState({});
  
  // État de connexion
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [connectionInfo, setConnectionInfo] = useState(null);

  // Cache étendu
  const [cache, setCache] = useState({
    articlesSearches: new Map(),
    ordonnancesSearches: new Map(),
    ticketSearches: new Map(),
    lastOrdonnanceSearch: '',
    lastTicketSearch: '',
    lastSearch: '',
    lastFamily: ''
  });

  // ===============================================
  // CHARGEMENT INITIAL (INCHANGÉ)
  // ===============================================
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
        // Note: Les ordonnances se chargent à la demande car dépendent du dossier sélectionné
      ]);
      
      console.log('✅ Chargement initial terminé');
    } catch (error) {
      console.error('❌ Erreur chargement initial:', error);
      setErrors(prev => ({ ...prev, initial: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  };

  // Test de connexion (inchangé)
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

  // ===============================================
  // FONCTIONS EXISTANTES (INCHANGÉES)
  // ===============================================
  
  // Charger les familles (inchangé)
  const loadFamilies = async () => {
    if (families.length > 0) return families;
    
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

  // Charger les médicaments (inchangé)
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

  // Charger les médecins (inchangé)
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

  // Rechercher des articles (inchangé)
  const searchArticles = async (searchTerm = '', selectedFamily = '', page = 1, limit = 50) => {
    const cacheKey = `${searchTerm.trim()}-${selectedFamily}-${page}-${limit}`;
    
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

  // ===============================================
  // NOUVELLES FONCTIONS POUR ORDONNANCES
  // ===============================================

  /**
   * Charger les ordonnances avec cache intelligent
   */
  const loadOrdonnances = async (params = {}, forceReload = false) => {
    const { page = 1, search = '', per_page = 20 } = params;
    const cacheKey = `${search.trim()}-${page}-${per_page}`;
    
    // Vérifier le cache
    if (!forceReload && cache.ordonnancesSearches.has(cacheKey)) {
      console.log('📦 Cache ordonnances utilisé:', cacheKey);
      const cachedResult = cache.ordonnancesSearches.get(cacheKey);
      setOrdonnances(cachedResult.ordonnances);
      return cachedResult;
    }

    setLoading(prev => ({ ...prev, ordonnances: true }));
    
    try {
      const result = await ordonnanceService.getOrdonnances({
        page,
        search: search.trim(),
        per_page
      });

      if (result.success) {
        // Mettre à jour le state
        setOrdonnances(result.data.ordonnances);
        setErrors(prev => ({ ...prev, ordonnances: null }));

        // Mettre en cache
        const cacheResult = {
          ordonnances: result.data.ordonnances,
          pagination: result.data.pagination,
          dossier_info: result.data.dossier_info,
          timestamp: Date.now()
        };

        const newCache = new Map(cache.ordonnancesSearches);
        if (newCache.size >= 30) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        newCache.set(cacheKey, cacheResult);
        
        setCache(prev => ({ 
          ...prev, 
          ordonnancesSearches: newCache,
          lastOrdonnanceSearch: search.trim()
        }));

        console.log('💾 Ordonnances mises en cache:', cacheKey);
        return cacheResult;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error instanceof RedirectError) {
        // Gestion des redirections pour sélection de dossier
        setErrors(prev => ({ ...prev, ordonnances: error.message }));
        throw error;
      }
      
      setErrors(prev => ({ ...prev, ordonnances: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, ordonnances: false }));
    }
  };

  /**
   * Récupérer une ordonnance spécifique
   */
  const loadOrdonnanceDetail = async (id, forceReload = false) => {
    // Vérifier si déjà en cache
    if (!forceReload && selectedOrdonnance?.id === id) {
      return selectedOrdonnance;
    }

    setLoading(prev => ({ ...prev, ordonnanceDetail: true }));
    
    try {
      const result = await ordonnanceService.getOrdonnance(id);

      if (result.success) {
        const ordonnanceFormatted = ordonnanceService.formatOrdonnanceForDisplay(result.data);
        setSelectedOrdonnance(ordonnanceFormatted);
        setErrors(prev => ({ ...prev, ordonnanceDetail: null }));
        
        console.log('✅ Détails ordonnance chargés:', id);
        return ordonnanceFormatted;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, ordonnanceDetail: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, ordonnanceDetail: false }));
    }
  };

  /**
   * Créer une nouvelle ordonnance
   */
  const createOrdonnance = async (formData) => {
    setLoading(prev => ({ ...prev, ordonnances: true }));
    
    try {
      const ordonnanceData = ordonnanceService.prepareOrdonnanceData(formData);
      const result = await ordonnanceService.createOrdonnance(ordonnanceData);

      if (result.success) {
        // Invalider le cache
        setCache(prev => ({ 
          ...prev, 
          ordonnancesSearches: new Map() 
        }));
        
        // Optionnel : ajouter à la liste en cours
        if (ordonnances.length > 0) {
          const newOrdonnance = ordonnanceService.formatOrdonnanceForDisplay(result.data);
          setOrdonnances(prev => [newOrdonnance, ...prev.slice(0, 19)]); // Garder max 20
        }
        
        setErrors(prev => ({ ...prev, ordonnances: null }));
        console.log('✅ Ordonnance créée:', result.data.id);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(prev => ({ ...prev, ordonnanceValidation: error.errors }));
      } else if (error instanceof RedirectError) {
        setErrors(prev => ({ ...prev, ordonnances: error.message }));
      } else {
        setErrors(prev => ({ ...prev, ordonnances: error.message }));
      }
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, ordonnances: false }));
    }
  };

  /**
   * Modifier une ordonnance existante
   */
  const updateOrdonnance = async (id, formData) => {
    setLoading(prev => ({ ...prev, ordonnances: true }));
    
    try {
      const ordonnanceData = ordonnanceService.prepareOrdonnanceData(formData);
      const result = await ordonnanceService.updateOrdonnance(id, ordonnanceData);

      if (result.success) {
        // Invalider le cache
        setCache(prev => ({ 
          ...prev, 
          ordonnancesSearches: new Map() 
        }));
        
        // Mettre à jour l'ordonnance sélectionnée
        if (selectedOrdonnance?.id === id) {
          const updatedOrdonnance = ordonnanceService.formatOrdonnanceForDisplay(result.data);
          setSelectedOrdonnance(updatedOrdonnance);
        }
        
        // Mettre à jour dans la liste
        setOrdonnances(prev => prev.map(ord => 
          ord.id === id 
            ? ordonnanceService.formatOrdonnanceForDisplay(result.data)
            : ord
        ));
        
        setErrors(prev => ({ ...prev, ordonnances: null }));
        console.log('✅ Ordonnance modifiée:', id);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors(prev => ({ ...prev, ordonnanceValidation: error.errors }));
      } else {
        setErrors(prev => ({ ...prev, ordonnances: error.message }));
      }
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, ordonnances: false }));
    }
  };

  /**
   * Supprimer une ordonnance
   */
  const deleteOrdonnance = async (id) => {
    setLoading(prev => ({ ...prev, ordonnances: true }));
    
    try {
      const result = await ordonnanceService.deleteOrdonnance(id);

      if (result.success) {
        // Invalider le cache
        setCache(prev => ({ 
          ...prev, 
          ordonnancesSearches: new Map() 
        }));
        
        // Retirer de la liste
        setOrdonnances(prev => prev.filter(ord => ord.id !== id));
        
        // Nettoyer l'ordonnance sélectionnée si c'est celle supprimée
        if (selectedOrdonnance?.id === id) {
          setSelectedOrdonnance(null);
        }
        
        setErrors(prev => ({ ...prev, ordonnances: null }));
        console.log('✅ Ordonnance supprimée:', id);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, ordonnances: error.message }));
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, ordonnances: false }));
    }
  };

  /**
   * Rechercher des tickets avec cache
   */
  const searchTickets = async (query, limit = 10) => {
    if (!query || query.length < 2) {
      setTickets([]);
      return { success: true, tickets: [] };
    }

    const cacheKey = `${query.trim()}-${limit}`;
    
    // Vérifier le cache
    if (cache.ticketSearches.has(cacheKey)) {
      const cachedTickets = cache.ticketSearches.get(cacheKey);
      setTickets(cachedTickets);
      return { success: true, tickets: cachedTickets };
    }

    setLoading(prev => ({ ...prev, tickets: true }));
    
    try {
      const result = await ordonnanceService.searchTickets(query.trim(), limit);

      if (result.success) {
        setTickets(result.tickets);
        
        // Mettre en cache
        const newCache = new Map(cache.ticketSearches);
        if (newCache.size >= 20) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        newCache.set(cacheKey, result.tickets);
        
        setCache(prev => ({ 
          ...prev, 
          ticketSearches: newCache,
          lastTicketSearch: query.trim()
        }));
        
        setErrors(prev => ({ ...prev, tickets: null }));
        console.log('💾 Tickets mis en cache:', cacheKey);
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error instanceof RedirectError) {
        setErrors(prev => ({ ...prev, tickets: error.message }));
      } else {
        setErrors(prev => ({ ...prev, tickets: error.message }));
      }
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, tickets: false }));
    }
  };

  /**
   * Récupérer les médicaments d'un ticket
   */
  const getMedicamentsFromTicket = async (codeTicket) => {
    setLoading(prev => ({ ...prev, tickets: true }));
    
    try {
      const result = await ordonnanceService.getMedicamentsFromTicket(codeTicket);

      if (result.success) {
        setErrors(prev => ({ ...prev, tickets: null }));
        console.log('✅ Médicaments récupérés pour ticket:', codeTicket);
        
        // Préparer les médicaments pour le formulaire
        const medicamentsForForm = ordonnanceService.prepareMedicamentsFromTicket(
          result.medicaments, 
          codeTicket
        );
        
        return {
          ...result,
          medicamentsForForm
        };
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error instanceof RedirectError) {
        setErrors(prev => ({ ...prev, tickets: error.message }));
      } else {
        setErrors(prev => ({ ...prev, tickets: error.message }));
      }
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, tickets: false }));
    }
  };

  /**
   * Charger les statistiques des ordonnances
   */
  const loadOrdonnancesStats = async (forceReload = false) => {
    if (ordonnancesStats && !forceReload) return ordonnancesStats;

    setLoading(prev => ({ ...prev, stats: true }));
    
    try {
      const result = await ordonnanceService.getStats();

      if (result.success) {
        setOrdonnancesStats(result.data);
        setErrors(prev => ({ ...prev, stats: null }));
        console.log('✅ Statistiques chargées');
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      if (error instanceof RedirectError) {
        setErrors(prev => ({ ...prev, stats: error.message }));
      } else {
        setErrors(prev => ({ ...prev, stats: error.message }));
      }
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // ===============================================
  // CRUD MÉDICAMENTS (INCHANGÉS)
  // ===============================================
  
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

  // ===============================================
  // CRUD MÉDECINS (INCHANGÉS)
  // ===============================================

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

  // ===============================================
  // FONCTIONS UTILITAIRES ÉTENDUES
  // ===============================================

  const clearCache = () => {
    setCache({
      articlesSearches: new Map(),
      ordonnancesSearches: new Map(),
      ticketSearches: new Map(),
      lastOrdonnanceSearch: '',
      lastTicketSearch: '',
      lastSearch: '',
      lastFamily: ''
    });
    console.log('🗑️ Tout le cache vidé');
  };

  const clearOrdonnancesCache = () => {
    setCache(prev => ({ 
      ...prev, 
      ordonnancesSearches: new Map(),
      lastOrdonnanceSearch: ''
    }));
    console.log('🗑️ Cache ordonnances vidé');
  };

  const refreshConnection = async () => {
    await testConnection();
  };

  const refreshAllData = async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    clearCache();
    
    await Promise.allSettled([
      loadFamilies(),
      loadMedicaments(true),
      loadMedecins(true)
    ]);
    
    setLoading(prev => ({ ...prev, initial: false }));
  };

  // ===============================================
  // VALEUR DU CONTEXTE ÉTENDUE
  // ===============================================
  const contextValue = {
    // Données existantes
    articles,
    families,
    medicaments,
    medecins,
    
    // Nouvelles données ordonnances
    ordonnances,
    selectedOrdonnance,
    ordonnancesStats,
    tickets,
    
    // États étendus
    loading,
    errors,
    connectionStatus,
    connectionInfo,
    
    // Fonctions de recherche existantes
    searchArticles,
    
    // Nouvelles fonctions ordonnances
    loadOrdonnances,
    loadOrdonnanceDetail,
    createOrdonnance,
    updateOrdonnance,
    deleteOrdonnance,
    searchTickets,
    getMedicamentsFromTicket,
    loadOrdonnancesStats,
    
    // Fonctions CRUD existantes
    addMedicament,
    updateMedicament,
    deleteMedicament,
    addMedecin,
    updateMedecin,
    deleteMedecin,
    
    // Fonctions utilitaires étendues
    testConnection: refreshConnection,
    loadFamilies,
    loadMedicaments,
    loadMedecins,
    clearCache,
    clearOrdonnancesCache,
    refreshAllData,
    
    // Utilitaires ordonnances
    setSelectedOrdonnance,
    setOrdonnances,
    
    // Cache info étendue
    cacheSize: cache.articlesSearches.size + cache.ordonnancesSearches.size + cache.ticketSearches.size,
    ordonnancesCacheSize: cache.ordonnancesSearches.size,
    ticketsCacheSize: cache.ticketSearches.size
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};
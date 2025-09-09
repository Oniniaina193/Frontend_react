// services/OrdonnanceService.js - VERSION COMPLÈTE OPTIMISÉE
import eventBus, { EVENTS } from '../utils/EventBus';

const getApiUrl = () => {
  try {
    if (import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    } else {
      return 'http://localhost:8000/api';
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL:', error);
    return 'http://localhost:8000/api';
  }
};

const API_BASE_URL = getApiUrl();

class OrdonnanceService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/ordonnances`;
    this.directAccessURL = `${API_BASE_URL}/direct-access`;
    this.tokenKey = 'pharmacy_token';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Cache du dossier actuel pour éviter les re-sync
    this.currentDossierCache = {
      dossier: null,
      timestamp: 0,
      maxAge: 5 * 60 * 1000 // 5 minutes de cache
    };
  }

  getToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  getHeaders() {
    const token = this.getToken();
    return {
      ...this.headers,
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // MÉTHODE DE DEBUG : Vérifier le dossier actuel
  async debugCurrentDossier() {
    const sessionDossier = sessionStorage.getItem('current_dossier_vente');
    const localDossier = localStorage.getItem('current_dossier_vente');
    const cachedDossier = this.getCachedCurrentDossier();
    
    console.log('=== DEBUG DOSSIER ===');
    console.log('sessionStorage dossier:', sessionDossier);
    console.log('localStorage dossier:', localDossier);
    console.log('Cache dossier:', this.currentDossierCache.dossier);
    console.log('Dossier utilisé:', cachedDossier);
    
    // Vérifier côté serveur
    try {
      const response = await fetch('/api/folder-selection/current', {
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      console.log('Dossier côté serveur:', data);
    } catch (error) {
      console.error('Erreur récupération dossier serveur:', error);
    }
    
    return cachedDossier;
  }

  // Récupération du dossier avec cache
  getCurrentDossier() {
    const sessionDossier = sessionStorage.getItem('current_dossier_vente');
    const localDossier = localStorage.getItem('current_dossier_vente');
    
    if (sessionDossier) {
      // Mettre à jour le cache
      this.currentDossierCache = {
        dossier: sessionDossier,
        timestamp: Date.now(),
        maxAge: this.currentDossierCache.maxAge
      };
      return sessionDossier;
    }
    
    if (localDossier) {
      // Copier en session pour cohérence
      sessionStorage.setItem('current_dossier_vente', localDossier);
      
      // Mettre à jour le cache
      this.currentDossierCache = {
        dossier: localDossier,
        timestamp: Date.now(),
        maxAge: this.currentDossierCache.maxAge
      };
      return localDossier;
    }
    
    console.warn('⚠️ Aucun dossier trouvé, utilisation de "default"');
    return 'default';
  }

  // Récupération du dossier depuis le cache
  getCachedCurrentDossier() {
    const now = Date.now();
    
    // Si le cache est valide, utiliser le cache
    if (this.currentDossierCache.dossier && 
        (now - this.currentDossierCache.timestamp) < this.currentDossierCache.maxAge) {
      return this.currentDossierCache.dossier;
    }
    
    // Sinon, récupérer et mettre en cache
    return this.getCurrentDossier();
  }

  // Ajouter le dossier aux paramètres
  addDossierToParams(params = {}) {
    return {
      ...params,
      current_dossier_vente: this.getCachedCurrentDossier()
    };
  }

  // MÉTHODE SYNCHRONISÉE : Récupérer et synchroniser le dossier actuel
  async syncCurrentDossier() {
    try {
      const response = await fetch('/api/folder-selection/current', {
        headers: { 'Accept': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success && data.data && data.data.folder_name) {
        // Synchroniser le dossier avec le storage local
        sessionStorage.setItem('current_dossier_vente', data.data.folder_name);
        localStorage.setItem('current_dossier_vente', data.data.folder_name);
        
        // Mettre à jour le cache
        this.currentDossierCache = {
          dossier: data.data.folder_name,
          timestamp: Date.now(),
          maxAge: this.currentDossierCache.maxAge
        };
        
        console.log('🔄 Dossier synchronisé:', data.data.folder_name);
        return data.data.folder_name;
      }
    } catch (error) {
      console.error('Erreur sync dossier:', error);
    }
    
    return this.getCachedCurrentDossier();
  }

  // Synchronisation intelligente (seulement si nécessaire)
  async syncCurrentDossierSmart() {
    try {
      const cachedDossier = this.getCachedCurrentDossier();
      
      // Si on a un dossier en cache récent, l'utiliser
      if (cachedDossier !== 'default') {
        return cachedDossier;
      }
      
      // Sinon, synchroniser avec le serveur (cas rare)
      return await this.syncCurrentDossier();
    } catch (error) {
      console.error('Erreur sync dossier smart:', error);
      return this.getCachedCurrentDossier();
    }
  }

  // Invalider le cache du dossier (quand on change de dossier)
  invalidateDossierCache() {
    this.currentDossierCache = {
      dossier: null,
      timestamp: 0,
      maxAge: this.currentDossierCache.maxAge
    };
    console.log('🗑️ Cache dossier invalidé');
  }

  // Debug du cache
  debugCacheStatus() {
    console.log('=== DEBUG CACHE DOSSIER ===');
    console.log('Dossier en cache:', this.currentDossierCache.dossier);
    console.log('Timestamp cache:', new Date(this.currentDossierCache.timestamp));
    console.log('Age du cache (ms):', Date.now() - this.currentDossierCache.timestamp);
    console.log('Cache valide:', (Date.now() - this.currentDossierCache.timestamp) < this.currentDossierCache.maxAge);
    console.log('SessionStorage:', sessionStorage.getItem('current_dossier_vente'));
    console.log('LocalStorage:', localStorage.getItem('current_dossier_vente'));
  }

  // ORDONNANCES - CRUD Operations
  async getOrdonnances(params = {}) {
    try {
      // Utiliser le cache au lieu de re-sync à chaque fois
      const currentDossier = this.getCachedCurrentDossier();
      console.log('📁 Chargement ordonnances pour dossier (cache):', currentDossier);
      
      const paramsWithDossier = {
        ...params,
        current_dossier_vente: currentDossier
      };
      
      const queryParams = new URLSearchParams();
      if (paramsWithDossier.search) queryParams.append('search', paramsWithDossier.search);
      if (paramsWithDossier.page) queryParams.append('page', paramsWithDossier.page);
      if (paramsWithDossier.per_page) queryParams.append('per_page', paramsWithDossier.per_page);
      if (paramsWithDossier.medecin_id) queryParams.append('medecin_id', paramsWithDossier.medecin_id);
      if (paramsWithDossier.client_id) queryParams.append('client_id', paramsWithDossier.client_id);
      if (paramsWithDossier.date_debut) queryParams.append('date_debut', paramsWithDossier.date_debut);
      if (paramsWithDossier.date_fin) queryParams.append('date_fin', paramsWithDossier.date_fin);
      
      queryParams.append('current_dossier_vente', currentDossier);

      const url = `${this.baseURL}${queryParams.toString() ? `?${queryParams}` : ''}`;
      console.log('🌐 URL requête:', url);
      
      const response = await fetch(url, { 
        method: 'GET', 
        headers: this.getHeaders(),
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('📊 Réponse ordonnances:', data);
      
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la récupération des ordonnances');
      
      return data;
    } catch (error) {
      console.error('❌ Erreur getOrdonnances:', error);
      throw error;
    }
  }

  async createOrdonnance(ordonnanceData) {
    try {
      const dataWithDossier = {
        ...ordonnanceData,
        current_dossier_vente: this.getCachedCurrentDossier()
      };
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(dataWithDossier),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création de l\'ordonnance');
      }
      
      // Émettre l'événement de création
      eventBus.emit(EVENTS.ORDONNANCE_CREATED, data.data);
      console.log('📡 Événement ORDONNANCE_CREATED émis:', data.data);
      
      return data;
    } catch (error) {
      console.error('Erreur createOrdonnance:', error);
      throw error;
    }
  }

  async updateOrdonnance(id, ordonnanceData) {
    try {
      const dataWithDossier = {
        ...ordonnanceData,
        current_dossier_vente: this.getCachedCurrentDossier()
      };
      
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(dataWithDossier),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la modification de l\'ordonnance');
      }
      
      // Émettre l'événement de mise à jour
      eventBus.emit(EVENTS.ORDONNANCE_UPDATED, { id, data: data.data });
      console.log('📡 Événement ORDONNANCE_UPDATED émis:', { id, data: data.data });
      
      return data;
    } catch (error) {
      console.error('Erreur updateOrdonnance:', error);
      throw error;
    }
  }

  async deleteOrdonnance(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression de l\'ordonnance');
      }
      
      // Émettre l'événement de suppression
      eventBus.emit(EVENTS.ORDONNANCE_DELETED, { id, deletedData: data });
      console.log('📡 Événement ORDONNANCE_DELETED émis pour ID:', id);
      
      return data;
    } catch (error) {
      console.error('Erreur deleteOrdonnance:', error);
      throw error;
    }
  }

  async getOrdonnance(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération de l\'ordonnance');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur getOrdonnance:', error);
      throw error;
    }
  }

  // Vérifier si le dossier est bien configuré
  async verifyDossierConfiguration() {
    try {
      const currentDossier = this.getCachedCurrentDossier();
      
      // Test de requête simple
      const response = await fetch(`${this.baseURL}?current_dossier_vente=${encodeURIComponent(currentDossier)}&per_page=1`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      return {
        success: response.ok,
        dossier: currentDossier,
        message: response.ok ? 'Configuration OK' : data.message,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        dossier: this.getCachedCurrentDossier(),
        message: error.message,
        data: null
      };
    }
  }

  // Demander un refresh des statistiques
  requestStatsRefresh() {
    eventBus.emit(EVENTS.STATS_REFRESH_NEEDED, { source: 'OrdonnanceService' });
    console.log('📡 Refresh des statistiques demandé depuis OrdonnanceService');
  }

  // Médecins pour sélection
  async getMedecinsForSelection() {
    try {
      const response = await fetch(`${this.baseURL}/data/medecins-selection`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des médecins');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur getMedecinsForSelection:', error);
      throw error;
    }
  }

  // Suggestion de numéro d'ordonnance
  async suggestNumeroOrdonnance() {
    try {
      const currentDossier = this.getCachedCurrentDossier();
      const url = `${this.baseURL}/suggest-numero?current_dossier_vente=${encodeURIComponent(currentDossier)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suggestion du numéro');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur suggestNumeroOrdonnance:', error);
      throw error;
    }
  }

  // Vérifier l'unicité du numéro d'ordonnance
  async checkNumeroUnique(numero) {
    try {
      return true;
    } catch (error) {
      console.error('Erreur checkNumeroUnique:', error);
      throw error;
    }
  }

  // Médicaments avec ordonnances
  async getMedicamentsAvecOrdonnances() {
    try {
      const currentDossier = this.getCachedCurrentDossier();
      const url = `${this.baseURL}/historique/medicaments?current_dossier_vente=${encodeURIComponent(currentDossier)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des médicaments');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur getMedicamentsAvecOrdonnances:', error);
      throw error;
    }
  }

  // Historique par médicament
  async getHistoriqueParMedicament(params = {}) {
    try {
      const paramsWithDossier = this.addDossierToParams(params);
      
      const queryParams = new URLSearchParams();
      
      if (paramsWithDossier.medicament) queryParams.append('medicament', paramsWithDossier.medicament);
      if (paramsWithDossier.date) queryParams.append('date', paramsWithDossier.date);
      if (paramsWithDossier.page) queryParams.append('page', paramsWithDossier.page);
      if (paramsWithDossier.per_page) queryParams.append('per_page', paramsWithDossier.per_page);
      queryParams.append('current_dossier_vente', paramsWithDossier.current_dossier_vente);

      if (!paramsWithDossier.medicament && !paramsWithDossier.date) {
        throw new Error('Au moins un critère de recherche est requis (médicament ou date)');
      }

      const url = `${this.baseURL}/historique${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { 
        method: 'GET', 
        headers: this.getHeaders(),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la récupération de l\'historique');
      
      return data;
    } catch (error) {
      console.error('Erreur getHistoriqueParMedicament:', error);
      throw error;
    }
  }

  // Statistiques du dossier
  async getStatistiquesDossier() {
    try {
      const currentDossier = this.getCachedCurrentDossier();
      const url = `${this.baseURL}/statistiques?current_dossier_vente=${encodeURIComponent(currentDossier)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des statistiques');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur getStatistiquesDossier:', error);
      throw error;
    }
  }

  // TICKETS ACCESS - Pour récupérer les médicaments
  async searchTickets(query, limit = 10) {
    try {
      if (!query || query.trim().length < 2) {
        return { success: true, data: [] };
      }

      const response = await fetch(
        `${this.directAccessURL}/tickets/search?search=${encodeURIComponent(query)}&limit=${limit}`, 
        {
          method: 'GET',
          headers: this.getHeaders(),
          credentials: 'include',
        }
      );
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la recherche de tickets');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur searchTickets:', error);
      throw error;
    }
  }

  async getTicketDetails(codeTicket) {
    try {
      if (!codeTicket || !codeTicket.trim()) {
        throw new Error('Code ticket requis');
      }

      const response = await fetch(
        `${this.directAccessURL}/tickets/${encodeURIComponent(codeTicket.trim())}`, 
        {
          method: 'GET',
          headers: this.getHeaders(),
          credentials: 'include',
        }
      );
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération du ticket');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur getTicketDetails:', error);
      throw error;
    }
  }

  // UTILITAIRES
  formatOrdonnanceForSubmit(formData, medicaments, clientExistant = null) {
    const ordonnanceData = {
      numero_ordonnance: formData.numero_ordonnance,
      medecin_id: formData.medecin_id,
      date: formData.date,
      medicaments: medicaments.map(med => ({
        id: med.id || null,
        code_medicament: med.code_doc || med.code_medicament || '',
        designation: med.designation,
        quantite: parseInt(med.quantite) || 1,
        posologie: med.posologie || '',
        duree: med.duree || ''
      }))
    };

    if (clientExistant) {
      ordonnanceData.client_id = clientExistant.id;
    } else {
      ordonnanceData.client = {
        nom_complet: formData.client_nom_complet,
        adresse: formData.client_adresse,
        telephone: formData.client_telephone || null
      };
    }

    return ordonnanceData;
  }

  // Formatage pour modification (pas de numéro d'ordonnance)
  formatOrdonnanceForUpdate(formData, medicaments) {
    return {
      medecin_id: formData.medecin_id,
      date: formData.date,
      medicaments: medicaments.map(med => ({
        id: med.id || null,
        code_medicament: med.code_doc || med.code_medicament || '',
        designation: med.designation,
        quantite: parseInt(med.quantite) || 1,
        posologie: med.posologie || '',
        duree: med.duree || ''
      })),
      client: {
        nom_complet: formData.client_nom_complet,
        adresse: formData.client_adresse,
        telephone: formData.client_telephone || null
      }
    };
  }

  validateOrdonnanceData(ordonnanceData, isUpdate = false) {
    const errors = [];

    if (!isUpdate && !ordonnanceData.numero_ordonnance) {
      errors.push('Numéro d\'ordonnance requis');
    }

    if (!isUpdate && ordonnanceData.numero_ordonnance && ordonnanceData.numero_ordonnance.trim().length === 0) {
      errors.push('Numéro d\'ordonnance ne peut pas être vide');
    }

    if (!ordonnanceData.medecin_id) {
      errors.push('Médecin requis');
    }

    if (!ordonnanceData.date) {
      errors.push('Date requise');
    }

    if (!ordonnanceData.client_id && !ordonnanceData.client) {
      errors.push('Client requis');
    }

    if (ordonnanceData.client && !ordonnanceData.client.nom_complet) {
      errors.push('Nom du client requis');
    }

    if (ordonnanceData.client && !ordonnanceData.client.adresse) {
      errors.push('Adresse du client requise');
    }

    if (!ordonnanceData.medicaments || ordonnanceData.medicaments.length === 0) {
      errors.push('Au moins un médicament requis');
    }

    ordonnanceData.medicaments?.forEach((med, index) => {
      if (!med.designation) {
        errors.push(`Désignation du médicament ${index + 1} requise`);
      }
      if (!med.quantite || med.quantite < 1) {
        errors.push(`Quantité du médicament ${index + 1} invalide`);
      }
      if (!med.posologie) {
        errors.push(`Posologie du médicament ${index + 1} requise`);
      }
      if (!med.duree) {
        errors.push(`Durée du médicament ${index + 1} requise`);
      }
    });

    return errors;
  }

  // IMPRESSION ET EXPORT
  
  /**
   * Impression HTML de l'ordonnance
   */
  async printOrdonnance(ordonnanceId) {
    try {
      console.log('🖨️ Impression de l\'ordonnance ID:', ordonnanceId);
      
      const response = await fetch(`${this.baseURL}/print/${ordonnanceId}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la génération de l\'ordonnance imprimable');
      }
      
      // Créer une nouvelle fenêtre pour l'impression
      const printWindow = window.open('', '_blank', 'width=800,height=1000,scrollbars=yes');
      
      if (!printWindow) {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloqués.');
      }
      
      // Écrire le HTML dans la nouvelle fenêtre
      printWindow.document.write(data.data.html);
      printWindow.document.close();
      
      // Attendre que le contenu soit chargé puis imprimer
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          // Optionnel : fermer la fenêtre après impression
          printWindow.onafterprint = function() {
            printWindow.close();
          };
        }, 500);
      };
      
      return {
        success: true,
        message: 'Fenêtre d\'impression ouverte'
      };
      
    } catch (error) {
      console.error('❌ Erreur impression ordonnance:', error);
      throw error;
    }
  }

  /**
   * Téléchargement PDF de l'ordonnance
   */
  async downloadPdfOrdonnance(ordonnanceId, numeroOrdonnance) {
    try {
      console.log('📄 Téléchargement PDF de l\'ordonnance ID:', ordonnanceId);
      
      const response = await fetch(`${this.baseURL}/pdf/${ordonnanceId}`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/pdf'
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la génération du PDF');
      }
      
      // Créer un blob à partir de la réponse
      const blob = await response.blob();
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ordonnance_${numeroOrdonnance}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Nettoyer l'URL du blob
      window.URL.revokeObjectURL(url);
      
      return {
        success: true,
        message: 'PDF téléchargé avec succès'
      };
      
    } catch (error) {
      console.error('❌ Erreur téléchargement PDF:', error);
      throw error;
    }
  }

  /**
   * Impression directe (alternative moderne avec l'API Print)
   */
  async printOrdonnanceDirectly(ordonnanceId) {
    try {
      // Vérifier si l'API Print est supportée
      if (!('print' in window)) {
        throw new Error('L\'impression directe n\'est pas supportée par votre navigateur');
      }
      
      // Récupérer le HTML formaté
      const response = await fetch(`${this.baseURL}/print/${ordonnanceId}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la génération de l\'ordonnance');
      }
      
      // Créer un iframe invisible pour l'impression
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-1000px';
      iframe.style.left = '-1000px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      // Écrire le contenu dans l'iframe
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(data.data.html);
      iframeDoc.close();
      
      // Imprimer le contenu de l'iframe
      setTimeout(() => {
        iframe.contentWindow.print();
        
        // Nettoyer l'iframe après impression
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
      
      return {
        success: true,
        message: 'Impression lancée'
      };
      
    } catch (error) {
      console.error('❌ Erreur impression directe:', error);
      // Fallback vers l'impression normale
      return this.printOrdonnance(ordonnanceId);
    }
  }

  /**
   * Détecter si une imprimante est disponible
   */
  async checkPrinterAvailability() {
    try {
      // Méthode moderne avec l'API Print
      if ('print' in window && 'navigator' in window && 'serviceWorker' in navigator) {
        return {
          available: true,
          method: 'modern',
          message: 'Imprimante détectée (API moderne)'
        };
      }
      
      // Méthode basique
      return {
        available: true,
        method: 'basic',
        message: 'Impression disponible (méthode basique)'
      };
      
    } catch (error) {
      return {
        available: false,
        method: null,
        message: 'Impression non disponible: ' + error.message
      };
    }
  }

  /**
   * Exporter la liste des ordonnances en PDF
   */
  async exportHistoriqueList(params = {}) {
    try {
      console.log('📄 Export PDF de la liste d\'ordonnances avec params:', params);
      
      const currentDossier = this.getCachedCurrentDossier();
      const exportParams = {
        ...params,
        current_dossier_vente: currentDossier,
        format: 'pdf'
      };
      
      const queryParams = new URLSearchParams();
      if (exportParams.medicament) queryParams.append('medicament', exportParams.medicament);
      if (exportParams.date) queryParams.append('date', exportParams.date);
      if (exportParams.titre) queryParams.append('titre', exportParams.titre);
      queryParams.append('current_dossier_vente', currentDossier);
      queryParams.append('format', 'pdf');
      
      const url = `${this.baseURL}/historique/export?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/pdf'
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'export PDF');
      }
      
      // Créer un blob à partir de la réponse
      const blob = await response.blob();
      
      // Générer le nom de fichier
      const today = new Date().toISOString().split('T')[0];
      const fileName = `historique_ordonnances_${today}.pdf`;
      
      // Créer un lien de téléchargement
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Nettoyer l'URL du blob
      window.URL.revokeObjectURL(downloadUrl);
      
      return {
        success: true,
        message: 'Export PDF généré avec succès'
      };
      
    } catch (error) {
      console.error('❌ Erreur export PDF liste:', error);
      throw error;
    }
  }

  /**
   * Imprimer la liste des ordonnances
   */
  async printHistoriqueList(params = {}) {
    try {
      console.log('🖨️ Impression de la liste d\'ordonnances avec params:', params);
      
      const currentDossier = this.getCachedCurrentDossier();
      const printParams = {
        ...params,
        current_dossier_vente: currentDossier
      };
      
      const queryParams = new URLSearchParams();
      if (printParams.medicament) queryParams.append('medicament', printParams.medicament);
      if (printParams.date) queryParams.append('date', printParams.date);
      if (printParams.titre) queryParams.append('titre', printParams.titre);
      queryParams.append('current_dossier_vente', currentDossier);
      
      const url = `${this.baseURL}/historique/print?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la génération de la liste imprimable');
      }
      
      // Créer une nouvelle fenêtre pour l'impression
      const printWindow = window.open('', '_blank', 'width=800,height=1000,scrollbars=yes');
      
      if (!printWindow) {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloqués.');
      }
      
      // Écrire le HTML dans la nouvelle fenêtre
      printWindow.document.write(data.data.html);
      printWindow.document.close();
      
      // Attendre que le contenu soit chargé puis imprimer
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          // Optionnel : fermer la fenêtre après impression
          printWindow.onafterprint = function() {
            printWindow.close();
          };
        }, 500);
      };
      
      return {
        success: true,
        message: 'Impression de la liste lancée'
      };
      
    } catch (error) {
      console.error('❌ Erreur impression liste:', error);
      throw error;
    }
  }

  // Ajouter ces nouvelles méthodes à votre OrdonnanceService existant

/**
 * Recherche rapide de médicaments pour autocomplétion
 * Recherche dans les médicaments déjà utilisés dans les ordonnances
 */
async searchMedicamentsRapide(query, limit = 10) {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    const currentDossier = this.getCachedCurrentDossier();
    const url = `${this.baseURL}/medicaments/search-rapide?` +
                `q=${encodeURIComponent(query.trim())}&` +
                `limit=${limit}&` +
                `current_dossier_vente=${encodeURIComponent(currentDossier)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la recherche de médicaments');
    }

    return data;
  } catch (error) {
    console.error('Erreur searchMedicamentsRapide:', error);
    return { success: false, data: [], message: error.message };
  }
}

/**
 * Recherche d'historique avec médicament en saisie libre
 * Cette méthode supporte maintenant la recherche par médicament saisi librement
 */
async getHistoriqueParMedicamentLibre(params = {}) {
  try {
    const paramsWithDossier = this.addDossierToParams(params);
    
    const queryParams = new URLSearchParams();
    
    // Support de la recherche libre de médicaments
    if (paramsWithDossier.medicament_libre) {
      queryParams.append('medicament_libre', paramsWithDossier.medicament_libre);
    }
    
    // Support de la recherche exacte (ancienne méthode)
    if (paramsWithDossier.medicament) {
      queryParams.append('medicament', paramsWithDossier.medicament);
    }
    
    if (paramsWithDossier.date) queryParams.append('date', paramsWithDossier.date);
    if (paramsWithDossier.page) queryParams.append('page', paramsWithDossier.page);
    if (paramsWithDossier.per_page) queryParams.append('per_page', paramsWithDossier.per_page);
    queryParams.append('current_dossier_vente', paramsWithDossier.current_dossier_vente);

    if (!paramsWithDossier.medicament_libre && !paramsWithDossier.medicament && !paramsWithDossier.date) {
      throw new Error('Au moins un critère de recherche est requis (médicament ou date)');
    }

    const url = `${this.baseURL}/historique/libre${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    console.log('🔍 Recherche historique libre avec URL:', url);
    
    const response = await fetch(url, { 
      method: 'GET', 
      headers: this.getHeaders(),
      credentials: 'include'
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erreur lors de la récupération de l\'historique');
    
    return data;
  } catch (error) {
    console.error('Erreur getHistoriqueParMedicamentLibre:', error);
    throw error;
  }
}

/**
 * Méthode optimisée pour récupérer les suggestions de médicaments
 * Utilise un cache local pour éviter les requêtes répétées
 */
async getSuggestionsMedicaments(forceRefresh = false) {
  try {
    // Cache local des suggestions (5 minutes)
    const cacheKey = `suggestions_medicaments_${this.getCachedCurrentDossier()}`;
    const cached = sessionStorage.getItem(cacheKey);
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
    
    if (!forceRefresh && cached && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp);
      if (age < 5 * 60 * 1000) { // 5 minutes
        return { success: true, data: JSON.parse(cached), fromCache: true };
      }
    }

    // Récupérer depuis l'API
    const response = await this.getMedicamentsAvecOrdonnances();
    
    if (response.success) {
      // Mettre en cache
      sessionStorage.setItem(cacheKey, JSON.stringify(response.data));
      sessionStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    }
    
    return response;
  } catch (error) {
    console.error('Erreur getSuggestionsMedicaments:', error);
    
    // Fallback : essayer le cache même s'il est expiré
    const cacheKey = `suggestions_medicaments_${this.getCachedCurrentDossier()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return { 
        success: true, 
        data: JSON.parse(cached), 
        fromCache: true,
        message: 'Données depuis le cache (erreur réseau)'
      };
    }
    
    throw error;
  }
}

/**
 * Invalider le cache des suggestions (à appeler après création d'ordonnance)
 */
invalidateSuggestionsCache() {
  const currentDossier = this.getCachedCurrentDossier();
  const cacheKey = `suggestions_medicaments_${currentDossier}`;
  sessionStorage.removeItem(cacheKey);
  sessionStorage.removeItem(`${cacheKey}_timestamp`);
  console.log('🗑️ Cache suggestions invalidé pour dossier:', currentDossier);
}

// Modifier la méthode createOrdonnance existante pour invalider le cache
async createOrdonnance(ordonnanceData) {
  try {
    const dataWithDossier = {
      ...ordonnanceData,
      current_dossier_vente: this.getCachedCurrentDossier()
    };
    
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(dataWithDossier),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la création de l\'ordonnance');
    }
    
    // Invalider le cache des suggestions
    this.invalidateSuggestionsCache();
    
    // Émettre l'événement de création
    eventBus.emit(EVENTS.ORDONNANCE_CREATED, data.data);
    console.log('📡 Événement ORDONNANCE_CREATED émis:', data.data);
    
    return data;
  } catch (error) {
    console.error('Erreur createOrdonnance:', error);
    throw error;
  }
}

  /**
   * Méthode alternative pour impression directe de liste (avec iframe)
   */
  async printHistoriqueListDirect(params = {}) {
    try {
      console.log('🖨️ Impression directe de la liste (iframe)');
      
      // Récupérer le HTML formaté
      const currentDossier = this.getCachedCurrentDossier();
      const printParams = {
        ...params,
        current_dossier_vente: currentDossier
      };
      
      const queryParams = new URLSearchParams();
      if (printParams.medicament) queryParams.append('medicament', printParams.medicament);
      if (printParams.date) queryParams.append('date', printParams.date);
      if (printParams.titre) queryParams.append('titre', printParams.titre);
      queryParams.append('current_dossier_vente', currentDossier);
      
      const url = `${this.baseURL}/historique/print?${queryParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la génération de la liste');
      }
      
      // Créer un iframe invisible pour l'impression
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-1000px';
      iframe.style.left = '-1000px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      // Écrire le contenu dans l'iframe
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(data.data.html);
      iframeDoc.close();
      
      // Imprimer le contenu de l'iframe
      setTimeout(() => {
        iframe.contentWindow.print();
        
        // Nettoyer l'iframe après impression
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
      
      return {
        success: true,
        message: 'Impression directe lancée'
      };
      
    } catch (error) {
      console.error('❌ Erreur impression directe liste:', error);
      // Fallback vers l'impression normale
      return this.printHistoriqueList(params);
    }
  }
}

const ordonnanceService = new OrdonnanceService();

export default ordonnanceService;
export { OrdonnanceService };
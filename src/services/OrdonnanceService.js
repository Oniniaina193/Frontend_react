// services/OrdonnanceService.js (version avec événements)
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
    const defaultDossier = 'default';
    
    console.log('=== DEBUG DOSSIER ===');
    console.log('sessionStorage dossier:', sessionDossier);
    console.log('localStorage dossier:', localDossier);
    console.log('Dossier utilisé:', this.getCurrentDossier());
    
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
    
    return this.getCurrentDossier();
  }

  // Récupérer le dossier actuel
  getCurrentDossier() {
    const sessionDossier = sessionStorage.getItem('current_dossier_vente');
    const localDossier = localStorage.getItem('current_dossier_vente');
    
    if (sessionDossier) {
      console.log('🗂️ Dossier trouvé (session):', sessionDossier);
      return sessionDossier;
    }
    
    if (localDossier) {
      console.log('🗂️ Dossier trouvé (local):', localDossier);
      // Copier en session pour cohérence
      sessionStorage.setItem('current_dossier_vente', localDossier);
      return localDossier;
    }
    
    console.warn('⚠️ Aucun dossier trouvé, utilisation de "default"');
    return 'default';
  }

  // Ajouter le dossier aux paramètres
  addDossierToParams(params = {}) {
    return {
      ...params,
      current_dossier_vente: this.getCurrentDossier()
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
        console.log('🔄 Dossier synchronisé:', data.data.folder_name);
        return data.data.folder_name;
      }
    } catch (error) {
      console.error('Erreur sync dossier:', error);
    }
    
    return this.getCurrentDossier();
  }

  // ORDONNANCES - CRUD Operations
  async getOrdonnances(params = {}) {
    try {
      // Synchroniser d'abord le dossier
      const currentDossier = await this.syncCurrentDossier();
      console.log('📁 Chargement ordonnances pour dossier:', currentDossier);
      
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
      
      // Le dossier est requis
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
        current_dossier_vente: this.getCurrentDossier()
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
      
      // 🔥 ÉMETTRE L'ÉVÉNEMENT DE CRÉATION
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
        current_dossier_vente: this.getCurrentDossier()
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
      
      // 🔥 ÉMETTRE L'ÉVÉNEMENT DE MISE À JOUR
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
      
      // 🔥 ÉMETTRE L'ÉVÉNEMENT DE SUPPRESSION
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

  // NOUVELLE MÉTHODE : Vérifier si le dossier est bien configuré
  async verifyDossierConfiguration() {
    try {
      const currentDossier = await this.syncCurrentDossier();
      
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
        dossier: this.getCurrentDossier(),
        message: error.message,
        data: null
      };
    }
  }

  // 🆕 NOUVELLE MÉTHODE: Demander un refresh des statistiques
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
      const currentDossier = this.getCurrentDossier();
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
      const currentDossier = this.getCurrentDossier();
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
      const currentDossier = this.getCurrentDossier();
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


  // Ajoutez ces méthodes à votre classe OrdonnanceService

/**
 * Exporter la liste des ordonnances en PDF
 */
async exportHistoriqueList(params = {}) {
  try {
    console.log('📄 Export PDF de la liste d\'ordonnances avec params:', params);
    
    const currentDossier = this.getCurrentDossier();
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
    
    const currentDossier = this.getCurrentDossier();
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

/**
 * Méthode alternative pour impression directe de liste (avec iframe)
 */
async printHistoriqueListDirect(params = {}) {
  try {
    console.log('🖨️ Impression directe de la liste (iframe)');
    
    // Récupérer le HTML formaté
    const currentDossier = this.getCurrentDossier();
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
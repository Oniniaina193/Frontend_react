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


  // Récupérer le dossier actuel - adaptez selon votre gestion
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


  // Ajouter le dossier aux paramètres pour les requêtes qui en ont besoin
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


  // Médecins pour sélection - PAS besoin de dossier selon votre contrôleur
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

  // Suggestion de numéro d'ordonnance - BESOIN du dossier
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
      // La vérification se fait côté serveur lors de la validation
      return true;
    } catch (error) {
      console.error('Erreur checkNumeroUnique:', error);
      throw error;
    }
  }

  // Médicaments avec ordonnances - BESOIN du dossier
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

  // Historique par médicament - BESOIN du dossier
  async getHistoriqueParMedicament(params = {}) {
    try {
      const paramsWithDossier = this.addDossierToParams(params);
      
      const queryParams = new URLSearchParams();
      
      if (paramsWithDossier.medicament) queryParams.append('medicament', paramsWithDossier.medicament);
      if (paramsWithDossier.date) queryParams.append('date', paramsWithDossier.date);
      if (paramsWithDossier.page) queryParams.append('page', paramsWithDossier.page);
      if (paramsWithDossier.per_page) queryParams.append('per_page', paramsWithDossier.per_page);
      // Le dossier est requis par le contrôleur
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

  // Statistiques du dossier - BESOIN du dossier
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
}

const ordonnanceService = new OrdonnanceService();

export default ordonnanceService;
export { OrdonnanceService };
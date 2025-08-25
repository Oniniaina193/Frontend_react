// services/ordonnanceService.js

const getApiUrl = () => {
  try {
    if (import.meta.env && import.meta.env.VITE_API_URL) {
      console.log('✅ Variable Vite trouvée:', import.meta.env.VITE_API_URL);
      return import.meta.env.VITE_API_URL;
    } else {
      console.warn('⚠️ Variable VITE_API_URL non trouvée, utilisation du fallback');
      return 'http://localhost:8000/api';
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'URL:', error);
    return 'http://localhost:8000/api';
  }
};

const API_BASE_URL = getApiUrl();
console.log('🔧 API_BASE_URL configurée pour OrdonnanceService:', API_BASE_URL);

class OrdonnanceService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/ordonnances`;
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
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    return {
      ...this.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken })
    };
  }

  // ===============================================
  // GESTION DES ORDONNANCES
  // ===============================================

  /**
   * Récupérer la liste des ordonnances avec pagination et recherche
   */
  async getOrdonnances(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Paramètres de pagination
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);
      
      // Paramètres de recherche
      if (params.search) queryParams.append('search', params.search);

      const url = `${this.baseURL}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        // Gestion spécifique des redirections (dossier non sélectionné)
        if (data.redirect) {
          throw new RedirectError(data.message, data.redirect);
        }
        throw new Error(data.message || 'Erreur lors de la récupération des ordonnances');
      }

      return {
        success: true,
        data: {
          ordonnances: data.data.ordonnances,
          pagination: data.data.pagination,
          dossier_info: data.data.dossier_info
        }
      };

    } catch (error) {
      console.error('Erreur getOrdonnances:', error);
      throw error;
    }
  }

  /**
   * Récupérer une ordonnance spécifique avec tous ses détails
   */
  async getOrdonnance(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Cette ordonnance n\'appartient pas au dossier courant');
        }
        throw new Error(data.message || 'Erreur lors de la récupération de l\'ordonnance');
      }

      return {
        success: true,
        data: data.data
      };

    } catch (error) {
      console.error('Erreur getOrdonnance:', error);
      throw error;
    }
  }

  /**
   * Créer une nouvelle ordonnance
   */
  async createOrdonnance(ordonnanceData) {
    try {
      // Validation côté client
      this.validateOrdonnanceData(ordonnanceData);

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(ordonnanceData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422) {
          throw new ValidationError('Données de validation incorrectes', data.errors);
        }
        if (response.status === 400) {
          throw new RedirectError(data.message, data.redirect);
        }
        throw new Error(data.message || 'Erreur lors de la création de l\'ordonnance');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Ordonnance créée avec succès'
      };

    } catch (error) {
      console.error('Erreur createOrdonnance:', error);
      throw error;
    }
  }

  /**
   * Modifier une ordonnance existante
   */
  async updateOrdonnance(id, ordonnanceData) {
    try {
      // Validation côté client
      this.validateOrdonnanceData(ordonnanceData);

      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(ordonnanceData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422) {
          throw new ValidationError('Données de validation incorrectes', data.errors);
        }
        if (response.status === 403) {
          throw new Error('Cette ordonnance n\'appartient pas au dossier courant');
        }
        throw new Error(data.message || 'Erreur lors de la modification de l\'ordonnance');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'Ordonnance modifiée avec succès'
      };

    } catch (error) {
      console.error('Erreur updateOrdonnance:', error);
      throw error;
    }
  }

  /**
   * Supprimer une ordonnance
   */
  async deleteOrdonnance(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Cette ordonnance n\'appartient pas au dossier courant');
        }
        if (response.status === 409) {
          throw new Error(data.message); // Contraintes métier
        }
        throw new Error(data.message || 'Erreur lors de la suppression de l\'ordonnance');
      }

      return {
        success: true,
        message: data.message || 'Ordonnance supprimée avec succès'
      };

    } catch (error) {
      console.error('Erreur deleteOrdonnance:', error);
      throw error;
    }
  }

  // ===============================================
  // GESTION DES TICKETS ET MÉDICAMENTS ACCESS
  // ===============================================

  /**
   * Rechercher des tickets par code partiel
   */
  async searchTickets(query, limit = 10) {
    try {
      if (!query || query.length < 2) {
        return { success: true, tickets: [] };
      }

      const queryParams = new URLSearchParams({
        q: query,
        limit: limit.toString()
      });

      const response = await fetch(`${this.baseURL}/search/tickets?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new RedirectError(data.message, data.redirect);
        }
        throw new Error(data.message || 'Erreur lors de la recherche de tickets');
      }

      return {
        success: true,
        tickets: data.tickets || []
      };

    } catch (error) {
      console.error('Erreur searchTickets:', error);
      throw error;
    }
  }

  /**
   * Récupérer les médicaments d'un ticket depuis Access
   */
  async getMedicamentsFromTicket(codeTicket) {
    try {
      if (!codeTicket) {
        throw new Error('Code ticket requis');
      }

      const response = await fetch(`${this.baseURL}/medicaments-ticket`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ code_ticket: codeTicket })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new RedirectError(data.message, data.redirect);
        }
        throw new Error(data.message || 'Erreur lors de la récupération des médicaments');
      }

      return {
        success: true,
        medicaments: data.medicaments || [],
        ticket_info: data.ticket_info,
        message: data.message
      };

    } catch (error) {
      console.error('Erreur getMedicamentsFromTicket:', error);
      throw error;
    }
  }

  // ===============================================
  // STATISTIQUES
  // ===============================================

  /**
   * Récupérer les statistiques des ordonnances
   */
  async getStats() {
    try {
      const response = await fetch(`${this.baseURL}/stats`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new RedirectError(data.message, data.redirect);
        }
        throw new Error(data.message || 'Erreur lors du calcul des statistiques');
      }

      return {
        success: true,
        data: data.data
      };

    } catch (error) {
      console.error('Erreur getStats:', error);
      throw error;
    }
  }

  // ===============================================
  // VALIDATION CÔTÉ CLIENT
  // ===============================================

  validateOrdonnanceData(data) {
    const errors = {};

    // Validation numéro ordonnance
    if (!data.numero_ordonnance?.trim()) {
      errors.numero_ordonnance = ['Le numéro d\'ordonnance est obligatoire'];
    }

    // Validation client
    if (!data.client?.nom_complet?.trim()) {
      errors['client.nom_complet'] = ['Le nom du client est obligatoire'];
    }

    // Validation médecin
    if (!data.medecin_id) {
      errors.medecin_id = ['Le médecin est obligatoire'];
    }

    // Validation médicaments
    if (!data.medicaments || data.medicaments.length === 0) {
      errors.medicaments = ['Au moins un médicament est requis'];
    } else if (data.medicaments.length > 20) {
      errors.medicaments = ['Maximum 20 médicaments par ordonnance'];
    } else {
      // Validation de chaque médicament
      data.medicaments.forEach((medicament, index) => {
        if (!medicament.code_ticket?.trim()) {
          errors[`medicaments.${index}.code_ticket`] = ['Le code ticket est obligatoire'];
        }
        if (!medicament.designation_medicament?.trim()) {
          errors[`medicaments.${index}.designation_medicament`] = ['La désignation est obligatoire'];
        }
        if (!medicament.posologie?.trim()) {
          errors[`medicaments.${index}.posologie`] = ['La posologie est obligatoire'];
        }
        if (!medicament.duree?.trim()) {
          errors[`medicaments.${index}.duree`] = ['La durée est obligatoire'];
        }
        if (!medicament.quantite || medicament.quantite < 1 || medicament.quantite > 9999) {
          errors[`medicaments.${index}.quantite`] = ['La quantité doit être entre 1 et 9999'];
        }
      });
    }

    // Notes (optionnel mais limité)
    if (data.notes && data.notes.length > 1000) {
      errors.notes = ['Les notes ne peuvent dépasser 1000 caractères'];
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Données invalides', errors);
    }
  }

  // ===============================================
  // UTILITAIRES
  // ===============================================

  /**
   * Formater les données d'ordonnance pour l'affichage
   */
  formatOrdonnanceForDisplay(ordonnance) {
    return {
      ...ordonnance,
      numero_affichage: this.extractNumeroSaisi(ordonnance.numero_ordonnance),
      date_creation_formatted: new Date(ordonnance.date_creation).toLocaleDateString('fr-FR'),
      total_lignes: ordonnance.lignes?.length || 0,
      client_nom: ordonnance.client?.nom_complet || 'N/A',
      medecin_nom: ordonnance.medecin?.nom_complet || 'N/A'
    };
  }

  /**
   * Extraire le numéro saisi du numéro complet
   */
  extractNumeroSaisi(numeroComplet) {
    if (!numeroComplet) return '';
    const parts = numeroComplet.split('-');
    return parts[0] || '';
  }

  /**
   * Préparer les données pour la création/modification
   */
  prepareOrdonnanceData(formData) {
    return {
      numero_ordonnance: formData.numero_ordonnance?.trim(),
      client: {
        nom_complet: formData.client?.nom_complet?.trim(),
        adresse: formData.client?.adresse?.trim() || null,
        telephone: formData.client?.telephone?.trim() || null
      },
      medecin_id: formData.medecin_id,
      medicaments: formData.medicaments.map(med => ({
        code_ticket: med.code_ticket?.trim(),
        designation_medicament: med.designation_medicament?.trim(),
        posologie: med.posologie?.trim(),
        duree: med.duree?.trim(),
        quantite: parseInt(med.quantite) || 1
      })),
      notes: formData.notes?.trim() || null
    };
  }

  /**
   * Préparer les médicaments depuis un ticket Access
   */
  prepareMedicamentsFromTicket(medicamentsAccess, codeTicket) {
    return medicamentsAccess.map(med => ({
      code_ticket: codeTicket,
      designation_medicament: med.designation || med.designation_courte || '',
      posologie: '', // À remplir par l'utilisateur
      duree: '',     // À remplir par l'utilisateur
      quantite: 1    // Valeur par défaut
    }));
  }
}

// ===============================================
// CLASSES D'ERREURS PERSONNALISÉES
// ===============================================

class ValidationError extends Error {
  constructor(message, errors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class RedirectError extends Error {
  constructor(message, redirectPath) {
    super(message);
    this.name = 'RedirectError';
    this.redirectPath = redirectPath;
  }
}

// ===============================================
// INSTANCE SINGLETON ET EXPORT
// ===============================================

const ordonnanceService = new OrdonnanceService();

export default ordonnanceService;
export { OrdonnanceService, ValidationError, RedirectError };
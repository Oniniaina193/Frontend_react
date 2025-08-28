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

  // ORDONNANCES - CRUD Operations
  async getOrdonnances(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);
      if (params.medecin_id) queryParams.append('medecin_id', params.medecin_id);
      if (params.client_id) queryParams.append('client_id', params.client_id);
      if (params.date_debut) queryParams.append('date_debut', params.date_debut);
      if (params.date_fin) queryParams.append('date_fin', params.date_fin);

      const url = `${this.baseURL}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { 
        method: 'GET', 
        headers: this.getHeaders(),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la récupération des ordonnances');
      
      return data;
    } catch (error) {
      console.error('Erreur getOrdonnances:', error);
      throw error;
    }
  }

  async createOrdonnance(ordonnanceData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(ordonnanceData),
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
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(ordonnanceData),
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

  // MODIFICATION 2 & 5: Nouvelle méthode pour récupérer les médecins avec format "Nom (ONM)"
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

  // MODIFICATION 1: Nouvelle méthode pour suggérer un numéro d'ordonnance (optionnel)
  async suggestNumeroOrdonnance() {
    try {
      const response = await fetch(`${API_BASE_URL}/ordonnances/suggest-numero`, {
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

  // MODIFICATION 1: Vérifier l'unicité du numéro d'ordonnance
  async checkNumeroUnique(numero) {
    try {
      // Cette vérification se fera côté serveur lors de la validation
      // Mais on peut implémenter une vérification en temps réel si nécessaire
      return true;
    } catch (error) {
      console.error('Erreur checkNumeroUnique:', error);
      throw error;
    }
  }

   /**
   * Récupérer la liste des médicaments qui ont des ordonnances
   * Pour le filtre de sélection dans l'historique
   */
  async getMedicamentsAvecOrdonnances() {
    try {
      const response = await fetch(`${this.baseURL}/historique/medicaments`, {
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
/**
 * Récupérer l'historique des ordonnances par médicament et/ou par date
 * MODIFICATION: Support de la recherche par date seule
 */
async getHistoriqueParMedicament(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    // MODIFICATION: Médicament optionnel maintenant
    if (params.medicament) queryParams.append('medicament', params.medicament);
    if (params.date) queryParams.append('date', params.date);
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);

    // MODIFICATION: Vérifier qu'au moins un critère est fourni côté client
    if (!params.medicament && !params.date) {
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
      // MODIFICATION 1: Inclure le numéro d'ordonnance saisi manuellement
      numero_ordonnance: formData.numero_ordonnance,
      medecin_id: formData.medecin_id,
      date: formData.date,
      medicaments: medicaments.map(med => ({
        id: med.id || null, // Pour les modifications
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

  // MODIFICATION 4: Formatage spécial pour la modification (exclure le numéro d'ordonnance)
  formatOrdonnanceForUpdate(formData, medicaments, clientExistant = null) {
    const ordonnanceData = {
      // MODIFICATION 4: PAS de numéro d'ordonnance dans la mise à jour
      medecin_id: formData.medecin_id,
      date: formData.date,
      medicaments: medicaments.map(med => ({
        id: med.id || null, // Important pour identifier les médicaments existants
        code_medicament: med.code_doc || med.code_medicament || '',
        designation: med.designation,
        quantite: parseInt(med.quantite) || 1,
        posologie: med.posologie || '', // MODIFICATION 4: Modifiable
        duree: med.duree || '' // MODIFICATION 4: Modifiable
      })),
      // MODIFICATION 4: Informations client modifiables
      client: {
        nom_complet: formData.client_nom_complet,
        adresse: formData.client_adresse,
        telephone: formData.client_telephone || null
      }
    };

    return ordonnanceData;
  }

  validateOrdonnanceData(ordonnanceData, isUpdate = false) {
    const errors = [];

    // MODIFICATION 1: Validation du numéro d'ordonnance (sauf en modification)
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
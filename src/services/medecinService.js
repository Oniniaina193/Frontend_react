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
console.log('🔧 API_BASE_URL configurée pour MedecinService:', API_BASE_URL);

class MedecinService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/medecins`;
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

  async getMedecins(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page);
      if (params.per_page) queryParams.append('per_page', params.per_page);

      const url = `${this.baseURL}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await fetch(url, { method: 'GET', headers: this.getHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la récupération des médecins');
      return data;
    } catch (error) {
      console.error('Erreur getMedecins:', error);
      throw error;
    }
  }

  async createMedecin(medecinData) {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(medecinData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la création du médecin');
      return data;
    } catch (error) {
      console.error('Erreur createMedecin:', error);
      throw error;
    }
  }

  async updateMedecin(id, medecinData) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(medecinData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la modification du médecin');
      return data;
    } catch (error) {
      console.error('Erreur updateMedecin:', error);
      throw error;
    }
  }

  async deleteMedecin(id) {
    try {
      const response = await fetch(`${this.baseURL}/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la suppression du médecin');
      return data;
    } catch (error) {
      console.error('Erreur deleteMedecin:', error);
      throw error;
    }
  }

  // Recherche rapide pour autocomplete
  async searchMedecins(query, limit = 10) {
    try {
      const response = await fetch(`${this.baseURL}/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la recherche');
      return data;
    } catch (error) {
      console.error('Erreur searchMedecins:', error);
      throw error;
    }
  }
}

const medecinService = new MedecinService();

export default medecinService;
export { MedecinService };

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
console.log('🔧 API_BASE_URL configurée pour StatistiquesService:', API_BASE_URL);

class StatistiquesService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/statistiques`;
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

  /**
   * Récupérer les statistiques du tableau de bord
   */
  async getDashboardStats() {
    try {
      const response = await fetch(`${this.baseURL}/dashboard`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Si erreur de redirection vers sélection dossier
        if (data.redirect) {
          throw new Error(data.message, { redirect: data.redirect });
        }
        throw new Error(data.message || 'Erreur lors de la récupération des statistiques');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur getDashboardStats:', error);
      throw error;
    }
  }

  /**
   * Récupérer les données des ventes mensuelles
   */
  async getVentesMensuelles() {
    try {
      const response = await fetch(`${this.baseURL}/ventes-mensuelles`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.redirect) {
          throw new Error(data.message, { redirect: data.redirect });
        }
        throw new Error(data.message || 'Erreur lors de la récupération des ventes mensuelles');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur getVentesMensuelles:', error);
      throw error;
    }
  }

  /**
   * Récupérer le top des médicaments les plus vendus
   */
  async getTopMedicaments() {
    try {
      const response = await fetch(`${this.baseURL}/top-medicaments`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.redirect) {
          throw new Error(data.message, { redirect: data.redirect });
        }
        throw new Error(data.message || 'Erreur lors de la récupération du top médicaments');
      }
      
      return data;
    } catch (error) {
      console.error('Erreur getTopMedicaments:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les données statistiques en une fois
   */
  async getAllStatistiques() {
    try {
      const [dashboardStats, ventesMensuelles, topMedicaments] = await Promise.allSettled([
        this.getDashboardStats(),
        this.getVentesMensuelles(),
        this.getTopMedicaments()
      ]);

      const result = {
        dashboard: dashboardStats.status === 'fulfilled' ? dashboardStats.value : null,
        ventes: ventesMensuelles.status === 'fulfilled' ? ventesMensuelles.value : null,
        topMedicaments: topMedicaments.status === 'fulfilled' ? topMedicaments.value : null,
        errors: []
      };

      // Collecter les erreurs
      if (dashboardStats.status === 'rejected') {
        result.errors.push({ type: 'dashboard', error: dashboardStats.reason });
      }
      if (ventesMensuelles.status === 'rejected') {
        result.errors.push({ type: 'ventes', error: ventesMensuelles.reason });
      }
      if (topMedicaments.status === 'rejected') {
        result.errors.push({ type: 'topMedicaments', error: topMedicaments.reason });
      }

      return result;
    } catch (error) {
      console.error('Erreur getAllStatistiques:', error);
      throw error;
    }
  }

  /**
   * Formater les données pour le graphique des ventes
   */
  formatVentesForChart(ventesData) {
    if (!ventesData || !ventesData.data || !ventesData.data.ventes_mensuelles) {
      return [];
    }

    return ventesData.data.ventes_mensuelles.map(vente => ({
      name: vente.label,
      mois: vente.mois,
      annee: vente.annee,
      ventes: vente.total_medicaments,
      value: vente.total_medicaments
    }));
  }

  /**
   * Formater les données pour le graphique du top médicaments
   */
  formatTopMedicamentsForChart(topData) {
    if (!topData || !topData.data || !topData.data.top_medicaments) {
      return [];
    }

    return topData.data.top_medicaments.map(medicament => ({
      name: medicament.medicament,
      value: medicament.total_vendu,
      pourcentage: medicament.pourcentage,
      position: medicament.position
    }));
  }

  /**
   * Formater les statistiques pour les cartes du dashboard
   */
  formatDashboardCards(dashboardData) {
    if (!dashboardData || !dashboardData.data) {
      return [];
    }

    const data = dashboardData.data;
    
    return [
      {
        title: 'Médicaments en stock',
        value: data.medicaments_en_stock?.toLocaleString() || '0',
        color: 'bg-blue-500',
        icon: '💊'
      },
      {
        title: 'Ordonnances du jour',
        value: data.ordonnances_du_jour?.toLocaleString() || '0',
        color: 'bg-green-500',
        icon: '📋'
      },
      {
        title: 'Médecins partenaires',
        value: data.medecins_partenaires?.toLocaleString() || '0',
        color: 'bg-purple-500',
        icon: '👨‍⚕️'
      },
      {
        title: 'Total ordonnances',
        value: data.total_ordonnances?.toLocaleString() || '0',
        color: 'bg-orange-500',
        icon: '📊'
      }
    ];
  }
}

const statistiquesService = new StatistiquesService();

export default statistiquesService;
export { StatistiquesService };
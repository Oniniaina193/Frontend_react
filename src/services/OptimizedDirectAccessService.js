// services/optimizedDirectAccessService.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class OptimizedDirectAccessService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Vérification rapide de la session (remplace testConnection)
   */
  async checkSession() {
    try {
      const response = await fetch(`${this.baseURL}/folder-selection/current`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });

      const result = await response.json();
      return {
        success: response.ok && result.success && result.data,
        data: result.data || null
      };
    } catch (error) {
      console.error('Erreur vérification session:', error);
      return {
        success: false,
        message: `Erreur réseau: ${error.message}`
      };
    }
  }

  /**
   * Recherche optimisée des articles - sans validation préalable
   */
  async searchArticles(params = {}) {
    try {
      const {
        search = '',
        family = '',
        page = 1,
        limit = 100
      } = params;

      // Validation côté client
      const trimmedSearch = search.trim();
      if (!trimmedSearch && !family) {
        return {
          success: true,
          data: {
            articles: [],
            pagination: {
              current_page: page,
              total_pages: 0,
              total_items: 0,
              items_per_page: limit,
              has_next: false,
              has_prev: false
            }
          }
        };
      }

      const queryParams = new URLSearchParams();
      
      if (trimmedSearch) {
        queryParams.append('search', trimmedSearch);
      }
      
      if (family) {
        queryParams.append('family', family);
      }
      
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const response = await fetch(`${this.baseURL}/optimized-direct-access/search?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur recherche articles:', error);
      return {
        success: false,
        message: `Erreur réseau: ${error.message}`
      };
    }
  }

  /**
   * Récupérer les familles (optionnel - seulement si nécessaire)
   */
  async getFamilies() {
    try {
      const response = await fetch(`${this.baseURL}/optimized-direct-access/families`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur familles:', error);
      return {
        success: false,
        message: `Erreur réseau: ${error.message}`,
        data: []
      };
    }
  }

  /**
   * Test de connexion simplifié (optionnel)
   */
  async quickTest() {
    try {
      const response = await fetch(`${this.baseURL}/optimized-direct-access/quick-test`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur test rapide:', error);
      return {
        success: false,
        message: `Erreur réseau: ${error.message}`
      };
    }
  }
}

// Cache intelligent pour les recherches
class SearchCache {
  constructor(maxSize = 50, ttl = 30 * 60 * 1000) { // 30 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  generateKey(searchTerm, family = '', page = 1, limit = 100) {
    return `${searchTerm.toLowerCase().trim()}-${family}-${page}-${limit}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Vérifier l'expiration
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key, data) {
    // Nettoyer le cache si trop plein
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Service avec cache intégré
class CachedOptimizedService extends OptimizedDirectAccessService {
  constructor() {
    super();
    this.searchCache = new SearchCache();
  }

  async searchArticles(params = {}) {
    const { search = '', family = '', page = 1, limit = 100 } = params;
    const cacheKey = this.searchCache.generateKey(search, family, page, limit);

    // Vérifier le cache d'abord
    const cachedResult = this.searchCache.get(cacheKey);
    if (cachedResult) {
      console.log('🚀 Résultat du cache:', cacheKey);
      return cachedResult;
    }

    // Appel API
    const result = await super.searchArticles(params);

    // Mettre en cache seulement si succès
    if (result.success) {
      this.searchCache.set(cacheKey, result);
      console.log('💾 Mis en cache:', cacheKey);
    }

    return result;
  }

  clearCache() {
    this.searchCache.clear();
    console.log('🗑️ Cache vidé');
  }

  getCacheStats() {
    return {
      size: this.searchCache.size(),
      maxSize: this.searchCache.maxSize,
      ttl: this.searchCache.ttl
    };
  }
}

// Instance par défaut
const optimizedService = new CachedOptimizedService();

export default optimizedService;
export { 
  OptimizedDirectAccessService, 
  CachedOptimizedService,
  SearchCache,
  optimizedService 
};
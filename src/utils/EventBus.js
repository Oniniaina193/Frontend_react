// utils/EventBus.js
class EventBus {
  constructor() {
    this.events = {};
  }

  // Écouter un événement
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);

    // Retourner une fonction de nettoyage
    return () => {
      this.off(eventName, callback);
    };
  }

  // Arrêter d'écouter un événement
  off(eventName, callback) {
    if (!this.events[eventName]) return;
    
    this.events[eventName] = this.events[eventName].filter(
      listener => listener !== callback
    );
  }

  // Émettre un événement
  emit(eventName, data = null) {
    console.log(`📡 Événement émis: ${eventName}`, data);
    
    if (!this.events[eventName]) return;
    
    this.events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erreur lors de l'exécution du callback pour ${eventName}:`, error);
      }
    });
  }

  // Nettoyer tous les événements
  clear() {
    this.events = {};
  }

  // Obtenir la liste des événements actifs (pour debug)
  getActiveEvents() {
    const active = {};
    Object.keys(this.events).forEach(eventName => {
      active[eventName] = this.events[eventName].length;
    });
    return active;
  }
}

// Instance globale
const eventBus = new EventBus();

// Constantes pour les noms d'événements
export const EVENTS = {
  // Médecins
  MEDECIN_CREATED: 'medecin:created',
  MEDECIN_UPDATED: 'medecin:updated', 
  MEDECIN_DELETED: 'medecin:deleted',
  
  // Ordonnances
  ORDONNANCE_CREATED: 'ordonnance:created',
  ORDONNANCE_UPDATED: 'ordonnance:updated',
  ORDONNANCE_DELETED: 'ordonnance:deleted',
  
  // Statistiques
  STATS_REFRESH_NEEDED: 'stats:refresh_needed',
  STATS_REFRESHED: 'stats:refreshed',
  
  // Dossiers
  DOSSIER_CHANGED: 'dossier:changed',
  
  // Général
  DATA_CHANGED: 'data:changed'
};

export default eventBus;
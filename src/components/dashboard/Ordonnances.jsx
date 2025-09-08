import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Printer, 
  Calendar,
  User,
  FileText,
  X,
  Save,
  UserPlus,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';

import ordonnanceService from '../../services/OrdonnanceService';
import clientService from '../../services/ClientService';
import medecinService from '../../services/medecinService';
import { useData } from '../../contexts/DataContext';

// NOUVEAUX IMPORTS POUR LES OPTIMISATIONS
import { useOptimizedNotifications } from '../../utils/OptimizedNotifications';
import eventBus, { EVENTS } from '../../utils/EventBus';

// Import des utilitaires d'impression
import { 
  PrintNotification, 
  PrinterStatusIndicator, 
  usePrintNotifications,
  PrintTestComponent 
} from '../../utils/PrinterUtils';

// Composant FormulaireOrdonnance (inchangé par rapport à l'original)
const FormulaireOrdonnance = React.memo(({ 
  isEdit = false, 
  formData, 
  setFormData, 
  medicaments, 
  setMedicaments,
  medecins,
  clients,
  tickets,
  setTickets,
  clientExistant,
  setClientExistant,
  loadingMedecins,
  loadingClients,
  loadingTicket,
  loadingNumeroSuggestion,
  onSubmit, 
  onCancel,
  onSuggestNumero,
  onSearchTickets,
  onLoadTicketDetails,
  onClientSelection,
  onShowAddMedecin
}) => {
  // Handlers mémorisés
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const handleMedicamentUpdate = useCallback((index, field, value) => {
    setMedicaments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, [setMedicaments]);

  const handleTicketSearch = useCallback((value) => {
    handleFormChange('code_ticket', value);
    if (value.length >= 3) {
      onSearchTickets(value);
    }
  }, [handleFormChange, onSearchTickets]);

  return (
    <div className="bg-white p-2 space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-center relative mb-4">
        <button
          onClick={onCancel}
          className="absolute left-0 text-gray-500 hover:text-gray-700 transition-colors"
          title="Fermer le formulaire"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-xl font-semibold text-gray-900">
          {isEdit ? 'Modifier l\'ordonnance' : 'Nouvelle ordonnance'}
        </h3>
      </div>

      {/* N° d'ordonnance */}
      <div className="grid grid-cols-4 gap-4 items-center">
        <label className="text-gray-700 font-medium">N° ordonnance</label>
        <div className="col-span-2 flex space-x-2">
          <input
            type="text"
            placeholder="Numéro d'ordonnance (requis)"
            value={formData.numero_ordonnance}
            onChange={(e) => handleFormChange('numero_ordonnance', e.target.value)}
            readOnly={isEdit}
            className={`flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 ${
              isEdit ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''
            }`}
          />
          {!isEdit && (
            <button
              onClick={onSuggestNumero}
              disabled={loadingNumeroSuggestion}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm"
              title="Suggérer un numéro automatique"
            >
              {loadingNumeroSuggestion ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Auto'
              )}
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {isEdit && 'Non modifiable'}
        </div>
      </div>

      {/* Médecin */}
      <div className="grid grid-cols-4 gap-4 items-center">
        <label className="text-gray-700 font-medium">Médecin préscripteur</label>
        <div className="col-span-2">
          <select
            value={formData.medecin_id}
            onChange={(e) => handleFormChange('medecin_id', e.target.value)}
            disabled={loadingMedecins}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
          >
            <option value="">
              {loadingMedecins ? 'Chargement...' : 'Sélectionner un médecin...'}
            </option>
            {medecins.map((medecin) => (
              <option key={medecin.id} value={medecin.id}>
                Dr. {medecin.nom_complet} - ONM: {medecin.ONM}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button
            onClick={onShowAddMedecin}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + Ajouter médecin
          </button>
        </div>
      </div>

      {/* Date */}
      <div className="grid grid-cols-4 gap-4 items-center">
        <label className="text-gray-700 font-medium">Date de création</label>
        <div className="col-span-2">
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleFormChange('date', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div></div>
      </div>

      {/* Client */}
      <div className="grid grid-cols-4 gap-4 items-start">
        <label className="text-gray-700 font-medium pt-2">Infos Client</label>
        <div className="col-span-3 space-y-3">
          {/* Sélection client existant */}
          <select
            value={clientExistant?.id || ''}
            onChange={(e) => onClientSelection(e.target.value)}
            disabled={loadingClients}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
          >
            <option value="">
              {loadingClients ? 'Chargement...' : 'Nouveau client (saisir ci-dessous)'}
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.nom_complet} 
              </option>
            ))}
          </select>
          
          {/* Nom complet */}
          <input
            type="text"
            placeholder="Nom complet *"
            value={formData.client_nom_complet}
            onChange={(e) => handleFormChange('client_nom_complet', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Adresse et téléphone */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Adresse complète *"
              value={formData.client_adresse}
              onChange={(e) => handleFormChange('client_adresse', e.target.value)}
              className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Téléphone"
              value={formData.client_telephone}
              onChange={(e) => handleFormChange('client_telephone', e.target.value)}
              className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* N° Ticket */}
      {!isEdit && (
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="text-gray-700 font-medium">N° Ticket</label>
          <div className="col-span-2 relative">
            <input
              type="text"
              placeholder="Saisir le numéro ticket "
              value={formData.code_ticket}
              onChange={(e) => handleTicketSearch(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            {tickets.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg z-10 mt-1">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      onLoadTicketDetails(ticket.code);
                      setTickets([]);
                    }}
                    className="w-full p-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                  >
                    {ticket.code}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            {formData.code_ticket && (
              <button
                onClick={() => onLoadTicketDetails(formData.code_ticket)}
                disabled={loadingTicket}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
              >
                {loadingTicket ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Charger'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Médicaments prescrits */}
      {medicaments.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Médicaments prescrits</h4>
          <div className="space-y-2">
            {medicaments.map((medicament, index) => (
              <div key={`medicament-${medicament.id || medicament.code_medicament || index}`} 
                   className="border border-gray-200 rounded p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Médicament
                    </label>
                    <div className="p-2 bg-gray-50 rounded text-sm">
                      {medicament.designation} (Qté: {medicament.quantite})
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Posologie *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 1 comprimé 3 fois/jour"
                      value={medicament.posologie || ''}
                      onChange={(e) => handleMedicamentUpdate(index, 'posologie', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Durée *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 7 jours"
                      value={medicament.duree || ''}
                      onChange={(e) => handleMedicamentUpdate(index, 'duree', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex space-x-3 pt-4 border-t">
        <button
          onClick={onSubmit}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
        >
          {isEdit ? 'Modifier' : 'Créer'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors text-sm font-medium"
        >
          Annuler
        </button>
      </div>
    </div>
  );
});

// Composant FormulaireMedecin avec notifications harmonisées - VERSION SIMPLE
const FormulaireMedecin = ({ onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    nom_complet: '',
    adresse: '',
    ONM: '',
    telephone: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-lg relative">
      <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
        Nouveau médecin
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="nom_complet"
          value={formData.nom_complet}
          onChange={handleChange}
          placeholder="Nom complet"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="text"
          name="adresse"
          value={formData.adresse}
          onChange={handleChange}
          placeholder="Adresse"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="text"
          name="ONM"
          value={formData.ONM}
          onChange={handleChange}
          placeholder="Numéro d'ordre"
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <input
          type="tel"
          name="telephone"
          value={formData.telephone}
          onChange={handleChange}
          placeholder="Téléphone"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="flex space-x-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            ) : (
              'Ajouter'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

// Composant principal Ordonnances avec les 3 optimisations
const Ordonnances = () => {
  // États principaux
  const [ordonnances, setOrdonnances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // États pour les modales et formulaires
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMedecinModal, setShowAddMedecinModal] = useState(false);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);

  // États pour le formulaire d'ajout/modification
  const [formData, setFormData] = useState({
    numero_ordonnance: '',
    medecin_id: '',
    date: new Date().toISOString().split('T')[0],
    client_nom_complet: '',
    client_adresse: '',
    client_telephone: '',
    code_ticket: ''
  });
  const [medicaments, setMedicaments] = useState([]);
  const [clientExistant, setClientExistant] = useState(null);

  // Cache des données
  const [clients, setClients] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [loadingNumeroSuggestion, setLoadingNumeroSuggestion] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingAddMedecin, setLoadingAddMedecin] = useState(false);

  // États pour la modification
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // États pour l'impression
  const [printerStatus, setPrinterStatus] = useState(null);
  const [printingOrdonnance, setPrintingOrdonnance] = useState(null);

  // Utiliser le DataContext pour les médecins
  const { medecins, addMedecin, loading: contextLoading } = useData();

  // Hook pour les notifications d'impression
  const { notification, showSuccess, showError, showInfo, hideNotification } = usePrintNotifications();

  // SOLUTION 2: Notifications harmonisées
  const notifications = useOptimizedNotifications();

  // SOLUTION 1: Actions optimistes avec mise à jour immédiate du tableau
  
  // Fonction pour créer une ordonnance temporaire optimiste
  const createOptimisticOrdonnance = (ordonnanceData) => {
  const tempId = `temp_${Date.now()}`;
  return {
    id: tempId,
    numero_ordonnance: ordonnanceData.numero_ordonnance,
    date: ordonnanceData.date,
    medecin: ordonnanceData.medecin_id ? 
      medecins.find(m => m.id === parseInt(ordonnanceData.medecin_id)) || 
      { nom_complet: 'Chargement...' } : null,
    client: ordonnanceData.client || {
      nom_complet: ordonnanceData.client_nom_complet || 'Nouveau client',
      adresse: ordonnanceData.client_adresse
    },
    // CORRECTION: Utiliser la longueur du tableau medicaments
    total_medicaments: medicaments.length, // Ajout de cette ligne
    lignes: medicaments, // Ajout des lignes pour cohérence
    _isOptimistic: true,
    _isLoading: true
  };
};

  // SOLUTION 3: Écouter les événements pour synchronisation
  useEffect(() => {
    // Écouter les événements d'ordonnances pour notifier l'historique
    const unsubscribeCreated = eventBus.on(EVENTS.ORDONNANCE_CREATED, (ordonnanceData) => {
      console.log('📡 Ordonnance créée, notification pour historique:', ordonnanceData);
      // Émettre un événement spécifique pour que l'historique se mette à jour
      eventBus.emit(EVENTS.DATA_CHANGED, { 
        type: 'ordonnance_created', 
        data: ordonnanceData,
        medicaments: ordonnanceData.lignes || []
      });
    });

    const unsubscribeUpdated = eventBus.on(EVENTS.ORDONNANCE_UPDATED, (updateData) => {
      console.log('📡 Ordonnance modifiée, notification pour historique:', updateData);
      eventBus.emit(EVENTS.DATA_CHANGED, { 
        type: 'ordonnance_updated', 
        data: updateData.data,
        medicaments: updateData.data.lignes || []
      });
    });

    const unsubscribeDeleted = eventBus.on(EVENTS.ORDONNANCE_DELETED, (deleteData) => {
      console.log('📡 Ordonnance supprimée, notification pour historique:', deleteData);
      eventBus.emit(EVENTS.DATA_CHANGED, { 
        type: 'ordonnance_deleted', 
        data: deleteData.deletedData
      });
    });

    // Nettoyage
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, []);

  // Chargement initial
  useEffect(() => {
    const debugAndLoad = async () => {
      // Debug du dossier
      console.log('=== DEBUT DEBUG ===');
      await ordonnanceService.debugCurrentDossier();
      
      // Vérification configuration
      const verification = await ordonnanceService.verifyDossierConfiguration();
      console.log('Vérification dossier:', verification);
      
      if (!verification.success) {
        setError(`Problème de configuration dossier: ${verification.message}`);
        return;
      }
      
      // Chargement normal
      loadOrdonnances();
      loadAllClients();
    };
    
    debugAndLoad();
  }, [currentPage, searchTerm]);

  // Charger les ordonnances
  const loadOrdonnances = async () => {
  setLoading(true);
  setError('');
  try {
    const response = await ordonnanceService.getOrdonnances({
      page: currentPage,
      per_page: 10,
      search: searchTerm
    });

    if (response.success) {
      // CORRECTION: Assurer que chaque ordonnance a le bon total_medicaments
      const ordonnancesWithCorrectTotal = response.data.ordonnances.map(ord => ({
        ...ord,
        total_medicaments: ord.lignes?.length || ord.total_medicaments || 0
      }));
      
      setOrdonnances(ordonnancesWithCorrectTotal);
      setTotalPages(response.data.pagination.last_page);
    }
  } catch (err) {
    setError('Erreur lors du chargement des ordonnances');
    notifications.showError('Erreur lors du chargement des ordonnances');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

// Charger tous les clients 
const loadAllClients = async () => {
  setLoadingClients(true);
  try {
    const response = await clientService.getAllClients();
    if (response.success) {
      setClients(response.data);
    }
  } catch (err) {
    console.error('Erreur chargement clients:', err);
  } finally {
    setLoadingClients(false);
  }
};

  // SOLUTION 2: Handler pour l'ajout de médecin avec notifications harmonisées
  const handleAddMedecin = async (medecinData) => {
    setLoadingAddMedecin(true);
    
    // Fermer le modal immédiatement
    setShowAddMedecinModal(false);
    
    try {
      const result = await addMedecin(medecinData);
      
      if (result.success) {
        // Sélectionner automatiquement le nouveau médecin
        const newMedecinId = result.data.id;
        setFormData(prev => ({ ...prev, medecin_id: newMedecinId }));
        
        // NOTIFICATION HARMONISÉE au lieu d'alert()
        notifications.showSuccess('Médecin ajouté avec succès!');
      }
    } catch (error) {
      console.error('Erreur ajout médecin:', error);
      notifications.showError('Erreur lors de l\'ajout du médecin: ' + error.message);
    } finally {
      setLoadingAddMedecin(false);
    }
  };

  // Handlers mémorisés (inchangés)
  const handleSuggestNumero = useCallback(async () => {
    setLoadingNumeroSuggestion(true);
    try {
      const response = await ordonnanceService.suggestNumeroOrdonnance();
      if (response.success) {
        setFormData(prev => ({ ...prev, numero_ordonnance: response.data.numero_suggere }));
      }
    } catch (err) {
      console.error('Erreur suggestion numéro:', err);
    } finally {
      setLoadingNumeroSuggestion(false);
    }
  }, []);

  const handleSearchTickets = useCallback(async (query) => {
    if (query.length < 2) {
      setTickets([]);
      return;
    }
    try {
      const response = await ordonnanceService.searchTickets(query);
      if (response.success) {
        setTickets(response.data);
      }
    } catch (err) {
      console.error('Erreur recherche tickets:', err);
    }
  }, []);

  const handleLoadTicketDetails = useCallback(async (codeTicket) => {
    setLoadingTicket(true);
    setError('');
    try {
      const response = await ordonnanceService.getTicketDetails(codeTicket);
      if (response.success) {
        setMedicaments(response.data.medicaments);
        setFormData(prev => ({ ...prev, code_ticket: codeTicket }));
      }
    } catch (err) {
      setError('Erreur lors du chargement du ticket: ' + err.message);
    } finally {
      setLoadingTicket(false);
    }
  }, []);

  const handleClientSelection = useCallback((clientId) => {
    if (clientId) {
      const client = clients.find(c => c.id === parseInt(clientId));
      if (client) {
        setClientExistant(client);
        setFormData(prev => ({
          ...prev,
          client_nom_complet: client.nom_complet,
          client_adresse: client.adresse,
          client_telephone: client.telephone || ''
        }));
      }
    } else {
      setClientExistant(null);
      setFormData(prev => ({
        ...prev,
        client_nom_complet: '',
        client_adresse: '',
        client_telephone: ''
      }));
    }
  }, [clients]);

  const handleShowAddMedecin = useCallback(() => {
    setShowAddMedecinModal(true);
  }, []);

  // Fonctions d'impression (inchangées)
  const handlePrintOrdonnance = async (ordonnance) => {
    setPrintingOrdonnance(ordonnance.id);
    showInfo('Préparation de l\'impression...');

    try {
      const result = await ordonnanceService.printOrdonnance(ordonnance.id);
      if (result.success) {
        showSuccess(`Ordonnance ${ordonnance.numero_ordonnance} envoyée à l'imprimante`);
      }
    } catch (error) {
      console.error('Erreur impression:', error);
      showError(`Erreur lors de l'impression: ${error.message}`);
    } finally {
      setPrintingOrdonnance(null);
    }
  };

  const handleDownloadPdf = async (ordonnance) => {
    setPrintingOrdonnance(ordonnance.id);
    showInfo('Génération du PDF...');

    try {
      const result = await ordonnanceService.downloadPdfOrdonnance(
        ordonnance.id, 
        ordonnance.numero_ordonnance
      );
      if (result.success) {
        showSuccess(`PDF de l'ordonnance ${ordonnance.numero_ordonnance} téléchargé`);
      }
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      showError(`Erreur lors du téléchargement: ${error.message}`);
    } finally {
      setPrintingOrdonnance(null);
    }
  };

  const handleDirectPrint = async (ordonnance) => {
    setPrintingOrdonnance(ordonnance.id);
    showInfo('Impression directe en cours...');

    try {
      const result = await ordonnanceService.printOrdonnanceDirectly(ordonnance.id);
      if (result.success) {
        showSuccess(`Impression directe de l'ordonnance ${ordonnance.numero_ordonnance} lancée`);
      }
    } catch (error) {
      console.error('Erreur impression directe:', error);
      showError(`Erreur lors de l'impression directe: ${error.message}`);
    } finally {
      setPrintingOrdonnance(null);
    }
  };

  const handleTestPrint = async () => {
    showInfo('Test d\'impression en cours...');
    
    try {
      const testWindow = window.open('', '_blank', 'width=600,height=400');
      testWindow.document.write(`
        <html>
          <head><title>Test d'impression</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Test d'impression</h2>
            <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
            <p>Si vous voyez cette page, votre imprimante est configurée correctement.</p>
            <hr>
            <p><small>Page de test générée par le système de gestion pharmaceutique</small></p>
          </body>
        </html>
      `);
      testWindow.document.close();
      
      setTimeout(() => {
        testWindow.print();
        testWindow.close();
      }, 500);
      
      showSuccess('Test d\'impression envoyé');
    } catch (error) {
      showError('Erreur lors du test d\'impression: ' + error.message);
    }
  };

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setFormData({
      numero_ordonnance: '',
      medecin_id: '',
      date: new Date().toISOString().split('T')[0],
      client_nom_complet: '',
      client_adresse: '',
      client_telephone: '',
      code_ticket: ''
    });
    setMedicaments([]);
    setClientExistant(null);
    setTickets([]);
    setError('');
    setIsEditing(false);
    setEditingId(null);
  }, []);

  // SOLUTION 1: Créer une ordonnance avec mise à jour optimiste
  const handleCreateOrdonnance = useCallback(async () => {
  setError('');
  
  try {
    const ordonnanceData = ordonnanceService.formatOrdonnanceForSubmit(
      formData, 
      medicaments, 
      clientExistant
    );

    const errors = ordonnanceService.validateOrdonnanceData(ordonnanceData);
    if (errors.length > 0) {
      setError(errors.join(', '));
      notifications.showError('Données invalides: ' + errors.join(', '));
      return;
    }

    // CONFIRMATION avant création
    const confirmCreate = confirm(`Créer l'ordonnance ${formData.numero_ordonnance} avec ${medicaments.length} médicament(s) ?`);
    if (!confirmCreate) return;

    // MISE À JOUR OPTIMISTE avec le bon nombre de médicaments
    const optimisticOrdonnance = {
      id: `temp_${Date.now()}`,
      numero_ordonnance: formData.numero_ordonnance,
      date: formData.date,
      medecin: formData.medecin_id ? 
        medecins.find(m => m.id === parseInt(formData.medecin_id)) || 
        { nom_complet: 'Chargement...' } : null,
      client: clientExistant || {
        nom_complet: formData.client_nom_complet || 'Nouveau client',
        adresse: formData.client_adresse,
        telephone: formData.client_telephone
      },
      total_medicaments: medicaments.length, // CORRECTION: Bon nombre
      lignes: medicaments,
      _isOptimistic: true,
      _isLoading: true
    };

    setOrdonnances(prev => [optimisticOrdonnance, ...prev]);
    
    // Fermer le modal immédiatement
    setShowAddModal(false);
    resetForm();
    
    // Notification immédiate
    notifications.showInfo('Création en cours...');

    try {
      const response = await ordonnanceService.createOrdonnance(ordonnanceData);
      
      if (response.success) {
        // Remplacer l'ordonnance optimiste par la vraie avec le bon total_medicaments
        const realOrdonnance = {
          ...response.data,
          total_medicaments: response.data.lignes?.length || medicaments.length,
          _isOptimistic: false,
          _isLoading: false
        };
        
        setOrdonnances(prev => prev.map(ord => 
          ord.id === optimisticOrdonnance.id ? realOrdonnance : ord
        ));
        
        // NOTIFICATION DE SUCCÈS avec détails
        notifications.showSuccess(
          `Ordonnance ${response.data.numero_ordonnance} créée avec succès (${realOrdonnance.total_medicaments} médicament(s))`
        );
        
        // ÉVÉNEMENTS pour synchronisation
        eventBus.emit(EVENTS.ORDONNANCE_CREATED, response.data);
      }
    } catch (apiError) {
      // Rollback : supprimer l'ordonnance optimiste
      setOrdonnances(prev => prev.filter(ord => ord.id !== optimisticOrdonnance.id));
      setError('Erreur lors de la création: ' + apiError.message);
      notifications.showError('Erreur lors de la création: ' + apiError.message);
      
      // Rouvrir le modal en cas d'erreur
      setShowAddModal(true);
      // Restaurer les données du formulaire
      setMedicaments(medicaments);
      setClientExistant(clientExistant);
    }
  } catch (err) {
    setError('Erreur lors de la création: ' + err.message);
    notifications.showError('Erreur lors de la création: ' + err.message);
  }
}, [formData, medicaments, clientExistant, resetForm, notifications, medecins]);

  // SOLUTION 1: Modifier une ordonnance avec mise à jour optimiste
 const handleUpdateOrdonnance = useCallback(async () => {
  setError('');
  
  try {
    const ordonnanceData = ordonnanceService.formatOrdonnanceForUpdate(
      formData, 
      medicaments, 
      clientExistant
    );

    const errors = ordonnanceService.validateOrdonnanceData(ordonnanceData, true);
    if (errors.length > 0) {
      setError(errors.join(', '));
      notifications.showError('Données invalides: ' + errors.join(', '));
      return;
    }

    // CONFIRMATION avant modification
    const confirmUpdate = confirm(
      `Modifier l'ordonnance ${formData.numero_ordonnance} ?\n` +
      `Nouveau nombre de médicaments: ${medicaments.length}`
    );
    if (!confirmUpdate) return;

    // Sauvegarder l'ordonnance actuelle pour rollback
    const currentOrdonnance = ordonnances.find(ord => ord.id === editingId);
    
    // MISE À JOUR OPTIMISTE avec le bon nombre de médicaments
    setOrdonnances(prev => prev.map(ord => 
      ord.id === editingId ? {
        ...ord,
        date: formData.date,
        client: {
          nom_complet: formData.client_nom_complet,
          adresse: formData.client_adresse,
          telephone: formData.client_telephone
        },
        medecin: formData.medecin_id ? 
          medecins.find(m => m.id === parseInt(formData.medecin_id)) || ord.medecin :
          ord.medecin,
        total_medicaments: medicaments.length, // CORRECTION: Bon nombre
        lignes: medicaments,
        _isOptimistic: true,
        _isLoading: true
      } : ord
    ));

    // Fermer le modal immédiatement
    setShowEditModal(false);
    resetForm();
    
    notifications.showInfo('Modification en cours...');

    try {
      const response = await ordonnanceService.updateOrdonnance(editingId, ordonnanceData);
      
      if (response.success) {
        // Confirmer la mise à jour avec le bon total_medicaments
        const updatedOrdonnance = {
          ...response.data,
          total_medicaments: response.data.lignes?.length || medicaments.length,
          _isOptimistic: false,
          _isLoading: false
        };
        
        setOrdonnances(prev => prev.map(ord => 
          ord.id === editingId ? updatedOrdonnance : ord
        ));
        
        // NOTIFICATION DE SUCCÈS avec détails
        notifications.showSuccess(
          `Ordonnance ${response.data.numero_ordonnance} modifiée avec succès (${updatedOrdonnance.total_medicaments} médicament(s))`
        );
        
        // ÉVÉNEMENTS pour synchronisation
        eventBus.emit(EVENTS.ORDONNANCE_UPDATED, { 
          id: editingId, 
          data: response.data 
        });
      }
    } catch (apiError) {
      // Rollback
      if (currentOrdonnance) {
        setOrdonnances(prev => prev.map(ord => 
          ord.id === editingId ? currentOrdonnance : ord
        ));
      }
      setError('Erreur lors de la modification: ' + apiError.message);
      notifications.showError('Erreur lors de la modification: ' + apiError.message);
      
      // Rouvrir le modal en cas d'erreur
      setShowEditModal(true);
    }
  } catch (err) {
    setError('Erreur lors de la modification: ' + err.message);
    notifications.showError('Erreur lors de la modification: ' + err.message);
  }
}, [formData, medicaments, clientExistant, editingId, resetForm, notifications, ordonnances, medecins]);

  // SOLUTION 1: Supprimer une ordonnance avec mise à jour optimiste
  const handleDelete = async (ordonnance) => {
  // CONFIRMATION avec détails
  const confirmDelete = confirm(
    `Supprimer l'ordonnance ${ordonnance.numero_ordonnance} ?\n` +
    `Cette ordonnance contient ${ordonnance.total_medicaments} médicament(s)\n` +
    `Client: ${ordonnance.client?.nom_complet}\n` +
    `Cette action est irréversible.`
  );
  if (!confirmDelete) return;

  // SUPPRESSION OPTIMISTE - Retirer immédiatement de la liste
  const originalOrdonnances = [...ordonnances];
  setOrdonnances(prev => prev.filter(ord => ord.id !== ordonnance.id));
  
  notifications.showInfo('Suppression en cours...');

  try {
    const response = await ordonnanceService.deleteOrdonnance(ordonnance.id);
    
    if (response.success) {
      // NOTIFICATION DE SUCCÈS avec détails
      notifications.showSuccess(
        `Ordonnance ${ordonnance.numero_ordonnance} supprimée avec succès`
      );
      
      // ÉVÉNEMENTS pour synchronisation
      eventBus.emit(EVENTS.ORDONNANCE_DELETED, { 
        id: ordonnance.id,
        deletedData: ordonnance
      });
    }
  } catch (err) {
    // Rollback : restaurer la liste
    setOrdonnances(originalOrdonnances);
    setError('Erreur lors de la suppression: ' + err.message);
    notifications.showError('Erreur lors de la suppression: ' + err.message);
  }
};

  // Voir les détails d'une ordonnance
  const handleViewDetails = async (ordonnance) => {
    try {
      const response = await ordonnanceService.getOrdonnance(ordonnance.id);
      if (response.success) {
        setSelectedOrdonnance(response.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      setError('Erreur lors du chargement: ' + err.message);
      notifications.showError('Erreur lors du chargement: ' + err.message);
    }
  };

  // Préparer l'édition d'une ordonnance
  const handleEditOrdonnance = async (ordonnance) => {
    try {
      const response = await ordonnanceService.getOrdonnance(ordonnance.id);
      if (response.success) {
        const ordonnanceData = response.data;
        
        setFormData({
          numero_ordonnance: ordonnanceData.numero_ordonnance,
          medecin_id: ordonnanceData.medecin_id,
          date: ordonnanceData.date,
          client_nom_complet: ordonnanceData.client?.nom_complet || '',
          client_adresse: ordonnanceData.client?.adresse || '',
          client_telephone: ordonnanceData.client?.telephone || '',
          code_ticket: ''
        });

        setMedicaments(ordonnanceData.lignes?.map(ligne => ({
          id: ligne.id,
          code_medicament: ligne.code_medicament,
          designation: ligne.designation,
          quantite: ligne.quantite,
          posologie: ligne.posologie,
          duree: ligne.duree
        })) || []);

        setClientExistant(ordonnanceData.client);
        setIsEditing(true);
        setEditingId(ordonnanceData.id);
        setShowDetailModal(false);
        setShowEditModal(true);
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'ordonnance: ' + err.message);
      alert('Erreur lors du chargement de l\'ordonnance: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Notifications d'impression */}
      <PrintNotification
        isVisible={notification.isVisible}
        type={notification.type}
        message={notification.message}
        onClose={hideNotification}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <PrinterStatusIndicator status={printerStatus} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 font-serif">Gestion des Ordonnances</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Nouvelle ordonnance
          </button>
        </div>
      </div>

      {/* Test d'imprimante */}
      {printerStatus && (
        <div className="flex justify-end">
          <PrintTestComponent onTestPrint={handleTestPrint} />
        </div>
      )}

      {/* Message d'erreur global */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Contenu avec blur */}
      <div className={`${(showAddModal || showEditModal || showAddMedecinModal) ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des ordonnances...</p>
          </div>
        ) : ordonnances.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4 mx-auto" />
            <p className="text-gray-500">
              {searchTerm ? 'Aucune ordonnance trouvée avec ces critères' : 'Aucune ordonnance enregistrée'}
            </p>
          </div>
        ) : (
          <>
            {/* Tableau avec indication des actions optimistes */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        N° Ordonnance
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Médecin
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Médicaments
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ordonnances.map((ordonnance) => (
                      <tr 
                        key={ordonnance.id} 
                        className={`hover:bg-gray-50 ${
                          ordonnance._isOptimistic ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <span className="text-sm text-gray-900">
                              {ordonnance.numero_ordonnance}
                              {ordonnance._isLoading && (
                                <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin inline ml-2"></div>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <span className="text-sm text-gray-900">
                              {new Date(ordonnance.date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-sm text-gray-900">
                                {ordonnance.client?.nom_complet}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="text-sm text-gray-900">
                            Dr. {ordonnance.medecin?.nom_complet}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ordonnance._isOptimistic ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {ordonnance.total_medicaments || 0} médicament(s)
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(ordonnance)}
                              disabled={ordonnance._isOptimistic}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors disabled:opacity-50"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handlePrintOrdonnance(ordonnance)}
                              disabled={printingOrdonnance === ordonnance.id || ordonnance._isOptimistic}
                              className="text-green-600 hover:text-green-900 p-1 rounded transition-colors disabled:opacity-50"
                              title="Imprimer l'ordonnance"
                            >
                              {printingOrdonnance === ordonnance.id ? (
                                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Printer className="w-4 h-4" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleDownloadPdf(ordonnance)}
                              disabled={printingOrdonnance === ordonnance.id || ordonnance._isOptimistic}
                              className="text-purple-600 hover:text-purple-900 p-1 rounded transition-colors disabled:opacity-50"
                              title="Télécharger PDF"
                            >
                              {printingOrdonnance === ordonnance.id ? (
                                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    currentPage === 1 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Précédent
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      page === currentPage 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    currentPage === totalPages 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal d'ajout */}
        {showAddModal && (
          <div className="absolute inset-0 flex items-start justify-center mt-2 z-20">
            <div className="bg-white w-full max-w-4xl p-6 rounded-lg shadow-lg relative mx-4">
              <FormulaireOrdonnance 
                isEdit={false}
                formData={formData}
                setFormData={setFormData}
                medicaments={medicaments}
                setMedicaments={setMedicaments}
                medecins={medecins}
                clients={clients}
                tickets={tickets}
                setTickets={setTickets}
                clientExistant={clientExistant}
                setClientExistant={setClientExistant}
                loadingMedecins={contextLoading.medecins}
                loadingClients={loadingClients}
                loadingTicket={loadingTicket}
                loadingNumeroSuggestion={loadingNumeroSuggestion}
                onSubmit={handleCreateOrdonnance}
                onCancel={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                onSuggestNumero={handleSuggestNumero}
                onSearchTickets={handleSearchTickets}
                onLoadTicketDetails={handleLoadTicketDetails}
                onClientSelection={handleClientSelection}
                onShowAddMedecin={handleShowAddMedecin}
              />
            </div>
          </div>
        )}

        {/* Modal d'édition */}
        {showEditModal && (
          <div className="absolute inset-0 flex items-start justify-center mt-2 z-20">
            <div className="bg-white w-full max-w-4xl p-6 rounded-lg shadow-lg relative mx-4">
              <FormulaireOrdonnance 
                isEdit={true}
                formData={formData}
                setFormData={setFormData}
                medicaments={medicaments}
                setMedicaments={setMedicaments}
                medecins={medecins}
                clients={clients}
                tickets={tickets}
                setTickets={setTickets}
                clientExistant={clientExistant}
                setClientExistant={setClientExistant}
                loadingMedecins={contextLoading.medecins}
                loadingClients={loadingClients}
                loadingTicket={loadingTicket}
                loadingNumeroSuggestion={loadingNumeroSuggestion}
                onSubmit={handleUpdateOrdonnance}
                onCancel={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                onSuggestNumero={handleSuggestNumero}
                onSearchTickets={handleSearchTickets}
                onLoadTicketDetails={handleLoadTicketDetails}
                onClientSelection={handleClientSelection}
                onShowAddMedecin={handleShowAddMedecin}
              />
            </div>
          </div>
        )}

        {/* Modal de détail d'ordonnance */}
        {showDetailModal && selectedOrdonnance && (
          <div className="absolute inset-0 flex items-start justify-start mt-2 ml-10 z-20">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg relative">
              
              {/* Contenu de l'ordonnance */}
              <div className="p-6">
                {/* En-tête */}
                <div className="flex items-center justify-center relative mb-6">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="absolute left-0 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Fermer"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-2xl font-medium text-gray-900 text-center">
                    ORDONNANCE MÉDICALE
                  </h2>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {/* Informations médecin (gauche) et N°/Date (droite) */}
                  <div className="grid grid-cols-2 gap-8 mb-6">
                   {/* Informations médecin - gauche */}
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Médecin prescripteur</p>
                      <div className="text-sm flex space-x-4">
                        <div>
                          <strong>Dr. {selectedOrdonnance.medecin?.nom_complet}</strong>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span>ONM: {selectedOrdonnance.medecin?.ONM}</span>
                          <span>Adresse: {selectedOrdonnance.medecin?.adresse || 'Non renseignée'}</span>
                          <span>Téléphone: {selectedOrdonnance.medecin?.telephone || 'Non renseigné'}</span>
                        </div>
                      </div>
                    </div>

                    {/* N° ordonnance et date */}
                    <div>
                      <div className="space-y-2 text-sm">
                        <p><strong>N° ordonnance:</strong> {selectedOrdonnance.numero_ordonnance}</p>
                        <p><strong>Date:</strong> {new Date(selectedOrdonnance.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Informations patient */}
                  <div className="mb-6 text-sm space-y-1">
                    <p><strong>Nom patient:</strong> {selectedOrdonnance.client?.nom_complet}</p>
                    <p><strong>Adresse:</strong> {selectedOrdonnance.client?.adresse}</p>
                    {selectedOrdonnance.client?.telephone && (
                      <p><strong>Téléphone:</strong> {selectedOrdonnance.client.telephone}</p>
                    )}
                  </div>

                  {/* Tableau des médicaments prescrits */}
                  <div className="mb-4">
                    <p className="font-semibold text-gray-900 mb-3">Médicaments prescrits</p>
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                              Nom du médicament
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                              Quantité
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                              Posologie
                            </th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                              Durée
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrdonnance.lignes?.map((ligne, index) => (
                            <tr key={ligne.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 text-sm border-b">
                                <strong>{ligne.designation}</strong>
                              </td>
                              <td className="px-4 py-3 text-sm text-center border-b">
                                {ligne.quantite}
                              </td>
                              <td className="px-4 py-3 text-sm border-b">
                                {ligne.posologie || 'Non renseigné'}
                              </td>
                              <td className="px-4 py-3 text-sm text-center border-b">
                                {ligne.duree || 'Non renseigné'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="border-t bg-gray-50 px-6 py-4 rounded-b-lg">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEditOrdonnance(selectedOrdonnance)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleDelete(selectedOrdonnance);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Supprimer
                    </button>
                    
                    <button
                      onClick={() => handleDirectPrint(selectedOrdonnance)}
                      disabled={printingOrdonnance === selectedOrdonnance.id}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      title="Impression directe"
                    >
                      {printingOrdonnance === selectedOrdonnance.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-2"></div>
                      ) : (
                        <Printer className="w-4 h-4 inline mr-2" />
                      )}
                      Imprimer
                    </button>
                    
                    <button
                      onClick={() => handleDownloadPdf(selectedOrdonnance)}
                      disabled={printingOrdonnance === selectedOrdonnance.id}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      title="Télécharger en PDF"
                    >
                      {printingOrdonnance === selectedOrdonnance.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-2"></div>
                      ) : (
                        <Download className="w-4 h-4 inline mr-2" />
                      )}
                      Telecharger
                    </button>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'ajout de médecin avec notifications harmonisées */}
        {showAddMedecinModal && (
          <div className="absolute inset-0 flex items-start justify-center mt-10 z-30">
            <FormulaireMedecin
              onSubmit={handleAddMedecin}
              onCancel={() => setShowAddMedecinModal(false)}
              loading={loadingAddMedecin}
            />
          </div>
        )}
      </div>
    );
  };

  export default Ordonnances;
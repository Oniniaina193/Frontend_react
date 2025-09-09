import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Eye, 
  Printer, 
  Calendar,
  FileText,
  X,
  Filter,
  Clock,
  FolderOpen,
  Download,
  RefreshCw
} from 'lucide-react';

import ordonnanceService from '../../services/OrdonnanceService';
import MedicamentAutocomplete from './MedicamentAutocomplete'; // Import du nouveau composant
import { 
  PrintNotification, 
  usePrintNotifications 
} from '../../utils/PrinterUtils';

// Hook personnalisé pour le debouncing des recherches (garde l'existant)
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Composant Modal de détails (garder l'existant)
const ModalDetailsHistorique = ({ selectedOrdonnance, onClose, onPrint, onDownload }) => {
  if (!selectedOrdonnance) return null;

  return (
    <div className="absolute inset-0 flex items-start justify-start mt-2 ml-10 z-20">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg relative">
        
        {/* Contenu de l'ordonnance */}
        <div className="p-6">
          {/* En-tête */}
          <div className="flex items-center justify-center relative mb-6">
            <button
              onClick={onClose}
              className="absolute left-0 text-gray-500 hover:text-gray-700 transition-colors"
              title="Fermer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-medium text-gray-900 text-center">
              ORDONNANCE MÉDICALE - HISTORIQUE
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

        {/* Boutons d'action - Imprimer, Télécharger et Fermer */}
        <div className="border-t bg-gray-50 px-6 py-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <button
                onClick={() => onPrint(selectedOrdonnance)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </button>
              <button
                onClick={() => onDownload(selectedOrdonnance)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </button>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal HistoriqueOrdonnances MODIFIÉ
const Historique = () => {
  // États principaux (garder les existants)
  const [ordonnances, setOrdonnances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // États pour les filtres - MODIFIÉS
  const [medicamentSelectionne, setMedicamentSelectionne] = useState('');
  const [dateFiltre, setDateFiltre] = useState('');
  const [medicamentsDisponibles, setMedicamentsDisponibles] = useState([]);
  const [loadingMedicaments, setLoadingMedicaments] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // États pour la modal (garder les existants)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);
  const [totalOrdonnances, setTotalOrdonnances] = useState(0);
  const [currentDossier, setCurrentDossier] = useState('');

  // Hook pour les notifications d'impression (garder existant)
  const { 
    notification, 
    showSuccess, 
    showError, 
    showInfo, 
    hideNotification 
  } = usePrintNotifications();

  // Debounce pour les recherches (garder existant)
  const debouncedMedicament = useDebounce(medicamentSelectionne, 300);
  const debouncedDate = useDebounce(dateFiltre, 300);

  // Fonctions existantes (garder telles quelles)
  const getCurrentDossierInfo = useCallback(async () => {
    try {
      const dossier = await ordonnanceService.syncCurrentDossier();
      setCurrentDossier(dossier);
      return dossier;
    } catch (error) {
      console.error('Erreur récupération dossier:', error);
      setError('Erreur lors de la récupération du dossier actuel');
      return 'default';
    }
  }, []);

  // NOUVELLE FONCTION : Charger les suggestions de médicaments avec cache
  const loadSuggestionsMedicaments = useCallback(async (forceRefresh = false) => {
    setLoadingSuggestions(true);
    setError('');
    
    try {
      const verificationResult = await ordonnanceService.verifyDossierConfiguration();
      
      if (!verificationResult.success) {
        setError(`Problème de configuration du dossier: ${verificationResult.message}`);
        setMedicamentsDisponibles([]);
        return;
      }

      const response = await ordonnanceService.getSuggestionsMedicaments(forceRefresh);
      if (response.success) {
        setMedicamentsDisponibles(response.data);
        console.log(`✅ ${response.data.length} suggestions chargées${response.fromCache ? ' (cache)' : ''} pour le dossier: ${verificationResult.dossier}`);
      } else {
        setError('Aucune suggestion trouvée pour ce dossier');
        setMedicamentsDisponibles([]);
      }
    } catch (err) {
      console.error('Erreur chargement suggestions:', err);
      setError('Erreur lors du chargement des suggestions pour ce dossier');
      setMedicamentsDisponibles([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // FONCTION MODIFIÉE : Recherche d'historique avec médicament libre
  const loadHistoriqueOrdonnances = useCallback(async () => {
    if (!debouncedMedicament && !debouncedDate) return;

    setLoading(true);
    setError('');
    
    try {
      const dossierInfo = await ordonnanceService.verifyDossierConfiguration();
      
      if (!dossierInfo.success) {
        setError(`Erreur de configuration du dossier: ${dossierInfo.message}`);
        setOrdonnances([]);
        setTotalOrdonnances(0);
        return;
      }

      const params = {
        page: currentPage,
        per_page: 10,
        ...(debouncedMedicament && { medicament_libre: debouncedMedicament }),
        ...(debouncedDate && { date: debouncedDate })
      };

      console.log('🔍 Recherche historique libre avec params:', params);
      console.log('📁 Pour le dossier:', dossierInfo.dossier);

      const response = await ordonnanceService.getHistoriqueParMedicamentLibre(params);
      
      if (response.success) {
        setOrdonnances(response.data.ordonnances);
        setTotalPages(response.data.pagination.last_page);
        setTotalOrdonnances(response.data.total_ordonnances || 0);
        
        console.log(`✅ ${response.data.ordonnances.length} ordonnances trouvées (recherche libre)`);
      } else {
        setError(response.message || 'Aucune ordonnance trouvée');
        setOrdonnances([]);
        setTotalOrdonnances(0);
      }
    } catch (err) {
      const errorMessage = err.message || 'Erreur lors du chargement de l\'historique';
      setError(errorMessage);
      setOrdonnances([]);
      setTotalOrdonnances(0);
      console.error('❌ Erreur historique libre:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedMedicament, debouncedDate]);

  // NOUVELLE FONCTION : Gestionnaire de recherche pour l'autocomplétion
  const handleMedicamentSearch = useCallback(async (medicament) => {
    console.log('🔍 Recherche déclenchée pour:', medicament);
    setMedicamentSelectionne(medicament);
    setCurrentPage(1);
  }, []);

  // NOUVELLE FONCTION : Gestionnaire de changement de médicament
  const handleMedicamentChange = useCallback((medicament) => {
    setMedicamentSelectionne(medicament);
    if (!medicament.trim()) {
      setOrdonnances([]);
      setTotalOrdonnances(0);
    }
  }, []);

  // Effets existants MODIFIÉS
  useEffect(() => {
    const initializeComponent = async () => {
      await getCurrentDossierInfo();
      loadSuggestionsMedicaments();
    };
    
    initializeComponent();
  }, [getCurrentDossierInfo, loadSuggestionsMedicaments]);

  // Surveiller les changements de dossier (MODIFIÉ)
  useEffect(() => {
    const handleDossierChange = () => {
      resetFiltres();
      getCurrentDossierInfo().then(() => {
        loadSuggestionsMedicaments(true);
      });
    };

    const handleOrdonnanceCreated = () => {
      console.log('🔄 Ordonnance créée détectée - rafraîchissement des suggestions');
      loadSuggestionsMedicaments(true);
      
      if (medicamentSelectionne || dateFiltre) {
        loadHistoriqueOrdonnances();
      }
    };

    window.addEventListener('storage', handleDossierChange);
    window.addEventListener('dossier-changed', handleDossierChange);
    window.addEventListener('ordonnance-created', handleOrdonnanceCreated);
    
    return () => {
      window.removeEventListener('storage', handleDossierChange);
      window.removeEventListener('dossier-changed', handleDossierChange);
      window.removeEventListener('ordonnance-created', handleOrdonnanceCreated);
    };
  }, [getCurrentDossierInfo, loadSuggestionsMedicaments, medicamentSelectionne, dateFiltre, loadHistoriqueOrdonnances]);

  // Rechargement avec debouncing (GARDER)
  useEffect(() => {
    if (debouncedMedicament || debouncedDate) {
      setCurrentPage(1);
      loadHistoriqueOrdonnances();
    } else {
      setOrdonnances([]);
      setTotalOrdonnances(0);
    }
  }, [currentPage, loadHistoriqueOrdonnances, debouncedMedicament, debouncedDate]);

  // Voir les détails d'une ordonnance
  const handleViewDetails = async (ordonnance) => {
    try {
      const response = await ordonnanceService.getOrdonnance(ordonnance.id);
      if (response.success) {
        setSelectedOrdonnance(response.data);
        setShowDetailModal(true);
      } else {
        setError('Impossible de charger les détails de l\'ordonnance');
      }
    } catch (err) {
      setError('Erreur lors du chargement: ' + err.message);
    }
  };

  const handlePrintOrdonnance = async (ordonnance) => {
    try {
      showInfo('Lancement de l\'impression...');
      await ordonnanceService.printOrdonnance(ordonnance.id);
      showSuccess('Impression lancée avec succès');
    } catch (error) {
      showError(`Erreur impression: ${error.message}`);
    }
  };

  const handleDownloadOrdonnance = async (ordonnance) => {
    try {
      showInfo('Génération du PDF...');
      await ordonnanceService.downloadPdfOrdonnance(ordonnance.id, ordonnance.numero_ordonnance);
      showSuccess('PDF téléchargé avec succès');
    } catch (error) {
      showError(`Erreur téléchargement: ${error.message}`);
    }
  };

  // Générer le titre pour les exports
  const generateExportTitle = useMemo(() => {
    const parts = ['Ordonnances'];
    
    if (debouncedMedicament) {
      const medicament = medicamentsDisponibles.find(m => m.designation === debouncedMedicament);
      parts.push(`- ${medicament ? medicament.designation : debouncedMedicament}`);
    }
    
    if (debouncedDate) {
      const dateFormatee = new Date(debouncedDate).toLocaleDateString('fr-FR');
      parts.push(`- ${dateFormatee}`);
    }
    
    if (currentDossier && currentDossier !== 'default') {
      parts.push(`(${currentDossier})`);
    }
    
    return parts.join(' ');
  }, [debouncedMedicament, debouncedDate, currentDossier, medicamentsDisponibles]);

  // Exporter la liste en PDF
  const handleExportListPDF = async () => {
    if (ordonnances.length === 0) {
      showError('Aucune ordonnance à exporter');
      return;
    }

    setExportLoading(true);
    try {
      showInfo('Génération de l\'export PDF...');
      
      const params = {
        medicament: debouncedMedicament,
        date: debouncedDate,
        titre: generateExportTitle,
        format: 'pdf'
      };
      
      await ordonnanceService.exportHistoriqueList(params);
      showSuccess('Export PDF généré avec succès');
    } catch (error) {
      showError(`Erreur export: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Imprimer la liste
  const handlePrintList = async () => {
    if (ordonnances.length === 0) {
      showError('Aucune ordonnance à imprimer');
      return;
    }

    setExportLoading(true);
    try {
      showInfo('Préparation de l\'impression...');
      
      const params = {
        medicament: debouncedMedicament,
        date: debouncedDate,
        titre: generateExportTitle
      };
      
      await ordonnanceService.printHistoriqueList(params);
      showSuccess('Impression lancée');
    } catch (error) {
      showError(`Erreur impression: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const resetFiltres = () => {
    setMedicamentSelectionne('');
    setDateFiltre('');
    setCurrentPage(1);
    setOrdonnances([]);
    setTotalOrdonnances(0);
    setError('');
  };

  const refreshDossierData = async () => {
    setError('');
    setLoading(true);
    
    try {
      await getCurrentDossierInfo();
      await loadSuggestionsMedicaments(true);
      
      if (debouncedMedicament || debouncedDate) {
        await loadHistoriqueOrdonnances();
      }
    } catch (error) {
      setError('Erreur lors de la mise à jour des données');
    } finally {
      setLoading(false);
    }
  };

  // Générer le texte de résumé des résultats
  const getTexteSummary = () => {
    if (!debouncedMedicament && !debouncedDate) return null;

    const dossierText = currentDossier ? ` (Dossier: ${currentDossier})` : '';

    if (debouncedMedicament && debouncedDate) {
      const medicament = medicamentsDisponibles.find(m => m.designation === debouncedMedicament);
      const nomMedicament = medicament ? medicament.designation : debouncedMedicament;
      const dateFormatee = new Date(debouncedDate).toLocaleDateString('fr-FR');
      return `${totalOrdonnances} ordonnance(s) pour ${nomMedicament} le ${dateFormatee}${dossierText}`;
    } else if (debouncedMedicament) {
      const medicament = medicamentsDisponibles.find(m => m.designation === debouncedMedicament);
      const nomMedicament = medicament ? medicament.designation : debouncedMedicament;
      return `${totalOrdonnances} ordonnance(s) pour ${nomMedicament}${dossierText}`;
    } else if (debouncedDate) {
      const dateFormatee = new Date(debouncedDate).toLocaleDateString('fr-FR');
      return `${totalOrdonnances} ordonnance(s) enregistrée(s) le ${dateFormatee}${dossierText}`;
    }
  };

  const peutRechercher = debouncedMedicament || debouncedDate;

  return (
    <div className="space-y-6 relative">
      {/* Notifications d'impression */}
      <PrintNotification
        isVisible={notification.isVisible}
        type={notification.type}
        message={notification.message}
        onClose={hideNotification}
      />

      {/* Header MODIFIÉ */}
      <div className="flex justify-between items-center">
        <div></div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 font-serif">Historique des Ordonnances</h2>
        </div>
        {/* NOUVELLE section : Boutons d'action à droite */}
        <div className="flex space-x-2 items-center">
          {/* Boutons d'export (déplacés ici) */}
          {peutRechercher && ordonnances.length > 0 && (
            <>
              <button
                onClick={handlePrintList}
                disabled={loading || exportLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
                title="Imprimer Liste"
              >
                <Printer className="w-4 h-4 mr-1" />
                {exportLoading ? 'Impression...' : 'Imprimer'}
              </button>
              <button
                onClick={handleExportListPDF}
                disabled={loading || exportLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center"
                title="Exporter PDF"
              >
                <Download className="w-4 h-4 mr-1" />
                {exportLoading ? 'Export...' : 'Export'}
              </button>
            </>
          )}
          
          {/* Bouton réinitialiser (icône seulement) */}
          <button
            onClick={resetFiltres}
            className="text-gray-500 hover:text-gray-700 p-2 rounded transition-colors"
            title="Réinitialiser les filtres"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Bouton actualiser */}
          <button
            onClick={refreshDossierData}
            className="text-gray-500 hover:text-gray-700 p-2 rounded transition-colors"
            title="Actualiser les données"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Résumé des résultats (NOUVEAU) */}
      {peutRechercher && ordonnances.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800 font-medium">
            <strong>Résultats:</strong> {getTexteSummary()}
          </div>
        </div>
      )}

      {/* Filtres MODIFIÉS - Labels inline */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* Autocomplétion médicament */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Nom :
            </label>
            <div className="flex-1">
              <MedicamentAutocomplete
                value={medicamentSelectionne}
                onChange={handleMedicamentChange}
                onSearch={handleMedicamentSearch}
                suggestions={medicamentsDisponibles}
                loading={loadingSuggestions}
                placeholder="Saisissez le nom d'un médicament..."
              />
              {loadingSuggestions && (
                <p className="text-xs text-gray-500 mt-1">Chargement des suggestions...</p>
              )}
            </div>
          </div>

          {/* Filtre par date */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Date :
            </label>
            <input
              type="date"
              value={dateFiltre}
              onChange={(e) => {
                setDateFiltre(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className={`${showDetailModal ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
        {!peutRechercher ? (
          <div className="text-center py-12">
            <Filter className="w-16 h-16 text-gray-300 mb-4 mx-auto" />
            <p className="text-gray-500">Sélectionnez un médicament et/ou une date pour voir l'historique des ordonnances</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de l'historique...</p>
          </div>
        ) : ordonnances.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mb-4 mx-auto" />
            <p className="text-gray-500">Aucune ordonnance trouvée avec ces critères</p>
            {debouncedMedicament && (
              <p className="text-sm text-gray-400 mt-2">
                Recherche effectuée pour : "{debouncedMedicament}"
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Tableau des résultats MODIFIÉ - Actions simplifiées */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom Client
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom Médicament
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Ordonnance
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        N° Ordonnance
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ordonnances.map((ordonnance) => (
                      <tr key={ordonnance.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">
                                {ordonnance.client?.nom_complet}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {ordonnance.medicament_principal || debouncedMedicament || 'Divers médicaments'}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {new Date(ordonnance.date).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900 font-medium">
                            {ordonnance.numero_ordonnance}
                          </div>
                        </td>
                        {/* MODIFIÉ : Seulement le bouton Détails */}
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleViewDetails(ordonnance)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center mx-auto"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Détails
                          </button>
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

      {/* Modal de détail */}
      {showDetailModal && selectedOrdonnance && (
        <ModalDetailsHistorique 
          selectedOrdonnance={selectedOrdonnance}
          onClose={() => setShowDetailModal(false)}
          onPrint={handlePrintOrdonnance}
          onDownload={handleDownloadOrdonnance}
        />
      )}
    </div>
  );
};

export default Historique;
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Eye, 
  Printer, 
  Calendar,
  FileText,
  X,
  Filter,
  Clock
} from 'lucide-react';

import ordonnanceService from '../../services/ordonnanceService';

// Composant Modal de détails (version historique - sans modifier/supprimer)
const ModalDetailsHistorique = ({ selectedOrdonnance, onClose }) => {
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

        {/* Boutons d'action - SEULEMENT Imprimer et Fermer */}
        <div className="border-t bg-gray-50 px-6 py-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  console.log('Impression de l\'ordonnance:', selectedOrdonnance.numero_ordonnance);
                  alert('Fonction d\'impression à implémenter');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Printer className="w-4 h-4 inline mr-2" />
                Imprimer
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

// Composant principal HistoriqueOrdonnances
const Historique = () => {
  // États principaux
  const [ordonnances, setOrdonnances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // États pour les filtres
  const [medicamentSelectionne, setMedicamentSelectionne] = useState('');
  const [dateFiltre, setDateFiltre] = useState('');
  const [medicamentsDisponibles, setMedicamentsDisponibles] = useState([]);
  const [loadingMedicaments, setLoadingMedicaments] = useState(false);

  // État pour la modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);

  // État pour les statistiques
  const [totalOrdonnances, setTotalOrdonnances] = useState(0);

  // Chargement initial
  useEffect(() => {
    loadMedicamentsDisponibles();
  }, []);

  // Rechargement quand les filtres changent
  useEffect(() => {
    // MODIFICATION: Permettre la recherche avec médicament OU date (ou les deux)
    if (medicamentSelectionne || dateFiltre) {
      loadHistoriqueOrdonnances();
    } else {
      setOrdonnances([]);
      setTotalOrdonnances(0);
    }
  }, [currentPage, medicamentSelectionne, dateFiltre]);

  // Charger la liste des médicaments qui ont des ordonnances
  const loadMedicamentsDisponibles = async () => {
    setLoadingMedicaments(true);
    try {
      const response = await ordonnanceService.getMedicamentsAvecOrdonnances();
      if (response.success) {
        setMedicamentsDisponibles(response.data);
      }
    } catch (err) {
      console.error('Erreur chargement médicaments:', err);
      setError('Erreur lors du chargement des médicaments');
    } finally {
      setLoadingMedicaments(false);
    }
  };

  // Charger l'historique des ordonnances selon les filtres
  const loadHistoriqueOrdonnances = async () => {
    // MODIFICATION: Permettre la recherche sans médicament si une date est sélectionnée
    if (!medicamentSelectionne && !dateFiltre) return;

    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        per_page: 10,
        ...(medicamentSelectionne && { medicament: medicamentSelectionne }),
        ...(dateFiltre && { date: dateFiltre })
      };

      const response = await ordonnanceService.getHistoriqueParMedicament(params);
      if (response.success) {
        setOrdonnances(response.data.ordonnances);
        setTotalPages(response.data.pagination.last_page);
        setTotalOrdonnances(response.data.total_ordonnances || 0);
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique');
      console.error(err);
    } finally {
      setLoading(false);
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
    }
  };

  // Reset filtres
  const resetFiltres = () => {
    setMedicamentSelectionne('');
    setDateFiltre('');
    setCurrentPage(1);
    setOrdonnances([]);
    setTotalOrdonnances(0);
  };

  // MODIFICATION: Générer le texte de résumé des résultats - prendre en compte la recherche par date seule
  const getTexteSummary = () => {
    if (!medicamentSelectionne && !dateFiltre) return null;

    if (medicamentSelectionne && dateFiltre) {
      // Recherche par médicament ET date
      const medicament = medicamentsDisponibles.find(m => m.designation === medicamentSelectionne);
      const nomMedicament = medicament ? medicament.designation : medicamentSelectionne;
      const dateFormatee = new Date(dateFiltre).toLocaleDateString('fr-FR');
      return `${totalOrdonnances} ordonnance(s) pour ${nomMedicament} le ${dateFormatee}`;
    } else if (medicamentSelectionne) {
      // Recherche par médicament seulement
      const medicament = medicamentsDisponibles.find(m => m.designation === medicamentSelectionne);
      const nomMedicament = medicament ? medicament.designation : medicamentSelectionne;
      return `${totalOrdonnances} ordonnance(s) pour ${nomMedicament}`;
    } else if (dateFiltre) {
      // NOUVEAU: Recherche par date seulement
      const dateFormatee = new Date(dateFiltre).toLocaleDateString('fr-FR');
      return `${totalOrdonnances} ordonnance(s) enregistrée(s) le ${dateFormatee}`;
    }
  };

  // MODIFICATION: Vérifier si on peut faire une recherche
  const peutRechercher = medicamentSelectionne || dateFiltre;

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div></div>
        <h2 className="text-2xl font-bold text-gray-900 font-serif">Historique des Ordonnances</h2>
        <div></div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Sélection médicament */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline w-4 h-4 mr-2" />
              Rechercher par médicament
            </label>
            <select
              value={medicamentSelectionne}
              onChange={(e) => {
                setMedicamentSelectionne(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loadingMedicaments}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
            >
              <option value="">
                {loadingMedicaments ? 'Chargement...' : 'Sélectionner un médicament... (optionnel)'}
              </option>
              {medicamentsDisponibles.map((medicament) => (
                <option key={medicament.designation} value={medicament.designation}>
                  {medicament.designation} 
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-2" />
              Filtrer par date
            </label>
            <input
              type="date"
              value={dateFiltre}
              onChange={(e) => {
                setDateFiltre(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bouton reset */}
          <div>
            <button
              onClick={resetFiltres}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors text-sm"
            >
              <X className="inline w-4 h-4 mr-2" />
              Réinitialiser
            </button>
          </div>

          {/* Résumé des résultats */}
          <div>
            {peutRechercher && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
                <div className="text-sm font-medium text-blue-800">
                  <Clock className="inline w-4 h-4 mr-1" />
                  {getTexteSummary()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
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
          </div>
        ) : (
          <>
            {/* Tableau des résultats */}
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
                        Détails
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
                            {medicamentSelectionne || 'Tous médicaments'}
                          </div>
                          <div className="text-xs text-gray-500">
                            N° ordonnance {ordonnance.numero_ordonnance}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {new Date(ordonnance.date).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleViewDetails(ordonnance)}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-900 p-1 rounded transition-colors mx-auto"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">Détails</span>
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
        />
      )}
    </div>
  );
};

export default Historique;
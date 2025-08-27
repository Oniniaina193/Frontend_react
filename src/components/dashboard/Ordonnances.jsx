import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';

import ordonnanceService from '../../services/ordonnanceService';
import clientService from '../../services/ClientService';
import medecinService from '../../services/medecinService';

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
    numero_ordonnance: '', // MODIFICATION 1: Champ pour numéro manuel
    medecin_id: '',
    date: new Date().toISOString().split('T')[0],
    client_nom_complet: '',
    client_adresse: '',
    client_telephone: '',
    code_ticket: ''
  });
  const [medicaments, setMedicaments] = useState([]);
  const [clientExistant, setClientExistant] = useState(null);

  // États pour les autocompletes
  const [medecins, setMedecins] = useState([]);
  const [clients, setClients] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [loadingNumeroSuggestion, setLoadingNumeroSuggestion] = useState(false);

  // États pour la modification
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Chargement initial
  useEffect(() => {
    loadOrdonnances();
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
        setOrdonnances(response.data.ordonnances);
        setTotalPages(response.data.pagination.last_page);
      }
    } catch (err) {
      setError('Erreur lors du chargement des ordonnances');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // MODIFICATION 2 & 5: Recherche de médecins avec nouveau format
  const searchMedecins = async (query) => {
    if (query.length < 2) {
      setMedecins([]);
      return;
    }
    try {
      const response = await ordonnanceService.getMedecinsForSelection();
      if (response.success) {
        // Filtrer les médecins en fonction de la recherche
        const filtered = response.data.filter(medecin => 
          medecin.nom_complet.toLowerCase().includes(query.toLowerCase()) ||
          medecin.ONM.toLowerCase().includes(query.toLowerCase())
        );
        setMedecins(filtered);
      }
    } catch (err) {
      console.error('Erreur recherche médecins:', err);
    }
  };

  // Recherche de clients
  const searchClients = async (query) => {
    if (query.length < 2) {
      setClients([]);
      return;
    }
    try {
      const response = await clientService.searchClients(query);
      if (response.success) {
        setClients(response.data);
      }
    } catch (err) {
      console.error('Erreur recherche clients:', err);
    }
  };

  // Recherche de tickets
  const searchTickets = async (query) => {
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
  };

  // Charger les détails d'un ticket
  const loadTicketDetails = async (codeTicket) => {
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
  };

  // MODIFICATION 1: Suggérer un numéro d'ordonnance
  const suggestNumeroOrdonnance = async () => {
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
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
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
    setMedecins([]);
    setClients([]);
    setTickets([]);
    setError('');
    setIsEditing(false);
    setEditingId(null);
  };

  // Créer une ordonnance
  const handleCreateOrdonnance = async () => {
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
        return;
      }

      const response = await ordonnanceService.createOrdonnance(ordonnanceData);
      if (response.success) {
        setShowAddModal(false);
        resetForm();
        loadOrdonnances();
        alert('Ordonnance créée avec succès');
      }
    } catch (err) {
      setError('Erreur lors de la création: ' + err.message);
    }
  };

  // MODIFICATION 4: Modifier une ordonnance
  const handleUpdateOrdonnance = async () => {
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
        return;
      }

      const response = await ordonnanceService.updateOrdonnance(editingId, ordonnanceData);
      if (response.success) {
        setShowEditModal(false);
        resetForm();
        loadOrdonnances();
        alert('Ordonnance modifiée avec succès');
      }
    } catch (err) {
      setError('Erreur lors de la modification: ' + err.message);
    }
  };

  // Supprimer une ordonnance
  const handleDelete = async (ordonnance) => {
    if (!confirm(`Supprimer l'ordonnance ${ordonnance.numero_ordonnance} ?`)) return;

    try {
      const response = await ordonnanceService.deleteOrdonnance(ordonnance.id);
      if (response.success) {
        loadOrdonnances();
        alert('Ordonnance supprimée avec succès');
      }
    } catch (err) {
      setError('Erreur lors de la suppression: ' + err.message);
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

  // MODIFICATION 4: Préparer l'édition d'une ordonnance
  const handleEditOrdonnance = async (ordonnance) => {
    try {
      const response = await ordonnanceService.getOrdonnance(ordonnance.id);
      if (response.success) {
        const ordonnanceData = response.data;
        
        // Remplir le formulaire avec les données existantes
        setFormData({
          numero_ordonnance: ordonnanceData.numero_ordonnance, // Lecture seule en modification
          medecin_id: ordonnanceData.medecin_id,
          date: ordonnanceData.date,
          client_nom_complet: ordonnanceData.client?.nom_complet || '',
          client_adresse: ordonnanceData.client?.adresse || '',
          client_telephone: ordonnanceData.client?.telephone || '',
          code_ticket: ''
        });

        // MODIFICATION 4: Charger les médicaments avec posologie et durée modifiables
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
    }
  };

  // Mise à jour des médicaments (posologie/durée)
  const updateMedicament = (index, field, value) => {
    const updatedMedicaments = [...medicaments];
    updatedMedicaments[index][field] = value;
    setMedicaments(updatedMedicaments);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Gestion des Ordonnances
              </h1>
              <p className="text-sm text-gray-600">
                Créer et gérer les ordonnances médicales
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle ordonnance</span>
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="mt-6 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, client, médecin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Message d'erreur global */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Liste des ordonnances */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : ordonnances.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune ordonnance trouvée
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Aucun résultat pour votre recherche' : 'Commencez par créer votre première ordonnance'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° Ordonnance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Médecin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Médicaments
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ordonnances.map((ordonnance) => (
                    <tr key={ordonnance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {ordonnance.numero_ordonnance}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {new Date(ordonnance.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ordonnance.client?.nom_complet}
                            </div>
                            {ordonnance.client?.telephone && (
                              <div className="text-xs text-gray-500">
                                {ordonnance.client.telephone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          Dr. {ordonnance.medecin?.nom_complet}
                        </div>
                        <div className="text-xs text-gray-500">
                          ONM: {ordonnance.medecin?.ONM}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {ordonnance.total_medicaments || 0} médicament(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewDetails(ordonnance)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditOrdonnance(ordonnance)}
                            className="text-green-600 hover:text-green-900 p-1 rounded"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {/* TODO: handlePrint */}}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded"
                            title="Imprimer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ordonnance)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout d'ordonnance */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Nouvelle ordonnance
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* MODIFICATION 1: Section Numéro d'ordonnance */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">0. Numéro d'ordonnance</h3>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="Numéro d'ordonnance (requis)"
                    value={formData.numero_ordonnance}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_ordonnance: e.target.value }))}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={suggestNumeroOrdonnance}
                    disabled={loadingNumeroSuggestion}
                    className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                    title="Suggérer un numéro automatique"
                  >
                    {loadingNumeroSuggestion ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Section 1: Médecin */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">1. Sélection du médecin</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un médecin par nom..."
                    onChange={(e) => searchMedecins(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {medecins.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 mt-1">
                      {medecins.map((medecin) => (
                        <button
                          key={medecin.id}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, medecin_id: medecin.id }));
                            setMedecins([]);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="font-medium">{medecin.nom_complet} ({medecin.ONM})</div>
                          {medecin.telephone && (
                            <div className="text-sm text-gray-500">Tél: {medecin.telephone}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!formData.medecin_id && (
                  <button
                    onClick={() => setShowAddMedecinModal(true)}
                    className="mt-3 flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Ajouter un nouveau médecin</span>
                  </button>
                )}
              </div>

              {/* Section 2: Date */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">2. Date de l'ordonnance</h3>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Section 3: Client */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">3. Informations du client</h3>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Rechercher un client existant..."
                    onChange={(e) => searchClients(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {clients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 mt-1">
                      {clients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => {
                            setClientExistant(client);
                            setFormData(prev => ({
                              ...prev,
                              client_nom_complet: client.nom_complet,
                              client_adresse: client.adresse,
                              client_telephone: client.telephone || ''
                            }));
                            setClients([]);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="font-medium">{client.nom_complet}</div>
                          <div className="text-sm text-gray-500">{client.telephone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nom complet *"
                    value={formData.client_nom_complet}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_nom_complet: e.target.value }))}
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Téléphone"
                    value={formData.client_telephone}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_telephone: e.target.value }))}
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Adresse complète *"
                    value={formData.client_adresse}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_adresse: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Section 4: Ticket */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">4. Code ticket (médicaments)</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Saisir le code ticket (ex: 24T00015)"
                    value={formData.code_ticket}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, code_ticket: value }));
                      if (value.length >= 3) {
                        searchTickets(value);
                      }
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {tickets.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 mt-1">
                      {tickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={() => {
                            loadTicketDetails(ticket.code);
                            setTickets([]);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="font-medium">{ticket.code}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {formData.code_ticket && (
                  <button
                    onClick={() => loadTicketDetails(formData.code_ticket)}
                    disabled={loadingTicket}
                    className="mt-3 flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                  >
                    {loadingTicket ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Charger les médicaments</span>
                  </button>
                )}
              </div>

              {/* Section 5: Médicaments */}
              {medicaments.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">5. Médicaments prescrits</h3>
                  <div className="space-y-4">
                    {medicaments.map((medicament, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Médicament
                            </label>
                            <div className="p-2 bg-gray-50 rounded border text-sm">
                              {medicament.designation} (Qté: {medicament.quantite})
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Posologie *
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: 1 comprimé 3 fois/jour"
                              value={medicament.posologie || ''}
                              onChange={(e) => updateMedicament(index, 'posologie', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Durée *
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: 7 jours"
                              value={medicament.duree || ''}
                              onChange={(e) => updateMedicament(index, 'duree', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateOrdonnance}
                  disabled={!formData.numero_ordonnance || !formData.medecin_id || !formData.client_nom_complet || medicaments.length === 0}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>Créer l'ordonnance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification d'ordonnance - MODIFICATION 4 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Modifier l'ordonnance {formData.numero_ordonnance}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Numéro d'ordonnance (lecture seule en modification) */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">Numéro d'ordonnance</h3>
                <input
                  type="text"
                  value={formData.numero_ordonnance}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="text-sm text-gray-500 mt-2">Le numéro d'ordonnance ne peut pas être modifié</p>
              </div>

              {/* Section 1: Médecin */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">1. Sélection du médecin</h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un médecin par nom..."
                    onChange={(e) => searchMedecins(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {medecins.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 mt-1">
                      {medecins.map((medecin) => (
                        <button
                          key={medecin.id}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, medecin_id: medecin.id }));
                            setMedecins([]);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="font-medium">{medecin.nom_complet} ({medecin.ONM})</div>
                          {medecin.telephone && (
                            <div className="text-sm text-gray-500">Tél: {medecin.telephone}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Date */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">2. Date de l'ordonnance</h3>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Section 3: Client (MODIFICATION 4: Modifiable) */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">3. Informations du client</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nom complet *"
                    value={formData.client_nom_complet}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_nom_complet: e.target.value }))}
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Téléphone"
                    value={formData.client_telephone}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_telephone: e.target.value }))}
                    className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Adresse complète *"
                    value={formData.client_adresse}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_adresse: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Section 4: Médicaments (MODIFICATION 4: Posologie et durée modifiables) */}
              {medicaments.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">4. Médicaments prescrits</h3>
                  <div className="space-y-4">
                    {medicaments.map((medicament, index) => (
                      <div key={medicament.id || index} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Médicament
                            </label>
                            <div className="p-2 bg-gray-50 rounded border text-sm">
                              {medicament.designation} (Qté: {medicament.quantite})
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Posologie *
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: 1 comprimé 3 fois/jour"
                              value={medicament.posologie || ''}
                              onChange={(e) => updateMedicament(index, 'posologie', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Durée *
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: 7 jours"
                              value={medicament.duree || ''}
                              onChange={(e) => updateMedicament(index, 'duree', e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateOrdonnance}
                  disabled={!formData.medecin_id || !formData.client_nom_complet || medicaments.length === 0}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails */}
      {showDetailModal && selectedOrdonnance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Ordonnance {selectedOrdonnance.numero_ordonnance}
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Médecin prescripteur</h3>
                  <div className="space-y-1">
                    <div className="font-medium">Dr. {selectedOrdonnance.medecin?.nom_complet}</div>
                    <div className="text-sm text-gray-600">ONM: {selectedOrdonnance.medecin?.ONM}</div>
                    {selectedOrdonnance.medecin?.telephone && (
                      <div className="text-sm text-gray-600">Tél: {selectedOrdonnance.medecin.telephone}</div>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Patient</h3>
                  <div className="space-y-1">
                    <div className="font-medium">{selectedOrdonnance.client?.nom_complet}</div>
                    <div className="text-sm text-gray-600">{selectedOrdonnance.client?.adresse}</div>
                    {selectedOrdonnance.client?.telephone && (
                      <div className="text-sm text-gray-600">Tél: {selectedOrdonnance.client.telephone}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Date d'émission</div>
                    <div className="font-medium">
                      {new Date(selectedOrdonnance.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Créée le</div>
                    <div className="font-medium">
                      {new Date(selectedOrdonnance.created_at).toLocaleDateString('fr-FR')} à {new Date(selectedOrdonnance.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Liste des médicaments */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Médicaments prescrits</h3>
                <div className="space-y-4">
                  {selectedOrdonnance.lignes?.map((ligne, index) => (
                    <div key={ligne.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Médicament</div>
                          <div className="font-medium text-gray-900">{ligne.designation}</div>
                          <div className="text-sm text-gray-500">Quantité: {ligne.quantite} unité(s)</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Posologie</div>
                          <div className="text-gray-900">{ligne.posologie}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Durée</div>
                          <div className="text-gray-900">{ligne.duree}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleEditOrdonnance(selectedOrdonnance)}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement print functionality
                      alert('Fonction d\'impression à implémenter');
                    }}
                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer</span>
                  </button>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleDelete(selectedOrdonnance);
                    }}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ordonnances;
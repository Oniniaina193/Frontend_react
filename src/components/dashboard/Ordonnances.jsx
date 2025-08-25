import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Printer, ArrowLeft, Save, X, AlertCircle, CheckCircle, Loader, User, Calendar, FileText } from 'lucide-react';
import { useData } from '../../contexts/DataContext'; // Import du contexte

// Composant principal
const Ordonnances = () => {
  const {
    // États du contexte
    ordonnances,
    selectedOrdonnance,
    medecins,
    tickets,
    loading,
    errors,
    
    // Fonctions du contexte
    loadOrdonnances,
    loadOrdonnanceDetail,
    createOrdonnance,
    updateOrdonnance,
    deleteOrdonnance,
    searchTickets,
    getMedicamentsFromTicket,
    setSelectedOrdonnance,
    loadMedecins
  } = useData();

  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'detail', 'edit'
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  // Charger les ordonnances avec gestion de la pagination
  const handleLoadOrdonnances = useCallback(async (page = 1, search = '') => {
    try {
      const result = await loadOrdonnances({ page, search, per_page: 20 });
      if (result && result.pagination) {
        setPagination(result.pagination);
      }
    } catch (error) {
      if (error.name === 'RedirectError') {
        // Gestion des redirections (sélection de dossier)
        showNotification(error.message, 'error');
      } else {
        showNotification('Erreur lors du chargement des ordonnances', 'error');
      }
    }
  }, [loadOrdonnances]);

  // Effet initial
  useEffect(() => {
    handleLoadOrdonnances();
    loadMedecins(); // Charger les médecins si pas déjà fait
  }, [handleLoadOrdonnances, loadMedecins]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleLoadOrdonnances(1, searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, handleLoadOrdonnances]);

  // Afficher notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Voir détails ordonnance
  const handleViewDetail = async (ordonnanceId) => {
    try {
      await loadOrdonnanceDetail(ordonnanceId);
      setCurrentView('detail');
    } catch (error) {
      showNotification(error.message || 'Erreur lors du chargement des détails', 'error');
    }
  };

  // Supprimer ordonnance
  const handleDelete = async (ordonnanceId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette ordonnance ?')) {
      return;
    }

    try {
      await deleteOrdonnance(ordonnanceId);
      showNotification('Ordonnance supprimée avec succès', 'success');
      if (currentView === 'detail') {
        setCurrentView('list');
      }
      handleLoadOrdonnances();
    } catch (error) {
      showNotification(error.message || 'Erreur lors de la suppression', 'error');
    }
  };

  // Imprimer ordonnance
  const handlePrint = () => {
    if (selectedOrdonnance) {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          <div className="flex items-center">
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : 
             notification.type === 'error' ? <AlertCircle className="w-5 h-5 mr-2" /> :
             <AlertCircle className="w-5 h-5 mr-2" />}
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              {currentView !== 'list' && (
                <button
                  onClick={() => setCurrentView('list')}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentView === 'list' ? 'Gestion des Ordonnances' :
                   currentView === 'create' ? 'Nouvelle Ordonnance' :
                   currentView === 'edit' ? 'Modifier Ordonnance' :
                   'Détails Ordonnance'}
                </h1>
                {currentView === 'list' && (
                  <p className="mt-1 text-sm text-gray-500">
                    {pagination.total} ordonnance{pagination.total > 1 ? 's' : ''} au total
                  </p>
                )}
              </div>
            </div>

            {currentView === 'list' && (
              <button
                onClick={() => setCurrentView('create')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Ordonnance
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vue Liste */}
        {currentView === 'list' && (
          <ListeOrdonnances
            ordonnances={ordonnances}
            loading={loading.ordonnances}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onViewDetail={handleViewDetail}
            onDelete={handleDelete}
            pagination={pagination}
            onPageChange={(page) => handleLoadOrdonnances(page, searchTerm)}
          />
        )}

        {/* Vue Création */}
        {currentView === 'create' && (
          <FormulaireOrdonnance
            onSuccess={() => {
              setCurrentView('list');
              handleLoadOrdonnances();
              showNotification('Ordonnance créée avec succès', 'success');
            }}
            onCancel={() => setCurrentView('list')}
            showNotification={showNotification}
          />
        )}

        {/* Vue Détails */}
        {currentView === 'detail' && selectedOrdonnance && (
          <DetailsOrdonnance
            ordonnance={selectedOrdonnance}
            onEdit={() => setCurrentView('edit')}
            onDelete={() => handleDelete(selectedOrdonnance.id)}
            onPrint={handlePrint}
          />
        )}

        {/* Vue Modification */}
        {currentView === 'edit' && selectedOrdonnance && (
          <FormulaireOrdonnance
            ordonnance={selectedOrdonnance}
            onSuccess={() => {
              setCurrentView('detail');
              handleViewDetail(selectedOrdonnance.id);
              showNotification('Ordonnance modifiée avec succès', 'success');
            }}
            onCancel={() => setCurrentView('detail')}
            showNotification={showNotification}
          />
        )}
      </div>
    </div>
  );
};

// Composant Liste des Ordonnances
const ListeOrdonnances = ({ 
  ordonnances, 
  loading, 
  searchTerm, 
  onSearchChange, 
  onViewDetail, 
  onDelete, 
  pagination, 
  onPageChange 
}) => {
  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher par numéro d'ordonnance ou nom client..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : ordonnances.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune ordonnance</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Aucun résultat pour cette recherche.' : 'Commencez par créer une nouvelle ordonnance.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numéro Ordonnance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Médecin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Médicaments
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ordonnances.map((ordonnance) => (
                    <tr key={ordonnance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ordonnance.numero_affichage || ordonnance.numero_saisi}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {ordonnance.client?.nom_complet || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {ordonnance.medecin?.nom_complet || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-500">
                            {new Date(ordonnance.date_creation).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {ordonnance.nombre_medicaments || ordonnance.lignes?.length || 0} médicament{(ordonnance.nombre_medicaments > 1 || (ordonnance.lignes?.length || 0) > 1) ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onViewDetail(ordonnance.id)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(ordonnance.id)}
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

            {/* Pagination */}
            {pagination.last_page > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => onPageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => onPageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Affichage de{' '}
                      <span className="font-medium">{pagination.from}</span>
                      {' '}à{' '}
                      <span className="font-medium">{pagination.to}</span>
                      {' '}sur{' '}
                      <span className="font-medium">{pagination.total}</span>
                      {' '}résultats
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: Math.min(pagination.last_page, 10) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pagination.current_page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            } ${page === 1 ? 'rounded-l-md' : ''} ${page === Math.min(pagination.last_page, 10) ? 'rounded-r-md' : ''}`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Composant Formulaire Ordonnance
const FormulaireOrdonnance = ({ ordonnance, onSuccess, onCancel, showNotification }) => {
  const {
    medecins,
    tickets,
    loading,
    errors,
    createOrdonnance,
    updateOrdonnance,
    searchTickets,
    getMedicamentsFromTicket
  } = useData();

  const [formData, setFormData] = useState({
    numero_ordonnance: ordonnance?.numero_saisi || '',
    client: {
      nom_complet: ordonnance?.client?.nom_complet || '',
      adresse: ordonnance?.client?.adresse || '',
      telephone: ordonnance?.client?.telephone || ''
    },
    medecin_id: ordonnance?.medecin_id || '',
    medicaments: ordonnance?.lignes || [],
    notes: ordonnance?.notes || ''
  });
  
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketSuggestions, setTicketSuggestions] = useState([]);

  // Recherche de tickets avec debounce
  useEffect(() => {
    if (ticketSearch.length >= 2) {
      const timer = setTimeout(async () => {
        try {
          await searchTickets(ticketSearch, 10);
        } catch (error) {
          console.error('Erreur recherche tickets:', error);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [ticketSearch, searchTickets]);

  // Mettre à jour les suggestions depuis le contexte
  useEffect(() => {
    setTicketSuggestions(tickets);
  }, [tickets]);

  // Récupérer les médicaments d'un ticket
  const handleSelectTicket = async (codeTicket) => {
    setTicketSearch('');
    setTicketSuggestions([]);

    try {
      const result = await getMedicamentsFromTicket(codeTicket);
      
      if (result.medicamentsForForm) {
        setFormData(prev => ({
          ...prev,
          medicaments: [...prev.medicaments, ...result.medicamentsForForm]
        }));
        showNotification(`${result.medicamentsForForm.length} médicament(s) ajouté(s)`, 'success');
      }
    } catch (error) {
      showNotification(error.message || 'Erreur lors de la récupération des médicaments', 'error');
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (ordonnance) {
        await updateOrdonnance(ordonnance.id, formData);
      } else {
        await createOrdonnance(formData);
      }
      onSuccess();
    } catch (error) {
      if (error.name === 'ValidationError') {
        showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      } else if (error.name === 'RedirectError') {
        showNotification(error.message, 'error');
      } else {
        showNotification(error.message || 'Erreur lors de la sauvegarde', 'error');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Informations de l'ordonnance
          </h3>
        </div>
        
        <div className="px-6 py-4 space-y-6">
          {/* Numéro ordonnance */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Numéro d'ordonnance *
            </label>
            <input
              type="text"
              required
              value={formData.numero_ordonnance}
              onChange={(e) => setFormData(prev => ({ ...prev, numero_ordonnance: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: 00012T"
            />
            {errors?.ordonnanceValidation?.numero_ordonnance && (
              <p className="mt-1 text-sm text-red-600">{errors.ordonnanceValidation.numero_ordonnance[0]}</p>
            )}
          </div>

          {/* Informations client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom complet du client *
              </label>
              <input
                type="text"
                required
                value={formData.client.nom_complet}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  client: { ...prev.client, nom_complet: e.target.value }
                }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors?.ordonnanceValidation?.['client.nom_complet'] && (
                <p className="mt-1 text-sm text-red-600">{errors.ordonnanceValidation['client.nom_complet'][0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                type="text"
                value={formData.client.telephone}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  client: { ...prev.client, telephone: e.target.value }
                }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Adresse</label>
            <textarea
              rows="2"
              value={formData.client.adresse}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                client: { ...prev.client, adresse: e.target.value }
              }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Sélection médecin */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Médecin prescripteur *</label>
            <select
              required
              value={formData.medecin_id}
              onChange={(e) => setFormData(prev => ({ ...prev, medecin_id: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un médecin</option>
              {medecins.map((medecin) => (
                <option key={medecin.id} value={medecin.id}>
                  {medecin.nom_complet} - {medecin.onm}
                </option>
              ))}
            </select>
            {errors?.ordonnanceValidation?.medecin_id && (
              <p className="mt-1 text-sm text-red-600">{errors.ordonnanceValidation.medecin_id[0]}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes additionnelles..."
            />
          </div>
        </div>
      </div>

      {/* Section médicaments */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Médicaments prescrits
          </h3>
        </div>
        
        <div className="px-6 py-4">
          {/* Recherche de tickets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ajouter des médicaments via un numéro de ticket
            </label>
            <div className="relative">
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Tapez le numéro de ticket..."
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              {/* Suggestions */}
              {ticketSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 overflow-auto border border-gray-300 rounded-md">
                  {ticketSuggestions.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => handleSelectTicket(ticket.code)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <span className="font-medium">{ticket.code}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {loading.tickets && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>
          </div>

          {/* Liste des médicaments */}
          <div className="space-y-4">
            {formData.medicaments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">Aucun médicament ajouté</p>
                <p className="text-sm">Utilisez la recherche de tickets ci-dessus pour ajouter des médicaments</p>
              </div>
            ) : (
              formData.medicaments.map((medicament, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        Ticket: {medicament.code_ticket}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {medicament.designation_medicament}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          medicaments: prev.medicaments.filter((_, i) => i !== index)
                        }));
                      }}
                      className="ml-4 text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Posologie *
                      </label>
                      <input
                        type="text"
                        required
                        value={medicament.posologie}
                        onChange={(e) => {
                          const newMedicaments = [...formData.medicaments];
                          newMedicaments[index].posologie = e.target.value;
                          setFormData(prev => ({ ...prev, medicaments: newMedicaments }));
                        }}
                        placeholder="Ex: 1 comprimé matin et soir"
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Durée *
                      </label>
                      <input
                        type="text"
                        required
                        value={medicament.duree}
                        onChange={(e) => {
                          const newMedicaments = [...formData.medicaments];
                          newMedicaments[index].duree = e.target.value;
                          setFormData(prev => ({ ...prev, medicaments: newMedicaments }));
                        }}
                        placeholder="Ex: 7 jours"
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantité *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={medicament.quantite}
                        onChange={(e) => {
                          const newMedicaments = [...formData.medicaments];
                          newMedicaments[index].quantite = parseInt(e.target.value) || 1;
                          setFormData(prev => ({ ...prev, medicaments: newMedicaments }));
                        }}
                        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Erreurs pour ce médicament */}
                  {errors?.ordonnanceValidation?.[`medicaments.${index}.posologie`] && (
                    <p className="mt-2 text-sm text-red-600">{errors.ordonnanceValidation[`medicaments.${index}.posologie`][0]}</p>
                  )}
                  {errors?.ordonnanceValidation?.[`medicaments.${index}.duree`] && (
                    <p className="mt-2 text-sm text-red-600">{errors.ordonnanceValidation[`medicaments.${index}.duree`][0]}</p>
                  )}
                  {errors?.ordonnanceValidation?.[`medicaments.${index}.quantite`] && (
                    <p className="mt-2 text-sm text-red-600">{errors.ordonnanceValidation[`medicaments.${index}.quantite`][0]}</p>
                  )}
                </div>
              ))
            )}
          </div>
          
          {errors?.ordonnanceValidation?.medicaments && (
            <p className="mt-2 text-sm text-red-600">{errors.ordonnanceValidation.medicaments[0]}</p>
          )}
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading.ordonnances || formData.medicaments.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading.ordonnances && <Loader className="w-4 h-4 animate-spin mr-2" />}
          <Save className="w-4 h-4 mr-2" />
          {ordonnance ? 'Modifier' : 'Créer'} l'ordonnance
        </button>
      </div>
    </form>
  );
};

// Composant Détails Ordonnance
const DetailsOrdonnance = ({ ordonnance, onEdit, onDelete, onPrint }) => {
  return (
    <div className="space-y-6">
      {/* Informations principales */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Ordonnance N° {ordonnance.numero_affichage || ordonnance.numero_saisi}
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(ordonnance.date_creation).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Client</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <div className="font-medium">{ordonnance.client?.nom_complet}</div>
                    {ordonnance.client?.adresse && (
                      <div className="text-gray-500">{ordonnance.client.adresse}</div>
                    )}
                    {ordonnance.client?.telephone && (
                      <div className="text-gray-500">{ordonnance.client.telephone}</div>
                    )}
                  </div>
                </div>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Médecin prescripteur</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="font-medium">{ordonnance.medecin?.nom_complet}</div>
                {ordonnance.medecin?.onm && (
                  <div className="text-gray-500">ONM: {ordonnance.medecin.onm}</div>
                )}
                {ordonnance.medecin?.adresse && (
                  <div className="text-gray-500">{ordonnance.medecin.adresse}</div>
                )}
              </dd>
            </div>
            
            {ordonnance.notes && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{ordonnance.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Médicaments prescrits */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Médicaments prescrits ({ordonnance.lignes?.length || 0})
          </h3>
        </div>
        
        <div className="px-6 py-4">
          {!ordonnance.lignes || ordonnance.lignes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">Aucun médicament prescrit</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ordonnance.lignes.map((ligne, index) => (
                <div key={ligne.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                          Ticket {ligne.code_ticket}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Qté: {ligne.quantite}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-2">
                        {ligne.designation_medicament}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Posologie:</span>
                          <p className="text-gray-900">{ligne.posologie}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Durée:</span>
                          <p className="text-gray-900">{ligne.duree}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={onPrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </button>
            
            <button
              onClick={onEdit}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </button>
            
            <button
              onClick={onDelete}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ordonnances;
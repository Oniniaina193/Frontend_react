import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader, AlertCircle, CheckCircle, X, Edit2, Save, XCircle } from 'lucide-react';
import medicamentService from '../../services/medicamentService';

const Medicaments = () => {
  // États principaux
  const [medicaments, setMedicaments] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // États du formulaire
  const [nouveauMedicament, setNouveauMedicament] = useState({
    nom: '',
    famille: ''
  });

  // États de modification en ligne
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({
    nom: '',
    famille: ''
  });

  // États de recherche et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 20
  });

  // Charger les données initiales
  useEffect(() => {
    loadFamilies();
    loadMedicaments();
  }, []);

  // Recherche avec délai
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedicaments(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedFamily]);

  // Charger les familles
  const loadFamilies = async () => {
    try {
      const response = await medicamentService.getFamilies();
      if (response.success) {
        setFamilies(response.data);
      } else {
        console.error('Erreur chargement familles:', response.message);
      }
    } catch (error) {
      console.error('Erreur chargement familles:', error);
    }
  };

  // Charger les médicaments
  const loadMedicaments = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page,
        per_page: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedFamily && { famille: selectedFamily })
      };

      const response = await medicamentService.getMedicaments(params);
      
      if (response.success) {
        setMedicaments(response.data.medicaments);
        setPagination(response.data.pagination);
      } else {
        setError(response.message || 'Erreur lors du chargement');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedFamily]);

  // Gérer les changements du formulaire
  const handleInputChange = (field, value) => {
    setNouveauMedicament(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Ajouter un médicament 
  const handleAjouter = async () => {
    if (!nouveauMedicament.nom.trim() || !nouveauMedicament.famille.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await medicamentService.createMedicament({
        nom: nouveauMedicament.nom.trim(),
        famille: nouveauMedicament.famille.trim()
      });

      if (response.success) {
        //Mise à jour du tableau
        const newMedicament = {
          id: response.data.id || Date.now(), 
          nom: nouveauMedicament.nom.trim(),
          famille: nouveauMedicament.famille.trim()
        };

        setMedicaments(prev => [newMedicament, ...prev]);
        
        // Mettre à jour la pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total + 1
        }));

        // Mettre à jour les familles si nouvelle famille
        if (!families.includes(nouveauMedicament.famille.trim())) {
          setFamilies(prev => [...prev, nouveauMedicament.famille.trim()]);
        }

        setNouveauMedicament({ nom: '', famille: '' });
        setSuccess('Médicament ajouté avec succès !');
        
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Commencer la modification
  const handleStartEdit = (medicament) => {
    setEditingId(medicament.id);
    setEditingData({
      nom: medicament.nom,
      famille: medicament.famille
    });
  };

  // Annuler la modification
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ nom: '', famille: '' });
  };

  // Gérer les changements dans le formulaire d'édition
  const handleEditChange = (field, value) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Sauvegarder la modification
  const handleSaveEdit = async (id) => {
    if (!editingData.nom.trim() || !editingData.famille.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await medicamentService.updateMedicament(id, {
        nom: editingData.nom.trim(),
        famille: editingData.famille.trim()
      });

      if (response.success) {
        // Mise à jour du tableau
        setMedicaments(prev => prev.map(med => 
          med.id === id 
            ? { ...med, nom: editingData.nom.trim(), famille: editingData.famille.trim() }
            : med
        ));

        // Mettre à jour les familles si nouvelle famille
        if (!families.includes(editingData.famille.trim())) {
          setFamilies(prev => [...prev, editingData.famille.trim()]);
        }

        setSuccess('Médicament modifié avec succès !');
        setEditingId(null);
        setEditingData({ nom: '', famille: '' });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Erreur lors de la modification');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  // Supprimer un médicament 
  const handleSupprimer = async (medicament) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${medicament.nom}" ?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await medicamentService.deleteMedicament(medicament.id);

      if (response.success) {
        // Mise à jour du tableau
        setMedicaments(prev => prev.filter(med => med.id !== medicament.id));
        
        // Mettre à jour la pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1
        }));

        setSuccess('Médicament supprimé avec succès !');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  // Changer de page
  const handlePageChange = (page) => {
    loadMedicaments(page);
  };

  // Masquer les messages
  const hideMessage = (type) => {
    if (type === 'error') setError('');
    if (type === 'success') setSuccess('');
  };

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-900 mb-0 font-serif">Gestion des Médicaments</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={() => hideMessage('error')} className="text-red-600 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
              <p className="text-green-700">{success}</p>
            </div>
            <button onClick={() => hideMessage('success')} className="text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={nouveauMedicament.nom}
            onChange={(e) => handleInputChange('nom', e.target.value)}
            placeholder="Nom du médicament"
            disabled={submitting}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>
        
        <div className="flex-1">
          <input
            type="text"
            value={nouveauMedicament.famille}
            onChange={(e) => handleInputChange('famille', e.target.value)}
            placeholder="Famille médicament"
            disabled={submitting}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            list="families-list"
          />
          <datalist id="families-list">
            {families.map((famille, index) => (
              <option key={index} value={famille} />
            ))}
          </datalist>
        </div>
        
        <button
          onClick={handleAjouter}
          disabled={submitting || !nouveauMedicament.nom.trim() || !nouveauMedicament.famille.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center"
        >
          {submitting ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Ajout...
            </>
          ) : (
            'Ajouter'
          )}
        </button>
      </div>

      {/* Tableau des médicaments */}
      <div className="bg-white shadow rounded-lg border border-black overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">Chargement...</span>
          </div>
        ) : (
          <>
            <table className="min-w-full border border-black">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-black">
                    Nom du médicament
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-black">
                    Famille
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-black">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {medicaments.map((med) => (
                  <tr key={med.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-1 text-sm border border-black text-center">
                      {editingId === med.id ? (
                        <input
                          type="text"
                          value={editingData.nom}
                          onChange={(e) => handleEditChange('nom', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{med.nom}</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-sm border border-black text-center">
                      {editingId === med.id ? (
                        <input
                          type="text"
                          value={editingData.famille}
                          onChange={(e) => handleEditChange('famille', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          list="families-list-edit"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {med.famille}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-sm border border-black">
                      {editingId === med.id ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleSaveEdit(med.id)}
                            className="text-green-600 hover:text-green-800 flex items-center"
                            title="Sauvegarder"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-800 flex items-center"
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleStartEdit(med)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSupprimer(med)}
                            className="text-red-600 hover:text-red-800"
                            title="Supprimer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Datalist pour l'édition */}
            <datalist id="families-list-edit">
              {families.map((famille, index) => (
                <option key={index} value={famille} />
              ))}
            </datalist>
            
            {medicaments.length === 0 && !loading && (
              <div className="text-center py-8 border-t border-black">
                <p className="text-gray-500">
                  {searchTerm || selectedFamily ? 'Aucun médicament trouvé avec ces critères' : 'Aucun médicament enregistré'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="bg-gray-50 px-6 py-3 border-t-2 border-black">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Affichage de {pagination.from || 0} à {pagination.to || 0} sur {pagination.total} résultats
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page <= 1 || loading}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {pagination.current_page} sur {pagination.last_page}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page >= pagination.last_page || loading}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Medicaments;
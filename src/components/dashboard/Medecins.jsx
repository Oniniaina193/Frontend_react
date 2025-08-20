import React, { useState, useEffect } from 'react';
import medecinService from '../../services/medecinService';

const Medecins = () => {
  const [medecins, setMedecins] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom_complet: '',
    adresse: '',
    ONM: '',
    telephone: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1
  });

  const perPage = 8;

  // Charger la liste des médecins
  const fetchMedecins = async (page = 1, searchTerm = '') => {
    try {
      const data = await medecinService.getMedecins({
        page,
        per_page: perPage,
        search: searchTerm
      });
      setMedecins(data.data.medecins || []);
      setPagination(data.data.pagination || { current_page: 1, last_page: 1 });
    } catch (error) {
      console.error('Erreur récupération médecins:', error);
    }
  };

  useEffect(() => {
    fetchMedecins();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await medecinService.updateMedecin(editingId, formData);
      } else {
        await medecinService.createMedecin(formData);
      }
      setFormData({ nom_complet: '', adresse: '', ONM: '', telephone: '' });
      setShowForm(false);
      setEditingId(null);
      fetchMedecins(pagination.current_page, search);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
    }
  };

  const handleEdit = (medecin) => {
    setFormData({
      nom_complet: medecin.nom_complet,
      adresse: medecin.adresse,
      ONM: medecin.ONM,
      telephone: medecin.telephone
    });
    setEditingId(medecin.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce médecin ?')) {
      try {
        await medecinService.deleteMedecin(id);
        fetchMedecins(pagination.current_page, search);
      } catch (error) {
        console.error('Erreur suppression médecin:', error);
      }
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    fetchMedecins(1, value);
  };

  const handlePageChange = (newPage) => {
    fetchMedecins(newPage, search);
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= pagination.last_page; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded-md ${i === pagination.current_page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 font-serif">Gestion des Médecins</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Rechercher..."
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <button
            onClick={() => { 
              setShowForm(true); 
              setEditingId(null); 
              setFormData({ nom_complet: '', adresse: '', ONM: '', telephone: '' }); 
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Ajouter un médecin
          </button>
        </div>
      </div>

      {/* Carte des médecins */}
      <div className={`${showForm ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {medecins.map((medecin) => (
            <div key={medecin.id} className="bg-white overflow-hidden shadow rounded-lg h-59">
              <div className="px-4 py-3 sm:p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {medecin.nom_complet.split(' ')[1]?.charAt(0) || 'M'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">Dr {medecin.nom_complet}</h3>
                    <p className="text-sm text-gray-500">Adresse: {medecin.adresse}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>📞 {medecin.telephone}</p>
                  <p>ONM: {medecin.ONM}</p>
                </div>
                <div className="mt-3 flex space-x-2 text-sm">
                  <button
                    onClick={() => handleEdit(medecin)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(medecin.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
          <br />
        {/* Pagination */}
        <div className="flex justify-center space-x-2 mt-4">
          {renderPagination()}
        </div>
      </div>

      {/* Formulaire d'ajout*/}
      {showForm && (
        <div className="absolute inset-0 flex items-start justify-center mt-10 z-20">
          <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-lg relative">
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">
              {editingId ? 'Modifier médecin' : 'Nouveau médecin'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                name="nom_complet"
                value={formData.nom_complet}
                onChange={handleChange}
                placeholder="Nom complet"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                type="text"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                placeholder="Adresse"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                type="text"
                name="ONM"
                value={formData.ONM}
                onChange={handleChange}
                placeholder="Numéro d'ordre"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                placeholder="Téléphone"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  {editingId ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medecins;

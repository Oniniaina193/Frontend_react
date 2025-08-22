import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';

const Medecins = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom_complet: '',
    adresse: '',
    ONM: '',
    telephone: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const perPage = 8;

  // Utiliser le cache global - plus de chargement nécessaire !
  const {
    medecins,
    loading,
    addMedecin,
    updateMedecin,
    deleteMedecin
  } = useData();

  // Filtrage côté client (ultra-rapide)
  const filteredMedecins = useMemo(() => {
    return medecins.filter(medecin => {
      return !search.trim() || 
        medecin.nom_complet.toLowerCase().includes(search.toLowerCase()) ||
        medecin.adresse.toLowerCase().includes(search.toLowerCase()) ||
        medecin.ONM.toLowerCase().includes(search.toLowerCase()) ||
        medecin.telephone.toLowerCase().includes(search.toLowerCase());
    });
  }, [medecins, search]);

  // Pagination côté client
  const paginatedMedecins = useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filteredMedecins.slice(startIndex, endIndex);
  }, [filteredMedecins, currentPage, perPage]);

  const totalPages = Math.ceil(filteredMedecins.length / perPage);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateMedecin(editingId, formData);
      } else {
        await addMedecin(formData);
      }
      setFormData({ nom_complet: '', adresse: '', ONM: '', telephone: '' });
      setShowForm(false);
      setEditingId(null);
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
        await deleteMedecin(id);
      } catch (error) {
        console.error('Erreur suppression médecin:', error);
      }
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset à la page 1
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 rounded-md transition-colors ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Ajouter un médecin
          </button>
        </div>
      </div>

      {/* Carte des médecins */}
      <div className={`${showForm ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
        {loading.initial ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des médecins...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {paginatedMedecins.map((medecin) => (
                <div key={medecin.id} className="bg-white overflow-hidden shadow rounded-lg h-59 hover:shadow-md transition-shadow">
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
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(medecin.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        Supprimer
                      </button><br />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredMedecins.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {search ? 'Aucun médecin trouvé avec ces critères' : 'Aucun médecin enregistré'}
                </p>
              </div>
            )}
            <br />
            
            {/* Pagination côté client - Ultra rapide */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-4">
                {renderPagination()}
              </div>
            )}
          </>
        )}
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                placeholder="Adresse"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                name="ONM"
                value={formData.ONM}
                onChange={handleChange}
                placeholder="Numéro d'ordre"
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
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {editingId ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
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
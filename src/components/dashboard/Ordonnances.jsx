import React, { useState } from 'react';

const Ordonnances = () => {
  const [ordonnances, setOrdonnances] = useState([
    { 
      id: 1, 
      patient: 'Jean Dupont', 
      medecin: 'Dr. Martin Dubois', 
      date: '2024-01-15', 
      statut: 'En cours',
      medicaments: ['Paracétamol 500mg', 'Amoxicilline 1g']
    },
    { 
      id: 2, 
      patient: 'Marie Moreau', 
      medecin: 'Dr. Sophie Laurent', 
      date: '2024-01-14', 
      statut: 'Complétée',
      medicaments: ['Aspirine 100mg']
    },
    { 
      id: 3, 
      patient: 'Paul Martin', 
      medecin: 'Dr. Pierre Bernard', 
      date: '2024-01-13', 
      statut: 'En attente',
      medicaments: ['Ibuprofène 400mg', 'Paracétamol 500mg']
    }
  ]);

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'Complétée': return 'bg-green-100 text-green-800';
      case 'En cours': return 'bg-yellow-100 text-yellow-800';
      case 'En attente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Gestion des Ordonnances</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
          Nouvelle ordonnance
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select className="border border-gray-300 rounded-md px-3 py-2">
            <option>Tous les statuts</option>
            <option>En attente</option>
            <option>En cours</option>
            <option>Complétée</option>
          </select>
          <input
            type="text"
            placeholder="Rechercher un patient"
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      {/* Liste des ordonnances */}
      <div className="space-y-4">
        {ordonnances.map((ordonnance) => (
          <div key={ordonnance.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Ordonnance #{ordonnance.id}
                </h3>
                <p className="text-sm text-gray-500">
                  Patient: {ordonnance.patient} | Médecin: {ordonnance.medecin}
                </p>
                <p className="text-sm text-gray-500">Date: {ordonnance.date}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(ordonnance.statut)}`}>
                {ordonnance.statut}
              </span>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Médicaments prescrits:</h4>
              <div className="flex flex-wrap gap-2">
                {ordonnance.medicaments.map((med, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {med}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                Traiter
              </button>
              <button className="text-blue-600 hover:text-blue-900 text-sm">
                Voir détails
              </button>
              <button className="text-gray-600 hover:text-gray-900 text-sm">
                Imprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ordonnances;

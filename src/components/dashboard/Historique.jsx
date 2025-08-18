import React, { useState } from 'react';

const Historique = () => {
  const [historique, setHistorique] = useState([
    { 
      id: 1, 
      action: 'Vente médicament', 
      details: 'Paracétamol 500mg - Quantité: 2', 
      utilisateur: 'Admin', 
      date: '2024-01-15 14:30',
      type: 'vente'
    },
    { 
      id: 2, 
      action: 'Ajout stock', 
      details: 'Amoxicilline 1g - Quantité: +50', 
      utilisateur: 'Pharmacien', 
      date: '2024-01-15 10:15',
      type: 'stock'
    },
    { 
      id: 3, 
      action: 'Nouvelle ordonnance', 
      details: 'Patient: Marie Moreau', 
      utilisateur: 'Dr. Sophie Laurent', 
      date: '2024-01-14 16:45',
      type: 'ordonnance'
    },
    { 
      id: 4, 
      action: 'Modification prix', 
      details: 'Ibuprofène 400mg - Prix: 3.20€', 
      utilisateur: 'Admin', 
      date: '2024-01-14 09:20',
      type: 'modification'
    }
  ]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'vente': return '💰';
      case 'stock': return '📦';
      case 'ordonnance': return '📋';
      case 'modification': return '✏️';
      default: return '📝';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'vente': return 'bg-green-100 text-green-800';
      case 'stock': return 'bg-blue-100 text-blue-800';
      case 'ordonnance': return 'bg-purple-100 text-purple-800';
      case 'modification': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Historique des Actions</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
          Exporter
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className="border border-gray-300 rounded-md px-3 py-2">
            <option>Tous les types</option>
            <option>Ventes</option>
            <option>Stock</option>
            <option>Ordonnances</option>
            <option>Modifications</option>
          </select>
          <input
            type="text"
            placeholder="Rechercher par utilisateur"
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      {/* Timeline des actions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="divide-y divide-gray-200">
          {historique.map((item) => (
            <div key={item.id} className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{getTypeIcon(item.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.action}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{item.details}</p>
                  <p className="text-xs text-gray-400">
                    Par {item.utilisateur} • {item.date}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
          <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
            Précédent
          </button>
          <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            1
          </button>
          <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600">
            2
          </button>
          <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            3
          </button>
          <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
            Suivant
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Historique;
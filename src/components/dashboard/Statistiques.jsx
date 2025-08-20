import React from 'react';

const Statistiques = () => {
  const stats = [
    { title: 'Médicaments en stock', value: '1,247', color: 'bg-blue-500' },
    { title: 'Ordonnances du jour', value: '86', color: 'bg-green-500' },
    { title: 'Médecins partenaires', value: '42', color: 'bg-purple-500' },
    { title: 'Chiffre d\'affaires', value: '€15,248', color: 'bg-orange-500' }
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-900 font-serif">Tableau de bord</h2>
      
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ventes mensuelles</h3>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Graphique des ventes</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top médicaments</h3>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">Graphique des médicaments populaires</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistiques;
import React, { useState } from 'react';
import FolderSelectionApp from './components/FolderSelectionApp';
import ArticleSearchApp from './components/ArticleSearchApp';
import './App.css';

function App() {
  // État pour gérer la vue actuelle
  const [currentView, setCurrentView] = useState('folder-selection');
  
  // Fonction pour passer à la recherche d'articles
  const handleContinueToSearch = () => {
    setCurrentView('article-search');
  };
  
  // Fonction pour retourner à la sélection de dossier
  const handleBackToSelection = () => {
    setCurrentView('folder-selection');
  };

  return (
    <div className="App">
      {currentView === 'folder-selection' && (
        <FolderSelectionApp onContinue={handleContinueToSearch} />
      )}
      {currentView === 'article-search' && (
        <ArticleSearchApp onBack={handleBackToSelection} />
      )}
    </div>
  );
}

export default App;
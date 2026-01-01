import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    age: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/students`);
      setStudents(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des étudiants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/students/${editingId}`, formData);
        setEditingId(null);
      } else {
        await axios.post(`${API_URL}/api/students`, formData);
      }
      setFormData({ nom: '', prenom: '', email: '', age: '' });
      await fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'opération');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setFormData({
      nom: student.nom,
      prenom: student.prenom,
      email: student.email,
      age: student.age || ''
    });
    setEditingId(student.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ?')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_URL}/api/students/${id}`);
      await fetchStudents();
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ nom: '', prenom: '', email: '', age: '' });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-indigo-900 mb-2">
              Gestion des Étudiants
            </h1>
            <p className="text-gray-600">Architecture Event Driven (EDA) avec Kubernetes</p>
          </header>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                {editingId ? 'Modifier un étudiant' : 'Ajouter un étudiant'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Âge
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Chargement...' : editingId ? 'Modifier' : 'Ajouter'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Liste des étudiants
                </h2>
                <button
                  onClick={fetchStudents}
                  disabled={loading}
                  className="text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
                >
                  🔄 Actualiser
                </button>
              </div>
              
              {loading && students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Chargement...
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun étudiant enregistré
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-800">
                            {student.prenom} {student.nom}
                          </h3>
                          <p className="text-gray-600 text-sm">{student.email}</p>
                          {student.age && (
                            <p className="text-gray-500 text-sm">Âge: {student.age} ans</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(student)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

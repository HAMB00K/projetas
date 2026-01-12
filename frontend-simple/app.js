const API_URL = '/api';

let editingId = null;

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('success');
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
    setTimeout(() => successDiv.classList.add('hidden'), 3000);
}

async function getErrorMessage(response) {
    try {
        const data = await response.json();
        if (data && data.error) return data.error;
        return 'Erreur inconnue';
    } catch (e) {
        return 'Erreur inconnue';
    }
}

async function loadStudents() {
    try {
        const response = await fetch(`${API_URL}/students`);
        if (!response.ok) {
            const msg = await getErrorMessage(response);
            throw new Error(msg);
        }
        
        const students = await response.json();
        const listDiv = document.getElementById('studentsList');
        
        if (students.length === 0) {
            listDiv.innerHTML = '<div class="text-center py-8 text-gray-500">Aucun étudiant enregistré</div>';
            return;
        }
        
        listDiv.innerHTML = students.map(student => `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-semibold text-lg text-gray-800">${student.prenom} ${student.nom}</h3>
                        <p class="text-gray-600 text-sm">${student.email}</p>
                        ${student.age ? `<p class="text-gray-500 text-sm">Âge: ${student.age} ans</p>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editStudent(${student.id}, '${student.nom}', '${student.prenom}', '${student.email}', ${student.age || 'null'})" class="text-blue-600 hover:text-blue-800 text-sm">✏️</button>
                        <button onclick="deleteStudent(${student.id})" class="text-red-600 hover:text-red-800 text-sm">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showError(error.message || 'Erreur lors du chargement des étudiants');
        console.error(error);
    }
}

function editStudent(id, nom, prenom, email, age) {
    editingId = id;
    document.getElementById('studentId').value = id;
    document.getElementById('nom').value = nom;
    document.getElementById('prenom').value = prenom;
    document.getElementById('email').value = email;
    document.getElementById('age').value = age || '';
    document.getElementById('formTitle').textContent = 'Modifier un étudiant';
    document.getElementById('cancelBtn').classList.remove('hidden');
}

function cancelEdit() {
    editingId = null;
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('formTitle').textContent = 'Ajouter un étudiant';
    document.getElementById('cancelBtn').classList.add('hidden');
}

async function deleteStudent(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ?')) return;
    
    try {
        const response = await fetch(`${API_URL}/students/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const msg = await getErrorMessage(response);
            throw new Error(msg);
        }
        
        showSuccess('Étudiant supprimé avec succès');
        await loadStudents();
    } catch (error) {
        showError(error.message || 'Erreur lors de la suppression');
        console.error(error);
    }
}

document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        nom: document.getElementById('nom').value,
        prenom: document.getElementById('prenom').value,
        email: document.getElementById('email').value,
        age: document.getElementById('age').value ? parseInt(document.getElementById('age').value) : null
    };
    
    try {
        const url = editingId ? `${API_URL}/students/${editingId}` : `${API_URL}/students`;
        const method = editingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const msg = await getErrorMessage(response);
            throw new Error(msg);
        }
        
        showSuccess(editingId ? 'Étudiant modifié avec succès' : 'Étudiant ajouté avec succès');
        cancelEdit();
        await loadStudents();
    } catch (error) {
        showError(error.message || 'Erreur lors de l\'enregistrement');
        console.error(error);
    }
});

document.getElementById('cancelBtn').addEventListener('click', cancelEdit);

loadStudents();

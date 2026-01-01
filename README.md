# TP Kubernetes - Architecture Event Driven (EDA)

## Développeurs
- Nassim Ben Saïd
- [Nom du binôme si applicable]

## Date de remise
Vendredi 16 Janvier 2026

## Description du Projet
Ce projet implémente une architecture Event Driven Architecture (EDA) pour la gestion d'étudiants, déployée sur Kubernetes/Minikube.

## Architecture

L'architecture se compose de 5 modules principaux :

1. **API REST** - Endpoints pour gérer les étudiants
2. **Service d'Intégration** - Consommateur Kafka qui écrit dans PostgreSQL
3. **Frontend Web** - Interface utilisateur React
4. **PostgreSQL** - Base de données
5. **Kafka** - Bus de messages (MOM)

### Flux de données

```
Frontend → API REST → Kafka → Service Intégration → PostgreSQL
                                      ↓
                               Kafka (résultat)
                                      ↓
                                  Frontend
```

## Structure du Projet

```
projetas/
├── api-rest/                    # API REST Node.js/Express
│   ├── server.js                # Serveur Express + Kafka Producer/Consumer
│   ├── package.json             # Dépendances
│   └── Dockerfile               # Dockerfile multi-stage
├── integration-service/         # Service d'intégration Node.js
│   ├── index.js                 # Consumer Kafka + PostgreSQL
│   ├── package.json             # Dépendances
│   └── Dockerfile               # Dockerfile multi-stage
├── frontend-simple/             # Frontend HTML/JS avec TailwindCSS
│   ├── index.html               # Page principale
│   ├── app.js                   # Logique JavaScript
│   ├── nginx.conf               # Configuration Nginx
│   └── Dockerfile               # Dockerfile
├── k8s/                         # Manifests Kubernetes
│   ├── postgres-deployment.yaml
│   ├── kafka-deployment.yaml
│   ├── api-rest-deployment.yaml
│   ├── integration-service-deployment.yaml
│   └── frontend-deployment.yaml
├── docker-compose.yml           # Pour tests locaux
├── RAPPORT_ETAPE1.md            # Réponses aux questions Étape 1
└── README.md
```

## Prérequis

- Docker
- Minikube
- kubectl
- Knative (optionnel)

## Installation et Déploiement

### 1. Démarrer Minikube

```bash
minikube start --profile knative --driver=docker
```

### 2. Configurer Docker pour utiliser le daemon Minikube

```bash
eval $(minikube -p knative docker-env)
```

### 3. Builder les images Docker

```bash
# API REST
docker build -t api-rest:latest ./api-rest

# Service d'intégration
docker build -t integration-service:latest ./integration-service

# Frontend
docker build -t frontend:latest ./frontend-simple
```

### 4. Déployer sur Kubernetes

```bash
# Déployer PostgreSQL
kubectl apply -f k8s/postgres-deployment.yaml

# Attendre que PostgreSQL soit prêt
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s

# Déployer Kafka et Zookeeper
kubectl apply -f k8s/kafka-deployment.yaml

# Attendre 30 secondes pour Kafka
sleep 30

# Déployer les services applicatifs
kubectl apply -f k8s/integration-service-deployment.yaml
kubectl apply -f k8s/api-rest-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

### 5. Vérifier le déploiement

```bash
kubectl get pods
kubectl get svc
```

### 6. Accéder à l'application

```bash
minikube service frontend-service --profile knative
```

Ou directement via l'URL : `http://$(minikube ip -p knative):31292`

## Technologies Utilisées

- **Backend**: Node.js, Express.js
- **Frontend**: HTML/JS Vanilla, TailwindCSS (via CDN), Nginx
- **Message Broker**: Apache Kafka
- **Base de données**: PostgreSQL
- **Orchestration**: Kubernetes (Minikube)
- **Containerisation**: Docker

## Endpoints API

- `POST /api/students` - Créer un étudiant
- `GET /api/students` - Lister tous les étudiants
- `GET /api/students/:id` - Obtenir un étudiant
- `PUT /api/students/:id` - Modifier un étudiant (optionnel)
- `DELETE /api/students/:id` - Supprimer un étudiant (optionnel)

## Date de Remise

Vendredi 16 Janvier 2026

## Contact

- Email: tondeur.herve@yahoo.fr
- Email: herve.tondeur@uphf.fr

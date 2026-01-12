const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka-service:9092';

app.use(cors());
app.use(bodyParser.json());

const kafka = new Kafka({
  clientId: 'api-rest',
  brokers: [KAFKA_BROKER],
  retry: {
    retries: 10,
    initialRetryTime: 300
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'api-rest-response-group' });

let responseCallbacks = new Map();

let producerConnectPromise = null;
let consumerStarted = false;

async function ensureProducerConnected() {
  if (producerConnectPromise) {
    return producerConnectPromise;
  }

  producerConnectPromise = producer.connect().finally(() => {
    producerConnectPromise = null;
  });
  return producerConnectPromise;
}

async function safeSend(topic, payload) {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }]
    });
  } catch (error) {
    const msg = (error && error.message) ? error.message : String(error);
    const shouldRetry = msg.toLowerCase().includes('disconnected') || msg.toLowerCase().includes('econnrefused');
    if (!shouldRetry) {
      throw error;
    }

    await ensureProducerConnected();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }]
    });
  }
}

async function initKafka() {
  try {
    await ensureProducerConnected();
    console.log('✅ Kafka Producer connected');
    
    if (!consumerStarted) {
      await consumer.connect();
      await consumer.subscribe({ topic: 'student-responses', fromBeginning: false });
      console.log('✅ Kafka Consumer connected and subscribed to student-responses');

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const response = JSON.parse(message.value.toString());
          console.log('📨 Received response:', response);

          const callback = responseCallbacks.get(response.correlationId);
          if (callback) {
            callback(response);
            responseCallbacks.delete(response.correlationId);
          }
        }
      });

      consumerStarted = true;
    }
  } catch (error) {
    console.error('❌ Kafka initialization error:', error);
    setTimeout(initKafka, 5000);
  }
}

initKafka();

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'api-rest' });
});

app.post('/api/students', async (req, res) => {
  try {
    const { nom, prenom, email, age } = req.body;
    
    if (!nom || !prenom || !email) {
      return res.status(400).json({ error: 'Nom, prénom et email sont requis' });
    }

    const correlationId = uuidv4();
    const studentData = {
      correlationId,
      action: 'CREATE',
      data: { nom, prenom, email, age: age || null }
    };

    await safeSend('student-events', studentData);

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        responseCallbacks.delete(correlationId);
        reject(new Error('Timeout waiting for response'));
      }, 20000);

      responseCallbacks.set(correlationId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });

    const response = await responsePromise;
    
    if (response.success) {
      res.status(201).json(response.data);
    } else {
      const errorMsg = response.error || 'Erreur inconnue';
      const isDuplicateEmail = String(errorMsg).includes('students_email_key') || String(errorMsg).toLowerCase().includes('duplicate key');
      res.status(isDuplicateEmail ? 409 : 500).json({ error: errorMsg });
    }
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'étudiant' });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const correlationId = uuidv4();
    const requestData = {
      correlationId,
      action: 'LIST',
      data: {}
    };

    await safeSend('student-events', requestData);

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        responseCallbacks.delete(correlationId);
        reject(new Error('Timeout waiting for response'));
      }, 20000);

      responseCallbacks.set(correlationId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });

    const response = await responsePromise;
    
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    console.error('Error listing students:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des étudiants' });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const correlationId = uuidv4();
    const requestData = {
      correlationId,
      action: 'GET',
      data: { id: req.params.id }
    };

    await safeSend('student-events', requestData);

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        responseCallbacks.delete(correlationId);
        reject(new Error('Timeout waiting for response'));
      }, 20000);

      responseCallbacks.set(correlationId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });

    const response = await responsePromise;
    
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(404).json({ error: response.error });
    }
  } catch (error) {
    console.error('Error getting student:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'étudiant' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { nom, prenom, email, age } = req.body;
    const correlationId = uuidv4();
    const studentData = {
      correlationId,
      action: 'UPDATE',
      data: { id: req.params.id, nom, prenom, email, age }
    };

    await safeSend('student-events', studentData);

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        responseCallbacks.delete(correlationId);
        reject(new Error('Timeout waiting for response'));
      }, 20000);

      responseCallbacks.set(correlationId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });

    const response = await responsePromise;
    
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'étudiant' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const correlationId = uuidv4();
    const requestData = {
      correlationId,
      action: 'DELETE',
      data: { id: req.params.id }
    };

    await safeSend('student-events', requestData);

    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        responseCallbacks.delete(correlationId);
        reject(new Error('Timeout waiting for response'));
      }, 20000);

      responseCallbacks.set(correlationId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });

    const response = await responsePromise;
    
    if (response.success) {
      res.json({ message: 'Étudiant supprimé avec succès' });
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'étudiant' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API REST listening on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await producer.disconnect();
  await consumer.disconnect();
  process.exit(0);
});

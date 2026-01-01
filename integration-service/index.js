const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka-service:9092';
const DB_HOST = process.env.DB_HOST || 'postgres-service';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'students_db';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const kafka = new Kafka({
  clientId: 'integration-service',
  brokers: [KAFKA_BROKER],
  retry: {
    retries: 10,
    initialRetryTime: 300
  }
});

const consumer = kafka.consumer({ groupId: 'integration-service-group' });
const producer = kafka.producer();

async function initDatabase() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS students (
          id SERIAL PRIMARY KEY,
          nom VARCHAR(100) NOT NULL,
          prenom VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          age INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Database initialized successfully');
      return;
    } catch (error) {
      console.error('❌ Database initialization error:', error.message);
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function sendResponse(correlationId, success, data = null, error = null) {
  try {
    const response = {
      correlationId,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    };

    await producer.send({
      topic: 'student-responses',
      messages: [{ value: JSON.stringify(response) }]
    });

    console.log('📤 Response sent:', response);
  } catch (err) {
    console.error('❌ Error sending response:', err);
  }
}

async function handleCreateStudent(correlationId, data) {
  try {
    const { nom, prenom, email, age } = data;
    const result = await pool.query(
      'INSERT INTO students (nom, prenom, email, age) VALUES ($1, $2, $3, $4) RETURNING *',
      [nom, prenom, email, age]
    );
    await sendResponse(correlationId, true, result.rows[0]);
  } catch (error) {
    console.error('Error creating student:', error);
    await sendResponse(correlationId, false, null, error.message);
  }
}

async function handleListStudents(correlationId) {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY id DESC');
    await sendResponse(correlationId, true, result.rows);
  } catch (error) {
    console.error('Error listing students:', error);
    await sendResponse(correlationId, false, null, error.message);
  }
}

async function handleGetStudent(correlationId, data) {
  try {
    const { id } = data;
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      await sendResponse(correlationId, false, null, 'Étudiant non trouvé');
    } else {
      await sendResponse(correlationId, true, result.rows[0]);
    }
  } catch (error) {
    console.error('Error getting student:', error);
    await sendResponse(correlationId, false, null, error.message);
  }
}

async function handleUpdateStudent(correlationId, data) {
  try {
    const { id, nom, prenom, email, age } = data;
    const result = await pool.query(
      'UPDATE students SET nom = $1, prenom = $2, email = $3, age = $4 WHERE id = $5 RETURNING *',
      [nom, prenom, email, age, id]
    );
    if (result.rows.length === 0) {
      await sendResponse(correlationId, false, null, 'Étudiant non trouvé');
    } else {
      await sendResponse(correlationId, true, result.rows[0]);
    }
  } catch (error) {
    console.error('Error updating student:', error);
    await sendResponse(correlationId, false, null, error.message);
  }
}

async function handleDeleteStudent(correlationId, data) {
  try {
    const { id } = data;
    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      await sendResponse(correlationId, false, null, 'Étudiant non trouvé');
    } else {
      await sendResponse(correlationId, true, result.rows[0]);
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    await sendResponse(correlationId, false, null, error.message);
  }
}

async function run() {
  try {
    await initDatabase();
    
    await producer.connect();
    console.log('✅ Kafka Producer connected');
    
    await consumer.connect();
    await consumer.subscribe({ topic: 'student-events', fromBeginning: false });
    console.log('✅ Kafka Consumer connected and subscribed to student-events');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log('📨 Received event:', event);

          const { correlationId, action, data } = event;

          switch (action) {
            case 'CREATE':
              await handleCreateStudent(correlationId, data);
              break;
            case 'LIST':
              await handleListStudents(correlationId);
              break;
            case 'GET':
              await handleGetStudent(correlationId, data);
              break;
            case 'UPDATE':
              await handleUpdateStudent(correlationId, data);
              break;
            case 'DELETE':
              await handleDeleteStudent(correlationId, data);
              break;
            default:
              console.error('Unknown action:', action);
              await sendResponse(correlationId, false, null, 'Action inconnue');
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      }
    });

    console.log('🚀 Integration Service is running...');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    setTimeout(run, 5000);
  }
}

run();

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing connections');
  await consumer.disconnect();
  await producer.disconnect();
  await pool.end();
  process.exit(0);
});

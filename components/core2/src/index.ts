import Express from 'express';

import { operationsApi } from './api';
import { Storage } from './store';

const storage = new Storage();
const app = Express();

app.use(Express.json());

/**
 * Logging middleware
 */
app.use((req, res, next) => {
  console.log(`> ${req.method} ${req.url}`);
  next();
});

/**
 * CORS middleware
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

/**
 * Delay middleware
 */
app.use((req, res, next) => {
  setTimeout(() => next(), 1000);
});

/**
 * Request body validation middleware
 */
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.body) {
      res.status(400).send('Request body is missing');
    } else {
      next();
    }
  } else {
    next();
  }
});

/**
 * Root
 */
app.get('/', (req, res) => {
  res.send('Hello World');
});

operationsApi(app, storage);

app.listen(3000, () => {
  console.log('Server started on port 3000');
});

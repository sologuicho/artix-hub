'use strict';

const { randomUUID } = require('node:crypto');
const { storage } = require('../lib/requestContext');

module.exports = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  storage.run({ correlationId }, next);
};

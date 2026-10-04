'use strict'

const { AsyncLocalStorage } = require('node:async_hooks')

const storage = new AsyncLocalStorage()

const getCorrelationId = () => storage.getStore()?.correlationId

module.exports = { storage, getCorrelationId }

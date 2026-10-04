'use strict'

const pino = require('pino')
const { getCorrelationId } = require('./requestContext')

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  mixin() {
    const id = getCorrelationId()
    return id ? { correlationId: id } : {}
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
})

module.exports = logger

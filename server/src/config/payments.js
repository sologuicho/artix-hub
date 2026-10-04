'use strict'

const Stripe = require('stripe')
const { MercadoPagoConfig } = require('mercadopago')
const logger = require('../lib/logger')

// Stripe — only initialize when key is present to avoid crash on startup
let stripe = null
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
} else {
  logger.warn(
    'Stripe not configured (STRIPE_SECRET_KEY missing) — payment routes will be unavailable'
  )
}

// MercadoPago — same guard
let mpClient = null
if (process.env.MP_ACCESS_TOKEN) {
  mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
} else {
  logger.warn('MercadoPago not configured (MP_ACCESS_TOKEN missing)')
}

const PRICE_IDS = {
  MEMBER: process.env.STRIPE_PRICE_MEMBER,
  STUDENT: process.env.STRIPE_PRICE_STUDENT,
  RESEARCHER: process.env.STRIPE_PRICE_RESEARCHER,
  TEAM: process.env.STRIPE_PRICE_TEAM,
  VISIONARY: process.env.STRIPE_PRICE_VISIONARY,
}

const MP_PLAN_IDS = {
  MEMBER: process.env.MP_PLAN_MEMBER,
  STUDENT: process.env.MP_PLAN_STUDENT,
  RESEARCHER: process.env.MP_PLAN_RESEARCHER,
  TEAM: process.env.MP_PLAN_TEAM,
  VISIONARY: process.env.MP_PLAN_VISIONARY,
}

module.exports = { stripe, mpClient, PRICE_IDS, MP_PLAN_IDS }

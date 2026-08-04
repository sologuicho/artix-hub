'use strict';

// Tiers de suscripción que pueden ser comprados a través de checkout.
// OBSERVER queda fuera porque es gratuito y se asigna por defecto en el registro.
const PAID_TIERS = ['MEMBER', 'STUDENT', 'RESEARCHER', 'TEAM', 'VISIONARY'];

module.exports = { PAID_TIERS };

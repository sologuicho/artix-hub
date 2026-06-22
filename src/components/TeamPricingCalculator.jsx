import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Calendar, ArrowRight } from 'lucide-react';

// ─── Pricing tiers ────────────────────────────────────────────────
const TIERS = [
  { min: 2,  max: 5,   price: 6, label: '2 – 5 usuarios' },
  { min: 6,  max: 15,  price: 5, label: '6 – 15 usuarios' },
  { min: 16, max: 30,  price: 4, label: '16 – 30 usuarios' },
  { min: 31, max: Infinity, price: null, label: '31+ usuarios' },
];

const getTier = (seats) => TIERS.find((t) => seats >= t.min && seats <= t.max);

// ─── Table row ────────────────────────────────────────────────────
const TierRow = ({ tier, navigate }) => {
  const isEnterprise = tier.price === null;

  return (
    <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-white/5 hover:border-white/15 hover:bg-white/[0.03] transition-all group">
      <div className="flex items-center gap-5 flex-1">
        <span className="text-sm font-medium text-gray-200 w-32">{tier.label}</span>
        {isEnterprise ? (
          <span className="text-sm text-gray-400 italic">Precio a convenir</span>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">${tier.price}</span>
            <span className="text-xs text-gray-500">/usuario/mes</span>
          </div>
        )}
      </div>

      <button
        onClick={() =>
          isEnterprise
            ? navigate('/contact')
            : navigate(`/auth?plan=team&seats=${tier.min}`)
        }
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          isEnterprise
            ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30'
            : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/25'
        }`}
      >
        {isEnterprise ? (
          <>
            <Calendar className="w-3.5 h-3.5" />
            Agendar demo
          </>
        ) : (
          <>
            Comenzar
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
      </button>
    </div>
  );
};

// ─── Custom calculator row ─────────────────────────────────────────
const CustomRow = ({ navigate }) => {
  const [seats, setSeats] = useState(3);

  const tier = getTier(seats);
  const isEnterprise = tier?.price === null;
  const monthlyTotal = isEnterprise ? null : seats * tier.price;
  const annualTotal = monthlyTotal ? Math.round(monthlyTotal * 12 * 0.8) : null;

  const decrement = () => setSeats((s) => Math.max(2, s - 1));
  const increment = () => setSeats((s) => s + 1);

  return (
    <div className="mt-3 rounded-xl border border-blue-500/25 bg-blue-950/20 p-5 transition-all">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Counter */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 font-medium">Personalizado:</span>
          <div className="flex items-center gap-3 bg-white/5 rounded-xl border border-white/10 px-2 py-1">
            <button
              onClick={decrement}
              disabled={seats <= 2}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center text-xl font-bold text-white tabular-nums">
              {seats}
            </span>
            <button
              onClick={increment}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm text-gray-500">usuarios</span>
        </div>

        {/* Result + CTA */}
        {isEnterprise ? (
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-400 italic">
              Para equipos grandes, contáctanos
            </span>
            <button
              onClick={() => navigate('/contact')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              Agendar demo
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-5 flex-wrap">
            <div className="text-right">
              <div className="text-sm text-gray-400">
                {seats} × ${tier.price} ={' '}
                <span className="text-lg font-bold text-white">${monthlyTotal}/mes</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 justify-end">
                <span className="text-xs text-gray-500">
                  ${annualTotal}/año
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Ahorra 20%
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/auth?plan=team&seats=${seats}`)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all"
            >
              Elegir este plan
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────
const TeamPricingCalculator = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
        <span>Rango de usuarios</span>
        <span>Precio</span>
      </div>

      {/* Tier rows */}
      {TIERS.map((tier) => (
        <TierRow key={tier.label} tier={tier} navigate={navigate} />
      ))}

      {/* Custom calculator */}
      <CustomRow navigate={navigate} />

      {/* Footer note */}
      <p className="text-xs text-gray-600 pt-3 text-center">
        Todos los precios en USD. Facturación por equipo. Cada miembro tiene acceso completo al plan Pro.
      </p>
    </div>
  );
};

export default TeamPricingCalculator;

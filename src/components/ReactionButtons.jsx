import { ThumbsUp, Heart, Hand, Laugh } from 'lucide-react';

const TYPES = [
  { key: 'like',  Icon: ThumbsUp, label: 'Me gusta' },
  { key: 'heart', Icon: Heart,    label: 'Me encanta' },
  { key: 'clap',  Icon: Hand,     label: 'Aplaudir' },
  { key: 'laugh', Icon: Laugh,    label: 'Divertido' },
];

const ReactionButtons = ({ reactions = {}, onReaction, disabled = false, className = '' }) => (
  <div className={`flex items-center gap-5 ${className}`}>
    {TYPES.map(({ key, Icon, label }) => {
      const { count = 0, active = false } = reactions[key] || {};
      return (
        <button
          key={key}
          onClick={() => !disabled && onReaction(key)}
          title={label}
          className="flex items-center gap-1.5 font-sans text-xs transition-colors duration-150"
          style={{
            background: 'none',
            border: 'none',
            cursor: disabled ? 'default' : 'pointer',
            color: active ? 'var(--accent)' : 'var(--muted)',
            padding: 0,
          }}
          onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { if (!disabled && !active) e.currentTarget.style.color = active ? 'var(--accent)' : 'var(--muted)'; }}
        >
          <Icon size={15} style={active ? { fill: 'currentColor' } : {}} />
          {count > 0 && <span>{count}</span>}
        </button>
      );
    })}
  </div>
);

export default ReactionButtons;

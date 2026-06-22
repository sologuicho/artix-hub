const severityConfig = {
  ok: { color: 'var(--accent)', label: '— Validado' },
  review: { color: '#d97706', label: '— Revisar' },
  critical: { color: '#ef4444', label: '— Crítico' },
};

const AIValidationPanel = ({
  status = 'idle',
  result,
  error,
  onApplyImprovements,
  isImproving = false,
}) => {
  const severity = result?.severity || 'ok';
  const config = severityConfig[severity] || severityConfig.ok;
  const issues = result?.issues || [];
  const suggestions = result?.suggestions || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans text-xs uppercase tracking-widest" style={{ color: config.color }}>
          {config.label}
        </span>
        {onApplyImprovements && (
          <button
            onClick={onApplyImprovements}
            disabled={isImproving || status === 'running'}
            className="btn btn-primary"
            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.625rem', opacity: (isImproving || status === 'running') ? 0.5 : 1 }}
          >
            {isImproving ? 'Aplicando…' : 'Aplicar'}
          </button>
        )}
      </div>

      {status === 'idle' && (
        <p className="font-sans text-sm" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Ejecuta la validación para recibir retroalimentación automática antes de publicar.
        </p>
      )}

      {status === 'running' && (
        <div className="flex items-center gap-2">
          <div style={{
            width: 14, height: 14,
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>Validando…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div className="font-sans text-sm" style={{ color: '#ef4444', padding: '0.625rem 0.75rem', border: '1px solid #ef4444', marginTop: '0.5rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
            Puntuación:{' '}
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{result.qualityScore ?? 0}/100</span>
          </p>

          {issues.filter(i => i.type === 'error').length > 0 && (
            <div style={{ padding: '0.75rem', border: '1px solid #ef4444' }}>
              <p className="font-sans text-xs uppercase tracking-widest mb-2" style={{ color: '#ef4444' }}>
                Errores ({issues.filter(i => i.type === 'error').length})
              </p>
              {issues.filter(i => i.type === 'error').map((item, idx) => (
                <p key={idx} className="font-sans text-sm" style={{ color: 'var(--muted)', marginBottom: '0.25rem' }}>
                  · {item.message}
                </p>
              ))}
            </div>
          )}

          {issues.filter(i => i.type === 'warning').length > 0 && (
            <div style={{ padding: '0.75rem', border: '1px solid #d97706' }}>
              <p className="font-sans text-xs uppercase tracking-widest mb-2" style={{ color: '#d97706' }}>
                Advertencias ({issues.filter(i => i.type === 'warning').length})
              </p>
              {issues.filter(i => i.type === 'warning').map((item, idx) => (
                <p key={idx} className="font-sans text-sm" style={{ color: 'var(--muted)', marginBottom: '0.25rem' }}>
                  · {item.message}
                </p>
              ))}
            </div>
          )}

          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {suggestions.map((suggestion, idx) => (
                <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                  <p className="font-sans text-sm" style={{ color: 'var(--text)' }}>
                    {suggestion.message || 'Sugerencias'}
                  </p>
                  {suggestion.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {suggestion.tags.map((tag, tagIdx) => (
                        <span key={tagIdx} className="category-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.improvements?.length > 0 && (
            <div>
              <p className="font-sans text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Mejoras sugeridas
              </p>
              {result.improvements.map((item, idx) => (
                <p key={idx} className="font-sans text-sm" style={{ color: 'var(--muted)', marginBottom: '0.25rem' }}>
                  · {item}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIValidationPanel;

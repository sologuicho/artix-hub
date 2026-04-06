const severityColors = {
  ok: 'text-green-600 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  review: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  critical: 'text-red-600 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
};

const AIValidationPanel = ({
  status = 'idle',
  result,
  error,
  onApplyImprovements,
  isImproving = false,
}) => {
  const severity = result?.severity || 'ok';
  const badgeClass = severityColors[severity] || severityColors.ok;
  const issues = result?.issues || [];
  const suggestions = result?.suggestions || [];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Validación de Contenido
          </p>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${badgeClass}`}>
            <span
              className={`w-2 h-2 rounded-full ${
                severity === 'critical'
                  ? 'bg-red-500'
                  : severity === 'review'
                  ? 'bg-amber-500'
                  : 'bg-green-500'
              }`}
            ></span>
            {severity === 'critical'
              ? 'Crítico'
              : severity === 'review'
              ? 'Revisar'
              : 'OK'}
          </div>
        </div>
        {onApplyImprovements && (
          <button
            onClick={onApplyImprovements}
            disabled={isImproving || status === 'running'}
            className="px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {isImproving ? 'Aplicando…' : 'Aplicar mejoras'}
          </button>
        )}
      </div>

      {status === 'idle' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ejecuta la validación para recibir retroalimentación automática antes de publicar.
        </p>
      )}

      {status === 'running' && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          Validando contenido…
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Puntuación de Calidad: {result.qualityScore ?? 0}/100
            </p>
          </div>

          {issues.length > 0 && (
            <div className="space-y-4">
              {issues.filter(i => i.type === 'error').length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Errores ({issues.filter(i => i.type === 'error').length})
                  </p>
                  <ul className="space-y-2">
                    {issues.filter(i => i.type === 'error').map((item, idx) => (
                      <li key={idx} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>{item.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {issues.filter(i => i.type === 'warning').length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Advertencias ({issues.filter(i => i.type === 'warning').length})
                  </p>
                  <ul className="space-y-2">
                    {issues.filter(i => i.type === 'warning').map((item, idx) => (
                      <li key={idx} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{item.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    {suggestion.message || 'Sugerencias:'}
                  </p>
                  {suggestion.tags && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {suggestion.tags.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.improvements?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Mejoras Sugeridas
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                {result.improvements.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIValidationPanel;

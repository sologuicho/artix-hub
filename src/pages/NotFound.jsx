import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <p
        className="font-display"
        style={{ fontSize: 'clamp(5rem, 20vw, 10rem)', color: 'var(--muted)', lineHeight: 1, marginBottom: '1.5rem' }}
      >
        404
      </p>

      <h1
        className="font-display mb-3"
        style={{ fontSize: 'clamp(1.25rem, 3vw, 2rem)', color: 'var(--text)' }}
      >
        Esta página no existe
      </h1>

      <p
        className="font-sans text-sm mb-10"
        style={{ color: 'var(--muted)', maxWidth: 380, lineHeight: 1.7 }}
      >
        El contenido que buscas fue movido o eliminado.
      </p>

      <button onClick={() => navigate('/')} className="btn btn-primary">
        Volver al inicio
      </button>
    </div>
  );
};

export default NotFound;

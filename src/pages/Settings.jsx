import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const getCsrf = () => {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === 'csrf') return decodeURIComponent(v || '');
  }
  return '';
};

/* ── Brutalist square toggle ── */
const Toggle = ({ on, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      appearance: 'none',
      cursor: 'pointer',
      border: 'none',
      flexShrink: 0,
      width: 40,
      height: 22,
      borderRadius: 0,
      background: on ? '#C4451A' : '#26261f',
      position: 'relative',
      padding: 0,
      transition: 'background 0.15s',
    }}
    aria-checked={on}
    role="switch"
  >
    <span
      style={{
        position: 'absolute',
        top: 3,
        left: on ? 21 : 3,
        width: 16,
        height: 16,
        background: on ? '#0a0a0a' : '#86847f',
        display: 'block',
        transition: 'left 0.15s',
      }}
    />
  </button>
);

/* ── Section nav item ── */
const NavItem = ({ name, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      appearance: 'none',
      background: active ? 'rgba(196,69,26,0.07)' : 'transparent',
      border: 'none',
      borderLeft: `2px solid ${active ? '#C4451A' : 'transparent'}`,
      cursor: 'pointer',
      textAlign: 'left',
      fontSize: 13.5,
      padding: '9px 14px',
      marginLeft: -1,
      color: active ? '#eceae6' : '#7a7a75',
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      width: '100%',
      transition: 'color 0.1s',
    }}
  >
    {name}
  </button>
);

/* ── Row inside a bordered list ── */
const AccountRow = ({ label, sub, subColor, action, onAction, last }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.07)',
    }}
  >
    <div>
      <div style={{ fontSize: 13.5, color: '#d4d2cd' }}>{label}</div>
      {sub && (
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: subColor || '#6f6f6a',
            marginTop: 3,
          }}
        >
          {sub}
        </div>
      )}
    </div>
    {action && (
      <button
        onClick={onAction}
        style={{
          appearance: 'none',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11.5,
          color: '#9a9a95',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '6px 12px',
          flexShrink: 0,
        }}
      >
        {action}
      </button>
    )}
  </div>
);

/* ── Toggle row ── */
const ToggleRow = ({ title, desc, on, onToggle, last }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px 16px',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div style={{ minWidth: 0, paddingRight: 18 }}>
      <div style={{ fontSize: 13.5, color: '#d4d2cd' }}>{title}</div>
      <div style={{ fontSize: 12, color: '#6f6f6a', marginTop: 3 }}>{desc}</div>
    </div>
    <Toggle on={on} onToggle={onToggle} />
  </div>
);

const NOTIF_DEFS = [
  { key: 'followers',  title: 'Nuevos seguidores',       desc: 'Cuando alguien empieza a seguirte.' },
  { key: 'replies',    title: 'Respuestas y menciones',   desc: 'Respuestas a tus posts o menciones en discusiones.' },
  { key: 'events',     title: 'Recordatorios de eventos', desc: 'Avisos antes de eventos a los que te inscribiste.' },
  { key: 'digest',     title: 'Resumen semanal',          desc: 'Lo más relevante de tus temas, cada lunes.' },
];

const PRIVACY_DEFS = [
  { key: 'publicProfile', title: 'Perfil público',     desc: 'Cualquiera puede ver tu perfil y publicaciones.' },
  { key: 'showActivity',  title: 'Mostrar actividad',  desc: 'Muestra likes, follows y lecturas recientes.' },
];

const TIERS = [
  { name: 'Free',    price: '$0',  note: 'lector'     },
  { name: 'Student', price: '$4',  note: 'verificado' },
  { name: 'Pro',     price: '$12', note: 'creadores'  },
  { name: 'Team',    price: '$32', note: 'por asiento'},
];

const SECTIONS = ['Perfil', 'Cuenta', 'Notificaciones', 'Suscripción', 'Privacidad', 'Peligro'];

const loadPref = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

const Settings = () => {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  /* redirect if not authenticated */
  useEffect(() => {
    if (!isAuthenticated()) navigate('/auth');
  }, [isAuthenticated, navigate]);

  const [section, setSection] = useState('Perfil');
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  /* profile form */
  const [form, setForm] = useState({
    name:     '',
    username: '',
    bio:      '',
    affil:    '',
    website:  '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  /* notification & privacy prefs (localStorage fallback) */
  const [notif, setNotif] = useState(() =>
    loadPref('settings_notif', { followers: true, replies: true, events: false, digest: true })
  );
  const [privacy, setPrivacy] = useState(() =>
    loadPref('settings_privacy', { publicProfile: true, showActivity: true })
  );

  /* password modal state */
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  /* delete confirm */
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* populate form when user is ready */
  useEffect(() => {
    if (user) {
      setForm({
        name:     user.name     || '',
        username: user.username || '',
        bio:      user.bio      || '',
        affil:    user.occupation || '',
        website:  '',
      });
    }
  }, [user]);

  /* persist prefs */
  useEffect(() => { localStorage.setItem('settings_notif', JSON.stringify(notif)); }, [notif]);
  useEffect(() => { localStorage.setItem('settings_privacy', JSON.stringify(privacy)); }, [privacy]);

  const flash = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 3000);
  };

  const handleSave = async () => {
    if (section !== 'Perfil') { flash(); return; }
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        credentials: 'include',
        body: JSON.stringify({
          name:       form.name     || undefined,
          username:   form.username || undefined,
          bio:        form.bio      || undefined,
          occupation: form.affil    || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (updateUser) updateUser(data.user);
        flash();
      } else {
        setSaveError(data.message || 'Error al guardar');
      }
    } catch {
      setSaveError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPass !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (pwForm.newPass.length < 6) {
      setPwMsg({ type: 'error', text: 'Mínimo 6 caracteres' });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPass }),
      });
      const data = await res.json();
      if (data.ok) {
        setPwMsg({ type: 'success', text: 'Contraseña actualizada' });
        setPwForm({ current: '', newPass: '', confirm: '' });
        setTimeout(() => { setPwModal(false); setPwMsg(null); }, 1500);
      } else {
        setPwMsg({ type: 'error', text: data.message || 'Error al cambiar' });
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Error de conexión' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.username) { setDeleteError('El nombre de usuario no coincide'); return; }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrf() },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) { await logout(); navigate('/'); }
      else setDeleteError(data.message || 'Error al eliminar');
    } catch {
      setDeleteError('Error de conexión');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleNotif = (key) => setNotif(p => ({ ...p, [key]: !p[key] }));
  const togglePrivacy = (key) => setPrivacy(p => ({ ...p, [key]: !p[key] }));

  const bioLeft = 280 - (form.bio?.length || 0);
  const tier = user?.subscriptionTier || 'free';
  const tierDisplay = tier.charAt(0).toUpperCase() + tier.slice(1);

  const inputStyle = {
    width: '100%',
    height: 40,
    background: '#0f0f0e',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e9e7e3',
    fontSize: 14,
    padding: '0 12px',
    outline: 'none',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
  };

  const labelStyle = {
    display: 'block',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: '0.06em',
    color: '#9a9a95',
    marginBottom: 8,
  };

  if (!isAuthenticated()) return null;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#e9e7e3', fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      {/* ── Inner sticky save bar ── */}
      <div
        style={{
          position: 'sticky',
          top: 56,
          zIndex: 40,
          background: 'rgba(10,10,10,0.88)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '0 28px',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              color: '#f4f2ee',
              flex: 1,
            }}
          >
            Configuración
          </span>
          {saveError && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: '#e0815e' }}>
              {saveError}
            </span>
          )}
          {saved && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: '#9bbf8a' }}>
              ✓ Cambios guardados
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              appearance: 'none',
              cursor: saving ? 'wait' : 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.03em',
              color: '#0a0a0a',
              background: '#C4451A',
              border: 'none',
              padding: '8px 18px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
        {/* Page title */}
        <div style={{ padding: '28px 0 12px' }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5,
              letterSpacing: '0.16em',
              color: '#76746f',
              marginBottom: 9,
            }}
          >
            CUENTA · @{user?.username || ''}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#f4f2ee',
              fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
            }}
          >
            Configuración
          </h1>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '208px minmax(0,1fr)',
            gap: 48,
            padding: '18px 0 80px',
            alignItems: 'start',
          }}
        >
          {/* ── Side nav ── */}
          <aside
            style={{
              position: 'sticky',
              top: 120,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {SECTIONS.map(s => (
              <NavItem key={s} name={s} active={section === s} onClick={() => setSection(s)} />
            ))}
          </aside>

          {/* ── Main panel ── */}
          <main style={{ maxWidth: 660 }}>

            {/* ════ PERFIL ════ */}
            {section === 'Perfil' && (
              <section>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 6,
                  }}
                >
                  PERFIL PÚBLICO
                </div>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: '#76746f' }}>
                  Esta información aparece en tu página pública de perfil.
                </p>

                {/* Avatar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    padding: '18px 0',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: 26,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: '#161614',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 20,
                      color: '#d4d2cd',
                      overflow: 'hidden',
                    }}
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (user?.name || user?.username || 'U').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: '#d4d2cd', fontWeight: 500 }}>Foto de perfil</div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11.5,
                        color: '#6f6f6a',
                        marginTop: 3,
                      }}
                    >
                      PNG o JPG · máx 2 MB · 400×400 px
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Próximamente: carga de avatar')}
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11.5,
                      color: '#9a9a95',
                      background: 'none',
                      border: '1px solid rgba(255,255,255,0.12)',
                      padding: '7px 13px',
                    }}
                  >
                    Subir
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {/* Name + Username */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                    <div>
                      <label style={labelStyle}>NOMBRE</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        style={inputStyle}
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>USUARIO</label>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 40,
                          background: '#0f0f0e',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 14,
                            color: '#5a5a56',
                            padding: '0 2px 0 12px',
                          }}
                        >
                          @
                        </span>
                        <input
                          type="text"
                          value={form.username}
                          onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                          style={{ ...inputStyle, width: 'auto', flex: 1, padding: '0 12px 0 2px', height: '100%', border: 'none', background: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label style={labelStyle}>BIOGRAFÍA</label>
                    <textarea
                      rows={3}
                      value={form.bio}
                      onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      maxLength={280}
                      style={{
                        width: '100%',
                        background: '#0f0f0e',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#e9e7e3',
                        fontSize: 14,
                        lineHeight: 1.55,
                        padding: '11px 12px',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                      }}
                      placeholder="Cuéntanos sobre ti…"
                    />
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: bioLeft < 20 ? '#e0815e' : '#6f6f6a',
                        marginTop: 6,
                        textAlign: 'right',
                      }}
                    >
                      {bioLeft} caracteres restantes
                    </div>
                  </div>

                  {/* Affiliation + Website */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                    <div>
                      <label style={labelStyle}>AFILIACIÓN</label>
                      <input
                        type="text"
                        value={form.affil}
                        onChange={e => setForm(p => ({ ...p, affil: e.target.value }))}
                        style={inputStyle}
                        placeholder="Universidad o empresa"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>SITIO WEB</label>
                      <input
                        type="url"
                        value={form.website}
                        onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                        style={inputStyle}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ════ CUENTA ════ */}
            {section === 'Cuenta' && (
              <section>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 6,
                  }}
                >
                  CUENTA
                </div>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: '#76746f' }}>
                  Datos privados de tu cuenta. No se muestran públicamente.
                </p>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <AccountRow
                    label="Correo electrónico"
                    sub={user?.email || '—'}
                    action="Cambiar"
                    onAction={() => alert('Próximamente: cambio de email')}
                  />
                  <AccountRow
                    label="Contraseña"
                    sub={user?.provider && user.provider !== 'local' ? `Autenticación via ${user.provider}` : 'Actualizar contraseña'}
                    action="Cambiar"
                    onAction={() => {
                      if (user?.provider && user.provider !== 'local') {
                        alert(`Tu cuenta usa ${user.provider}. Cambia la contraseña desde ese proveedor.`);
                      } else {
                        setPwModal(true);
                      }
                    }}
                  />
                  <AccountRow
                    label="Verificación en dos pasos"
                    sub="No configurada"
                    action="Gestionar"
                    onAction={() => alert('Próximamente: 2FA')}
                    last
                  />
                </div>
              </section>
            )}

            {/* ════ NOTIFICACIONES ════ */}
            {section === 'Notificaciones' && (
              <section>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 6,
                  }}
                >
                  NOTIFICACIONES
                </div>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: '#76746f' }}>
                  Elige qué quieres recibir por correo y en la plataforma.
                </p>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  {NOTIF_DEFS.map((d, i) => (
                    <ToggleRow
                      key={d.key}
                      title={d.title}
                      desc={d.desc}
                      on={notif[d.key]}
                      onToggle={() => toggleNotif(d.key)}
                      last={i === NOTIF_DEFS.length - 1}
                    />
                  ))}
                </div>
                <p
                  style={{
                    marginTop: 14,
                    fontSize: 11.5,
                    color: '#5a5a56',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  * Las preferencias de notificación se guardan localmente mientras no haya un endpoint de servidor.
                </p>
              </section>
            )}

            {/* ════ SUSCRIPCIÓN ════ */}
            {section === 'Suscripción' && (
              <section>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 6,
                  }}
                >
                  SUSCRIPCIÓN
                </div>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: '#76746f' }}>
                  Tu plan actual y opciones de cambio.
                </p>

                {/* Current plan card */}
                <div
                  style={{
                    border: '1px solid rgba(196,69,26,0.3)',
                    background: '#0e0c0b',
                    padding: 20,
                    marginBottom: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#f2f0ec' }}>Plan {tierDisplay}</span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10,
                          color: '#e0815e',
                          border: '1px solid rgba(196,69,26,0.45)',
                          padding: '1px 7px',
                        }}
                      >
                        ACTIVO
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        color: '#86847f',
                        marginTop: 6,
                      }}
                    >
                      {tier === 'free' ? 'Plan gratuito' : 'Plan de pago activo'}
                    </div>
                  </div>
                </div>

                {/* Tier comparison */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {TIERS.map((t, i) => {
                    const isActive = tier.toLowerCase() === t.name.toLowerCase();
                    return (
                      <div
                        key={t.name}
                        style={{
                          padding: 16,
                          borderRight: i < TIERS.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                          borderTop: isActive ? '2px solid #C4451A' : '2px solid transparent',
                          background: isActive ? 'rgba(196,69,26,0.08)' : 'transparent',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e2dd' }}>{t.name}</div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 17,
                            color: isActive ? '#e0815e' : '#b6b4af',
                            marginTop: 8,
                          }}
                        >
                          {t.price}
                        </div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 10.5,
                            color: '#6f6f6a',
                            marginTop: 4,
                          }}
                        >
                          {t.note}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
                  <Link
                    to="/subscription"
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      color: '#0a0a0a',
                      background: '#C4451A',
                      border: 'none',
                      padding: '9px 18px',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    Ver planes
                  </Link>
                </div>
              </section>
            )}

            {/* ════ PRIVACIDAD ════ */}
            {section === 'Privacidad' && (
              <section>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 6,
                  }}
                >
                  PRIVACIDAD
                </div>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: '#76746f' }}>
                  Controla la visibilidad de tu perfil y actividad.
                </p>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  {PRIVACY_DEFS.map((d, i) => (
                    <ToggleRow
                      key={d.key}
                      title={d.title}
                      desc={d.desc}
                      on={privacy[d.key]}
                      onToggle={() => togglePrivacy(d.key)}
                      last={i === PRIVACY_DEFS.length - 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ════ PELIGRO ════ */}
            {section === 'Peligro' && (
              <section>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 6,
                  }}
                >
                  ZONA DE PELIGRO
                </div>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: '#76746f' }}>
                  Las acciones de esta sección son permanentes e irreversibles.
                </p>

                <div
                  style={{
                    border: '1px solid rgba(196,69,26,0.4)',
                    padding: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, color: '#e0815e', fontWeight: 500 }}>Eliminar cuenta</div>
                    <div style={{ fontSize: 12, color: '#6f6f6a', marginTop: 3 }}>
                      Esta acción elimina todos tus datos de forma permanente y no se puede deshacer.
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteModal(true)}
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11.5,
                      color: '#e0815e',
                      background: 'none',
                      border: '1px solid rgba(196,69,26,0.5)',
                      padding: '7px 14px',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </section>
            )}

          </main>
        </div>
      </div>

      {/* ── Password modal ── */}
      {pwModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => e.target === e.currentTarget && setPwModal(false)}
        >
          <div
            style={{
              background: '#111110',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: 28,
              width: '100%',
              maxWidth: 420,
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5,
                letterSpacing: '0.14em',
                color: '#76746f',
                marginBottom: 18,
              }}
            >
              CAMBIAR CONTRASEÑA
            </div>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'current', label: 'CONTRASEÑA ACTUAL' },
                { key: 'newPass', label: 'NUEVA CONTRASEÑA' },
                { key: 'confirm', label: 'CONFIRMAR CONTRASEÑA' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    type="password"
                    value={pwForm[key]}
                    onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                    style={inputStyle}
                    required
                  />
                </div>
              ))}
              {pwMsg && (
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: pwMsg.type === 'success' ? '#9bbf8a' : '#e0815e',
                  }}
                >
                  {pwMsg.text}
                </p>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setPwModal(false); setPwMsg(null); setPwForm({ current: '', newPass: '', confirm: '' }); }}
                  style={{
                    appearance: 'none',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: '#86847f',
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '8px 16px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwSaving}
                  style={{
                    appearance: 'none',
                    cursor: pwSaving ? 'wait' : 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: '#0a0a0a',
                    background: '#C4451A',
                    border: 'none',
                    padding: '8px 18px',
                    opacity: pwSaving ? 0.7 : 1,
                  }}
                >
                  {pwSaving ? 'Actualizando…' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete account modal ── */}
      {deleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => e.target === e.currentTarget && setDeleteModal(false)}
        >
          <div
            style={{
              background: '#111110',
              border: '1px solid rgba(196,69,26,0.4)',
              padding: 28,
              width: '100%',
              maxWidth: 420,
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5,
                letterSpacing: '0.14em',
                color: '#e0815e',
                marginBottom: 12,
              }}
            >
              ELIMINAR CUENTA
            </div>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6f6f6a', lineHeight: 1.6 }}>
              Esta acción es permanente. Escribe tu nombre de usuario{' '}
              <strong style={{ color: '#d4d2cd' }}>@{user?.username}</strong> para confirmar.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={user?.username}
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            {deleteError && (
              <p
                style={{
                  margin: '0 0 12px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: '#e0815e',
                }}
              >
                {deleteError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setDeleteModal(false); setDeleteError(''); setDeleteConfirm(''); }}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: '#86847f',
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '8px 16px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirm !== user?.username}
                style={{
                  appearance: 'none',
                  cursor: deleteLoading ? 'wait' : deleteConfirm !== user?.username ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: '#0a0a0a',
                  background: deleteConfirm === user?.username ? '#C4451A' : '#2a2a28',
                  border: 'none',
                  padding: '8px 18px',
                  opacity: deleteLoading ? 0.6 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {deleteLoading ? 'Eliminando…' : 'Eliminar permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

const INSTITUTIONAL_SUFFIXES = [
  '.edu',
  '.edu.mx', '.edu.co', '.edu.ar', '.edu.pe',
  '.edu.cl', '.edu.ec', '.edu.ve', '.edu.bo', '.edu.uy', '.edu.py',
  '.tec.mx', '.itesm.mx', '.unam.mx', '.ipn.mx', '.tecnm.mx',
];

function isInstitutionalEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase();
  return INSTITUTIONAL_SUFFIXES.some(suffix =>
    domain === suffix.slice(1) || domain.endsWith(suffix)
  );
}

module.exports = { isInstitutionalEmail };

// =============================================
//  NOZ ST SOUPPLETS — Données planning S17
//  28 avr. → 3 mai 2026
//  Gérants : Mady (violet), Antoine (bleu), Willy (orange)
// =============================================

function calcSemaine(dateDebut) {
  const debut = new Date(dateDebut);
  const tmp = new Date(debut);
  tmp.setHours(0,0,0,0);
  tmp.setDate(tmp.getDate() + 3 - (tmp.getDay() + 6) % 7);
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const numSem = 1 + Math.round(((tmp - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  const moisDebut = debut.getMonth();
  const jours = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(debut);
    d.setDate(debut.getDate() + i);
    const horsLimite = d.getMonth() !== moisDebut;
    jours.push({
      key:  ['Lun','Mar','Mer','Jeu','Ven','Sam'][i],
      full: ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][i],
      date: new Date(d),
      iso:  d.toISOString().split('T')[0],
      jour: d.getDate(),
      horsLimite,
      label: horsLimite
        ? `${d.getDate()} ${['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][d.getMonth()]}.`
        : `${d.getDate()} ${['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][moisDebut]}.`,
    });
  }
  const finEffective = jours.filter(j => !j.horsLimite).at(-1)?.date || jours[5].date;
  return {
    numero: numSem,
    debut:  debut.toISOString().split('T')[0],
    fin:    finEffective.toISOString().split('T')[0],
    magasin: 'St Soupplets',
    jours,
  };
}

const DATE_DEBUT_SEMAINE = '2026-04-28';

const SEMAINE_DATA  = calcSemaine(DATE_DEBUT_SEMAINE);
const SEMAINE       = { numero: SEMAINE_DATA.numero, debut: SEMAINE_DATA.debut, fin: SEMAINE_DATA.fin, magasin: SEMAINE_DATA.magasin };
const JOURS         = SEMAINE_DATA.jours.map(j => j.key);
const JOURS_FULL    = Object.fromEntries(SEMAINE_DATA.jours.map(j => [j.key, j.full]));
const JOURS_DATES   = Object.fromEntries(SEMAINE_DATA.jours.map(j => [j.key, j.label]));
const JOURS_ISO     = Object.fromEntries(SEMAINE_DATA.jours.map(j => [j.key, j.iso]));
const JOURS_HORS    = Object.fromEntries(SEMAINE_DATA.jours.map(j => [j.key, j.horsLimite]));

const TASKS = {
  'Manager':    { label: 'Manager',    color: '#1565C0' },
  'Relais AM':  { label: 'Relais AM',  color: '#0277BD' },
  'Polyvalent': { label: 'Polyvalent', color: '#2E7D32' },
  'Caisse':     { label: 'Caisse',     color: '#D4A017' },
  'CPRO PM':    { label: 'CPRO PM',    color: '#6A1B9A' },
  'MEP':        { label: 'MEP',        color: '#00838F' },
  'TDM':        { label: 'TDM',        color: '#E65100' },
};

const ROLES = {
  'AM':   { label: 'AM',          color: '#1565C0' },
  'EMP':  { label: 'EMP',         color: '#2E7D32' },
  'CPRO': { label: 'Contrat Pro', color: '#6A1B9A' },
};

// =============================================
//  EMPLOYÉS ST SOUPPLETS — S17
//  PINs : 2001→Mady, 2002→Antoine, 2003→Willy
//         2004→Vanessa, 2005→F.Fareon, 2006→Inès
//         2007→Yoan, 2008→Meryem, 2009→Anthony
//         2010→Virginie, 2011→Yanis, 2012→Mylène
//         2013→Zao, 2014→Océane
// =============================================

const STAFF = [
  {
    // VIOLET sur le planning — gérante principale
    prenom: 'Mady', nom: '', role: 'AM', contrat: 39, pin: '2001',
    shifts: [
      { j: 'Lun', deb: 7,  fin: 20, task: 'Manager' },
      { j: 'Mar', deb: 7,  fin: 20, task: 'Manager' },
      { j: 'Mer', deb: 7,  fin: 20, task: 'Manager' },
      { j: 'Jeu', deb: 0,  fin: 0,  task: null },
      { j: 'Ven', deb: 7,  fin: 20, task: 'Manager' },
      { j: 'Sam', deb: 7,  fin: 20, task: 'Manager' },
    ],
  },
  {
    // BLEU sur le planning
    prenom: 'Antoine', nom: '', role: 'AM', contrat: 39, pin: '2002',
    shifts: [
      { j: 'Lun', deb: 6,  fin: 13, task: 'Relais AM' },
      { j: 'Mar', deb: 6,  fin: 13, task: 'Relais AM' },
      { j: 'Mer', deb: 0,  fin: 0,  task: null },
      { j: 'Jeu', deb: 6,  fin: 13, task: 'Relais AM' },
      { j: 'Ven', deb: 6,  fin: 13, task: 'Relais AM' },
      { j: 'Sam', deb: 6,  fin: 13, task: 'Relais AM' },
    ],
  },
  {
    // ORANGE sur le planning
    prenom: 'Willy', nom: '', role: 'AM', contrat: 39, pin: '2003',
    shifts: [
      { j: 'Lun', deb: 9,  fin: 17, task: 'Relais AM' },
      { j: 'Mar', deb: 0,  fin: 0,  task: null },
      { j: 'Mer', deb: 9,  fin: 17, task: 'Relais AM' },
      { j: 'Jeu', deb: 9,  fin: 17, task: 'Relais AM' },
      { j: 'Ven', deb: 9,  fin: 17, task: 'Relais AM' },
      { j: 'Sam', deb: 9,  fin: 17, task: 'Relais AM' },
    ],
  },
  {
    prenom: 'Vanessa', nom: '', role: 'EMP', contrat: 35, pin: '2004',
    shifts: [
      { j: 'Lun', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Mar', deb: 0,  fin: 0,  task: null },
      { j: 'Mer', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Jeu', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Ven', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Sam', deb: 0,  fin: 0,  task: null },
    ],
  },
  {
    prenom: 'F. Fareon', nom: '', role: 'EMP', contrat: 35, pin: '2005',
    shifts: [
      { j: 'Lun', deb: 0,  fin: 0,  task: null },
      { j: 'Mar', deb: 9,  fin: 16, task: 'Caisse' },
      { j: 'Mer', deb: 9,  fin: 16, task: 'Caisse' },
      { j: 'Jeu', deb: 9,  fin: 16, task: 'Caisse' },
      { j: 'Ven', deb: 9,  fin: 16, task: 'Caisse' },
      { j: 'Sam', deb: 9,  fin: 16, task: 'Caisse' },
    ],
  },
  {
    prenom: 'Inès', nom: '', role: 'EMP', contrat: 35, pin: '2006',
    shifts: [
      { j: 'Lun', deb: 9,  fin: 16, task: 'Polyvalent' },
      { j: 'Mar', deb: 9,  fin: 16, task: 'Polyvalent' },
      { j: 'Mer', deb: 0,  fin: 0,  task: null },
      { j: 'Jeu', deb: 9,  fin: 16, task: 'Polyvalent' },
      { j: 'Ven', deb: 0,  fin: 0,  task: null },
      { j: 'Sam', deb: 9,  fin: 16, task: 'Polyvalent' },
    ],
  },
  {
    prenom: 'Yoan', nom: '', role: 'EMP', contrat: 35, pin: '2007',
    shifts: [
      { j: 'Lun', deb: 8,  fin: 15, task: 'Polyvalent' },
      { j: 'Mar', deb: 0,  fin: 0,  task: null },
      { j: 'Mer', deb: 8,  fin: 15, task: 'Polyvalent' },
      { j: 'Jeu', deb: 0,  fin: 0,  task: null },
      { j: 'Ven', deb: 8,  fin: 15, task: 'Polyvalent' },
      { j: 'Sam', deb: 8,  fin: 15, task: 'Polyvalent' },
    ],
  },
  {
    prenom: 'Meryem', nom: '', role: 'EMP', contrat: 35, pin: '2008',
    shifts: [
      { j: 'Lun', deb: 9,  fin: 17, task: 'Caisse' },
      { j: 'Mar', deb: 9,  fin: 17, task: 'Caisse' },
      { j: 'Mer', deb: 0,  fin: 0,  task: null },
      { j: 'Jeu', deb: 9,  fin: 17, task: 'Caisse' },
      { j: 'Ven', deb: 9,  fin: 17, task: 'Caisse' },
      { j: 'Sam', deb: 0,  fin: 0,  task: null },
    ],
  },
  {
    prenom: 'Anthony', nom: '', role: 'EMP', contrat: 35, pin: '2009',
    shifts: [
      { j: 'Lun', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Mar', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Mer', deb: 10, fin: 17, task: 'Polyvalent' },
      { j: 'Jeu', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Ven', deb: 0,  fin: 0,  task: null },
      { j: 'Sam', deb: 6,  fin: 13, task: 'Polyvalent' },
    ],
  },
  {
    prenom: 'Virginie', nom: '', role: 'EMP', contrat: 35, pin: '2010',
    shifts: [
      { j: 'Lun', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Mar', deb: 0,  fin: 0,  task: null },
      { j: 'Mer', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Jeu', deb: 0,  fin: 0,  task: null },
      { j: 'Ven', deb: 6,  fin: 13, task: 'Polyvalent' },
      { j: 'Sam', deb: 6,  fin: 13, task: 'Polyvalent' },
    ],
  },
  {
    prenom: 'Yanis', nom: '', role: 'CPRO', contrat: 35, pin: '2011',
    shifts: [
      { j: 'Lun', deb: 6,  fin: 13, task: 'TDM' },
      { j: 'Mar', deb: 6,  fin: 13, task: 'TDM' },
      { j: 'Mer', deb: 6,  fin: 13, task: 'TDM' },
      { j: 'Jeu', deb: 0,  fin: 0,  task: null },
      { j: 'Ven', deb: 6,  fin: 13, task: 'TDM' },
      { j: 'Sam', deb: 0,  fin: 0,  task: null },
    ],
  },
  {
    prenom: 'Mylène', nom: '', role: 'CPRO', contrat: 35, pin: '2012',
    shifts: [
      { j: 'Lun', deb: 6,  fin: 13, task: 'MEP' },
      { j: 'Mar', deb: 6,  fin: 13, task: 'MEP' },
      { j: 'Mer', deb: 6,  fin: 13, task: 'MEP' },
      { j: 'Jeu', deb: 6,  fin: 13, task: 'MEP' },
      { j: 'Ven', deb: 0,  fin: 0,  task: null },
      { j: 'Sam', deb: 6,  fin: 13, task: 'MEP' },
    ],
  },
  {
    prenom: 'Zao', nom: '', role: 'CPRO', contrat: 35, pin: '2013',
    shifts: [
      { j: 'Lun', deb: 6,  fin: 13, task: 'MEP' },
      { j: 'Mar', deb: 0,  fin: 0,  task: null },
      { j: 'Mer', deb: 6,  fin: 13, task: 'MEP' },
      { j: 'Jeu', deb: 6,  fin: 13, task: 'MEP' },
      { j: 'Ven', deb: 6,  fin: 13, task: 'MEP' },
      { j: 'Sam', deb: 6,  fin: 13, task: 'MEP' },
    ],
  },
  {
    prenom: 'Océane', nom: '', role: 'CPRO', contrat: 35, pin: '2014',
    shifts: [
      { j: 'Lun', deb: 6,  fin: 13, task: 'CPRO PM' },
      { j: 'Mar', deb: 6,  fin: 13, task: 'CPRO PM' },
      { j: 'Mer', deb: 0,  fin: 0,  task: null },
      { j: 'Jeu', deb: 6,  fin: 13, task: 'CPRO PM' },
      { j: 'Ven', deb: 6,  fin: 13, task: 'CPRO PM' },
      { j: 'Sam', deb: 0,  fin: 0,  task: null },
    ],
  },
];

function totalHeures(staff) {
  return staff.shifts.reduce((sum, s) => sum + (s.deb ? s.fin - s.deb : 0), 0);
}
function initiales(p) {
  const w = p.prenom.trim().split(/\s+/);
  return (w[0][0] + (w[1]?.[0] || p.nom?.[0] || '')).toUpperCase();
}
function roleColor(role) {
  return (ROLES[role] || {}).color || '#888';
}

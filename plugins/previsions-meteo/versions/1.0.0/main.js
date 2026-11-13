// Prévisions météo : la météo d'une map n'est pas envoyée par le serveur, chaque client la
// calcule à partir de l'heure. Horizon fait tourner le même calcul en avance
// (horizon.game.weather) ; ce plugin le résume dans la barre du jeu et prévient avant
// l'arrivée de ce qui est surveillé.

const REFRESH_MS = 30 * 1000

// Seuils : ce qui se voit vraiment à l'écran.
const RAIN = 0.15 // pluie ou neige visibles
const HEAVY = 0.6 // forte
const LIGHTNING = 1 // un éclair par minute : orage
const VIOLENT = 6 // six par minute : violent
const FOG = 0.4

const NAMES = { orage: 'Orage', pluie: 'Pluie', neige: 'Neige', brouillard: 'Brouillard' }
const alerted = new Set()
let last = null

function watched(kind) {
  const watch = horizon.setting('watch')
  if (watch === 'orages') return kind === 'orage'
  if (watch === 'precipitations') return kind !== 'brouillard'
  return true
}

// What shows at that minute, the most notable first.
function kindOf(p) {
  if (p.lightning >= LIGHTNING && watched('orage')) return 'orage'
  if (p.snow >= RAIN && watched('neige')) return 'neige'
  if (p.rain >= RAIN && watched('pluie')) return 'pluie'
  if (p.fog >= FOG && watched('brouillard')) return 'brouillard'
  return null
}

const level = (kind, p) => ({ orage: p.lightning, pluie: p.rain, neige: p.snow, brouillard: p.fog })[kind] ?? 0

function strength(kind, p) {
  if (kind === 'orage') return p.lightning >= VIOLENT ? ' violent' : ''
  if (kind === 'pluie') return p.rain >= HEAVY ? ' forte' : ''
  if (kind === 'neige') return p.snow >= HEAVY ? ' forte' : ''
  return ''
}

// The periods: [{ kind, start, end }] (indexes of the points, one a minute).
function periods(points) {
  const list = []
  let current = null
  points.forEach((p, i) => {
    const kind = kindOf(p)
    if (current && current.kind === kind) {
      current.end = i
      // The strongest moment gives the period its strength.
      if (level(kind, p) > level(kind, current.peak)) current.peak = p
      return
    }
    if (current) list.push(current)
    current = kind ? { kind, start: i, end: i, peak: p } : null
  })
  if (current) list.push(current)
  return list
}

// A server time as a clock time of this computer.
function clock(forecast, t) {
  const d = new Date(Date.now() + (t - forecast.now))
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function inMinutes(forecast, t) {
  const m = Math.max(0, Math.round((t - forecast.now) / 60000))
  if (m < 1) return 'dans un instant'
  if (m < 60) return `dans ${m} min`
  return `vers ${clock(forecast, t)}`
}

function summary(forecast) {
  if (!forecast.weather) return { text: 'Météo : pas de météo ici', tone: 'off' }
  const pts = forecast.points
  const list = periods(pts)
  const announced = forecast.serverStorm && watched('orage') ? forecast.serverStorm : null
  const now = list[0] && list[0].start === 0 ? list[0] : null
  if (now) {
    const ends = now.end >= pts.length - 1 ? `encore plus de ${Math.round((pts.length - 1) / 60)} h` : `fin vers ${clock(forecast, pts[now.end].t)}`
    return { text: `${NAMES[now.kind]}${strength(now.kind, now.peak)} en cours, ${ends}`, tone: now.kind === 'orage' ? 'warn' : '' }
  }
  const next = list[0]
  if (announced && (!next || announced < pts[next.start].t)) {
    return { text: `Orage annoncé ${inMinutes(forecast, announced)}`, tone: 'warn', at: announced, kind: 'orage' }
  }
  if (next) {
    const p = pts[next.start]
    return { text: `${NAMES[next.kind]}${strength(next.kind, next.peak)} ${inMinutes(forecast, p.t)}`, tone: next.kind === 'orage' ? 'warn' : '', at: p.t, kind: next.kind }
  }
  const hours = Math.round((pts.length - 1) / 60)
  return { text: `Beau temps pour ${hours} h`, tone: 'ok' }
}

function alertIfSoon(forecast, s) {
  const before = Number(horizon.setting('alertBefore')) || 0
  if (!before || !s.at) return
  const minutes = (s.at - forecast.now) / 60000
  // One alert per event (its kind and its start, to the 5 minutes).
  const key = `${forecast.mapId}:${s.kind}:${Math.round(s.at / 300000)}`
  if (minutes <= before && minutes >= 0 && !alerted.has(key)) {
    alerted.add(key)
    horizon.notify(`Météo : ${s.text.charAt(0).toLowerCase()}${s.text.slice(1)}`)
  }
}

async function refresh() {
  const forecast = await horizon.game.weather(Number(horizon.setting('hours')) || 3)
  if (typeof forecast === 'string') {
    if (forecast === 'non-supporte') horizon.status.set('Météo : Ruffle natif requis', { tone: 'warn' })
    else if (forecast === 'pas-pret') horizon.status.set('Météo : en attente du jeu', { tone: 'off' })
    return
  }
  last = forecast
  const s = summary(forecast)
  horizon.status.set(s.text, s.tone ? { tone: s.tone } : undefined)
  alertIfSoon(forecast, s)
}

// The next hours in detail, in a notification.
function detail() {
  if (!last || !last.weather) return horizon.notify(last ? 'pas de météo sur cette map' : 'prévisions pas encore prêtes')
  const list = periods(last.points)
  if (!list.length) return horizon.notify(`beau temps pour ${Math.round((last.points.length - 1) / 60)} h`)
  const parts = list.slice(0, 5).map((p) => `${NAMES[p.kind]}${strength(p.kind, p.peak)} ${clock(last, last.points[p.start].t)}-${clock(last, last.points[p.end].t)}`)
  horizon.notify(parts.join(', '))
}

refresh()
setInterval(refresh, REFRESH_MS)
for (const id of ['watch', 'hours', 'alertBefore']) horizon.onSetting(id, refresh)
horizon.onKeySetting('detailKey', detail)

// Coupe la pluie et la neige : le jeu ne les dessine (et ne joue leur son) que si son
// reglage rainRateQuality est au-dessus de 0. L'hote d'Horizon le tient a 0 tant que la
// coupure dure, meme si la qualite change. Ruffle natif seulement.

let blocked = false

function showStatus() {
  horizon.status.set(blocked ? 'Pluie : coupée' : 'Pluie : normale', { tone: blocked ? 'ok' : 'off' })
}

async function setRain(block) {
  const result = await horizon.game.blockRain(block)
  if (result === 'ok') {
    blocked = block
    showStatus()
    return true
  }
  if (result === 'non-supporte') horizon.status.set('Anti-pluie : Ruffle natif requis', { tone: 'warn' })
  else if (result === 'pas-pret') horizon.notify('le jeu n’est pas encore prêt')
  return false
}

setRain(Boolean(horizon.setting('startOn')))

horizon.onKeySetting('toggleKey', async () => {
  if (await setRain(!blocked)) horizon.notify(blocked ? 'pluie coupée' : 'pluie remise')
})

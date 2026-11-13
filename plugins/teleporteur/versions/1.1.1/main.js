// Raccourci (Alt+T par defaut, reglable dans le menu Plugins) : ouvre la carte de destination du teleporteur, comme un clic sur son icone dans
// la barre d'objets. Le legendaire passe avant le normal quand on a les deux.

// Teleporteur legendaire, puis teleporteur normal.
const TELEPORTEURS = [464, 3]

horizon.onKeySetting('key', async () => {
  const result = await horizon.game.useObject(TELEPORTEURS)
  if (result === 'absent') horizon.notify("pas de téléporteur dans l'inventaire")
  else if (result === 'pas-pret') horizon.notify('le jeu n’est pas encore prêt')
})

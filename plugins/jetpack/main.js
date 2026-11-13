// Raccourci (Alt+V par defaut, reglable dans le menu Plugins) : active ou coupe le jetpack, comme un clic sur son icone dans la barre d'objets.
// Le jeu garde ses propres regles (pouvoir expire, sous l'eau, deja en vol).

// Le premier present dans l'inventaire : legendaire, normal, Noel, Blibli.
const JETPACKS = [453, 11, 134, 57]

horizon.onKeySetting('key', async () => {
  const result = await horizon.game.useObject(JETPACKS)
  if (result === 'absent') horizon.notify("pas de jetpack dans l'inventaire")
  else if (result === 'pas-pret') horizon.notify('le jeu n’est pas encore prêt')
})

// Builds index.json (the catalog Horizon reads) from plugins/<id>/versions/<version>/, every
// version of every plugin, with the SHA-256 of each file: Horizon installs the newest version
// whose minVersion it meets, and only if what it downloads matches. Also writes, for Horizon
// 0.3.2 (which reads plugins/<id>/plugin.json and main.js and the top-level version and files
// of index.json), a copy of the newest version compatible with it; and refreshes the plugin
// table of README.md (between the CATALOGUE markers).
//   node tools/build-index.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/
const VERSION = /^\d+\.\d+\.\d+$/
const FILES = ['plugin.json', 'main.js']
// The first Horizon with the catalog, which knows neither minVersion nor the versions.
const LEGACY_HORIZON = '0.3.2'
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

const parts = (v) => v.split('.').map(Number)
const compare = (a, b) => {
  const [pa, pb] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
  return 0
}

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const plugins = fs
  .readdirSync(path.join(root, 'plugins'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && ID.test(e.name))
  .map((e) => {
    const id = e.name
    const versionsDir = path.join(root, 'plugins', id, 'versions')
    if (!fs.existsSync(versionsDir)) fail(`${id} : pas de dossier versions/`)
    const versions = fs
      .readdirSync(versionsDir, { withFileTypes: true })
      .filter((v) => v.isDirectory())
      .map((v) => {
        const dir = path.join(versionsDir, v.name)
        const where = `${id} ${v.name}`
        for (const f of FILES) if (!fs.existsSync(path.join(dir, f))) fail(`${where} : ${f} manquant`)
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'plugin.json'), 'utf8'))
        if (!manifest.name || !manifest.author) fail(`${where} : name et author requis dans plugin.json`)
        if (manifest.version !== v.name || !VERSION.test(v.name)) fail(`${where} : "version" doit valoir "${v.name}" (x.y.z), le nom du dossier`)
        if (!VERSION.test(manifest.minVersion ?? '')) fail(`${where} : "minVersion" (version d'Horizon x.y.z) requis dans plugin.json`)
        return {
          version: manifest.version,
          minVersion: manifest.minVersion,
          name: manifest.name,
          description: manifest.description ?? '',
          author: manifest.author,
          path: `plugins/${id}/versions/${v.name}`,
          files: Object.fromEntries(FILES.map((f) => [f, sha256(fs.readFileSync(path.join(dir, f)))])),
        }
      })
      .sort((a, b) => compare(b.version, a.version))
    if (!versions.length) fail(`${id} : aucune version`)
    const latest = versions[0]
    const entry = { id, name: latest.name, description: latest.description, author: latest.author, versions }

    // Horizon 0.3.2: the copy at plugins/<id>/ and the top-level fields.
    const legacy = versions.find((v) => compare(v.minVersion, LEGACY_HORIZON) <= 0)
    for (const f of FILES) {
      const target = path.join(root, 'plugins', id, f)
      if (legacy) fs.copyFileSync(path.join(root, legacy.path, f), target)
      else fs.rmSync(target, { force: true })
    }
    if (legacy) Object.assign(entry, { version: legacy.version, files: legacy.files })
    return entry
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({ format: 2, plugins }, null, 2) + '\n')

const readme = path.join(root, 'README.md')
const table = [
  '| Plugin | Auteur | Version | Horizon | Description |',
  '|---|---|---|---|---|',
  ...plugins.map((p) => {
    const v = p.versions[0]
    return `| **${p.name}** (\`${p.id}\`) | ${p.author} | ${v.version} | ${v.minVersion} et plus | ${p.description.replace(/\|/g, '\\|')} |`
  }),
].join('\n')
const text = fs.readFileSync(readme, 'utf8')
fs.writeFileSync(readme, text.replace(/<!-- CATALOGUE -->[\s\S]*<!-- \/CATALOGUE -->/, `<!-- CATALOGUE -->\n${table}\n<!-- /CATALOGUE -->`))
console.log(plugins.map((p) => `${p.id} ${p.versions.map((v) => `${v.version} (Horizon ${v.minVersion}+)`).join(', ')}${p.version ? ` ; 0.3.2 : ${p.version}` : ''}`).join('\n'))

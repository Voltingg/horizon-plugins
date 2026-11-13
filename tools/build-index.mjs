// Builds index.json (the catalog Horizon reads) from plugins/*/plugin.json, with the SHA-256
// of each file: Horizon installs a plugin only if what it downloads matches. Also refreshes
// the plugin table of README.md (between the CATALOGUE markers).
//   node tools/build-index.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/
const FILES = ['plugin.json', 'main.js']
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

const plugins = fs
  .readdirSync(path.join(root, 'plugins'), { withFileTypes: true })
  .filter((e) => e.isDirectory() && ID.test(e.name))
  .map((e) => {
    const dir = path.join(root, 'plugins', e.name)
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'plugin.json'), 'utf8'))
    if (!manifest.name || !manifest.version || !manifest.author) throw new Error(`${e.name} : name, version et author requis dans plugin.json`)
    return {
      id: e.name,
      name: manifest.name,
      description: manifest.description ?? '',
      version: manifest.version,
      author: manifest.author,
      files: Object.fromEntries(FILES.map((f) => [f, sha256(fs.readFileSync(path.join(dir, f)))])),
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({ format: 1, plugins }, null, 2) + '\n')

const readme = path.join(root, 'README.md')
const table = [
  '| Plugin | Auteur | Version | Description |',
  '|---|---|---|---|',
  ...plugins.map((p) => `| **${p.name}** (\`${p.id}\`) | ${p.author} | ${p.version} | ${p.description.replace(/\|/g, '\\|')} |`),
].join('\n')
const text = fs.readFileSync(readme, 'utf8')
fs.writeFileSync(readme, text.replace(/<!-- CATALOGUE -->[\s\S]*<!-- \/CATALOGUE -->/, `<!-- CATALOGUE -->\n${table}\n<!-- /CATALOGUE -->`))
console.log(`${plugins.length} plugins : ${plugins.map((p) => `${p.id} ${p.version}`).join(', ')}`)

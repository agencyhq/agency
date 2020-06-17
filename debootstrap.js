const fs = require('fs').promises
const path = require('path')

const Arborist = require('@npmcli/arborist')
const npm = require('npm/lib/npm')
const pack = require('npm/lib/pack')
const globby = require('globby')

const lerna = require('./lerna.json')

async function debootstrap (arb, replacements) {
  const tree = await arb.loadActual({})

  await new Promise(resolve => npm.load(resolve))

  const opts = {
    add: [],
    rm: []
  }

  for (let [name] of tree.edgesOut) {
    if (replacements.has(name)) {
      opts.rm.push(name)
      const dir = replacements.get(name)
      name = name[0] === '@'
        ? name.substr(1).replace(/\//g, '-')
        : name
      const target = path.join(tree.path, 'node_components', `${name}-0.0.0.tgz`)

      await fs.mkdir(path.dirname(target), { recursive: true })

      await pack.prepareDirectory(dir)
      const pkg = await pack.packDirectory({}, dir, target, target, false)
      opts.add.push('./' + path.relative(tree.path, pkg.filename))
    }
  }

  await arb.buildIdealTree(opts)
  await arb.reify()
}

async function main () {
  const components = await globby(lerna.packages, { onlyDirectories: true })

  const arbs = components.map(path => new Arborist({ path }))
  const replacements = new Map()

  for (const arb of arbs) {
    const tree = await arb.loadActual({})

    replacements.set(tree.package.name, tree.path)
  }

  for (const arb of arbs) {
    await debootstrap(arb, replacements)
  }
}

main()

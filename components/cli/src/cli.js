const fs = require('fs')

const log = require('loglevel')
const { table } = require('table')
const yargs = require('yargs')

const RPC = require('@agencyhq/jsonrpc-ws')

log.setLevel(process.env.LOG_LEVEL || 'info')

function wrapRPC (fn) {
  return async (argv) => {
    const { rpcToken, rpcUrl, quiet } = argv
    const rpc = new RPC.Client(rpcUrl)

    await rpc.connect()
    await rpc.auth({ token: rpcToken })

    try {
      const output = await fn({ ...argv, rpc })

      if (!quiet) {
        console.log(output)
      }
    } finally {
      await rpc.close()
    }
  }
}

function formatRule (rule) {
  return table([
    ['id', rule.id],
    ['user', rule.user],
    ['created at', rule.created_at],
    ['updated at', rule.updated_at],
    ['code', rule.code]
  ], {
    columns: {
      0: {
        width: 10
      },
      1: {
        width: (process.stdout.columns || 80) - 10 - 7
      }
    },
    drawHorizontalLine: (index, size) => {
      return index === 0 || index === 4 || index === 5
    }
  })
}

const COMMANDS = [{
  command: 'rule',
  subcommands: [{
    command: 'list',
    describe: 'list all rules',
    handler: wrapRPC(async ({ rpc, json }) => {
      const rules = await rpc.call('rule.list')

      if (json) {
        return rules
      }

      const output = []

      for (const rule of rules) {
        output.push(formatRule(rule))
      }

      return output.join('\n')
    })
  }, {
    command: 'update [id] [filepath]',
    describe: 'update the rule with content of the file',
    builder: y => y
      .positional('id', {
        type: 'string',
        description: 'rule id'
      })
      .positional('filepath', {
        type: 'string',
        description: 'path to the file'
      }),
    handler: wrapRPC(async ({ rpc, id, filepath, json }) => {
      const code = fs.readFileSync(filepath, { encoding: 'utf8' })

      const rule = await rpc.call('rule.update', { id, code })

      if (json) {
        return rule
      }

      return formatRule(rule)
    })
  }]
}]

async function main () {
  yargs
    .option('rpc-token', {
      global: true,
      description: 'Agency RPC token',
      type: 'string',
      default: process.env.AGENCY_TOKEN
    })
    .option('rpc-url', {
      global: true,
      description: 'Agency RPC url',
      type: 'string',
      default: process.env.AGENCY_URL || 'ws://localhost:3000/'
    })
    .option('q', {
      global: true,
      alias: 'quiet',
      description: 'suppress output'
    })
    .option('json', {
      global: true,
      description: 'output as json'
    })

  for (const cmd of COMMANDS) {
    yargs.command(cmd.command, '', y => {
      for (const subcmd of cmd.subcommands) {
        y.command(subcmd)
      }
    })
  }

  yargs
    .help()
    .parse()
}

main()
  .catch(e => {
    log.error(e)
    process.exit(1)
  })

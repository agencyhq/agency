import fs from 'fs'

import log from 'loglevel'
import { table } from 'table'
import yargs from 'yargs'

import RPC from '@agencyhq/jsonrpc-ws'

log.setLevel(process.env.LOG_LEVEL || 'info')

function forever () {
  return new Promise(resolve => {
    process.once('SIGINT', () => {
      log.info('Caught interrupt signal')
      resolve()
    })
  })
}

function wrapRPC (fn) {
  return async (argv) => {
    const { agencyToken, agencyUrl, quiet } = argv
    const rpc = new RPC.Client(agencyUrl)

    await rpc.connect()
    await rpc.auth({ token: agencyToken })

    try {
      const output = await fn({ ...argv, rpc })

      if (!quiet && output) {
        log.info(output)
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
    command: 'create [filepath]',
    describe: 'create a rule with content of the file',
    builder: y => y
      .positional('filepath', {
        type: 'string',
        description: 'path to the file'
      }),
    handler: wrapRPC(async ({ rpc, filepath, json }) => {
      const code = fs.readFileSync(filepath, { encoding: 'utf8' })

      const rule = await rpc.call('rule.create', { code })

      if (json) {
        return rule
      }

      return formatRule(rule)
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
}, {
  command: 'subscribe [events...]',
  describe: 'subscribe to event',
  builder: y => y
    .positional('events', {
      type: 'string',
      description: 'event type',
      array: true
    }),
  handler: wrapRPC(async ({ rpc, events, json }) => {
    for (const event of events) {
      await rpc.subscribe(event, payload => {
        log.info(JSON.stringify({
          event,
          payload
        }, null, 2))
      })
    }

    log.info('listening for events:', events)

    await forever()
  })
}]

export async function main () {
  yargs
    .option('agency-token', {
      global: true,
      description: 'Agency RPC token',
      type: 'string',
      default: process.env.AGENCY_TOKEN
    })
    .option('agency-url', {
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
    const {
      command,
      describe = '',
      subcommands,
      builder,
      handler
    } = cmd

    if (subcommands) {
      yargs.command(command, describe, y => {
        for (const subcmd of subcommands) {
          y.command(subcmd)
        }
      })
    } else {
      yargs.command(command, describe, builder, handler)
    }
  }

  yargs
    .demandCommand()
    .parse()
}

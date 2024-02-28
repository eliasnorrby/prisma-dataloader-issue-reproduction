import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends
  PrismaClient<Prisma.PrismaClientOptions, 'query'>
implements OnModuleInit {
  constructor() {
    const log: (Prisma.LogLevel | Prisma.LogDefinition)[] = [
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ]

    log.push(
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'info' },
    )

    super({ log })

    let queryCount = 0
    let lastQueriedAt = 0

    this.$on('query', (event) => {
      // Reset queryCount if there haven't seen a query for 2 seconds
      const now = Date.now()
      if (now - lastQueriedAt > 2000) {
        queryCount = 0
      }
      lastQueriedAt = now

      const params = JSON.parse(event.params)

      let paramCount = 0
      const query = event.query
      .replace(/`main`./g, '')
      .replace(/`/g, '')
      .replace(/\?/g, () => {
        const item = params[paramCount++]

        return JSON.stringify(item)
      })

      console.debug(`Prisma Query #${++queryCount}:`, query)
      console.debug()
    })
  }

  async onModuleInit() {
    // Note: this is optional
    await this.$connect()
  }
}

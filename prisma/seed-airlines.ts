import { PrismaClient } from '@prisma/client'
import csv from 'csv-parser'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {

  const airlines: any[] = []

  const csvFilePath = path.join(
    __dirname,
    'airlines.csv'
  )

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      airlines.push(row)
    })
    .on('end', async () => {

      console.log(`Found ${airlines.length} airlines`)

      for (const airline of airlines) {
        try {
          await prisma.airline.upsert({
            where: {
              airlineId: Number(airline.airline_id)
            },
            update: {
              name: airline.name,
              iata: airline.iata || null,
              icao: airline.icao || null,
              callsign: airline.callsign || null,
              country: airline.country || null,
              logoSvgUrl: airline.logo_svg_url || null,
              logoPngUrl: airline.logo_png_url || null,
              isActive: true
            },
            create: {
              airlineId: Number(airline.airline_id),
              name: airline.name,
              iata: airline.iata || null,
              icao: airline.icao || null,
              callsign: airline.callsign || null,
              country: airline.country || null,
              logoSvgUrl: airline.logo_svg_url || null,
              logoPngUrl: airline.logo_png_url || null,
              isActive: true
            }
          })
          console.log(`Imported: ${airline.name}`)
        } catch (error) {
          console.error(
            `Failed: ${airline.name}`,
            error
          )
        }
      }

      console.log('✅ Airline import completed')
      await prisma.$disconnect()
    })

}

main()
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

import { PrismaClient } from '@prisma/client'
import csv from 'csv-parser'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {

  const airports: any[] = []

  const csvFilePath = path.join(
    __dirname,
    'data',
    'airports.csv'
  )

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      airports.push(row)
    })
    .on('end', async () => {

      console.log(`Found ${airports.length} airports`)

      for (const airport of airports) {
        try {
          // Skip airports without IATA
          if (!airport.IataCode) {
            continue
          }

          await prisma.airport.upsert({
            where: {
              iataCode: airport.IataCode
            },
            update: {
              airportName: airport.AirportName,
              latitude: airport.Latitude ? parseFloat(airport.Latitude) : null,
              longitude: airport.Longitude ? parseFloat(airport.Longitude) : null,
              continent: airport.Continent || null,
              isoCountry: airport.IsoCountry || null,
              isoRegion: airport.IsoRegion || null,
              city: airport.City || null,
              gpsCode: airport.GpsCode || null,
              isActive: true
            },
            create: {
              airportName: airport.AirportName,
              latitude: airport.Latitude ? parseFloat(airport.Latitude) : null,
              longitude: airport.Longitude ? parseFloat(airport.Longitude) : null,
              continent: airport.Continent || null,
              isoCountry: airport.IsoCountry || null,
              isoRegion: airport.IsoRegion || null,
              city: airport.City || null,
              gpsCode: airport.GpsCode || null,
              iataCode: airport.IataCode,
              isActive: true
            }
          })
          console.log(`Imported: ${airport.IataCode} - ${airport.AirportName}`)
        } catch (error) {
          console.error(`Failed: ${airport.IataCode}`, error)
        }
      }

      console.log('✅ Airport import completed')
      await prisma.$disconnect()
    })

}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

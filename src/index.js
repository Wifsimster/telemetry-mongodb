const fastify = require('fastify')({ logger: true })
const config = require('../config')
const mqtt = require('mqtt')
const MongoClient = require('mongodb').MongoClient
const mqttUrl = `mqtt://${config.mqtt.host}:${config.mqtt.port}`
const mongoUrl = `mongodb://${config.mongo.host}:${config.mongo.port}/`
const PORT = 3001
const mongoClient = new MongoClient(mongoUrl)

fastify.get('/linky', async (request, reply) => {
  try {
    const db = mongoClient.db(config.mongo.db)
    const linky = db.collection('linky')
    const options = {
      sort: { createdAt: -1 },
      projection: {
        createdAt: 1,
        index: 1,
        instantaneousIntensity03: 1,
      },
    }

    const cursor = linky.find({ createdAt: { $exists: true } }, options)

    if ((await cursor.count()) === 0) {
      return 'No documents found !'
    }

    return await cursor.toArray()
  } catch (err) {
    return err
  }
})

async function main() {
  await mongoClient.connect()
  const db = mongoClient.db(config.mongo.db)

  const mqttClient = mqtt.connect(mqttUrl)

  mqttClient.on('connect', function () {
    mqttClient.subscribe(config.mqtt.topic, function (err) {
      if (!err) {
        console.log(`Subscribe to ${config.mqtt.topic}`)
      }
    })
  })

  mqttClient.on('message', (topic, message) => {
    try {
      let data = JSON.parse(message.toString())
      data.createdAt = new Date()

      db.collection('linky').insertOne(data, function (err, res) {
        if (err) throw err
      })

      console.log(data)
    } catch (err) {
      console.error(err)
    }
  })

  try {
    await fastify.listen(PORT)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

main()

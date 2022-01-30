const fastify = require('fastify')({ logger: true })
const config = require('../config')
const mqtt = require('mqtt')
const MongoClient = require('mongodb').MongoClient
const mqttUrl = `mqtt://${config.mqtt.host}:${config.mqtt.port}`
const mongoUrl = `mongodb://${config.mongo.host}:${config.mongo.port}/`
const PORT = 3001
const mongoClient = new MongoClient(mongoUrl)

fastify.register(require('fastify-cors'), {})

fastify.get('/linky', async (request, reply) => {
  try {
    const db = mongoClient.db(config.mongo.db)
    const linky = db.collection('linky')
    const cursor = linky.find().sort({ _id: -1 }).limit(1)
    let results = await cursor.toArray()
    return results[0]
  } catch (err) {
    return err
  }
})

fastify.get('/teleinfo', async (request, reply) => {
  try {
    const db = mongoClient.db(config.mongo.db)
    const linky = db.collection('linky')
    let sort = {}
    sort[request.query.sort] = request.query.order
    const options = {
      sort,
      projection: {
        _id: 0,
        createdAt: 1,
        apparentPower: 1,
        instantaneousIntensity01: 1,
        instantaneousIntensity02: 1,
        instantaneousIntensity03: 1,
      },
      limit: request.query.limit ?? 100,
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

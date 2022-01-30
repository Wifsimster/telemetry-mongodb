# telemetry-mongodb
Read telemetry data on a MQTT broker &amp; save them into a MongoDB server.

To be used with the project [teleinfo](https://github.com/Wifsimster/teleinfo).
## Description

Start a web server on port **3001**.

Exposes two routes :

### GET /linky
Return the last buffer of teleinfo from MongoDB server.

### GET /teleinfo?sort=createdAt&order=-1&limit=100
 
 Return an array of teleinfo from MongoDB server.
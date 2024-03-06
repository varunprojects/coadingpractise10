const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = express()
app.use(express.json())
const databasePath = path.join(__dirname, 'covid19IndiaPortal.db')
let database = null
const initializeAndDbAndServer = async () => {
  try {
    database = await open({filename: databasePath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log(`server is running on http://localhost:3000`)
    })
  } catch (error) {
    console.log(`Database error is ${error}`)
    process.exit(1)
  }
}
initializeAndDbAndServer()

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  // check user
  const userDetailsQuery = `select * from user where username = '${username}';`
  const userDetails = await database.get(userDetailsQuery)
  if (userDetails !== undefined) {
    const isPasswordValid = await bcrypt.compare(password, userDetails.password)
    if (isPasswordValid) {
      //get JWT Token
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'vivek_secret_key')
      response.send({jwtToken}) //Scenario 3
    } else {
      response.status(400)
      response.send(`Invalid password`) //Scenario 2
    }
  } else {
    response.status(400)
    response.send('Invalid user') //Scenario 1
  }
})

function authenticationToken(request, response, next) {
  let jwtToken
  const authHeader = request.headers.authorization
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, 'vivek_secret_key', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send(`Invalid JWT Token`) // Scenario 1
      } else {
        next() //Scenario 2
      }
    })
  } else {
    response.status(401)
    response.send(`Invalid JWT Token`) //Scenario 1
  }
}
const convertStateDbObject = objectItem => {
  return {
    stateId: objectItem.state_id,
    stateName: objectItem.state_name,
    population: objectItem.population,
  }
}
app.get('/states/', authenticationToken, async (request, response) => {
  const getStatesquery = `SELECT * FROM state;`
  const getstates = await database.all(getStatesquery)
  response.send(getstates.map(eachstate => convertStateDbObject(eachstate)))
})
module.exports=app;
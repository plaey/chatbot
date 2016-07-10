const http = require('http')
const bankai = require('bankai')
const socketio = require('socket.io')
const browserify = require('browserify')
const serverRouter = require('server-router')
const parser = require('./arithmetics-parser')
const dotenv = require('dotenv').load()
const MAPS_KEY = process.env.MAPS_KEY

const PORT = process.env.PORT || 8080
const server = http.createServer(createRouter())
server.listen(PORT, () => {
  process.stdout.write(`listening on port ${PORT}\n`)
})

function createRouter () {

  const router = serverRouter('/404')

  const html = bankai.html({ css: false })
  router.on('/', (req, res) => html(req, res).pipe(res))

  const css = bankai.css({ use: [ 'sheetify-cssnext' ]})
  router.on('/bundle.css', (req, res) => css(req, res).pipe(res))

  const js = bankai.js(browserify, require.resolve('./client.js'),
    { transform: [ 'envify', 'yo-yoify', 'es2020' ] }
  )
  router.on('/bundle.js', (req, res) => js(req, res).pipe(res))

  router.on('/404', (req, res) => {
    res.statusCode = 404
    res.end('{ "message": "the server is confused" }')
  })

  return router

}

const io = socketio(server)

io.on('connect', (socket) => {

  console.info(`Opened connection 🎉 ${
    JSON.stringify(Object.keys(io.engine.clients))
  }`)
  socket.emit('mapsKey', {key: MAPS_KEY})

  var data = {
    message: 'Welcome! ', from: 'Chatbot', clientID: socket.id
  };
  socket.emit('welcomeMessage', data);
  console.log(`Sent: ${JSON.stringify(data,null,0)}`);
  io.sockets.emit('setUsersCount', io.engine.clientsCount);
  // console.log(`Sent: clienConnectionsCount ${io.engine.clientsCount}`);

  socket.on('chatMessage', (data) => {

    console.log(`Received: ${JSON.stringify(data,null,0)}`);
    socket.broadcast.emit('chatMessage', data);
    console.log(`Broadcasted: ${JSON.stringify(data,null,0)}`);
    try {
      const equation = data.message.trim()
      const result = parser.parse(data.message.trim());
      data = {message: `@guest-${socket.id.slice(2,5)}: \n ${equation} == ${result}`,
        from: 'Chatbot', clientID: "Chatbot"
      }
      setTimeout(()=>{io.sockets.emit('chatMessage', data)}, 1000 * 1)
      console.log(`Broadcasted Result: ${result}`);

    } catch (e) {

      console.log(`Not an arithmetic expression`);

    }

  })

  socket.on('disconnect', () => {

    console.info('Closed connection 😱')
    io.sockets.emit('setUsersCount', {numberUsers: io.engine.clientsCount - 1});

  })

})

io.on('disconnect', () => { console.info('Closed connection 😱') })

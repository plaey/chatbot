const socketio = require('socket.io-client')
let MAPS_KEY = ""

module.exports = function createModel() {

  const io = socketio()

  return {
    subscriptions: [
      function (send, done) {

        io.on('connect', (data, done) => {
          console.info('Opened connection 🎉')//TODO: make this a log action

          // this uses done() chaining from choo^v3.0.0
          setTimeout(
            () => {
              send('addMessage',
                {
                  message: 'If you are curious, I can tell you where you are.',
                  from: "Chatbot", clientID: "ChatBoot"
                },
                () => {
                  setTimeout(
                    () => {
                      send('addMessage',
                        {
                          message: 'Go ahead, ask me: "Where am I?"',
                          from: "Chatbot", clientID: "ChatBoot"
                        },
                        () => {}
                      )
                      send('go2lastMessage', () => {})
                    }, 1000 * 10
                  )
                }
              )
              send('go2lastMessage', () => {})
            }, 1000 * 10
          )
          // chained / serial / non-racing pattern using done() from choo^v3.0.0
          // send('message1', {...}, () => send('message2', {...}, ()=>{ done }))
          // message 2 always "waits" for message1 callback to complete

          setTimeout(
            () => send('addMessage',
              {
                message: `I know math.`,
                from: "Chatbot", clientID: "ChatBoot"
              },
              () => { send('go2lastMessage', () => {}) }
            ),
            1000 * 30
          )
          setTimeout(
            () => send('addMessage',
              {
                message: `Try me with arithmetic expressions.`,
                from: "Chatbot", clientID: "ChatBoot"
              },
              () => { send('go2lastMessage', () => {}) }
            ),
            1000 * 40
          )
          // not chained / parallel / racing effects
          // with unknown async callback time message2 might not "wait"
          // setTimeout(send('mesage1', {...},()=>{}), randomTime)
          // setTimeout(send('mesage2', {...},()=>{}), randomTime)

        })

        io.on('mapsKey', (data) => { MAPS_KEY = data.key })

        io.on('setUsersCount',
          (data, done) => send('setUsersCount', data, ()=>{})
        )

        io.on('welcomeMessage', (data, done) => {

          console.log("Received: %c%s %O", "color:red", data.message, data);
          // console.log(`Received: ${JSON.stringify(data,null,2)}`);
          //TODO: make this a log action
          send('setClientID', `-${data.clientID.substr(2,3)}`, ()=>{})
          send('addMessage', data, ()=>{})

        })

        io.on('chatMessage', (data, done) => {

          console.log("Received: %c%s %O", "color:red", data.message, data);
          //TODO: make this a log action
          send('addMessage', data, ()=>{})
          send('go2lastMessage',null,()=>{})

        })

        io.on('error', (data) => send('error', data ))

        io.on('disconnect', () => console.info('Closed connection 😱'))
        //TODO: make this a log action

      }

    ],

    effects: {

      submitMessageForm: (formData, state, send, done) => {

        send('emitMessage', formData, ()=>{})
        console.log('Sent: ', formData) //TODO: make this a log action
        send('addMessage', Object.assign({ownMessage: true}, formData), ()=>{} )
        send('emptyTextField',  ()=>{})
        send('go2lastMessage',  ()=>{})

        if (formData.message.match(/Where am I?/i)) {

          navigator.geolocation.getCurrentPosition( function(p){

            var mapsapi = require( 'google-maps-api' )( MAPS_KEY );
            mapsapi().then( function( maps ) {
              const geocoder = new google.maps.Geocoder()
              const latlng = new google.maps.LatLng(
                p.coords.latitude, p.coords.longitude
              )
              geocoder.geocode({
                'latLng': latlng
              }, function(result, status) {

                let answer = `Your location is probably:
                  ${result[0].formatted_address} (most likely on planet Earth).`
                send('addMessage', {
                  message: answer, from: "Chatbot", clientID: "ChatBoot"
                }, () => { send('go2lastMessage', ()=>{}) })
                console.info(`Your location is probably:
                  ${result[0].formatted_address}`
                )
                setTimeout(
                  () => {
                    let answer = `Geographically speaking, you are at:
                      ${p.coords.latitude} latitude and
                      ${p.coords.longitude} longitude.`
                    send('addMessage', {
                      message: answer, from: "Chatbot", clientID: "ChatBoot"
                    }, () => { send('go2lastMessage', ()=>{}) })
                    console.info(`Your Geolocation is: `)
                    console.table([{
                      latitude: p.coords.latitude,
                      longitude: p.coords.longitude
                    }])
                  }, 1000 * 4
                )
              })
            }).catch((e) => { console.log(e) })

          }, function(error) {

            setTimeout(
              () => {
                send('addMessage', {
                  message: `You are most likely on planet Earth.`,
                  from: "Chatbot", clientID: "ChatBoot"
                }, () => { send('go2lastMessage', ()=>{}) })
                console.info(`You are most likely on planet Earth.`)
              }, 1000 * 5
            )

          })

        }

      },

      emitMessage: (data, state, send, done) => {
        io.emit('chatMessage', data)
      },

      go2lastMessage: () => setTimeout(() => { window.scrollBy(0,500) }, 500),

      error: (data, state, send, done) => {
        console.error(data)
        send('addMessage', {
          message: data.message || 'Bad server connection',
          from: 'Chatbot', clientID: 'Chatbot'
        })

      } // TODO: elaborate on error reporting

    },

    reducers: {

      setClientID: (data, state) => ({ clientID: data }),

      addMessage: (data, state) => {
        return {messages: state.messages.concat([data])}
      },

      emptyTextField: (data, state) => ({textInput: ''}),

      setUsersCount: (data, state) => ({numberUsers: data}),

      textInput: (data, state) => ({textInput: data})

    },

    state: {

      clientID: ' Loging in ...',
      messages: [],
      numberUsers: 0,
      textInput: ''

    }

  }

}

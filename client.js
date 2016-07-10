const choo = require('choo')
const html = require('choo/html')
const sheetify = require('sheetify')
const socketio = require('socket.io-client')

const app = choo()
app.model(createModel())
app.router((route) => [ route('/', view)])
const mystyles = sheetify('./style.css')
sheetify('./node_modules/tachyons/css/tachyons.css',{ global: true })
const tree = app.start()
document.body.appendChild(tree)
let MAPS_KEY = ""

function createModel() {

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

      emitMessage: (data, state, send, done) => {
        io.emit('chatMessage', data)
      },

      go2lastMessage: () => setTimeout(() => {window.scrollBy(0,500)}, 500),

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

function view (state, prev, send) {

  function onSubmit (event) {

    event.preventDefault()

    let formData = {}
    for (i of (new FormData(event.target)).entries()) {
      formData[i[0]] = i[1];
    }
    formData.from = discreteFilterUserAgents(navigator.userAgent)
    formData.clientID = state.clientID

    send('emitMessage', formData)
    console.log('Sent: ', formData) //TODO: make this a log action
    send('addMessage', Object.assign({ownMessage: true}, formData) )
    send('emptyTextField')
    send('go2lastMessage')

    if (formData.message.match(/Where am I?/i)) {

      navigator.geolocation.getCurrentPosition( function(p){

        var mapsapi = require( 'google-maps-api' )( MAPS_KEY );
        mapsapi().then( function( maps ) {
          geocoder = new google.maps.Geocoder()
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
            })
            send('go2lastMessage')
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
                })
                send('go2lastMessage')
                console.info(`Your Geolocation is: `)
                console.table([{
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude
                }])
              }, 1000 * 4
            )
          })
        }).catch((e)=>{console.log(e);});

      }, function(error) {

        setTimeout(
          () => {
            send('addMessage', {
              message: `You are most likely on planet Earth.`,
              from: "Chatbot", clientID: "ChatBoot"
            })
            send('go2lastMessage') //TODO make all these an associated effect
            console.info(`You are most likely on planet Earth.`)
          }, 1000 * 5
        )

      })

    }

  }

  function onClick (event) {

    onSubmit.bind(event.path[3])

  }

  function discreteFilterUserAgents(userAgentString) {
    if (/Firefox/.test(userAgentString)) {
      return 'Firefox'
    } else if (/[Chrome|Chromium]/.test(userAgentString)) {
      return 'Chrome'
    } else if (/[MSIE|Trident|Edge]/.test(userAgentString)) {
      return 'IE'
    } else if (/Safari/.test(userAgentString)) {
      return 'Safari'
    } else if (/[OPR|Opera]/.test(userAgentString)) {
      return 'Opera'
    } else {
      return 'Browser'
    }
  }

  return html`
    <div class=${mystyles}>
      <header class="bg-black-30 h3 w-100 dt">
        <div class="dtc v-mid tl w-50">
          <a href="/" class="dib f5 f4-ns fw6 mt0 mb1 ml2 link black-80 dim"
            title="Home">
            <span class="balck">Chatbot</span>
            <small class="nowrap f6 mt2 mt3-ns pr2 black-50 fw2">v0.0.1</small>
            <div class="dib">
              <small class="nowrap f6 mt2 mt3-ns pr2 black-60 fw2">
                Choo Tachyons Socketio
              </small>
            </div>
          </a>
        </div>
        <nav class="db dtc v-mid w-100 tr">
          <a title="Username" href="/"
            class="f6 fw6 dim link black-70 mr1 mr3-m mr4-l dib"
          >
            guest${(state.clientID)}
          </a>
          <a title="Online Users" href="/"
            class="f6 fw6 dim link black-70 mr1 mr3-m mr4-l dib"
          >
            #users online: ${state.numberUsers}
          </a>
          <a title="GitHub"
            href="/github/choochatbot"
            class="f6 fw6 dim link black-70 mr1 mr3-m mr4-l dn dib-l"
          >
            GitHub
          </a>
        </nav>
      </header>
      <main class="mv5 pv1">
        <ul class="list ph0 pb2 pt0 br3 bg-white mh1 mv1"
          id="messages"
          style=""
        >
          ${state.messages.map((m) => {
            return html`
            <li class="ph3 ba b--light-gray f4 f3-ns pv3 br3 bg-gray mb2
              ${ m.ownMessage
                ? ' ml4 mr1 ml6-m ml7-l tr '
                : ' ml1 mr4 mr6-m mr7-l '
              }"
              style="
              ${ m.ownMessage
                ? 'background-color:#E8FDF5'
                : 'background-color:#E2F4FF'
              }"
            >
              <span class="black-40">
                ${
                  (m.from == 'Chatbot' || m.ownMessage)
                    ? ''
                    : 'guest'
                }${
                  m.ownMessage
                    ? 'you'
                    : ( m.clientID[0] == '-'
                        ? m.clientID
                        : m.from
                      )
                }:
              </span>
              <span class="black-60">
                ${m.message}
              </span>
            </li>`
          })}
        </ul>
      </main>
      <footer class="h3 w-100">
        <form id="message" onsubmit=${onSubmit} class="ml1 w-99">
          <fieldset class="br3 bg-black-30 v-mid center pa0">
            <div class="tc">
            <input name="message" style="outline:none;"
              value="${state.textInput}"
              class="h3 br3 ml0 mr0 f3 v-mid mv1 pl1 fc"
              type="text" autofocus placeholder="type message here"
              list="questions" autocomplete="on"
              oninput=${(e)=>send('textInput', e.target.value)}
            />
            <datalist id="questions">
              <option value="Where am I?"></option>
              <option value="( 927 / 9 + 78 ) * 5 - 128"></option>
            </datalist>
            <input type="submit" value="send" style="outline:none;"
              class="h3 mr0 mv1 br3 v-mid mt2 bg-black-10 fc f6 ph0"
              onclick=${onClick} ontouchend=${onClick}
            />
            </div>
          </fieldset>
        </form>
      </footer>
    </div>
  `

}

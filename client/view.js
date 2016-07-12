const html = require('choo/html')
const sheetify = require('sheetify')

const mystyles = sheetify('./style.css')
sheetify('../node_modules/tachyons/css/tachyons.css',{ global: true })
module.exports = function view (state, prev, send) {

  function onSubmit (event) {

    event.preventDefault()

    let formData = {}
    const whichBrowser = discreteFilterUserAgents(navigator.userAgent)
    if ( !(whichBrowser == 'Firefox' || whichBrowser == 'Chrome')) {
      formData.message = document.querySelector(
        '#message fieldset div input'
      ).value
    } else {
      for (let i of (new FormData(event.target)).entries()) {
        formData[i[0]] = i[1];
      }
    }
    formData.from = whichBrowser
    formData.clientID = state.clientID

    send('submitMessageForm', formData)

  }

  function onClick (event) {

    onSubmit.bind(document.querySelector('#message'))
    // onSubmit.bind(event.path[3])

  }

  function discreteFilterUserAgents(userAgentString) {
    if (/MSIE|Trident|Edge|Win/.test(userAgentString)) {
      return 'IE'
    } else if (/Safari/.test(userAgentString)) {
      return 'Safari'
    } else if (/OPR|Opera/.test(userAgentString)) {
      return 'Opera'
    } else if (/Firefox/.test(userAgentString)) {
      return 'Firefox'
    } else if (/Chrome|Chromium/.test(userAgentString)) {
      return 'Chrome'
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
            href="https://github.com/plaey/chatbot"
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

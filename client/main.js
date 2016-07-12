const choo = require('choo')

const app = choo()
const model = require('./model')
app.model(model())
const view = require('./view')
app.router((route) => [ route('/', view)])
const tree = app.start()
document.body.appendChild(tree)

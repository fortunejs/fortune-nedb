const testAdapter = require('fortune/test/adapter')
const adapter = require('../lib')

testAdapter(adapter, {
  dbPath: __dirname
})

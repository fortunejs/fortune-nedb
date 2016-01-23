const path = require('path')
const testAdapter = require('fortune/test/adapter')
const adapter = require('../lib')

testAdapter(adapter, {
  dbPath: path.join(__dirname, '../')
})

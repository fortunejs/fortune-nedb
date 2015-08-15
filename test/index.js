/* eslint-disable no-var */
var path = require('path')
var testAdapter = require('fortune/test/adapter')
var adapter = require('../dist')

testAdapter(adapter, {
  dbPath: path.join(__dirname, '../')
})

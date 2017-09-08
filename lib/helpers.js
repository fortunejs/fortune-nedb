'use strict'

const uid = require('nedb/lib/customUtils')


const bufferEncoding = 'base64'
const idKey = '_id'


module.exports = { idKey, inputRecord, outputRecord, mapValues, castValue }


// Cast and assign values per field.
function inputRecord (type, record) {
  const recordTypes = this.recordTypes
  const primaryKey = this.keys.primary
  const typeKey = this.keys.type
  const isArrayKey = this.keys.isArray
  const clone = {}
  const fields = recordTypes[type]

  // ID business.
  const id = record[primaryKey]
  clone[idKey] = id ? id : generateId()

  for (const field in record) {
    if (field === primaryKey) continue
    clone[field] = record[field]
  }

  for (const field of Object.getOwnPropertyNames(fields)) {
    const fieldType = fields[field][typeKey]
    const fieldIsArray = fields[field][isArrayKey]

    if (!(field in record)) {
      clone[field] = fieldIsArray ? [] : null
      continue
    }

    // NeDB lacks native support for buffer types.
    if (fieldType &&
      (fieldType === Buffer || fieldType.prototype.constructor === Buffer) &&
      record[field]) {
      clone[field] = fieldIsArray ?
        record[field].map(toString) : toString(record[field])
      continue
    }
  }

  return clone
}


function outputRecord (type, record) {
  const recordTypes = this.recordTypes
  const primaryKey = this.keys.primary
  const typeKey = this.keys.type
  const isArrayKey = this.keys.isArray
  const denormalizedInverseKey = this.keys.denormalizedInverse
  const clone = {}
  const fields = recordTypes[type]

  // ID business.
  clone[primaryKey] = record[idKey]

  for (const field in record) {
    if (!(field in fields)) continue

    const value = record[field]
    const fieldType = fields[field][typeKey]

    // NeDB lacks native support for buffer types.
    if (fieldType &&
      (fieldType === Buffer || fieldType.prototype.constructor === Buffer) &&
      record[field]) {
      clone[field] = fields[field][isArrayKey] ?
        value.map(toBuffer) : toBuffer(value)
      continue
    }

    // Do not enumerate denormalized fields.
    if (fields[field][denormalizedInverseKey]) {
      Object.defineProperty(clone, field, {
        configurable: true, writable: true, value
      })
      continue
    }

    clone[field] = value
  }

  return clone
}


// Buffer to string casting, and vice versa.
function toString (buffer) {
  return buffer.toString(bufferEncoding)
}
function toBuffer (string) {
  return new Buffer(string, bufferEncoding)
}


/**
 * Immutable mapping on an object.
 *
 * @param {Object} object
 * @param {Function} map should return the first argument, which is the value
 * @return {Object}
 */
function mapValues (object, map) {
  return Object.keys(object).reduce((clone, key) =>
    Object.assign(clone, { [key]: map(object[key], key) }), {})
}


/**
 * Cast non-native types.
 *
 * @param {*} value
 * @return {*}
 */
function castValue (value) {
  if (Buffer.isBuffer(value))
    return value.toString(bufferEncoding)

  return value
}


/**
 * Defer to using the uid function provided by NEDB.
 *
 * @return {String}
 */
function generateId () {
  return uid(16)
}

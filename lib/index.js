'use strict'

const path = require('path')
const Store = require('nedb')
const helpers = require('./helpers')
const inputRecord = helpers.inputRecord
const outputRecord = helpers.outputRecord
const generateQuery = helpers.generateQuery
const mapValues = helpers.mapValues
const idKey = helpers.idKey


// By default, try to auto-compact the database every minute.
const defaultCompactionInterval = 60 * 1000


/**
 * NeDB adapter.
 */
module.exports = Adapter => class NedbAdapter extends Adapter {

  connect () {
    const Promise = this.Promise
    const recordTypes = this.recordTypes
    const options = this.options
    const compactionInterval = options.compactionInterval
    const dbPath = options.dbPath

    delete options.filename

    try {
      this.db = mapValues(recordTypes, (fields, type) => {
        const db = new Store(Object.assign({}, options, dbPath ? {
          filename: path.join(dbPath, `${type}.db`)
        } : null))
        db.persistence.setAutocompactionInterval(
          compactionInterval ? compactionInterval : defaultCompactionInterval)
        return db
      })
    }
    catch (error) {
      return Promise.reject(error)
    }

    return Promise.all(Object.keys(this.db).map(type =>
      new Promise((resolve, reject) =>
        this.db[type].loadDatabase(error => error ? reject(error) : resolve())
    )))
    .then(() => null)
  }


  disconnect () {
    const Promise = this.Promise

    return Promise.all(
      Object.keys(this.db).map(key => new Promise(resolve => {
        const db = this.db[key]

        // This auto compaction interval prevents the process from exiting.
        db.persistence.stopAutocompaction()

        // Internal hook to NeDB's executor which will run after all other
        // operations are done.
        db.executor.push({ fn: resolve, arguments: [] })
      }))
    ).then(() => null)
  }


  find (type, ids, options) {
    // Handle no-op.
    if (ids && !ids.length) return super.find()
    if (!options) options = {}

    const Promise = this.Promise
    const fields = this.recordTypes[type]
    let query = generateQuery(fields, options)

    if ('query' in options) {
      const result = options.query(query)
      if (result != null) query = result
    }

    if (ids && ids.length)
      query[idKey] = { $in: ids }

    // Parallelize the find method with count method.
    return Promise.all([
      new Promise((resolve, reject) => {
        let fields

        if ('fields' in options)
          fields = mapValues(options.fields, value => value ? 1 : 0)

        const dbCollection = this.db[type]
        const find = dbCollection.find.call(dbCollection, query, fields)

        if ('sort' in options)
          find.sort(mapValues(options.sort, value => value ? 1 : -1))

        if ('offset' in options)
          find.skip(options.offset)

        if ('limit' in options)
          find.limit(options.limit)

        find.exec((error, records) => error ? reject(error) :
          resolve(records.map(outputRecord.bind(this, type)))
        )
      }),
      new Promise((resolve, reject) =>
        this.db[type].count(query, (error, count) => error ?
          reject(error) : resolve(count)))
    ])

    .then(results => {
      // Set the count on the records array.
      results[0].count = results[1]
      return results[0]
    })
  }


  create (type, records) {
    const Promise = this.Promise
    const ConflictError = this.errors.ConflictError

    return new Promise((resolve, reject) =>
      this.db[type].insert(
        records.map(inputRecord.bind(this, type)),
        (error, result) => error ?
          reject(error.errorType === 'uniqueViolated' ?
            new ConflictError('Duplicate key.') : error) :
          resolve(result.map(outputRecord.bind(this, type)))
      ))
  }


  update (type, updates) {
    const Promise = this.Promise
    const primaryKey = this.keys.primary

    return Promise.all(updates.map(update =>
      new Promise((resolve, reject) => {
        const modifiers = {}

        if ('replace' in update)
          modifiers.$set = update.replace

        if ('push' in update)
          modifiers.$push = mapValues(update.push, value =>
            Array.isArray(value) ? { $each: value } : value)

        if ('pull' in update)
          modifiers.$pull = mapValues(update.pull, value =>
            Array.isArray(value) ? { $in: value } : value)

        // Custom update operators have precedence.
        Object.assign(modifiers, update.operate)

        // Short circuit no-op.
        if (!Object.keys(modifiers).length) {
          resolve(0)
          return
        }

        this.db[type].update({ [idKey]: update[primaryKey] },
          modifiers, {}, (error, number) => error ?
          reject(error) : resolve(number))
      })
    ))
    .then(numbers => numbers.reduce((accumulator, number) =>
      accumulator + number, 0))
  }


  delete (type, ids) {
    if (ids && !ids.length) return super.delete()

    const Promise = this.Promise

    return new Promise((resolve, reject) =>
      this.db[type].remove(ids && ids.length ?
        { [idKey]: { $in: ids } } : {}, { multi: true },
        (error, number) => error ? reject(error) : resolve(number)))
  }

}

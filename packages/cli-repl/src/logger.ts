import pino from 'pino'
import path from 'path'
import os from 'os'

function logger (bus) {
  const dest = path.join(os.homedir(), './.mongosh_log')
  const log = pino({name: 'monogsh'}, pino.destination(dest))

  bus.on('connect', function(info) {
    log.info('connect', info)
  })

  bus.on('eval:error', function(err) {
    log.error('eval:error', err)
  })

  bus.on('error', function(error) {
    log.error(error)
  })

  bus.on('cmd:help', function() {
    log.info('cmd:help')
  })

  bus.on('cmd:use', function(database) {
    log.info('cmd:use', database)
  })

  bus.on('cmd:show', function(databases) {
    log.info('cmd:show', databases)
  })

  bus.on('cmd:it', function(info) {
    log.info('cmd:it', info)
  })

  bus.on('method:aggregate', function(collection, pipeline) {
    const params = { collection, pipeline }
    log.info('method:aggregate', params)
  })

  bus.on('method:bulkWrite', function(collection, operations) {
    const params = { collection, operations }
    log.info('method:bulkWrite', params)
  })

  bus.on('method:count', function(collection, query = {}) {
    const params = { collection, query }
    log.info('method:count', params)
  })

  bus.on('method:countDocuments', function(collection, query = {}, options) {
    const params = { collection, query, options }
    log.info('method:countDocument', params)
  })

  bus.on('method:deleteMany', function(collection, filter) {
    const params = { collection, filter }
    log.info('method:deleteMany', params)
  })

  bus.on('method:deleteOne', function(collection, filter) {
    const params = { collection, filter }
    log.info('method:deleteOne', params)
  })

  bus.on('method:distinct', function(collection, field, query = {}) {
    const params = { collection, query, options }
    log.info('method:distinct', params)
  })

  bus.on('method:estimatedDocumentCount', function(collection) {
    const params = { collection }
    log.info('method:estimatedDocumentCount', params)
  })

  bus.on('method:find', function(collection, query = {}, projection = {}) {
    const params = { collection, query, projection }
    log.info('method:find', params)
  })

  bus.on('method:findOne', function(collection, query = {}, projection = {}) {
    const params = { collection, query, projection }
    log.info('method:findOne', params)
  })

  bus.on('method:findOneAndDelete', function(collection, filter = {}) {
    const params = { collection, filter }
    log.info('method:findOneAndDelete', params)
  })

  bus.on('method:findOneAndReplace', function(collection, filter) {
    const params = { collection, filter }
    log.info('method:findOneAndReplace', params)
  })

  bus.on('method:findOneAndUpdate', function(collection, filter) {
    const params = { collection, filter }
    log.info('method:findOneAndUpdate', params)
  })

  bus.on('method:insert', function(collection, docs) {
    const params = { collection, docs }
    log.info('method:insert', params)
  })

  bus.on('method:insertMany', function(collection, docs) {
    const params = { collection, docs }
    log.info('method:insertMany', params)
  })

  bus.on('method:insertOne', function(collection, doc) {
    const params = { collection, doc }
    log.info('method:insertOne', params)
  })

  bus.on('method:isCapped', function(collection) {
    const params = { collection }
    log.info('method:isCapped', params)
  })

  bus.on('method:remove', function(collection, query = {}) {
    const params = { collection, query }
    log.info('method:remove', params)
  })

  bus.on('method:save', function(collection, doc) {
    const params = { collection, doc }
    log.info('method:save', params)
  })

  bus.on('method:replaceOne', function(collection, filter) {
    const params = { collection, filter }
    log.info('method:replaceOne', params)
  })

  bus.on('method:runCommand', function(database, cmd) {
    const params = { database, cmd }
    log.info('method:runCommand', params)
  })

  bus.on('method:update', function(collection, filter) {
    const params = { collection, filter }
    log.info('method:update', params)
  })

  bus.on('method:updateMany', function(collection, filter) {
    const params = { collection, filter }
    log.info('method:updateMany', params)
  })

  bus.on('method:updateOne', function(collection, filter) {
    const params = { collection, filter }
    log.info('method:updateOne', params)
  })
}

export default logger;

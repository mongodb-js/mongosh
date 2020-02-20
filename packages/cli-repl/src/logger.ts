import pino from 'pino'
import path from 'path'
import os from 'os'

function logger (bus) {
  const dest = path.join(os.homedir(), './.mongosh_log')
  const log = pino({name: 'monogsh'}, pino.destination(dest))

  bus.on('eval:error', function(err) {
    log.error('eval:error', err)
  })

  bus.on('use', function(info) {
    log.info('use', info)
  })

  bus.on('it', function(info) {
    log.info('it', info)
  })

  bus.on('start', function(info) {
    log.info('start', info)
  })

  bus.on('aggregate', function(pipeline) {
    log.info('aggregate', pipeline)
  })

  bus.on('bulkWrite:start', function(coll) {
    log.info('bulkWrite:start', coll)
  })

  bus.on('bulkWrite:result', function(result) {
    log.info('bulkWrite:result', result)
  })

  bus.on('count', function(coll, query) {
    log.info('count', coll, query)
  })

  bus.on('countDocuments', function(coll, query) {
    log.info('countDocument', coll, query)
  })

  bus.on('deleteMany', function() {
  })

  bus.on('deleteOne', function() {
  })

  bus.on('distinct', function() {
  })

  bus.on('estimatedDocumentCount', function() {
  })

  bus.on('find', function(coll, query) {
    log.info('find', coll, query)
  })

  bus.on('findOne', function(coll, query = {}) {
    log.info('findOne', coll, query)
  })

  bus.on('findOneAndDelete', function() {
  })

  bus.on('findOneAndReplace', function() {
  })

  bus.on('findOneAndUpdate', function() {
  })

  bus.on('insert', function() {
  })

  bus.on('insertMany', function() {
  })

  bus.on('insertOne', function() {
  })

  bus.on('isCapped', function() {
  })

  bus.on('remove', function() {
  })

  bus.on('save', function() {
  })

  bus.on('replaceOne', function() {
  })

  bus.on('runCommand', function() {
  })

  bus.on('update', function() {
  })

  bus.on('updateMany', function() {
  })

  bus.on('updateOne', function() {
  })
}

export default logger;

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

  bus.on('cmd:use', function(info) {
    log.info('cmd:use', info)
  })

  bus.on('cmd:it', function(info) {
    log.info('cmd:it', info)
  })

  bus.on('method:aggregate', function(coll, pipeline) {
    log.info('method:aggregate', coll, pipeline)
  })

  bus.on('method:bulkWrite:start', function(coll) {
    log.info('bulkWrite:start', coll)
  })

  bus.on('method:bulkWrite:result', function(result) {
    log.info('bulkWrite:result', result)
  })

  bus.on('method:count', function(coll, query = {}) {
    log.info('method:count', coll, query)
  })

  bus.on('method:countDocuments', function(coll, query = {}, options) {
    const params = {
      collection: coll, 
      query,
      options 
    }
    log.info('method:countDocument', params)
  })

  bus.on('deleteMany', function() {
  })

  bus.on('deleteOne', function() {
  })

  bus.on('distinct', function() {
  })

  bus.on('estimatedDocumentCount', function() {
  })

  bus.on('method:find', function(coll, query = {}, projection = {}) {
    const params = {
      collection: coll, 
      query,
      projection
    }
    log.info('method:find', params)
  })

  bus.on('method:findOne', function(coll, query = {}, projection = {}) {
    const params = {
      collection: coll, 
      query,
      projection
    }
    log.info('method:findOne', params)
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

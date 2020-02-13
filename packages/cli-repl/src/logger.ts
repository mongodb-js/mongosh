function logger (bus) {
  bus.on('start', function (info) {
    console.log('start', info)
  })

  bus.on('aggregate', function(pipeline) {
  })

  bus.on('bulkWrite', function() {
  })

  bus.on('count', function() {
  })

  bus.on('countDocuments', function() {
  })

  bus.on('deleteMany', function() {
  })

  bus.on('deleteOne', function() {
  })

  bus.on('distinct', function() {
  })

  bus.on('estimatedDocumentCount', function() {
  })

  bus.on('find', function() {
  })

  bus.on('findOne', function() {
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

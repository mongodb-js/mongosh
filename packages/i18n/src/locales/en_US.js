/**
 * US english translations.
 */
const translations = {
  'browser-repl': {},
  build: {},
  'cli-repl': {
    args: {
      usage: '$ mongosh [options] [db address]',
      options: 'Options:',
      help: 'Show this usage information',
      ipv6: 'Enable IPv6 support (disabled by default)',
      host: 'Server to connect to',
      port: 'Port to connect to',
      version: 'Show version information',
      shell: 'Run the shell after executing files',
      nodb: "Don't connect to mongod on startup - no 'db address' [arg] expected",
      norc: "Will not run the '.mongorc.js' file on start up",
      eval: 'Evaluate javascript',
      retryWrites: 'Automatically retry write operations upon transient network errors',
      disableImplicitSessions: 'Do not automatically create and use implicit sessions',
      authenticationOptions: 'Authentication Options:',
      username: 'Username for authentication',
      password: 'Password for authentication',
      authenticationDatabase: 'User source (defaults to dbname)',
      authenticationMechanism: 'Authentication mechanism',
      gssapiServiceName: 'Service name to use when authenticating using GSSAPI/Kerberos',
      gssapiHostName: 'Remote host name to use for purpose of GSSAPI/Kerberos authentication',
      tlsOptions: 'TLS Options:',
      tls: 'Use TLS for all connections',
      tlsCertificateKeyFile: 'PEM certificate/key file for TLS',
      tlsCertificateKeyFilePassword: 'Password for key in PEM file for TLS',
      tlsCAFile: 'Certificate Authority file for TLS',
      tlsCRFile: 'Certificate Revocation List file for TLS',
      tlsAlowInvalidHostnames: 'Allow connections to servers with non-matching hostnames',
      tlsAlowInvalidCertificates: 'Allow connections to servers with invalid certificates',
      tlsCertificateSelector: 'TLS Certificate in system store',
      tlsDisabledProtocols: 'Comma separated list of TLS protocols to disable [TLS1_0,TLS1_1,TLS1_2]',
      fleAwsOptions: 'FLE AWS Options',
      awsAccessKeyId: 'AWS Access Key for FLE Amazon KMS',
      awsSecretAccessKey: 'AWS Secret Key for FLE Amazon KMS',
      awsSessionToken: 'Optional AWS Session Token ID',
      keyVaultNamespace: 'database.collection to store encrypted FLE parameters',
      kmsURL: 'Test parameter to override the URL for',
      dbAddressOptions: 'DB Address Examples',
      'dbAddress/foo': 'Foo database on local machine',
      'dbAddress/192/foo': 'Foo database on 192.168.0.5 machine',
      'dbAddress/192/host/foo': 'Foo database on 192.168.0.5 machine on port 9999',
      'dbAddress/connectionURI': 'Connection string URI can also be used',
      fileNames: 'File Names',
      filenameDescription: 'A list of files to run. Files must end in .js and will exit after unless --shell is specified.',
      examples: 'Examples',
      connectionExampleWithDatabase: "Start mongosh using 'ships' database on specified connection string:",
      moreInformation: 'For more information on usage:'
    },
    'arg-parser': {
      'unknown-option': 'Error parsing command line: unrecognized option:'
    },
    'cli-repl': {
      connecting: 'Connecting to:',
      telemetry: 'To help improve our products, anonymous usage data is collected and sent to MongoDB periodically (https://www.mongodb.com/legal/privacy-policy).',
      disableTelemetry: 'You can opt-out by running the ',
      command: 'command.',
      enabledTelemetry: 'Telemetry is now enabled.',
      disabledTelemetry: 'Telemetry is now disabled.',
      wiki: {
        info: 'For more information about mongosh, please see the wiki:',
        link: 'github.com/mongodb-js/mongosh/wiki'
      }
    },
    'uri-generator': {
      'no-host-port': 'If a full URI is provided, you cannot also specify --host or --port'
    }
  },
  mapper: {},
  'service-provider-browser': {},
  'service-provider-core': {},
  'service-provider-server': {},
  'shell-api': {
    help: {
      description: 'Shell Help',
      link: 'https://docs.mongodb.com/manual/reference/method',
      help: {
        use: 'Set current database',
        it: 'result of the last line evaluated; use to further iterate',
        exit: 'Quit the MongoDB shell',
        'show-databases': 'Print a list of all available databases',
        'show-collections': 'Print a list of all collections for current database',
      }
    },
    classes: {
      AggregationCursor: {
        help: {
          description: 'Aggregation Class',
          attributes: {
            close: 'Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.',
            forEach: 'Iterates the cursor to apply a JavaScript function to each document from the cursor.',
            hasNext: 'cursor.hasNext() returns true if the cursor returned by the db.collection.aggregate() can iterate further to return more documents.',
            isClosed: 'Returns true if the cursor is closed.',
            isExhausted: 'cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.',
            itcount: 'Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.',
            map: 'Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.',
            next: 'The next document in the cursor returned by the db.collection.find() method.',
            objsLeftInBatch: 'cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.',
            toArray: 'The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.'
          }
        }
      },
      BulkWriteResult: {
        help: {
          description: 'BulkWriteResult Class'
        }
      },
      CommandResult: {
        help: {
          description: 'CommandResult Class'
        }
      },
      ShowDbsResult: {
        help: {
          description: 'ShowDatabasesResult Class'
        }
      },
      Collection: {
        help: {
          description: 'Collection Class',
          attributes: {
            aggregate: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.aggregate',
              description: 'Calculates aggregate values for the data in a collection or a view.',
              example: 'db.collection.aggregate(pipeline, options)',
              parameters: {
                pipeline: {
                  type: 'array',
                  description: 'A sequence of data aggregation operations or stages.'
                },
                options: {
                  type: 'document',
                  description: 'The aggregate options',
                  values: {
                    explain: {
                      type: 'boolean'
                    },
                    allowDiskUse: {
                      type: 'boolean'
                    },
                    cursor: {
                      type: 'document'
                    },
                    maxTimeMS: {
                      type: 'int32'
                    },
                    bypassDocumentValidation: {
                      type: 'boolean'
                    },
                    readConcern: {
                      type: 'document'
                    },
                    collation: {
                      type: 'document'
                    },
                    hint: {
                      type: 'document'
                    },
                    comment: {
                      type: 'string'
                    },
                    writeConcern: {
                      type: 'document'
                    }
                  }
                }
              },
              returns: 'A cursor to the documents produced by the final stage of the aggregation pipeline operation, or if you include the explain option, the document that provides details on the processing of the aggregation operation. If the pipeline includes the $out operator, aggregate() returns an empty cursor.'
            },
            bulkWrite: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite',
              description: 'Performs multiple write operations with controls for order of execution.',
              example: 'db.collection.bulkWrite(operations, options)',
              parameters: {
                operations: {
                  type: 'array',
                  description: 'An array of bulkWrite() write operations'
                },
                options: {
                  type: 'document',
                  description: 'The bulk write options',
                  values: {
                    writeConcern: {
                      type: 'document'
                    },
                    ordered: {
                      type: 'boolean'
                    }
                  }
                }
              },
              returns: 'A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled. A count for each write operation. An array containing an _id for each successfully inserted or upserted documents.'
            },
            countDocuments: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments',
              description: 'Returns the count of documents that match the query for a collection or view.',
              example: 'db.collection.countDocuments(query, options)',
              parameters: {
                query: {
                  type: 'document',
                  description: 'The query selection criteria. To count all documents, specify an empty document.'
                },
                options: {
                  type: 'document',
                  description: 'The count options',
                  values: {
                    limit: {
                      type: 'int32',
                      description: 'The maximum number of documents to count.'
                    },
                    skip: {
                      type: 'int32',
                      description: 'The number of documents to skip before counting.'
                    },
                    hint: {
                      type: 'string|document',
                      description: 'An index name or the index specification to use for the query.'
                    },
                    maxTimeMS: {
                      type: 'int32',
                      description: 'The maximum amount of time to allow the count to run.'
                    }
                  }
                }
              },
              returns: 'The count.'
            },
            count: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.count',
              description: 'Returns the count of documents that would match a find() query for the collection or view.',
              example: 'db.collection.count(query, options)',
              parameters: {
                query: {
                  type: 'document',
                  description: 'The query selection criteria.'
                },
                options: {
                  type: 'document',
                  description: 'The count options',
                  values: {
                    limit: {
                      type: 'int32',
                      description: 'The maximum number of documents to count.'
                    },
                    skip: {
                      type: 'int32',
                      description: 'The number of documents to skip before counting.'
                    },
                    hint: {
                      type: 'string|document',
                      description: 'An index name or the index specification to use for the query.'
                    },
                    maxTimeMS: {
                      type: 'int32',
                      description: 'The maximum amount of time to allow the count to run.'
                    },
                    readConcern: {
                      type: 'string',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'The count.'
            },
            deleteMany: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany',
              description: 'Removes all documents that match the filter from a collection.',
              example: 'db.collection.deleteMany()',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'Specifies deletion criteria using query operators.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'A document containing a boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled deletedCount containing the number of deleted documents'
            },
            deleteOne: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne',
              description: 'Removes a single document from a collection.',
              example: 'db.collection.deleteOne(filter, options)',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'Specifies deletion criteria using query operators.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'A document containing a boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled deletedCount containing the number of deleted documents'
            },
            distinct: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.distinct',
              description: 'Finds the distinct values for a specified field across a single collection or view and returns the results in an array.',
              example: 'db.collection.distinct(field, query, options)',
              parameters: {
                field: {
                  type: 'string',
                  description: 'The field for which to return distinct values.'
                },
                query: {
                  type: 'document',
                  description: 'A query that specifies the documents from which to retrieve the distinct values.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    collation: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'The results in an array.'
            },
            estimatedDocumentCount: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.estimatedDocumentCount',
              description: 'Returns the count of all documents in a collection or view.',
              example: 'db.collection.estimatedDocumentCount(options)',
              parameters: {
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    maxTimeMS: {
                      type: 'int32',
                      description: 'The maximum amount of time to allow the count to run.'
                    }
                  }
                }
              },
              returns: 'count as an integer'
            },
            find: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.find',
              description: 'Selects documents in a collection or view.',
              example: 'db.collection.find(query, projection)',
              parameters: {
                query: {
                  type: 'document',
                  description: 'Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).'
                },
                projection: {
                  type: 'document',
                  description: 'Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.'
                }
              },
              returns: 'A cursor to the documents that match the query criteria.'
            },
            findAndModify: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify',
              description: 'Modifies and returns a single document.',
              example: 'db.collection.findAndModify(spec)',
              parameters: {
                spec: {
                  type: 'document',
                  description: '',
                  values: {
                    query: {
                      type: 'document',
                      description: ''
                    },
                    sort: {
                      type: 'document',
                      description: ''
                    },
                    remove: {
                      type: 'boolean',
                      description: ''
                    },
                    update: {
                      type: 'document|array',
                      description: ''
                    },
                    new: {
                      type: 'boolean',
                      description: ''
                    },
                    fields: {
                      type: 'document',
                      description: ''
                    },
                    upsert: {
                      type: 'boolean',
                      description: ''
                    },
                    bypassDocumentValidation: {
                      type: 'boolean',
                      description: ''
                    },
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    },
                    arrayFilters: {
                      type: 'array',
                      description: ''
                    }
                  }
                }
              },
              returns: 'For remove operations, if the query matches a document, findAndModify() returns the removed document. If the query does not match a document to remove, findAndModify() returns null.'
            },
            findOne: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.findOne',
              description: 'Selects documents in a collection or view.',
              example: 'db.collection.findOne(query, projection)',
              parameters: {
                query: {
                  type: 'document',
                  description: 'Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).'
                },
                projection: {
                  type: 'document',
                  description: 'Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.'
                }
              },
              returns: 'A cursor to the documents that match the query criteria.'
            },
            findOneAndDelete: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete',
              description: 'Deletes a single document based on the filter and sort criteria, returning the deleted document.',
              example: 'db.collection.findOneAndDelete(filter, options)',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'The selection criteria for the update.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    projection: {
                      type: 'document',
                      description: ''
                    },
                    sort: {
                      type: 'document',
                      description: ''
                    },
                    maxTimeMS: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'Returns the deleted document.'
            },
            findOneAndReplace: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace',
              description: 'Modifies and replaces a single document based on the filter and sort criteria.',
              example: 'db.collection.findOneAndReplace(filter, replacement, options)',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'The selection criteria for the update.'
                },
                replacement: {
                  type: 'document',
                  description: 'The replacement document.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    projection: {
                      type: 'document',
                      description: ''
                    },
                    sort: {
                      type: 'document',
                      description: ''
                    },
                    maxTimeMS: {
                      type: 'int32',
                      description: ''
                    },
                    upsert: {
                      type: 'boolean',
                      description: ''
                    },
                    returnNewDocument: {
                      type: 'boolean',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'Returns either the original document or, if returnNewDocument: true, the replacement document.'
            },
            findOneAndUpdate: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate',
              description: 'Updates a single document based on the filter and sort criteria.',
              example: 'db.collection.findOneAndUpdate(filter, update, options)',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'The selection criteria for the update.'
                },
                update: {
                  type: 'document|array',
                  description: 'The update document or, starting in MongoDB 4.2, an aggregation pipeline.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    projection: {
                      type: 'document',
                      description: ''
                    },
                    sort: {
                      type: 'document',
                      description: ''
                    },
                    maxTimeMS: {
                      type: 'int32',
                      description: ''
                    },
                    upsert: {
                      type: 'boolean',
                      description: ''
                    },
                    returnNewDocument: {
                      type: 'boolean',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    },
                    arrayFilters: {
                      type: 'array',
                      description: ''
                    }
                  }
                }
              },
              returns: 'Returns either the original document or, if returnNewDocument: true, the updated document.'
            },
            insert: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.insert',
              description: 'Inserts a document or documents into a collection.',
              example: 'db.collection.insert(document, options)',
              parameters: {
                document: {
                  type: 'document|array',
                  description: 'A document or array of documents to insert into the collection.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    ordered: {
                      type: 'boolean',
                      description: ''
                    }
                  }
                }
              },
              returns: ''
            },
            insertMany: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.insertMany',
              description: 'Inserts multiple documents into a collection.',
              example: 'db.collection.insertMany(documents, options)',
              parameters: {
                documents: {
                  type: 'array',
                  description: 'An array of documents to insert into the collection.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    ordered: {
                      type: 'boolean',
                      description: ''
                    }
                  }
                }
              },
              returns: 'A document containing a boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled and An array of _id for each successfully inserted documents'
            },
            insertOne: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.insertOne',
              description: 'Inserts a document into a collection.',
              example: 'db.collection.insertOne(document, options)',
              parameters: {
                document: {
                  type: 'document',
                  description: 'A document to insert into the collection.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    writeConcern: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'A document containing a boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.  A field insertedId with the _id value of the inserted document.'
            },
            isCapped: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.isCapped',
              description: 'Checks if a collection is capped',
              example: 'db.collection.isCapped()',
              parameters: {},
              returns: 'Returns true if the collection is a capped collection, otherwise returns false.'
            },
            remove: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.remove',
              description: 'Removes documents from a collection.',
              example: 'db.collection.remove(query, options)',
              parameters: {
                query: {
                  type: 'document',
                  description: ''
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    justOne: {
                      type: 'boolean',
                      description: ''
                    },
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'The status of the operation.'
            },
            save: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.save',
              description: 'Updates an existing document or inserts a new document, depending on its document parameter.',
              example: 'db.collection.save(document, options)',
              parameters: {
                document: {
                  type: 'document',
                  description: ''
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    writeConcern: {
                      type: 'document',
                      description: ''
                    }
                  }
                }
              },
              returns: 'A WriteResult object that contains the status of the operation. Changed in version 2.6: The save() returns an object that contains the status of the operation.'
            },
            replaceOne: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.replaceOne',
              description: 'Replaces a single document within the collection based on the filter.',
              example: 'db.collection.replaceOne(filter, replacement, options)',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'The selection criteria for the update.'
                },
                replacement: {
                  type: 'document',
                  description: 'The replacement document.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    upsert: {
                      type: 'boolean',
                      description: ''
                    },
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    },
                    hint: {
                      type: 'document|string',
                      description: ''
                    }
                  }
                }
              },
              returns: ''
            },
            update: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.update',
              description: 'Modifies an existing document or documents in a collection.',
              example: 'db.collection.update(query, update, options)',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'The selection criteria for the update.'
                },
                update: {
                  type: 'document',
                  description: 'The modifications to apply.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    upsert: {
                      type: 'boolean',
                      description: ''
                    },
                    multi: {
                      type: 'boolean',
                      description: ''
                    },
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    },
                    arrayFilters: {
                      type: 'array',
                      description: ''
                    },
                    hint: {
                      type: 'document|string',
                      description: ''
                    }
                  }
                }
              },
              returns: ''
            },
            updateMany: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.updateMany',
              description: 'Updates all documents that match the specified filter for a collection.',
              example: 'db.collection.updateMany(filter, update, options)',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'The selection criteria for the update.'
                },
                update: {
                  type: 'document',
                  description: 'The modifications to apply.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    upsert: {
                      type: 'boolean',
                      description: ''
                    },
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    },
                    arrayFilters: {
                      type: 'array',
                      description: ''
                    },
                    hint: {
                      type: 'document|string',
                      description: ''
                    }
                  }
                }
              },
              returns: ''
            },
            convertToCapped: {
              link: '',
              description: "calls {convertToCapped:'coll', size:maxBytes}} command",
              example: 'db.coll.convertToCapped(10000)',
              parameters: {
                size: {
                  type: 'number',
                  description: 'The maximum size, in bytes, for the capped collection.'
                }
              }
            },
            getDb: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            stats: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            dataSize: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            storageSize: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            totalSize: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            createIndexes: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.createIndexes',
              description: 'Creates one or more indexes on a collection',
              example: "db.coll.db.coll.createIndexes([{ category: 1 }], { name: 'index-1' })",
              parameters: {}
            },
            createIndex: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.createIndex',
              description: 'Creates one index on a collection',
              example: "db.coll.db.coll.createIndex({ category: 1 }, { name: 'index-1' })",
              parameters: {}
            },
            ensureIndex: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.ensureIndex',
              description: 'Creates one index on a collection',
              example: "db.coll.db.coll.ensureIndex({ category: 1 }, { name: 'index-1' })",
              parameters: {}
            },
            getIndexes: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            getIndexKeys: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            getIndices: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            getIndexSpecs: {
              link: '',
              description: '',
              example: '',
              parameters: {}
            },
            totalIndexSize: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.totalIndexSize',
              description: 'Reports the total size used by the indexes on a collection.',
              example: '',
              parameters: {}
            },
            dropIndexes: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.dropIndexes',
              description: 'Drops the specified index or indexes (except the index on the _id field) from a collection.',
              example: '',
              parameters: {}
            },
            dropIndex: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.dropIndex',
              description: 'Drops or removes the specified index from a collection.',
              example: '',
              parameters: {}
            },
            reIndex: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.reIndex',
              description: 'Rebuilds all existing indexes on a collection.',
              example: '',
              parameters: {}
            },
            drop: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.drop',
              description: 'Removes a collection or view from the database.',
              example: 'db.students.drop()'
            },
            exists: {
              link: '',
              description: 'Returns collection infos if the collection exists or null otherwise.',
              example: 'db.coll.exists()',
              parameters: {}
            },
            getFullName: {
              link: '',
              description: 'Returns the name of the collection prefixed with the database name.',
              example: 'db.coll.getFullName()',
              parameters: {}
            },
            getName: {
              link: '',
              description: 'Returns the name of the collection.',
              example: 'db.coll.getName()',
              parameters: {}
            },
            renameCollection: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.renameCollection/',
              description: 'Renames a collection.',
              example: 'db.coll.renameCollection("newName")',
              parameters: {}
            },
            runCommand: {
              link: '',
              description: 'Runs a db command with the given name where the first param is the collection name.',
              example: 'db.collection.runCommand("text", { search: "searchKeywords" })',
              parameters: {}
            },
            explain: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.explain',
              description: 'Returns information on the query plan.',
              example: 'db.collection.explain().<method(...)>',
              parameters: {}
            },
            updateOne: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.collection.updateOne',
              description: 'Updates a single document within the collection based on the filter.',
              example: 'db.collection.updateOne(filter, update, options)',
              parameters: {
                filter: {
                  type: 'document',
                  description: 'The selection criteria for the update.'
                },
                update: {
                  type: 'document',
                  description: 'The modifications to apply.'
                },
                options: {
                  type: 'document',
                  description: '',
                  values: {
                    upsert: {
                      type: 'boolean',
                      description: ''
                    },
                    writeConcern: {
                      type: 'document',
                      description: ''
                    },
                    collation: {
                      type: 'document',
                      description: ''
                    },
                    arrayFilters: {
                      type: 'array',
                      description: ''
                    },
                    hint: {
                      type: 'document|string',
                      description: ''
                    }
                  }
                }
              },
              returns: ''
            }
          }
        }
      },
      Cursor: {
        iteration: {
          'no-cursor': 'no cursor',
          'type-it-for-more': 'Type "it" for more'
        },
        help: {
          description: 'Collection Cursor',
          attributes: {
            addOption: 'Adds OP_QUERY wire protocol flags, such as the tailable flag, to change the behavior of queries. Accepts: DBQuery.Option fields tailable, slaveOk, noTimeout, awaitData, exhaust, partial.',
            allowPartialResults: "Sets the 'partial' option to true.",
            batchSize: 'Specifies the number of documents to return in each batch of the response from the MongoDB instance. In most cases, modifying the batch size will not affect the user or the application, as the mongo shell and most drivers return results as if MongoDB returned a single batch.',
            clone: 'Clone the cursor.',
            close: 'Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.',
            collation: 'Specifies the collation for the cursor returned by the db.collection.find(). To use, append to the db.collection.find().',
            comment: 'Adds a comment field to the query.',
            count: 'Counts the number of documents referenced by a cursor.',
            explain: 'Provides information on the query plan for the db.collection.find() method.',
            forEach: 'Iterates the cursor to apply a JavaScript function to each document from the cursor.',
            getQueryPlan: 'Runs cursor.explain()',
            hasNext: 'cursor.hasNext() returns true if the cursor returned by the db.collection.find() query can iterate further to return more documents.',
            hint: 'Call this method on a query to override MongoDB’s default index selection and query optimization process. Use db.collection.getIndexes() to return the list of current indexes on a collection.',
            isClosed: 'Returns true if the cursor is closed.',
            isExhausted: 'cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.',
            itcount: 'Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.',
            length: 'Runs cursor.count()',
            limit: 'Use the limit() method on a cursor to specify the maximum number of documents the cursor will return.',
            map: 'Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.',
            max: 'Specifies the exclusive upper bound for a specific index in order to constrain the results of find(). max() provides a way to specify an upper bound on compound key indexes.',
            maxScan: 'Constrains the query to only scan the specified number of documents when fulfilling the query.',
            maxTimeMs: 'Specifies a cumulative time limit in milliseconds for processing operations on a cursor.',
            min: 'Specifies the inclusive lower bound for a specific index in order to constrain the results of find(). min() provides a way to specify lower bounds on compound key indexes.',
            modifiers: 'Get query modifiers.',
            next: 'The next document in the cursor returned by the db.collection.find() method.',
            noCursorTimeout: 'Instructs the server to avoid closing a cursor automatically after a period of inactivity.',
            objsLeftInBatch: 'cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.',
            oplogReplay: 'Sets oplogReplay cursor flag to true.',
            projection: 'Sets a field projection for the query.',
            pretty: 'Configures the cursor to display results in an easy-to-read format.',
            readConcern: 'Specify a read concern for the db.collection.find() method.',
            readonly: '',
            readPref: 'Append readPref() to a cursor to control how the client routes the query to members of the replica set.',
            returnKey: 'Modifies the cursor to return index keys rather than the documents.',
            showDiskLoc: 'The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.',
            showRecordId: 'Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.',
            size: 'A count of the number of documents that match the db.collection.find() query after applying any cursor.skip() and cursor.limit() methods.',
            skip: 'Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.',
            snapshot: 'The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document',
            sort: 'Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.',
            tailable: 'Marks the cursor as tailable.',
            toArray: 'The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.'
          }
        }
      },
      Database: {
        help: {
          description: 'Database Class',
          attributes: {
            aggregate: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.aggregate',
              description: 'Runs a specified admin/diagnostic pipeline which does not require an underlying collection.',
              example: 'db.aggregate(pipeline, options)',
              parameters: {}
            },
            runCommand: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.runCommand',
              description: 'Runs an arbitrary command on the database.',
              example: 'db.runCommand({ text: "myCollection", search: "searchKeywords" })',
              parameters: {}
            },
            adminCommand: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.adminCommand',
              description: 'Runs an arbitrary command against the admin database.',
              example: 'db.adminCommand({ serverStatus: 1 })',
              parameters: {}
            },
            getCollectionInfos: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.getCollectionInfos',
              description: 'Returns an array of documents with collection information, i.e. collection name and options, for the current database.',
              example: 'db.getCollectionInfos()',
              parameters: {}
            },
            getCollectionNames: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.getCollectionNames',
              description: 'Returns an array containing the names of all collections in the current database.',
              example: 'db.getCollectionNames',
              parameters: {}
            },
            getSiblingDB: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.getSiblingDB',
              description: 'Returns another database without modifying the db variable in the shell environment.',
              example: 'db.getSiblingDB(name)',
              parameters: {}
            },
            getCollection: {
              link: 'https://docs.mongodb.com/manual/reference/method/db.getCollection',
              description: 'Returns a collection or a view object by its name.',
              example: 'db.getCollection(name)',
              parameters: {}
            }
          }
        }
      },
      Explainable: {
        help: {
          description: 'Explainable Class',
          attributes: {
            getCollection: {
              link: '',
              description: 'Returns the explainable collection.',
              example: 'db.coll.explain().getCollection()',
              parameters: {}
            },
            getVerbosity: {
              link: '',
              description: 'Returns the explainable verbosity.',
              example: 'db.coll.explain().getVerbosity()',
              parameters: {}
            },
            setVerbosity: {
              link: '',
              description: 'Sets the explainable verbosity.',
              example: 'db.coll.explain().setVerbosity("queryPlanner")',
              parameters: {}
            }
          }
        }
      },
      ReplicaSet: {
        help: {
          description: 'Replica Set Class'
        }
      },
      Shard: {
        help: {
          description: 'The Shard Class'
        }
      }
    }
  },
  'transport-browser': {
    'stitch-browser-transport': {
      'auth-error': 'Error authenticating with Stitch.'
    }
  },
  'transport-core': {
    'stitch-transport': {
      'not-implemented': 'is not implemented in the Stitch SDK',
      'agg-on-db': 'Aggregations run on the database is not allowed via Stitch'
    }
  },
  'transport-server': {}
};

export default translations;

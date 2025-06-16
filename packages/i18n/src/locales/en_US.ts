/* eslint-disable filename-rules/match */
import type Catalog from '../catalog';

/**
 * US english translations.
 */
const translations: Catalog = {
  'browser-repl': {},
  build: {},
  'cli-repl': {
    args: {
      usage:
        '$ mongosh [options] [db address] [file names (ending in .js or .mongodb)]',
      options: 'Options:',
      file: 'Load the specified mongosh script',
      help: 'Show this usage information',
      ipv6: 'Enable IPv6 support (disabled by default)',
      host: 'Server to connect to',
      port: 'Port to connect to',
      buildInfo: 'Show build information',
      version: 'Show version information',
      quiet: 'Silence output from the shell during the connection process',
      shell: 'Run the shell after executing files',
      nodb: "Don't connect to mongod on startup - no 'db address' [arg] expected",
      norc: "Will not run the '.mongoshrc.js' file on start up",
      eval: 'Evaluate javascript',
      json: 'Print result of --eval as Extended JSON, including errors',
      retryWrites:
        'Automatically retry write operations upon transient network errors (Default: true)',
      authenticationOptions: 'Authentication Options:',
      username: 'Username for authentication',
      password: 'Password for authentication',
      authenticationDatabase: 'User source (defaults to dbname)',
      authenticationMechanism: 'Authentication mechanism',
      awsIamSessionToken: 'AWS IAM Temporary Session Token ID',
      gssapiServiceName:
        'Service name to use when authenticating using GSSAPI/Kerberos',
      gssapiHostName:
        'Remote host name to use for purpose of GSSAPI/Kerberos authentication',
      sspiHostnameCanonicalization:
        'Specify the SSPI hostname canonicalization (none or forward, available on Windows)',
      sspiRealmOverride: 'Specify the SSPI server realm (available on Windows)',
      tlsOptions: 'TLS Options:',
      tls: 'Use TLS for all connections',
      tlsCertificateKeyFile: 'PEM certificate/key file for TLS',
      tlsCertificateKeyFilePassword: 'Password for key in PEM file for TLS',
      tlsCAFile: 'Certificate Authority file for TLS',
      tlsCRFile: 'Certificate Revocation List file for TLS',
      tlsAllowInvalidHostnames:
        'Allow connections to servers with non-matching hostnames',
      tlsAllowInvalidCertificates:
        'Allow connections to servers with invalid certificates',
      tlsCertificateSelector:
        'TLS Certificate in system store (Windows and macOS only)',
      tlsCRLFile:
        'Specifies the .pem file that contains the Certificate Revocation List',
      tlsDisabledProtocols:
        'Comma separated list of TLS protocols to disable [TLS1_0,TLS1_1,TLS1_2]',
      tlsFIPSMode: "Enable the system TLS library's FIPS mode",
      apiVersionOptions: 'API version options:',
      apiVersion: 'Specifies the API version to connect with',
      apiStrict: 'Use strict API version mode',
      apiDeprecationErrors:
        'Fail deprecated commands for the specified API version',
      fleOptions: 'FLE Options:',
      awsAccessKeyId: 'AWS Access Key for FLE Amazon KMS',
      awsSecretAccessKey: 'AWS Secret Key for FLE Amazon KMS',
      awsSessionToken: 'Optional AWS Session Token ID',
      keyVaultNamespace:
        'database.collection to store encrypted FLE parameters',
      kmsURL: 'Test parameter to override the URL of the KMS endpoint',
      dbAddressOptions: 'DB Address Examples:',
      'dbAddress/foo': 'Foo database on local machine',
      'dbAddress/192/foo': 'Foo database on 192.168.0.5 machine',
      'dbAddress/192/host/foo':
        'Foo database on 192.168.0.5 machine on port 9999',
      'dbAddress/connectionURI': 'Connection string URI can also be used',
      fileNames: 'File Names:',
      filenameDescription:
        'A list of files to run. Files must end in .js and will exit after unless --shell is specified.',
      examples: 'Examples:',
      connectionExampleWithDatabase:
        "Start mongosh using 'ships' database on specified connection string:",
      moreInformation: 'For more information on usage:',
      oidcOptions: 'OIDC auth options:',
      oidcFlows: 'Supported OIDC auth flows',
      oidcRedirectUri:
        'Local auth code flow redirect URL [http://localhost:27097/redirect]',
      oidcTrustedEndpoint:
        'Treat the cluster/database mongosh as a trusted endpoint',
      oidcIdTokenAsAccessToken:
        'Use ID tokens in place of access tokens for auth',
      oidcDumpTokens:
        "Debug OIDC by printing tokens to mongosh's output [redacted|include-secrets]",
      oidcNoNonce: "Don't send a nonce argument in the OIDC auth request",
    },
    'arg-parser': {
      'unknown-option': 'Error parsing command line: unrecognized option:',
    },
    'cli-repl': {
      connecting: 'Connecting to:',
      telemetry:
        'To help improve our products, anonymous usage data is collected and sent to MongoDB periodically (https://www.mongodb.com/legal/privacy-policy).',
      disableTelemetry: 'You can opt-out by running the ',
      command: 'command.',
      enabledTelemetry: 'Telemetry is now enabled.',
      disabledTelemetry: 'Telemetry is now disabled.',
      wiki: {
        info: 'For mongosh info see:',
        link: 'https://www.mongodb.com/docs/mongodb-shell/',
      },
      additionalErrorInfo: 'Additional information',
      additionalErrorResult: 'Result',
      additionalErrorViolations: 'Violations',
      additionalErrorWriteErrors: 'Write Errors',
      errorCausedBy: 'Caused by',
    },
    'uri-generator': {
      'no-host-port':
        'If a full URI is provided, you cannot also specify --host or --port',
      'invalid-host': 'The --host argument contains an invalid character',
      'host-list-port-mismatch':
        'The host list contains different ports than provided by --port',
      'diverging-service-name':
        'Either the --gssapiServiceName parameter or the SERVICE_NAME authentication mechanism property in the connection string can be used but not both.',
      'gssapi-service-name-unsupported':
        'The gssapiServiceName query parameter is not supported anymore. Please use the --gssapiServiceName argument or the SERVICE_NAME authentication mechanism property (e.g. ?authMechanismProperties=SERVICE_NAME:<value>).',
    },
  },
  'service-provider-browser': {},
  'service-provider-core': {},
  'service-provider-node-driver': {},
  'shell-api': {
    classes: {
      ShellLog: {
        help: {
          description: 'Shell log methods',
          link: '#',
          attributes: {
            getPath: {
              description: 'Gets a path to the current log file',
              example: 'log.getPath()',
            },
            info: {
              description: 'Writes a custom info message to the log file',
              example: 'log.info("Custom info message")',
            },
            warn: {
              description: 'Writes a custom warning message to the log file',
              example: 'log.warn("Custom warning message")',
            },
            error: {
              description: 'Writes a custom error message to the log file',
              example: 'log.error("Custom error message")',
            },
            fatal: {
              description: 'Writes a custom fatal message to the log file',
              example: 'log.fatal("Custom fatal message")',
            },
            debug: {
              description: 'Writes a custom debug message to the log file',
              example: 'log.debug("Custom debug message")',
            },
          },
        },
      },
      ShellApi: {
        help: {
          description: 'Shell Help',
          link: 'https://mongodb.com/docs/manual/reference/method',
          attributes: {
            log: {
              description:
                "'log.info(<msg>)': Write a custom info/warn/error/fatal/debug message to the log file\n" +
                "'log.getPath()': Gets a path to the current log file\n",
            },
            use: {
              description: 'Set current database',
            },
            it: {
              description:
                'result of the last line evaluated; use to further iterate',
            },
            exit: {
              description: 'Quit the MongoDB shell with exit/exit()/.exit',
            },
            quit: {
              description: 'Quit the MongoDB shell with quit/quit()',
            },
            show: {
              description:
                "'show databases'/'show dbs': Print a list of all available databases\n" +
                "'show collections'/'show tables': Print a list of all collections for current database\n" +
                "'show profile': Prints system.profile information\n" +
                "'show users': Print a list of all users for current database\n" +
                "'show roles': Print a list of all roles for current database\n" +
                "'show log <type>': log for current connection, if type is not set uses 'global'\n" +
                "'show logs': Print all logs",
            },
            connect: {
              description:
                'Create a new connection and return the Database object. Usage: connect(URI, username [optional], password [optional])',
              link: 'https://mongodb.com/docs/manual/reference/method/connect',
            },
            Mongo: {
              description:
                'Create a new connection and return the Mongo object. Usage: new Mongo(URI, options [optional])',
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo/#Mongo',
            },
            version: {
              description: 'Shell version',
              link: 'https://mongodb.com/docs/manual/reference/method/version/',
            },
            load: {
              description:
                'Loads and runs a JavaScript file into the current shell environment',
              example: 'load("path/to/file.js")',
            },
            enableTelemetry: {
              description:
                'Enables collection of anonymous usage data to improve the mongosh CLI',
            },
            disableTelemetry: {
              description:
                'Disables collection of anonymous usage data to improve the mongosh CLI',
            },
            passwordPrompt: {
              description: 'Prompts the user for a password',
              link: 'https://mongodb.com/docs/manual/reference/method/passwordPrompt/',
            },
            sleep: {
              description: 'Sleep for the specified number of milliseconds',
              link: 'https://mongodb.com/docs/manual/reference/method/sleep/',
              example: 'sleep(5000)',
            },
            cls: {
              description: 'Clears the screen like console.clear()',
            },
            print: {
              description: 'Prints the contents of an object to the output',
              example: 'print({ some: "value" })',
            },
            printjson: {
              description: 'Alias for print()',
            },
            isInteractive: {
              description:
                'Returns whether the shell will enter or has entered interactive mode',
            },
            convertShardKeyToHashed: {
              description:
                'Returns the hashed value for the input using the same hashing function as a hashed index.',
              link: 'https://www.mongodb.com/docs/manual/reference/method/convertShardKeyToHashed/',
            },
          },
        },
      },
      ShellConfig: {
        help: {
          description: 'Shell configuration methods',
          attributes: {
            get: {
              description: 'Get a configuration value with config.get(key)',
            },
            set: {
              description:
                'Change a configuration value with config.set(key, value)',
            },
            reset: {
              description:
                'Reset a configuration value to its default value with config.reset(key)',
            },
          },
        },
      },
      AggregationCursor: {
        help: {
          description: 'Aggregation Class',
          attributes: {
            close: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.close',
              description:
                'Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.',
              example: 'db.collection.aggregate(pipeline, options).close()',
            },
            forEach: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.forEach',
              description:
                'Iterates the cursor to apply a JavaScript function to each document from the cursor.',
              example:
                'db.collection.aggregate(pipeline, options).forEach(function)',
            },
            hasNext: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.hasNext',
              description:
                "cursor.hasNext() returns true if the cursor returned by the db.collection.aggregate() can iterate further to return more documents. NOTE: if the cursor is tailable with awaitData then hasNext will block until a document is returned. To check if a document is in the cursor's batch without waiting, use tryNext instead",
              example: 'db.collection.aggregate(pipeline, options).hasNext()',
            },
            isClosed: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.isClosed',
              description: 'Returns true if the cursor is closed.',
              example: 'db.collection.aggregate(pipeline, options).isClosed()',
            },
            isExhausted: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.isExhausted',
              description:
                'cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.',
              example:
                'db.collection.aggregate(pipeline, options).isExhausted()',
            },
            itcount: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.itcount',
              description:
                'Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.',
              example: 'db.collection.aggregate(pipeline, options).itcount()',
            },
            map: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.map',
              description:
                'Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.',
              example:
                'db.collection.aggregate(pipeline, options).map(function)',
            },
            maxTimeMS: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.maxTimeMS',
              description:
                'Specifies a cumulative time limit in milliseconds for processing operations on a cursor.',
              example:
                'db.collection.aggregate(pipeline, options).maxTimeMS(timeLimit)',
            },
            next: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.next',
              description:
                "The next document in the cursor returned by the db.collection.aggregate() method. NOTE: if the cursor is tailable with awaitData then next will block until a document is returned. To check if a document is in the cursor's batch without waiting, use tryNext instead",
              example: 'db.collection.aggregate(pipeline, options).next()',
            },
            tryNext: {
              description:
                "If a document is in the cursor's batch it will be returned, otherwise null will be returned",
            },
            explain: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.explain',
              description:
                'Provides information on the query plan for db.collection.aggregate() method.',
              example:
                'db.collection.aggregate(pipeline, options).explain([verbosity])',
            },
            objsLeftInBatch: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.objsLeftInBatch',
              description:
                'cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.',
              example:
                'db.collection.aggregate(pipeline, options).objsLeftInBatch()',
            },
            toArray: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.toArray',
              description:
                'The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.',
              example: 'db.collection.aggregate(pipeline, options).toArray()',
            },
            pretty: {
              description:
                'Deprecated. The shell provides auto-formatting so this method is no longer useful',
            },
            batchSize: {
              description:
                'Specifies the number of documents to return in each batch of the response from the MongoDB instance.',
              example:
                'db.collection.aggregate(pipeline, options).batchSize(10)',
            },
            projection: {
              link: '',
              description: 'Sets a field projection for the query.',
              example:
                'db.collection.aggregate(pipeline, options).projection(field)',
            },
            sort: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.sort',
              description:
                'Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.',
              example:
                'db.collection.aggregate(pipeline, options).sort(sortDocument)',
            },
            skip: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.skip',
              description:
                'Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.',
              example:
                'db.collection.aggregate(pipeline, options).skip(offsetNumber)',
            },
          },
        },
      },
      BulkWriteResult: {
        help: {
          description: 'BulkWriteResult Class',
          attributes: {
            acknowledged: {
              description: 'Acknowledged returned from the server',
            },
            insertedCount: {
              description: 'Number of documents inserted',
            },
            insertedIds: {
              description: 'Array of ObjectIds inserted',
            },
            matchedCount: {
              description: 'Number of documents matched',
            },
            modifiedCount: {
              description: 'Number of documents modified',
            },
            deletedCount: {
              description: 'Number of documents deleted',
            },
            upsertedCount: {
              description: 'Number of documents upserted',
            },
            upsertedIds: {
              description: 'Array of ObjectIds upserted',
            },
          },
        },
      },
      ClientBulkWriteResult: {
        help: {
          description: 'ClientBulkWriteResult Class',
          attributes: {
            acknowledged: {
              description: 'Acknowledged returned from the server',
            },
            insertedCount: {
              description: 'Number of documents inserted',
            },
            matchedCount: {
              description: 'Number of documents matched',
            },
            modifiedCount: {
              description: 'Number of documents modified',
            },
            deletedCount: {
              description: 'Number of documents deleted',
            },
            upsertedCount: {
              description: 'Number of documents upserted',
            },
            insertResults: {
              description:
                'The results of each individual insert operation that was successfully performed',
            },
            updateResults: {
              description:
                'The results of each individual update operation that was successfully performed',
            },
            deleteResults: {
              description:
                'The results of each individual delete operation that was successfully performed.',
            },
          },
        },
      },
      CommandResult: {
        help: {
          description: 'CommandResult Class',
        },
      },
      InsertManyResult: {
        help: {
          description: 'InsertManyResult Class',
          attributes: {
            acknowledged: {
              description: 'Acknowledged returned from the server',
            },
            insertedIds: {
              description: 'Array of ObjectIds inserted',
            },
          },
        },
      },
      InsertOneResult: {
        help: {
          description: 'InsertOneResult Class',
          attributes: {
            acknowledged: {
              description: 'Acknowledged returned from the server',
            },
            insertedId: {
              description: 'ObjectId of document inserted',
            },
          },
        },
      },
      UpdateResult: {
        help: {
          description: 'CommandResult Class',
          attributes: {
            acknowledged: {
              description: 'Acknowledged returned from the server',
            },
            insertedId: {
              description: 'ObjectId inserted',
            },
            matchedCount: {
              description: 'Number of documents matched',
            },
            modifiedCount: {
              description: 'Number of documents modified',
            },
            upsertedCount: {
              description: 'Number of documents upserted',
            },
          },
        },
      },
      DeleteResult: {
        help: {
          description: 'CommandResult Class',
          attributes: {
            acknowledged: {
              description: 'Acknowledged returned from the server',
            },
            deletedCount: {
              description: 'Number of documents deleted',
            },
          },
        },
      },
      ShowDbsResult: {
        help: {
          description: 'ShowDatabasesResult Class',
        },
      },
      Collection: {
        help: {
          description: 'Collection Class',
          attributes: {
            watch: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.watch',
              description: 'Opens a change stream cursor on the collection',
              example: 'const cursor = db.collection.watch(pipeline, options)',
            },
            aggregate: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.aggregate',
              description:
                'Calculates aggregate values for the data in a collection or a view.',
              example: 'db.collection.aggregate(pipeline, options)',
            },
            bulkWrite: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.bulkWrite',
              description:
                'Performs multiple write operations with controls for order of execution.',
              example: 'db.collection.bulkWrite(operations, options)',
            },
            countDocuments: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.countDocuments',
              description:
                'Returns the count of documents that match the query for a collection or view.',
              example: 'db.collection.countDocuments(query, options)',
            },
            count: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.count',
              description:
                'Returns the count of documents that would match a find() query for the collection or view.',
              example: 'db.collection.count(query, options)',
            },
            dataSize: {
              link: 'hhttps://mongodb.com/docs/manual/reference/method/db.collection.dataSize',
              description:
                'This method provides a wrapper around the size output of the collStats (i.e. db.collection.stats()) command.',
              example: 'db.collection.dataSize()',
            },
            deleteMany: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.deleteMany',
              description:
                'Removes all documents that match the filter from a collection.',
              example: 'db.collection.deleteMany()',
            },
            deleteOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.deleteOne',
              description: 'Removes a single document from a collection.',
              example: 'db.collection.deleteOne(filter, options)',
            },
            distinct: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.distinct',
              description:
                'Finds the distinct values for a specified field across a single collection or view and returns the results in an array.',
              example: 'db.collection.distinct(field, query, options)',
            },
            estimatedDocumentCount: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.estimatedDocumentCount',
              description:
                'Returns the count of all documents in a collection or view.',
              example: 'db.collection.estimatedDocumentCount(options)',
            },
            find: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.find',
              description: 'Selects documents in a collection or view.',
              example: 'db.collection.find(query, projection, options)',
            },
            findAndModify: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.findAndModify',
              description: 'Modifies and returns a single document.',
              example: 'db.collection.findAndModify(spec)',
            },
            findOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.findOne',
              description: 'Selects documents in a collection or view.',
              example: 'db.collection.findOne(query, projection, options)',
            },
            findOneAndDelete: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.findOneAndDelete',
              description:
                'Deletes a single document based on the filter and sort criteria, returning the deleted document.',
              example: 'db.collection.findOneAndDelete(filter, options)',
            },
            findOneAndReplace: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.findOneAndReplace',
              description:
                'Modifies and replaces a single document based on the filter and sort criteria.',
              example:
                'db.collection.findOneAndReplace(filter, replacement, options)',
            },
            findOneAndUpdate: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate',
              description:
                'Updates a single document based on the filter and sort criteria.',
              example:
                'db.collection.findOneAndUpdate(filter, update, options)',
            },
            getIndexes: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.getIndexes',
              description:
                'Returns an array that holds a list of documents that identify and describe the existing indexes on the collection.',
              example: 'db.collection.getIndexes()',
            },
            getIndices: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.getIndexes',
              description:
                'Alias for getIndexes. Returns an array that holds a list of documents that identify and describe the existing indexes on the collection.',
              example: 'db.collection.getIndices()',
            },
            insert: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.insert',
              description: 'Inserts a document or documents into a collection.',
              example: 'db.collection.insert(document, options)',
            },
            insertMany: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.insertMany',
              description: 'Inserts multiple documents into a collection.',
              example: 'db.collection.insertMany(documents, options)',
            },
            insertOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.insertOne',
              description: 'Inserts a document into a collection.',
              example: 'db.collection.insertOne(document, options)',
            },
            isCapped: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.isCapped',
              description: 'Checks if a collection is capped',
              example: 'db.collection.isCapped()',
            },
            remove: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.remove',
              description: 'Removes documents from a collection.',
              example: 'db.collection.remove(query, options)',
            },
            stats: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.stats',
              description: 'Returns statistics about the collection.',
              example: 'db.collection.stats(options)',
            },
            storageSize: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.storageSize',
              description:
                'The total amount of storage allocated to this collection for document storage.',
              example: 'db.collection.storageSize()',
            },
            replaceOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.replaceOne',
              description:
                'Replaces a single document within the collection based on the filter.',
              example: 'db.collection.replaceOne(filter, replacement, options)',
            },
            totalSize: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.totalSize',
              description:
                'The total size in bytes of the data in the collection plus the size of every index on the collection.',
              example: 'db.collection.totalSize()',
            },
            update: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.update',
              description:
                'Modifies an existing document or documents in a collection.',
              example: 'db.collection.update(query, update, options)',
            },
            updateMany: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.updateMany',
              description:
                'Updates all documents that match the specified filter for a collection.',
              example: 'db.collection.updateMany(filter, update, options)',
            },
            compactStructuredEncryptionData: {
              link: '',
              description: 'Compacts structured encryption data',
              example: 'db.collection.compactStructuredEncryptionData()',
            },
            convertToCapped: {
              link: '',
              description:
                "calls {convertToCapped:'coll', size:maxBytes}} command",
              example: 'db.coll.convertToCapped(10000)',
            },
            createIndexes: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.createIndexes',
              description: 'Creates one or more indexes on a collection',
              example:
                "db.coll.createIndexes([{ category: 1 }], { name: 'index-1' })",
            },
            createIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.createIndex',
              description: 'Creates one index on a collection',
              example:
                "db.coll.createIndex({ category: 1 }, { name: 'index-1' })",
            },
            ensureIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.ensureIndex',
              description: 'Creates one index on a collection',
              example:
                "db.coll.ensureIndex({ category: 1 }, { name: 'index-1' })",
            },
            getDB: {
              link: '',
              description: 'Get current database.',
              example: 'db.collection.getDB()',
            },
            getIndexKeys: {
              link: '',
              description:
                'Return an array of key patterns for indexes defined on collection',
              example: 'db.collection.getIndexKeys()',
            },
            getIndexSpecs: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.getIndexes',
              description:
                'Alias for getIndexes. Returns an array that holds a list of documents that identify and describe the existing indexes on the collection.',
              example: 'db.collection.getIndexSpecs()',
            },
            totalIndexSize: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.totalIndexSize',
              description:
                'Reports the total size used by the indexes on a collection.',
              example: 'db.collection.totalIndexSize()',
            },
            dropIndexes: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.dropIndexes',
              description:
                'Drops the specified index or indexes (except the index on the _id field) from a collection.',
              example: 'db.collection.dropIndexes()',
            },
            dropIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.dropIndex',
              description:
                'Drops or removes the specified index from a collection.',
              example: 'db.collection.dropIndex()',
            },
            reIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.reIndex',
              description: 'Rebuilds all existing indexes on a collection.',
              example: '',
            },
            hideIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.hideIndex',
              description: 'Hides an existing index from the query planner.',
              example: 'db.collection.hideIndex("index_1")',
            },
            unhideIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.unhideIndex',
              description: 'Unhides an existing index from the query planner.',
              example: 'db.collection.unhideIndex("index_1")',
            },
            drop: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.drop',
              description: 'Removes a collection or view from the database.',
              example: 'db.students.drop()',
            },
            exists: {
              link: '',
              description:
                'Returns collection infos if the collection exists or null otherwise.',
              example: 'db.coll.exists()',
            },
            getFullName: {
              link: '',
              description:
                'Returns the name of the collection prefixed with the database name.',
              example: 'db.coll.getFullName()',
            },
            getName: {
              link: '',
              description: 'Returns the name of the collection.',
              example: 'db.coll.getName()',
            },
            renameCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.renameCollection/',
              description: 'Renames a collection.',
              example: 'db.coll.renameCollection("newName")',
            },
            runCommand: {
              link: '',
              description:
                'Runs a db command with the given name where the first param is the collection name.',
              example:
                'db.collection.runCommand("text", { search: "searchKeywords" })',
            },
            explain: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description: 'Returns information on the query plan.',
              example: 'db.collection.explain().<method(...)>',
            },
            updateOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.updateOne',
              description:
                'Updates a single document within the collection based on the filter.',
              example: 'db.collection.updateOne(filter, update, options)',
            },
            getMongo: {
              description: 'Returns the Mongo object.',
              example: 'db.collection.getMongo()',
            },
            latencyStats: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.latencyStats',
              description:
                "returns the $latencyStats aggregation for the collection. Takes an options document with an optional boolean 'histograms' field.",
              example: 'db.latencyStats({ histograms: true })',
            },
            initializeUnorderedBulkOp: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.initializeUnorderedBulkOp',
              description:
                'Initializes an unordered bulk command. Returns an instance of Bulk',
              example: 'db.coll.initializeUnorderedBulkOp()',
            },
            initializeOrderedBulkOp: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.initializeOrderedBulkOp',
              description:
                'Initializes an ordered bulk command. Returns an instance of Bulk',
              example: 'db.coll.initializeOrderedBulkOp()',
            },
            getPlanCache: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.getPlanCache/',
              description:
                'Returns an interface to access the query plan cache for a collection. The interface provides methods to view and clear the query plan cache.',
              example: 'db.coll.getPlanCache()',
            },
            validate: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.validate',
              description:
                'Calls the validate command. Default full value is false',
              example: 'db.coll.validate(<full>)',
            },
            mapReduce: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.mapReduce',
              description: 'Calls the mapReduce command',
              example: 'db.coll.mapReduce(mapFn, reduceFn, options)',
            },
            getShardVersion: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.getShardVersion',
              description: 'Calls the getShardVersion command',
              example: 'db.coll.getShardVersion()',
            },
            getShardDistribution: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.getShardDistribution',
              description:
                'Prints the data distribution statistics for a sharded collection.',
              example: 'db.coll.getShardDistribution()',
            },
            getShardLocation: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.getShardLocation',
              description:
                'Returns a document containing the shards where this collection is located as well as whether the collection itself is sharded.',
              example: 'db.coll.getShardLocation()',
            },
            analyzeShardKey: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.analyzeShardKey',
              description:
                'Returns metrics for evaluating a shard key. That is, ‘key’ can be a candidate shard key for an unsharded or sharded collection, or the current shard key for a sharded collection.',
              example: 'db.coll.analyzeShardKey(key)',
            },
            configureQueryAnalyzer: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.configureQueryAnalyzer',
              description:
                'Starts or stops collecting metrics about reads and writes against an unsharded or sharded collection.',
              example: 'db.coll.configureQueryAnalyzer(options)',
            },
            checkMetadataConsistency: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.checkMetadataConsistency',
              description:
                'Returns a cursor with information about metadata inconsistencies',
              example: 'db.coll.checkMetadataConsistency(<options>)',
            },
            getSearchIndexes: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.getSearchIndexes',
              description:
                'Returns an array that holds a list of documents that identify and describe the existing search indexes on the collection.',
              example: 'db.coll.getSearchIndexes(<name>)',
            },
            createSearchIndexes: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.createSearchIndexes',
              description: 'Creates one or more search indexes on a collection',
              example: 'db.coll.createSearchIndexes(specs)',
            },
            createSearchIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.createSearchIndex',
              description: 'Creates one search indexes on a collection',
              example: 'db.coll.createSearchIndex(<name>, definition)',
            },
            dropSearchIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.dropSearchIndex',
              description:
                'Drops or removes the specified search index from a collection.',
              example: 'db.coll.dropSearchIndex(name)',
            },
            updateSearchIndex: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.updateSearchIndex',
              description: 'Updates the sepecified search index.',
              example: 'db.coll.updateSearchIndex(name, definition)',
            },
          },
        },
      },
      ChangeStreamCursor: {
        iteration: {
          'no-cursor': 'no cursor',
          'type-it-for-more': 'Type "it" for more',
        },
        help: {
          description: 'Change Stream Cursor',
          attributes: {
            close: {
              description:
                'Instructs the server to close a cursor and free associated server resources.',
            },
            isClosed: {
              description: 'Returns true if the cursor is closed',
            },
            itcount: {
              description:
                'Returns the number of documents in the current batch. NOTE: this method exhausts the cursor batch',
            },
            getResumeToken: {
              description: 'Returns the ResumeToken of the change stream',
            },
            hasNext: {
              description:
                'WARNING: on change streams this method will block unless the cursor is closed. Use tryNext to check if there are any documents in the batch. This is a breaking change',
            },
            next: {
              description:
                'WARNING: on change streams this method will block unless the cursor is closed. Use tryNext to get the next document in the batch. This is a breaking change',
            },
            tryNext: {
              description:
                'If there is a document in the change stream, it will be returned. Otherwise returns null.',
            },
            isExhausted: {
              description:
                'This method is deprecated because because after closing a cursor, the remaining documents in the batch are no longer accessible. If you want to see if the cursor is closed use cursor.isClosed. If you want to see if there are documents left in the batch, use cursor.tryNext. This is a breaking change',
            },
          },
        },
      },
      Cursor: {
        iteration: {
          'no-cursor': 'no cursor',
          'type-it-for-more': 'Type "it" for more',
        },
        help: {
          description: 'Collection Cursor',
          attributes: {
            addOption: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.addOption',
              description:
                'Adds OP_QUERY wire protocol flags, such as the tailable flag, to change the behavior of queries. Accepts: DBQuery.Option fields tailable, slaveOk, noTimeout, awaitData, exhaust, partial.',
              example:
                'db.collection.find(query, projection, options).addOption(flag)',
            },
            allowPartialResults: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.allowPartialResults',
              description: "Sets the 'partial' option to true.",
              example:
                'db.collection.find(query, projection, options).allowPartialResults()',
            },
            allowDiskUse: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.allowDiskUse',
              description:
                "Sets the 'allowDiskUse' option. If no argument is passed, the default is true.",
              example:
                'db.collection.find(query, projection, options).sort(sort).allowDiskUse(false)',
            },
            batchSize: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.batchSize',
              description:
                'Specifies the number of documents to return in each batch of the response from the MongoDB instance. In most cases, modifying the batch size will not affect the user or the application, as the mongo shell and most drivers return results as if MongoDB returned a single batch.',
              example:
                'db.collection.find(query, projection, options).batchSize(10)',
            },
            close: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.close',
              description:
                'Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.',
              example: 'db.collection.find(query, projection, options).close()',
            },
            collation: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.collation',
              description:
                'Specifies the collation for the cursor returned by the db.collection.find(). To use, append to the db.collection.find().',
              example:
                'db.collection.find(query, projection, options).collation(collationDocument)',
            },
            comment: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.comment',
              description: 'Adds a comment field to the query.',
              example:
                "db.collection.find(query, projection, options).comment('Comment')",
            },
            count: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.count',
              description:
                'Counts the number of documents referenced by a cursor.',
              example: 'db.collection.find(query, projection, options).count()',
            },
            explain: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.explain',
              description:
                'Provides information on the query plan for the db.collection.find() method.',
              example:
                'db.collection.find(query, projection, options).explain()',
            },
            forEach: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.forEach',
              description:
                'Iterates the cursor to apply a JavaScript function to each document from the cursor.',
              example:
                'db.collection.find(query, projection, options).forEach(function)',
            },
            getQueryPlan: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.explain',
              description: 'Runs cursor.explain()',
              example:
                'db.collection.find(query, projection, options).getQueryPlan()',
            },
            hasNext: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.hasNext',
              description:
                "cursor.hasNext() returns true if the cursor returned by the db.collection.find() query can iterate further to return more documents. NOTE: if the cursor is tailable with awaitData then hasNext will block until a document is returned. To check if a document is in the cursor's batch without waiting, use tryNext instead",
              example:
                'db.collection.find(query, projection, options).hasNext()',
            },
            hint: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.hint',
              description:
                'Call this method on a query to override MongoDB’s default index selection and query optimization process. Use db.collection.getIndexes() to return the list of current indexes on a collection.',
              example:
                'db.collection.find(query, projection, options).hint(index)',
            },
            isClosed: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.isClosed',
              description: 'Returns true if the cursor is closed.',
              example:
                'db.collection.find(query, projection, options).isClosed()',
            },
            isExhausted: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.isExhausted',
              description:
                'cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.',
              example:
                'db.collection.find(query, projection, options).isExhausted()',
            },
            itcount: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.itcount',
              description:
                'Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.',
              example:
                'db.collection.find(query, projection, options).itcount()',
            },
            length: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.count',
              description: 'Runs cursor.count()',
              example:
                'db.collection.find(query, projection, options).length()',
            },
            limit: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.limit',
              description:
                'Use the limit() method on a cursor to specify the maximum number of documents the cursor will return.',
              example:
                'db.collection.find(query, projection, options).limit(2)',
            },
            map: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.map',
              description:
                'Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.',
              example:
                'db.collection.find(query, projection, options).map(function)',
            },
            max: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.max',
              description:
                'Specifies the exclusive upper bound for a specific index in order to constrain the results of find(). max() provides a way to specify an upper bound on compound key indexes.',
              example:
                'db.collection.find(query, projection, options).max(indexBoundsDocument)',
            },
            maxScan: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.maxScan',
              description: 'deprecated, non-functional',
            },
            maxTimeMS: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.maxTimeMS',
              description:
                'Specifies a cumulative time limit in milliseconds for processing operations on a cursor.',
              example:
                'db.collection.find(query, projection, options).maxTimeMS(timeLimit)',
            },
            maxAwaitTimeMS: {
              description:
                'Set a maxAwaitTimeMS on a tailing cursor query to allow to customize the timeout value for the option awaitData (Only supported on MongoDB 3.2 or higher, ignored otherwise)',
              example:
                'db.collection.find(query, projection, options).maxAwaitTimeMS(timeLimit)',
            },
            min: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.min',
              description:
                'Specifies the inclusive lower bound for a specific index in order to constrain the results of find(). min() provides a way to specify lower bounds on compound key indexes.',
              example:
                'db.collection.find(query, projection, options).min(indexBoundsDocument)',
            },
            modifiers: {
              link: '',
              description: 'Get query modifiers.',
              example:
                'db.collection.find(query, projection, options).modifiers()',
            },
            next: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.next',
              description:
                "The next document in the cursor returned by the db.collection.find() method. NOTE: if the cursor is tailable with awaitData then hasNext will block until a document is returned. To check if a document is in the cursor's batch without waiting, use tryNext instead",
              example: 'db.collection.find(query, projection, options).next()',
            },
            tryNext: {
              description:
                "If a document is in the cursor's batch it will be returned, otherwise null will be returned",
            },
            noCursorTimeout: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.noCursorTimeout',
              description:
                'Instructs the server to avoid closing a cursor automatically after a period of inactivity.',
              example:
                'db.collection.find(query, projection, options).noCursorTimeout()',
            },
            objsLeftInBatch: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.objsLeftInBatch',
              description:
                'cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.',
              example:
                'db.collection.find(query, projection, options).objsLeftInBatch()',
            },
            oplogReplay: {
              link: '',
              description: 'Sets oplogReplay cursor flag to true.',
              example:
                'db.collection.find(query, projection, options).oplogReplay()',
            },
            projection: {
              link: '',
              description: 'Sets a field projection for the query.',
              example:
                'db.collection.find(query, projection, options).projection(field)',
            },
            // don't document since everything is currently pretty printed
            pretty: {
              description:
                'Deprecated. The shell provides auto-formatting so this method is no longer useful',
            },
            readConcern: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.readConcern',
              description:
                'Specify a read concern for the db.collection.find() method.',
              example:
                'db.collection.find(query, projection, options).readConcern(level)',
            },
            readonly: {
              link: '',
              description: '',
              example: '',
            },
            readPref: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.readPref',
              description:
                'Append readPref() to a cursor to control how the client routes the query to members of the replica set.',
              example:
                'db.collection.find(query, projection, options).readPref(mode, tagSet)',
            },
            returnKey: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.returnKey',
              description:
                'Modifies the cursor to return index keys rather than the documents.',
              example:
                'db.collection.find(query, projection, options).returnKey()',
            },
            showDiskLoc: {
              link: '',
              description:
                'The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY style find.',
              example:
                'db.collection.find(query, projection, options).showDiskLoc()',
            },
            showRecordId: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.showRecordId',
              description:
                'Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.',
              example:
                'db.collection.find(query, projection, options).showRecordId',
            },
            size: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.size',
              description:
                'A count of the number of documents that match the db.collection.find() query after applying any cursor.skip() and cursor.limit() methods.',
              example: 'db.collection.find(query, projection, options).size()',
            },
            skip: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.skip',
              description:
                'Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.',
              example:
                'db.collection.find(query, projection, options).skip(offsetNumber)',
            },
            snapshot: {
              link: '',
              description:
                'The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document',
              example:
                'db.collection.find(query, projection, options).snapshot()',
            },
            sort: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.sort',
              description:
                'Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.',
              example:
                'db.collection.find(query, projection, options).sort(sortDocument)',
            },
            tailable: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.tailable',
              description: 'Marks the cursor as tailable.',
              example:
                'db.collection.find(query, projection, options).tailable({ awaitData: true })',
            },
            toArray: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.toArray',
              description:
                'The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.',
              example:
                'db.collection.find(query, projection, options).toArray()',
            },
          },
        },
      },
      Database: {
        help: {
          description: 'Database Class',
          attributes: {
            sql: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.sql',
              description:
                '(Experimental) Runs a SQL query against Atlas Data Lake. Note: this is an experimental feature that may be subject to change in future releases.',
              example:
                'const cursor = db.sql("SELECT * FROM myCollection", options)',
            },
            watch: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.watch',
              description: 'Opens a change stream cursor on the database',
              example: 'const cursor = db.watch(pipeline, options)',
            },
            aggregate: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.aggregate',
              description:
                'Runs a specified admin/diagnostic pipeline which does not require an underlying collection.',
              example: 'db.aggregate(pipeline, options)',
            },
            runCommand: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.runCommand',
              description: 'Runs an arbitrary command on the database.',
              example:
                'db.runCommand({ text: "myCollection", search: "searchKeywords" })',
            },
            dropDatabase: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.dropDatabase',
              description:
                'Removes the current database, deleting the associated data files.',
              example: 'db.dropDatabase([writeConcern])',
            },
            adminCommand: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.adminCommand',
              description:
                'Runs an arbitrary command against the admin database.',
              example: 'db.adminCommand({ serverStatus: 1 })',
            },
            getCollectionInfos: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getCollectionInfos',
              description:
                'Returns an array of documents with collection information, i.e. collection name and options, for the current database.',
              example: 'db.getCollectionInfos()',
            },
            getCollectionNames: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getCollectionNames',
              description:
                'Returns an array containing the names of all collections in the current database.',
              example: 'db.getCollectionNames',
            },
            getSiblingDB: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getSiblingDB',
              description:
                'Returns another database without modifying the db variable in the shell environment.',
              example: 'db.getSiblingDB(name)',
            },
            getCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getCollection',
              description:
                'Returns a collection or a view object that is functionally equivalent to using the db.<collectionName>.',
              example: 'db.getCollection(name)',
            },
            getMongo: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getMongo/',
              description: 'Returns the current database connection',
              example: 'connection = db.getMongo()',
            },
            getName: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getName',
              description: 'Returns the name of the DB',
              example: 'db.getName()',
            },
            createCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.createCollection/',
              description: 'Create new collection',
              example: "db.createCollection('collName')",
            },
            createEncryptedCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.createEncryptedCollection/',
              description:
                'Creates a new collection with a list of encrypted fields each with unique and auto-created data encryption keys (DEKs). This is a utility function that internally utilises ClientEnryption.createEncryptedCollection.',
              example:
                'db.createEncryptedCollection( "collName", { "provider": "<kmsProvider>", "createCollectionOptions": { "encryptedFields": { ... }, ...<otherOptions> } })',
            },
            createView: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.createView/',
              description: 'Create new view',
              example: "db.createView('viewName', 'source', [])",
            },
            createUser: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.createUser',
              description:
                'Creates a new user for the database on which the method is run. db.createUser() returns a duplicate user error if the user already exists on the database.',
              example: 'db.createUser(user, writeConcern)',
            },
            updateUser: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.updateUser',
              description:
                'Updates the user’s profile on the database on which you run the method. An update to a field completely replaces the previous field’s values. This includes updates to the user’s roles array.',
              example: 'db.updateUser(username, update, writeConcern)',
            },
            changeUserPassword: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.changeUserPassword',
              description:
                'Updates a user’s password. Run the method in the database where the user is defined, i.e. the database you created the user.',
              example: 'db.changeUserPassword(username, password)',
            },
            logout: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.logout',
              description:
                'Ends the current authentication session. This function has no effect if the current session is not authenticated.',
              example: 'db.logout()',
            },
            dropUser: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.dropUser',
              description: 'Removes the user from the current database.',
              example: 'db.dropUser(username, writeConcern)',
            },
            dropAllUsers: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.dropAllUsers',
              description: 'Removes all users from the current database.',
              example: 'db.dropAllUsers(writeConcern)',
            },
            auth: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.auth',
              description:
                'Allows a user to authenticate to the database from within the shell.',
              example: 'db.auth(username, password)',
            },
            grantRolesToUser: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.grantRolesToUser',
              description: 'Grants additional roles to a user.',
              example:
                'db.grantRolesToUser( "<username>", [ <roles> ], { <writeConcern> } )',
            },
            revokeRolesFromUser: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.revokeRolesFromUser',
              description:
                'Removes a one or more roles from a user on the current database.',
              example:
                'db.revokeRolesFromUser( "<username>", [ <roles> ], { <writeConcern> } )',
            },
            getUser: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getUser',
              description:
                'Returns user information for a specified user. Run this method on the user’s database. The user must exist on the database on which the method runs.',
              example: 'db.getUser(username, args)',
            },
            getUsers: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getUsers',
              description:
                'Returns information for all the users in the database.',
              example: 'db.getUsers(<options>)',
            },
            createRole: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.createRole',
              description: 'Creates a new role.',
              example: 'db.createRole(role, writeConcern)',
            },
            updateRole: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.updateRole',
              description:
                'Updates the role’s profile on the database on which you run the method. An update to a field completely replaces the previous field’s values.',
              example: 'db.updateRole(rolename, update, writeConcern)',
            },
            dropRole: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.dropRole',
              description: 'Removes the role from the current database.',
              example: 'db.dropRole(rolename, writeConcern)',
            },
            dropAllRoles: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.dropAllRoles',
              description: 'Removes all roles from the current database.',
              example: 'db.dropAllRoles(writeConcern)',
            },
            grantRolesToRole: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.grantRolesToRole',
              description: 'Grants additional roles to a role.',
              example:
                'db.grantRolesToRole( "<rolename>", [ <roles> ], { <writeConcern> } )',
            },
            revokeRolesFromRole: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.revokeRolesFromRole',
              description:
                'Removes a one or more roles from a role on the current database.',
              example:
                'db.revokeRolesFromRole( "<rolename>", [ <roles> ], { <writeConcern> } )',
            },
            grantPrivilegesToRole: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.grantPrivilegesToRole',
              description: 'Grants additional privileges to a role.',
              example:
                'db.grantPrivilegesToRole( "<rolename>", [ <privileges> ], { <writeConcern> } )',
            },
            revokePrivilegesFromRole: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.revokePrivilegesFromRole',
              description:
                'Removes a one or more privileges from a role on the current database.',
              example:
                'db.revokeRolesFromRole( "<rolename>", [ <privileges> ], { <writeConcern> } )',
            },
            getRole: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getRole',
              description:
                'Returns role information for a specified role. Run this method on the role’s database. The role must exist on the database on which the method runs.',
              example: 'db.getRole(rolename, args)',
            },
            getRoles: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getRoles',
              description:
                'Returns information for all the roles in the database.',
              example: 'db.getRoles(<options>)',
            },
            currentOp: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.currentOp',
              description:
                'Runs an aggregation using $currentOp operator. Returns a document that contains information on in-progress operations for the database instance. For further information, see $currentOp.',
              example: 'db.currentOp()',
            },
            killOp: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.killOp',
              description:
                'Calls the killOp command. Terminates an operation as specified by the operation ID. To find operations and their corresponding IDs, see $currentOp or db.currentOp().',
              example: 'db.killOp(<options>)',
            },
            shutdownServer: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.shutdownServer',
              description:
                'Calls the shutdown command. Shuts down the current mongod or mongos process cleanly and safely. You must issue the db.shutdownServer() operation against the admin database.',
              example: 'db.shutdownServer(<options>)',
            },
            fsyncLock: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.fsyncLock',
              description:
                'Calls the fsync command. Forces the mongod to flush all pending write operations to disk and locks the entire mongod instance to prevent additional writes until the user releases the lock with a corresponding db.fsyncUnlock() command.',
              example: 'db.fsyncLock(<options>)',
            },
            fsyncUnlock: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.fsyncUnlock',
              description:
                'Calls the fsyncUnlock command. Reduces the lock taken by db.fsyncLock() on a mongod instance by 1.',
              example: 'db.fsyncUnlock(<options>)',
            },
            version: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.version',
              description: 'returns the db version. uses the buildinfo command',
              example: 'db.version()',
            },
            serverBits: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.serverBits',
              description:
                'returns the db serverBits. uses the buildInfo command',
              example: 'db.serverBits()',
            },
            isMaster: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.isMaster',
              description: 'Calls the isMaster command',
              example: 'db.isMaster()',
            },
            hello: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.hello',
              description: 'Calls the hello command',
              example: 'db.hello()',
            },
            rotateCertificates: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.rotateCertificates',
              description: 'Calls the rotateCertificates command',
              example: 'db.rotateCertificates()',
            },
            serverBuildInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.serverBuildInfo',
              description:
                'returns the db serverBuildInfo. uses the buildInfo command',
              example: 'db.serverBuildInfo()',
            },
            serverStatus: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.serverStatus',
              description:
                'returns the server stats. uses the serverStatus command',
              example: 'db.serverStatus(<opts>)',
            },
            stats: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.stats',
              description: 'returns the db stats. uses the dbStats command',
              example: 'db.stats(<scale>) or db.stats({ scale: <scale> })',
            },
            hostInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.hostInfo',
              description: 'Calls the hostInfo command',
              example: 'db.hostInfo()',
            },
            serverCmdLineOpts: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.serverCmdLineOpts',
              description:
                'returns the db serverCmdLineOpts. uses the getCmdLineOpts command',
              example: 'db.serverCmdLineOpts()',
            },
            printCollectionStats: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.printCollectionStats',
              description:
                'Prints the collection.stats for each collection in the db.',
              example: 'db.printCollectionStats(scale)',
            },
            getProfilingStatus: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getProfilingStatus',
              description:
                'returns the db getProfilingStatus. uses the profile command',
              example: 'db.getProfilingStatus()',
            },
            setProfilingLevel: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.setProfilingLevel',
              description:
                'returns the db setProfilingLevel. uses the profile command',
              example: 'db.setProfilingLevel(level, <options>)',
            },
            setLogLevel: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.setLogLevel',
              description:
                'returns the db setLogLevel. uses the setParameter command',
              example: 'db.setLogLevel(logLevel, <component>)',
            },
            getLogComponents: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getLogComponents',
              description:
                'returns the db getLogComponents. uses the getParameter command',
              example: 'db.getLogComponents()',
            },
            cloneDatabase: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.cloneDatabase',
              description: 'deprecated, non-functional',
            },
            copyDatabase: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.copyDatabase',
              description: 'deprecated, non-functional',
            },
            cloneCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.cloneCollection',
              description: 'deprecated, non-functional',
            },
            listCommands: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.listCommands',
              description: 'Calls the listCommands command',
              example: 'db.listCommands()',
            },
            commandHelp: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.commandHelp',
              description:
                'returns the db commandHelp. uses the passed in command with help: true',
              example: 'db.commandHelp(<command>)',
            },
            getLastError: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getLastError',
              description: 'Calls the getLastError command',
              example: 'db.getLastError(<w>, <wTimeout>)',
            },
            getLastErrorObj: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getLastErrorObj',
              description: 'Calls the getLastError command',
              example: 'db.getLastErrorObj(<w>, <wTimeout>, <j>)',
            },
            printShardingStatus: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.printShardingStatus',
              description: 'Calls sh.status(verbose)',
              example: 'db.printShardingStatus(verbose?)',
            },
            printSecondaryReplicationInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.printSecondaryReplicationInfo',
              description: 'Prints secondary replicaset information',
              example: 'db.printSecondaryReplicationInfo()',
            },
            printSlaveReplicationInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.printSlaveReplicationInfo',
              description: 'DEPRECATED. Use db.printSecondaryReplicationInfo',
              example: 'db.printSlaveReplicationInfo()',
            },
            getReplicationInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.getReplicationInfo',
              description: 'Returns replication information',
              example: 'db.getReplicationInfo()',
            },
            printReplicationInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.printReplicationInfo',
              description: 'Formats sh.getReplicationInfo',
              example: 'db.printReplicationInfo()',
            },
            setSecondaryOk: {
              description:
                'This method is deprecated. Use db.getMongo().setReadPref() instead',
            },
            checkMetadataConsistency: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.checkMetadataConsistency',
              description:
                'Returns a cursor with information about metadata inconsistencies',
              example: 'db.checkMetadataConsistency(<options>)',
            },
          },
        },
      },
      DBQuery: {
        help: {
          description:
            'Deprecated -- use config.set("displayBatchSize", value) instead of DBQuery.shellBatchSize = value',
        },
      },
      Explainable: {
        help: {
          description: 'Explainable Class',
          attributes: {
            aggregate: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Provides information on the query plan for db.collection.aggregate() method.',
              example: 'db.coll.explain().aggregate()',
            },
            find: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description: 'Returns information on the query plan.',
              example: 'db.coll.explain().find()',
            },
            count: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.count().',
              example: 'db.coll.explain().count()',
            },
            remove: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.remove().',
              example: 'db.coll.explain().remove({})',
            },
            update: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.update().',
              example: 'db.coll.explain().update({}, { $inc: ${ a: 1 } })',
            },
            distinct: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.distinct().',
              example: 'db.coll.explain().distinct("_id")',
            },
            mapReduce: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.mapReduce().',
              example: 'db.coll.explain().mapReduce(map, reduce, options)',
            },
            findAndModify: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.findAndModify().',
              example:
                'db.coll.explain().findAndModify({ query: { ... }, update: { ... } })',
            },
            findOneAndDelete: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.findOneAndDelete().',
              example: 'db.coll.explain().findOneAndDelete({ ... query ... })',
            },
            findOneAndReplace: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.findOneAndReplace().',
              example:
                'db.coll.explain().findOneAndReplace({ ... query ... }, { ... replacement ... })',
            },
            findOneAndUpdate: {
              link: 'https://mongodb.com/docs/manual/reference/method/db.collection.explain',
              description:
                'Returns information on the query plan for db.collection.findOneAndUpdate().',
              example:
                'db.coll.explain().findOneAndUpdate({ ... query ... }, { ... update operators ... })',
            },
            getCollection: {
              link: '',
              description: 'Returns the explainable collection.',
              example: 'db.coll.explain().getCollection()',
            },
            getVerbosity: {
              link: '',
              description: 'Returns the explainable verbosity.',
              example: 'db.coll.explain().getVerbosity()',
            },
            setVerbosity: {
              link: '',
              description: 'Sets the explainable verbosity.',
              example: 'db.coll.explain().setVerbosity("queryPlanner")',
            },
          },
        },
      },
      ExplainableCursor: {
        iteration: {
          'no-cursor': 'no cursor',
          'type-it-for-more': 'Type "it" for more',
        },
        help: {
          description:
            'Explainable Cursor. See the Cursor class help methods for more information',
        },
      },
      RunCommandCursor: {
        help: {
          description: 'RunCommandCursor Class',
          attributes: {
            batchSize: {
              description:
                'Specifies the number of documents to return in each batch of the response from the MongoDB instance.',
            },
            close: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.close',
              description:
                'Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.',
            },
            forEach: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.forEach',
              description:
                'Iterates the cursor to apply a JavaScript function to each document from the cursor.',
            },
            hasNext: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.hasNext',
              description:
                "cursor.hasNext() returns true if the cursor returned by the db.collection.aggregate() can iterate further to return more documents. NOTE: if the cursor is tailable with awaitData then hasNext will block until a document is returned. To check if a document is in the cursor's batch without waiting, use tryNext instead",
            },
            isClosed: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.isClosed',
              description: 'Returns true if the cursor is closed.',
            },
            isExhausted: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.isExhausted',
              description:
                'cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.',
            },
            itcount: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.itcount',
              description:
                'Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.',
            },
            map: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.map',
              description:
                'Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.',
            },
            maxTimeMS: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.maxTimeMS',
              description:
                'Specifies a cumulative time limit in milliseconds for processing operations on a cursor.',
            },
            next: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.next',
              description:
                "The next document in the cursor returned by the db.collection.aggregate() method. NOTE: if the cursor is tailable with awaitData then next will block until a document is returned. To check if a document is in the cursor's batch without waiting, use tryNext instead",
            },
            objsLeftInBatch: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.objsLeftInBatch',
              description:
                'cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.',
            },
            pretty: {
              description:
                'Deprecated. The shell provides auto-formatting so this method is no longer useful',
            },
            toArray: {
              link: 'https://mongodb.com/docs/manual/reference/method/cursor.toArray',
              description:
                'The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.',
            },
            tryNext: {
              description:
                "If a document is in the cursor's batch it will be returned, otherwise null will be returned",
            },
          },
        },
      },
      ReplicaSet: {
        help: {
          description: 'Replica Set Class',
          link: 'https://mongodb.com/docs/manual/reference/method/js-replication/',
          attributes: {
            initiate: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.initiate',
              description: 'Initiates the replica set.',
              example: 'rs.initiate()',
            },
            config: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.conf',
              description:
                'Returns a document that contains the current replica set configuration.',
              example: 'rs.config()',
            },
            reconfig: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.reconfig',
              description:
                'Reconfigures an existing replica set, overwriting the existing replica set configuration.',
              example: 'rs.reconfig()',
            },
            reconfigForPSASet: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.reconfigForPSASet',
              description:
                'Reconfigures an existing replica set, overwriting the existing replica set configuration, if the reconfiguration is a transition from a Primary-Arbiter to a Primary-Secondary-Arbiter set.',
              example:
                'rs.reconfigForPSASet(indexOfNewMemberInMembersArray, config)',
            },
            conf: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.conf',
              description: 'Calls replSetConfig',
              example: 'rs.conf()',
            },
            status: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.status',
              description: 'Calls replSetGetStatus',
              example: 'rs.status()',
            },
            isMaster: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.isMaster',
              description: 'Calls isMaster',
              example: 'rs.isMaster()',
            },
            hello: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.hello',
              description: 'Calls hello',
              example: 'rs.hello()',
            },
            printSecondaryReplicationInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo',
              description: 'Calls db.printSecondaryReplicationInfo',
              example: 'rs.printSecondaryReplicationInfo()',
            },
            printSlaveReplicationInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.printSlaveReplicationInfo',
              description: 'DEPRECATED. Use rs.printSecondaryReplicationInfo',
              example: 'rs.printSlaveReplicationInfo()',
            },
            printReplicationInfo: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.printReplicationInfo',
              description: 'Calls db.printReplicationInfo',
              example: 'rs.printReplicationInfo()',
            },
            add: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.add',
              description: 'Adds replica set member to replica set.',
              example: 'rs.add(hostport, arbiterOnly?)',
            },
            addArb: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.addArb',
              description: 'Calls rs.add with arbiterOnly=true',
              example: 'rs.addArb(hostname)',
            },
            remove: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.remove',
              description: 'Removes a replica set member.',
              example: 'rs.remove(hostname)',
            },
            freeze: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.freeze',
              description:
                'Prevents the current member from seeking election as primary for a period of time. Uses the replSetFreeze command',
              example: 'rs.freeze(secs)',
            },
            stepDown: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.stepDown',
              description:
                'Causes the current primary to become a secondary which forces an election. If no stepDownSecs is provided, uses 60 seconds. Uses the replSetStepDown command',
              example: 'rs.stepDown(stepDownSecs?, catchUpSecs?)',
            },
            syncFrom: {
              link: 'https://mongodb.com/docs/manual/reference/method/rs.syncFrom',
              description:
                'Sets the member that this replica set member will sync from, overriding the default sync target selection logic.',
              example: 'rs.syncFrom(host)',
            },
            secondaryOk: {
              description:
                'This method is deprecated. Use db.getMongo().setReadPref() instead',
            },
          },
        },
      },
      Shard: {
        help: {
          description: 'The Shard Class',
          attributes: {
            enableSharding: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.enableSharding',
              description:
                'Enables sharding on a specific database. Uses the enableSharding command',
              example: 'sh.enableSharding(database, primaryShard?)',
            },
            shardCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.shardCollection',
              description:
                'Enables sharding for a collection. Uses the shardCollection command',
              example: 'sh.shardCollection(namespace, key, unique?, options?)',
            },
            reshardCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.reshardCollection',
              description:
                'Enables sharding for a collection. Uses the reshardCollection command',
              example:
                'sh.reshardCollection(namespace, key, unique?, options?)',
            },
            commitReshardCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.commitReshardCollection',
              description:
                'Commits the current reshardCollection on a given collection',
              example: 'sh.commitReshardCollection(namespace)',
            },
            abortReshardCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.abortReshardCollection',
              description:
                'Abort the current reshardCollection on a given collection',
              example: 'sh.abortReshardCollection(namespace)',
            },
            status: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.status',
              description:
                'Prints a formatted report of the sharding configuration and the information regarding existing chunks in a sharded cluster. The default behavior suppresses the detailed chunk information if the total number of chunks is greater than or equal to 20.',
              example: 'sh.status(verbose?)',
            },
            addShard: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.addShard',
              description:
                'Adds a shard to a sharded cluster. Uses the addShard command',
              example: 'sh.addShard(url)',
            },
            addShardToZone: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.addShardToZone',
              description:
                'Associates a shard to a zone. Uses the addShardToZone command',
              example: 'sh.addShardToZone(shard, zone)',
            },
            addShardTag: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.addShardTag',
              description:
                '3.4+ only. Calls addShardTag for a sharded DB. Aliases to sh.addShardToZone().',
              example: 'sh.addShardTag(shard, tag)',
            },
            updateZoneKeyRange: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.updateZoneKeyRange',
              description:
                'Associates a range of shard keys to a zone. Uses the updateZoneKeyRange command',
              example: 'sh.updateZoneKeyRange(ns, min, max, zone)',
            },
            addTagRange: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.addTagRange',
              description:
                '3.4+ only. Adds a tag range for a sharded DB. This method aliases to sh.updateZoneKeyRange()',
              example: 'sh.addTagRange(ns, min, max, zone)',
            },
            removeRangeFromZone: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.removeRangeFromZone',
              description:
                '3.4+ only. Removes an association between a range of shard keys and a zone.',
              example: 'sh.removeRangeFromZone(ns, min, max)',
            },
            removeTagRange: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.removeTagRange',
              description:
                '3.4+ only. Removes tag range for a sharded DB. Aliases to sh.removeRangeFromZone',
              example: 'sh.removeTagRange(ns, min, max)',
            },
            removeShardFromZone: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.removeShardFromZone',
              description:
                '3.4+ only. Removes the association between a shard and a zone. Uses the removeShardFromZone command',
              example: 'sh.removeShardFromZone(shard, zone)',
            },
            removeShardTag: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.removeShardTag',
              description:
                '3.4+ only. Removes a shard tag for a sharded DB. Aliases to sh.removeShardFromZone',
              example: 'sh.removeShardTag(shard, zone)',
            },
            enableAutoSplit: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.enableAutoSplit',
              description:
                'Enables auto-splitting for the sharded cluster. Calls update on the config.settings collection',
              example: 'sh.enableAutoSplit()',
            },
            disableAutoSplit: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.disableAutoSplit',
              description:
                'Disables auto-splitting for the sharded cluster. Calls update on the config.settings collection',
              example: 'sh.disableAutoSplit()',
            },
            splitAt: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.splitAt',
              description:
                'Divides an existing chunk into two chunks using a specific value of the shard key as the dividing point. Uses the split command',
              example: 'sh.splitAt(ns, query)',
            },
            splitFind: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.splitFind',
              description:
                'Splits a chunk at the shard key value specified by the query at the median. Uses the split command',
              example: 'sh.splitFind(ns, query)',
            },
            moveChunk: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.moveChunk',
              description:
                'Moves the chunk that contains the document specified by the query to the destination shard. Uses the moveChunk command',
              example: 'sh.moveChunk(ns, query, destination)',
            },
            moveRange: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.moveRange',
              description:
                'Moves a range of documents specified by the min and max keys to the destination shard. Uses the moveRange command',
              example: 'sh.moveRange(ns, toShard, min?, max?)',
            },
            balancerCollectionStatus: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.balancerCollectionStatus',
              description:
                'Returns information on whether the chunks of a sharded collection are balanced. Uses the balancerCollectionStatus command',
              example: 'sh.balancerCollectionStatus(ns)',
            },
            enableBalancing: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.enableBalancing',
              description: 'Activates the sharded collection balancer process.',
              example: 'sh.enableBalancing(ns)',
            },
            disableBalancing: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.disableBalancing',
              description:
                'Disable balancing on a single collection in a sharded database. Does not affect balancing of other collections in a sharded cluster.',
              example: 'sh.disableBalancing(ns)',
            },
            getBalancerState: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.getBalancerState',
              description:
                'Returns true when the balancer is enabled and false if the balancer is disabled. This does not reflect the current state of balancing operations: use sh.isBalancerRunning() to check the balancer’s current state.',
              example: 'sh.getBalancerState()',
            },
            isBalancerRunning: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.isBalancerRunning',
              description:
                'Returns true if the balancer process is currently running and migrating chunks and false if the balancer process is not running. Uses the balancerStatus command',
              example: 'sh.isBalancerRunning()',
            },
            startBalancer: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.startBalancer',
              description:
                'Enables the balancer. Uses the balancerStart command',
              example: 'sh.startBalancer(timeout)',
            },
            stopBalancer: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.stopBalancer',
              description:
                'Disables the balancer. uses the balancerStop command',
              example: 'sh.stopBalancer(timeout)',
            },
            setBalancerState: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.setBalancerState',
              description:
                'Calls sh.startBalancer if state is true, otherwise calls sh.stopBalancer',
              example: 'sh.setBalancerState(state)',
            },
            getShardedDataDistribution: {
              description:
                'Returns data-size distribution information for all existing sharded collections',
              example: 'sh.getShardedDataDistribution()',
            },
            startAutoMerger: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.startAutoMerger',
              description:
                'Globally enable auto-merger (active only if balancer is up)',
              example: 'sh.startAutoMerger()',
            },
            stopAutoMerger: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.stopAutoMerger',
              description: 'Globally disable auto-merger',
              example: 'sh.stopAutoMerger()',
            },
            isAutoMergerEnabled: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.isAutoMergerEnabled',
              description: 'Returns whether the auto-merger is enabled',
              example: 'sh.isAutoMergerEnabled()',
            },
            disableAutoMerger: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.disableAutoMerger',
              description: 'Disable auto-merging on one collection',
              example: 'sh.disableAutoMerger(ns)',
            },
            enableAutoMerger: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.enableAutoMerger',
              description: 'Re-enable auto-merge on one collection',
              example: 'sh.enableAutoMerger(ns)',
            },
            checkMetadataConsistency: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.checkMetadataConsistency',
              description:
                'Returns a cursor with information about metadata inconsistencies',
              example: 'sh.checkMetadataConsistency(<options>)',
            },
            shardAndDistributeCollection: {
              description:
                'Shards a collection and then immediately reshards the collection to the same shard key.',
              example:
                'sh.shardAndDistributeCollection(ns, key, unique?, options?)',
            },
            moveCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.moveCollection',
              description:
                'Moves a single unsharded collection to a different shard.',
              example: 'sh.moveCollection(ns, toShard)',
            },
            abortMoveCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.abortMoveCollection',
              description:
                'Abort the current moveCollection operation on a given collection',
              example: 'sh.abortMoveCollection(ns)',
            },
            unshardCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.unshardCollection',
              description:
                'Unshard the given collection and move all data to the given shard.',
              example: 'sh.unshardCollection(ns, toShard)',
            },
            abortUnshardCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.abortUnshardCollection',
              description:
                'Abort the current unshardCollection operation on a given collection',
              example: 'sh.abortUnshardCollection(ns)',
            },
            listShards: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.listShards',
              description:
                'Returns a list of the configured shards in a sharded cluster',
              example: 'sh.listShards()',
            },
            isConfigShardEnabled: {
              link: 'https://mongodb.com/docs/manual/reference/method/sh.isConfigShardEnabled',
              description:
                'Returns a document with an `enabled: <boolean>` field indicating whether the cluster is configured as embedded config server cluster. If it is, then the config shard host and tags are also returned.',
              example: 'sh.isConfigShardEnabled()',
            },
          },
        },
      },
      Session: {
        help: {
          description: 'The Session Class. Represents a server session',
          link: 'https://mongodb.com/docs/manual/reference/method/Session/',
          attributes: {
            getDatabase: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session/#Session.getDatabase',
              description:
                'Returns a database class that will pass the session to the server with every command',
            },
            advanceOperationTime: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session/#Session.advanceOperationTime',
              description: 'Updates the operation time',
            },
            endSession: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session/#Session.endSession',
              description: 'Ends the session',
            },
            hasEnded: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session/#Session.hasEnded',
              description:
                'Returns a boolean that specifies whether the session has ended.',
            },
            getClusterTime: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session/#Session.getClusterTime',
              description:
                'Returns the most recent cluster time as seen by the session. Applicable for replica sets and sharded clusters only.',
            },
            getOperationTime: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session/#Session.getOperationTime',
              description:
                'Returns the timestamp of the last acknowledged operation for the session.',
            },
            getOptions: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session/#Session.getOptions',
              description: 'Returns the options object passed to startSession',
            },
            startTransaction: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session.startTransaction/#Session.startTransaction',
              description:
                'Starts a multi-document transaction for the session.',
            },
            commitTransaction: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session.commitTransaction/#Session.commitTransaction',
              description: 'Commits the session’s transaction.',
            },
            abortTransaction: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session.abortTransaction/#Session.abortTransaction',
              description: 'Aborts the session’s transaction.',
            },
            withTransaction: {
              link: 'https://mongodb.com/docs/manual/reference/method/Session.abortTransaction/#Session.withTransaction',
              description: 'Run a function within a transaction context.',
              example:
                'session.withTransaction(() => { session.getDatabase("test").test.insertOne({ doc: 1 }); })',
            },
            advanceClusterTime: {
              description:
                'Advances the clusterTime for a Session to the provided clusterTime.',
            },
          },
        },
      },
      Mongo: {
        help: {
          description: 'The Mongo Class. Represents a connection to a server',
          link: 'https://mongodb.com/docs/manual/reference/method/Mongo/#Mongo',
          attributes: {
            watch: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.watch',
              description: 'Opens a change stream cursor on the connection',
              example: 'const cursor = db.getMongo().watch(pipeline, options)',
            },
            startSession: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.startSession/',
              description: 'Starts a session for the connection.',
            },
            bulkWrite: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.bulkWrite',
              description:
                'Performs multiple write operations across databases and collections with controls for order of execution.',
              example: 'db.getMongo().bulkWrite(operations, options)',
            },
            getCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getCollection',
              description:
                'Returns the specified Collection of the Mongo object.',
              example:
                'const collection = db.getMongo().getCollection("databaseName.collectionName")',
            },
            getDB: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getDB',
              description:
                'Returns the specified Database of the Mongo object.',
            },
            getDBs: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getDBs',
              description:
                'Returns information about all databases. Uses the listDatabases command.',
            },
            getDBNames: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getDBs',
              description:
                'Returns an array of all database names. Uses the listDatabases command.',
              example:
                'db.getMongo().getDBNames().map(name => db.getSiblingDB(name).getCollectionNames())',
            },
            getURI: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getURI',
              description: 'Returns the connection string for current session',
            },
            connect: {
              link: 'https://mongodb.com/docs/manual/reference/method/connect',
              description:
                'Creates a connection to a MongoDB instance and returns the reference to the database.',
            },
            close: {
              description:
                'Closes a Mongo object, disposing of related resources and closing the underlying connection.',
            },
            getReadConcern: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getReadConcern',
              description: 'Returns the ReadConcern set for the connection.',
              example: 'db.getMongo().getReadConcern()',
            },
            getWriteConcern: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getWriteConcern',
              description: 'Returns the WriteConcern set for the connection.',
              example: 'db.getMongo().getWriteConcern()',
            },
            getReadPref: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getReadPref',
              description: 'Returns the ReadPreference set for the connection.',
              example: 'db.getMongo().getReadPref()',
            },
            getReadPrefMode: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getReadPrefMode',
              description:
                'Returns the ReadPreference Mode set for the connection.',
              example: 'db.getMongo().getReadPrefMode()',
            },
            getReadPrefTagSet: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.getReadPrefTagSet',
              description:
                'Returns the ReadPreference TagSet set for the connection.',
              example: 'db.getMongo().getReadPrefTagSet()',
            },
            setReadPref: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.setReadPref',
              description: 'Sets the ReadPreference for the connection',
              example: 'db.getMongo().setReadPref(mode, tagSets, hedgeOptions)',
            },
            setReadConcern: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.setReadConcern',
              description: 'Sets the ReadConcern for the connection',
              example: 'db.getMongo().setReadConcern(level)',
            },
            setWriteConcern: {
              link: 'https://mongodb.com/docs/manual/reference/method/Mongo.setWriteConcern',
              description: 'Sets the WriteConcern for the connection',
              example: "db.getMongo().setWriteConcern('majority')",
            },
            setCausalConsistency: {
              description:
                'This method is deprecated. It is not possible to set causal consistency for an entire connection due to driver limitations, use startSession({causalConsistency: <>}) instead.',
            },
            setSlaveOk: {
              description: 'This method is deprecated',
            },
            setSecondaryOk: {
              description:
                'This method is deprecated. Use .setReadPref() instead',
            },
            isCausalConsistency: {
              description:
                'This method is deprecated. Causal consistency for drivers is set via Mongo.startSession and can be checked via session.getOptions. The default value is true',
            },
            getKeyVault: {
              description:
                'Returns the KeyVault object for the current database connection. The KeyVault object supports data encryption key management for Client-side field level encryption.',
              link: 'https://mongodb.com/docs/manual/reference/method/getKeyVault/#getKeyVault',
            },
            getClientEncryption: {
              description:
                'Returns the ClientEncryption object for the current database collection. The ClientEncryption object supports explicit (manual) encryption and decryption of field values for Client-Side field level encryption.',
              link: 'https://mongodb.com/docs/manual/reference/method/getClientEncryption/#getClientEncryption',
            },
            convertShardKeyToHashed: {
              description:
                'Returns the hashed value for the input using the same hashing function as a hashed index.',
              link: 'https://www.mongodb.com/docs/manual/reference/method/convertShardKeyToHashed/',
            },
          },
        },
      },
      DBRef: {
        help: {
          description: 'The DBRef BSON Class.',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/DBRef.html',
          example:
            'new DBRef(namespace: string, oid: ObjectId, db: string [optional])',
        },
        attributes: {},
      },
      MaxKey: {
        help: {
          description: 'The MaxKey BSON Class.',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/MaxKey.html',
          example: 'new MaxKey()',
        },
        attributes: {},
      },
      MinKey: {
        help: {
          description: 'The MinKey BSON Class',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/MinKey.html',
          example: 'new MinKey()',
        },
        attributes: {},
      },
      ObjectId: {
        help: {
          description: 'The ObjectId BSON Class',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/ObjectID.html',
          example: 'new ObjectId(id: string|number [optional])',
        },
        attributes: {},
      },
      BSONSymbol: {
        help: {
          description:
            'The Symbol BSON Class. Deprecated since server version 1.6',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Symbol.html',
          example: 'new BSONSymbol("abc")',
        },
        attributes: {},
      },
      Timestamp: {
        help: {
          description: 'The Timestamp BSON Class',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Timestamp.html',
          example:
            'new Timestamp(low: signed 32 bit number, high: signed 32 bit number)',
        },
        attributes: {},
      },
      Code: {
        help: {
          description: 'The Code BSON Class',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Code.html',
          example: 'new Code("x", { x: 1 } [optional])',
        },
        attributes: {},
      },
      NumberDecimal: {
        help: {
          description:
            'A helper method that constructs a Decimal128 BSON Class from a string',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Decimal128.html',
          example: 'NumberDecimal("1.23423423")',
        },
      },
      Decimal128: {
        help: {
          description:
            'The Decimal128 BSON Class. Takes a Buffer as an argument.',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Decimal128.html',
        },
        attributes: {},
      },
      NumberInt: {
        help: {
          description:
            'A helper method that constructs an Int32 BSON Class from a string',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Int32.html',
          example: 'NumberInt("123")',
        },
      },
      Int32: {
        help: {
          description: 'The 32-bit Integer BSON Class',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Int32.html',
          example: 'new Int32(123)',
        },
        attributes: {},
      },
      Long: {
        help: {
          description: 'The Long BSON Class',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Long.html',
          example:
            'new Long(low: signed 32 bit number, high: signed 32 bit number)',
        },
        attributes: {},
      },
      Double: {
        help: {
          description: 'The Double BSON Class.',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Long.html',
          example: 'new Double(123)',
        },
        attributes: {},
      },
      NumberLong: {
        help: {
          description:
            'A helper method that constructs a Long BSON Class from a string',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Long.html',
          example: 'NumberLong("123")',
        },
      },
      Date: {
        help: {
          description: 'The Date Class',
        },
      },
      ISODate: {
        help: {
          description: 'Helper method for creating dates using ISO',
        },
      },
      BinData: {
        help: {
          description: 'A helper method that constructs a Binary BSON Class.',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Binary.html',
          example: 'BinData(subtype: number, base64string)',
        },
      },
      Binary: {
        help: {
          description:
            'The Binary BSON Class that takes in (Buffer, subtype: number) as arguments.',
          link: 'https://mongodb.github.io/node-mongodb-native/3.6/api/Binary.html',
        },
        attributes: {
          SUBTYPE_BYTE_ARRAY: {
            description: 'The byte array BSON type',
          },
          SUBTYPE_DEFAULT: {
            description: 'The default BSON type',
          },
          SUBTYPE_FUNCTION: {
            description: 'The function BSON type',
          },
          SUBTYPE_MD5: {
            description: 'The MD5 BSON type',
          },
          SUBTYPE_USER_DEFINED: {
            description: 'The user BSON type',
          },
          SUBTYPE_UUID: {
            description: 'The UUID BSON type',
          },
          SUBTYPE_UUID_OLD: {
            description: 'The Old UUID BSON type',
          },
        },
      },
      HexData: {
        help: {
          description:
            'Helper method to create BinData. Accepts subtype hex string',
          example: 'HexData(0, "0123456789abcdef")',
        },
      },
      UUID: {
        help: {
          description:
            'Helper method to create BinData with subtype UUID. Accepts hex string (with optional dashes)',
          example: 'UUID("01234567-89ab-cdef-0123-456789abcdef")',
        },
      },
      MD5: {
        help: {
          description:
            'Helper method to create BinData with subtype MD5. Accepts hex string',
          example: 'MD5("0123456789abcdef0123456789abcdef")',
        },
      },
      bsonsize: {
        help: {
          description: 'Helper method to calculate BSON object size',
          example: 'bsonsize({ foo: "bar" })',
        },
      },
      Map: {
        help: {
          description: 'BSON Map',
        },
      },
      Bulk: {
        help: {
          link: 'https://mongodb.com/docs/manual/reference/method/Bulk',
          description:
            'Bulk operations builder used to construct a list of write operations to perform in bulk for a single collection. To instantiate the builder, use either the db.collection.initializeOrderedBulkOp() or the db.collection.initializeUnorderedBulkOp() method.',
          attributes: {
            insert: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.insert/',
              description: 'Adds an insert to the bulk operation.',
              example: 'db.insert(<document>)',
            },
            execute: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.execute/',
              description: 'Executes the bulk operation.',
              example: 'bulkOp.execute()',
            },
            find: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find/',
              description: 'Adds a find to the bulk operation.',
              example: 'bulkOp.find(<filter>)',
            },
            getOperations: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.getOperations/',
              description: 'Returns the batches executed by the bulk write.',
              example: 'bulkOp.getOperations()',
            },
            tojson: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.tojson/',
              description:
                'Returns a JSON document that contains the number of operations and batches in the Bulk() object.',
              example: 'bulkOp.tojson()',
            },
            toString: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.toString/',
              description:
                'Returns as a string a JSON document that contains the number of operations and batches in the Bulk() object.',
              example: 'bulkOp.toString()',
            },
          },
        },
      },
      BulkFindOp: {
        help: {
          link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find',
          description: 'Bulk operations builder returned after Bulk.find()',
          attributes: {
            arrayFilters: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.arrayFilters/',
              description: 'Adds an arrayFilter to the bulk operation.',
              example: 'bulkOp.find(...).arrayFilters(<array of filters)',
            },
            hint: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.hint/',
              description: 'Adds an hint to the bulk operation.',
              example: 'bulkOp.find(...).hint(<hintd document>)',
            },
            collation: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.collation/',
              description: 'Adds collation options to the bulk operation.',
              example: 'bulkOp.find(...).collation(<collation doc>)',
            },
            remove: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.remove/',
              description: 'Adds an remove to the bulk operation.',
              example: 'bulkOp.find(...).remove()',
            },
            removeOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.removeOne/',
              description: 'Adds an removeOne to the bulk operation.',
              example: 'bulkOp.find(...).removeOne()',
            },
            delete: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.delete/',
              description: 'Adds an delete to the bulk operation.',
              example: 'bulkOp.find(...).delete()',
            },
            deleteOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.deleteOne/',
              description: 'Adds an deleteOne to the bulk operation.',
              example: 'bulkOp.find(...).deleteOne()',
            },
            replaceOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.replaceOne/',
              description: 'Adds an replaceOne to the bulk operation.',
              example: 'bulkOp.find(...).replaceOne(<document>)',
            },
            updateOne: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.updateOne/',
              description: 'Adds an updateOne to the bulk operation.',
              example: 'bulkOp.find(...).updateOne(<document>)',
            },
            update: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.update/',
              description: 'Adds an update to the bulk operation.',
              example: 'bulkOp.find(...).update(<document>)',
            },
            upsert: {
              link: 'https://mongodb.com/docs/manual/reference/method/Bulk.find.upsert/',
              description:
                'Adds an upsert to the bulk operation updates for this find(...).',
              example: 'bulkOp.find(...).upsert()',
            },
          },
        },
      },
      PlanCache: {
        help: {
          link: 'https://mongodb.com/docs/manual/reference/method/js-plan-cache/',
          description:
            'An interface to access the query plan cache object and associated PlanCache methods for a collection.',
          attributes: {
            clear: {
              link: 'https://mongodb.com/docs/manual/reference/method/PlanCache.clear',
              description: 'Removes cached query plan(s) for a collection.',
              example: 'db.coll.getPlanCache().clear()',
            },
            clearPlansByQuery: {
              link: 'https://mongodb.com/docs/manual/reference/method/PlanCache.clearPlansByQuery',
              description:
                'Removes cached query plan(s) for a collection of the specified query shape.',
              example:
                'db.coll.getPlanCache().clearPlansByQuery(<query>, <projection?>, <sort?>)',
            },
            list: {
              link: 'https://mongodb.com/docs/manual/reference/method/PlanCache.list',
              description: 'Lists cached query plan(s) for a collection.',
              example: 'db.coll.getPlanCache().list(<pipeline>)',
            },
            getPlansByQuery: {
              description: 'Deprecated. Please use PlanCache.list instead',
            },
            listQueryShapes: {
              description: 'Deprecated. Please use PlanCache.list instead',
            },
          },
        },
      },
      Document: {
        help: {
          link: 'https://mongodb.com/docs/manual/core/document/',
          description: 'A generic MongoDB document, without any methods.',
          attributes: {},
        },
      },
      KeyVault: {
        help: {
          link: 'https://mongodb.com/docs/manual/core/security-client-side-encryption/',
          description:
            'The key vault object for the current MongoDB connection',
          attributes: {
            createKey: {
              description:
                'Creates a data encryption key for use with client-side field level encryption.',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.createKey/#KeyVault.createKey',
            },
            deleteKey: {
              description:
                'Deletes the specified data encryption key from the key vault.',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.deleteKey/#KeyVault.deleteKey',
            },
            getKey: {
              description:
                'Retreives the specified data encryption key from the key vault.',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.getKey/#KeyVault.getKey',
            },
            getKeys: {
              description: 'Retrieves all keys in the key vault.',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.getKeys/#KeyVault.getKeys',
            },
            addKeyAlternateName: {
              description:
                'Associates a key alternative name to the specified data encryption key.',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.addKeyAlternateName/#KeyVault.addKeyAlternateName',
            },
            removeKeyAlternateName: {
              description:
                'Removes a key alternative name from the specified data encryption key.',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.removeKeyAlternateName/#KeyVault.removeKeyAlternateName',
            },
            getKeyByAltName: {
              description:
                'Retrieves keys with the specified key alternative name.',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.getKeyByAltName/#KeyVault.getKeyByAltName',
            },
            rewrapManyDataKey: {
              description:
                'Re-wrap one, more, or all data keys with another KMS provider, or re-wrap using the same one.',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.rewrapManyDataKey/#KeyVault.rewrapManyDataKey',
            },
            createDataKey: {
              description: 'Alias of KeyVault.createKey()',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.createKey/#KeyVault.createKey',
            },
            removeKeyAltName: {
              description: 'Alias of KeyVault.removeKeyAlternateName()',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.removeKeyAlternateName/#KeyVault.removeKeyAlternateName',
            },
            addKeyAltName: {
              description: 'Alias of KeyVault.addKeyAlternateName()',
              link: 'https://mongodb.com/docs/manual/reference/method/KeyVault.addKeyAlternateName/#KeyVault.addKeyAlternateName',
            },
          },
        },
      },
      ClientEncryption: {
        help: {
          link: 'https://mongodb.com/docs/manual/core/security-client-side-encryption/',
          description:
            'The ClientEncryption object for the current database collection.',
          attributes: {
            encrypt: {
              link: 'https://mongodb.com/docs/manual/reference/method/ClientEncryption.encrypt/#ClientEncryption.encrypt',
              description:
                'Encrypts the value using the specified encryptionKeyId and encryptionAlgorithm. encrypt supports explicit (manual) encryption of field values.',
            },
            encryptExpression: {
              link: 'https://mongodb.com/docs/manual/reference/method/ClientEncryption.encrypt/#ClientEncryption.encryptExpression',
              description:
                'Encrypts an MQL expression using the specified encryptionKeyId and encryptionAlgorithm.',
            },
            decrypt: {
              link: 'https://mongodb.com/docs/manual/reference/method/ClientEncryption.decrypt/#ClientEncryption.decrypt',
              description:
                'decrypts the encryptionValue if the current database connection was configured with access to the Key Management Service (KMS) and key vault used to encrypt encryptionValue.',
            },
            createEncryptedCollection: {
              link: 'https://mongodb.com/docs/manual/reference/method/ClientEncryption.createEncryptedCollection/#ClientEncryption.createEncryptedCollection',
              description:
                'Creates a new collection with a list of encrypted fields each with unique and auto-created data encryption keys (DEKs). This method should be invoked on a connection instantiated with queryable encryption options.',
              example:
                'db.getMongo().getClientEncryption().createEncryptedCollection( "dbName", "collName", { "provider": "<kmsProvider>", "createCollectionOptions": { "encryptedFields": { ... }, ...<otherOptions> } })',
            },
          },
        },
      },
      Streams: {
        help: {
          description: 'Streams',
          attributes: {
            process: {
              description:
                'Allows a user to process streams of data in the shell interactively and quickly iterate building a stream processor as they go.',
            },
            createStreamProcessor: {
              description: 'Create a named stream processor.',
            },
            getProcessor: {
              description: 'Get a stream processor with specified name.',
            },
            listStreamProcessors: {
              description: 'Show a list of all the named stream processors.',
            },
            listConnections: {
              description:
                'Show a list of all the named connections for this instance from the Connection Registry.',
            },
          },
        },
      },
      StreamProcessor: {
        help: {
          description: 'Stream processor',
          attributes: {
            start: {
              description: 'Start a named stream processor.',
            },
            stop: {
              description: 'Stop a named stream processor.',
            },
            drop: {
              description: 'Drop a named stream processor.',
            },
            sample: {
              description:
                'Return a sample of the results from a named stream processor.',
            },
            stats: {
              description:
                'Return stats captured from a named stream processor.',
            },
            modify: {
              description: 'Modify a stream processor definition.',
            },
          },
        },
      },
    },
  },
  'transport-browser': {
    'stitch-browser-transport': {
      'auth-error': 'Error authenticating with Stitch.',
    },
  },
  'transport-core': {
    'stitch-transport': {
      'not-implemented': 'is not implemented in the Stitch SDK',
      'agg-on-db': 'Aggregations run on the database is not allowed via Stitch',
    },
  },
  'transport-server': {},
};

export default translations;

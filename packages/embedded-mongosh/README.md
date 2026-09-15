# @0q/mongosh

[mongosh](https://github.com/mongodb-js/mongosh) with an embedded MongoDB engine. No server,
no port: a directory is the database.

```sh
npx @0q/mongosh mongodb_embedded://./data
```

![mongosh opening a data directory in-process, inserting and querying, and the directory afterwards](https://raw.githubusercontent.com/jeroenvervaeke/mongosh/feat/embedded-mongodb/packages/embedded-mongosh/demo.gif)

Everything else is mongosh: `show dbs`, `db.movies.find()`, aggregations, the REPL, `--eval`,
scripts. The directory is MongoDB's own on-disk format, created on first use, and the engine
runs inside the shell's process through
[`@0q/embedded-mongodb`](https://www.npmjs.com/package/@0q/embedded-mongodb).

Both spellings of the scheme work, `mongodb_embedded://` and `mongodb+embedded://`; plain
`mongodb://` addresses connect to a server as usual. Linux x64, Linux arm64 and macOS arm64.

This is a build of a [fork of mongosh](https://github.com/jeroenvervaeke/mongosh), not a
MongoDB release. The Kerberos and field-level-encryption addons are not included.

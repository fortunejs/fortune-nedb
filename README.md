# Fortune NeDB Adapter

[![Build Status](https://img.shields.io/travis/fortunejs/fortune-nedb/master.svg?style=flat-square)](https://travis-ci.org/fortunejs/fortune-nedb)
[![npm Version](https://img.shields.io/npm/v/fortune-nedb.svg?style=flat-square)](https://www.npmjs.com/package/fortune-nedb)
[![License](https://img.shields.io/npm/l/fortune-nedb.svg?style=flat-square)](https://raw.githubusercontent.com/fortunejs/fortune-nedb/master/LICENSE)

This is a [NeDB](https://github.com/louischatriot/nedb) adapter for [Fortune](http://fortunejs.com).


## Usage

Install the `fortune-nedb` package from `npm`:

```
$ npm install fortune-nedb
```

Then use it with Fortune:

```js
const fortune = require('fortune')
const nedbAdapter = require('fortune-nedb')

const store = fortune({
  adapter: { type: nedbAdapter }
})
```


## Options

All of the options are enumerated [here](https://github.com/louischatriot/nedb). Here are additional adapter-specific options:

- `dbPath`: Path to a directory where the database is persisted to disk. Optional.

Note that the `filename` option has no effect, since Fortune.js determines filenames based on type name.

Another adapter-specific option is the `query` object in the `find` method, this allows for arbitrary queries.


## License

This software is licensed under the [MIT License](//github.com/fortunejs/fortune-nedb/blob/master/LICENSE).

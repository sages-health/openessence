Any .js files in this directory are assumed to be elasticsearch index settings files.
The name of the file is the name of the resulting alias. For example, a file named
`foo.js` would give settings for alias `foo`.

Here's an example `foo.js` file:
```
exports.index = {
  mappings: {
    ...
  },
  analysis: {
    ...
  }
};

// SQL to run to get records for reindexing. Defaults to SELECT * FROM exports.table
exports.reIndexSql = 'SELECT * FROM foo';

exports.table = 'foo';
exports.type = 'visit';

// PostgreSQL NOTIFY channels to LISTEN on for changes to data.
exports.channels = ['foo_insert', 'foo_update', 'foo_delete', 'foo_truncate'];
```

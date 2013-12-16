'use strict';

/**
 * Lock implementations.
 *
 * Right now, only PostgreSQL advisory locks are implemented. In
 * the future, we may implement file locking for single nodes and ZooKeeper/etcd for
 * distributed locking.
 */
module.exports = require('./pglock');

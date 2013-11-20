'use strict';

var Sequelize = require('sequelize');

module.exports = function (sequelize) {
  return sequelize.define('User', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false
    }
  }, {
    tableName: 'user',
    instanceMethods: {
      /**
       *
       * @param password plaintext password, i.e. not hashed
       * @param callback passed error and boolean result of comparison
       */
      comparePassword: function (password, callback) {
        var bcrypt = require('bcrypt');
        bcrypt.compare(password, this.password, callback);
      }
    }
  });
};

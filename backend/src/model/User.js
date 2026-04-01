'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  fullName: { type: DataTypes.STRING(255), allowNull: false, field: 'full_name' },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  phone: { type: DataTypes.STRING(20) },
  pin: { type: DataTypes.STRING(10) },
  password: { type: DataTypes.STRING(255), allowNull: false },
}, {
  tableName: 'profiles',
  timestamps: false,
});

module.exports = User;

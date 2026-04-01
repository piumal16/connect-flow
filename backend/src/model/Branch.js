'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Branch = sequelize.define('Branch', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  address: { type: DataTypes.STRING(255) },
  phone: { type: DataTypes.STRING(20) },
  managerId: { type: DataTypes.CHAR(36), field: 'manager_id' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
}, {
  tableName: 'branches',
  timestamps: false,
});

module.exports = Branch;

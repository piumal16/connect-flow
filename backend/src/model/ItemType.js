'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemType = sequelize.define('ItemType', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(500) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdBy: { type: DataTypes.CHAR(36), field: 'created_by' },
}, {
  tableName: 'item_types',
  timestamps: false,
});

module.exports = ItemType;

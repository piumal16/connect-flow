'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLogEntry = sequelize.define('ActivityLogEntry', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.CHAR(36), field: 'user_id' },
  action: { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  metadata: { type: DataTypes.TEXT('long') },
}, {
  tableName: 'activity_log_entries',
  timestamps: false,
});

module.exports = ActivityLogEntry;

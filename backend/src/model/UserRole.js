'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserRole = sequelize.define('UserRole', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.CHAR(36), field: 'user_id' },
  role: {
    type: DataTypes.ENUM('SUPERADMIN', 'ADMIN', 'MANAGER', 'STAFF'),
    allowNull: false,
  },
  branchId: { type: DataTypes.CHAR(36), field: 'branch_id' },
}, {
  tableName: 'user_roles',
  timestamps: false,
});

module.exports = UserRole;

'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  fullName: { type: DataTypes.STRING(255), allowNull: false, field: 'full_name' },
  nic: { type: DataTypes.STRING(50), unique: true },
  phone: { type: DataTypes.STRING(20) },
  address: { type: DataTypes.TEXT },
  gender: { type: DataTypes.STRING(20) },
  customerType: { type: DataTypes.STRING(50), field: 'customer_type' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
}, {
  tableName: 'customers',
  timestamps: false,
});

module.exports = Customer;

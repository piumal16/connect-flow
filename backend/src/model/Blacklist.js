'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Blacklist = sequelize.define('Blacklist', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  customerName: { type: DataTypes.STRING(255), field: 'customer_name' },
  customerNic: { type: DataTypes.STRING(50), field: 'customer_nic' },
  reason: { type: DataTypes.TEXT },
  policeReportNumber: { type: DataTypes.STRING(100), field: 'police_report_number' },
  policeReportDate: { type: DataTypes.DATEONLY, field: 'police_report_date' },
  branchId: { type: DataTypes.CHAR(36), field: 'branch_id' },
  addedBy: { type: DataTypes.CHAR(36), field: 'added_by' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
}, {
  tableName: 'blacklist',
  timestamps: false,
});

module.exports = Blacklist;

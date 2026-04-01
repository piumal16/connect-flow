'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TransactionProfit = sequelize.define('TransactionProfit', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  transactionId: { type: DataTypes.CHAR(36), field: 'transaction_id' },
  profitAmount: { type: DataTypes.DECIMAL(18, 2), field: 'profit_amount' },
  pawnId: { type: DataTypes.STRING, field: 'pawn_id' },
  profitNotes: { type: DataTypes.TEXT, field: 'profit_notes' },
  profitRecordedDate: { type: DataTypes.DATE, field: 'profit_recorded_date' },
  profitRecordedBy: { type: DataTypes.CHAR(36), field: 'profit_recorded_by' },
}, {
  tableName: 'transaction_profits',
  timestamps: false,
});

module.exports = TransactionProfit;

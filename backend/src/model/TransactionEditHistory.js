'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TransactionEditHistory = sequelize.define('TransactionEditHistory', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  transactionId: { type: DataTypes.CHAR(36), field: 'transaction_id' },
  pawnId: { type: DataTypes.STRING, field: 'pawn_id' },
  editedBy: { type: DataTypes.CHAR(36), field: 'edited_by' },
  editedByName: { type: DataTypes.STRING, field: 'edited_by_name' },
  editType: { type: DataTypes.STRING(50), field: 'edit_type' },
  previousStatus: { type: DataTypes.STRING(50), field: 'previous_status' },
  newStatus: { type: DataTypes.STRING(50), field: 'new_status' },
  previousLoanAmount: { type: DataTypes.DECIMAL(18, 2), field: 'previous_loan_amount' },
  newLoanAmount: { type: DataTypes.DECIMAL(18, 2), field: 'new_loan_amount' },
  previousRemarks: { type: DataTypes.TEXT, field: 'previous_remarks' },
  newRemarks: { type: DataTypes.TEXT, field: 'new_remarks' },
  previousPhone: { type: DataTypes.STRING, field: 'previous_phone' },
  newPhone: { type: DataTypes.STRING, field: 'new_phone' },
  editReason: { type: DataTypes.TEXT, field: 'edit_reason' },
}, {
  tableName: 'transaction_edit_history',
  timestamps: false,
});

module.exports = TransactionEditHistory;

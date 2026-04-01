'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PawnTransaction = sequelize.define('PawnTransaction', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  pawnId: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'pawn_id' },
  branchId: { type: DataTypes.CHAR(36), field: 'branch_id' },
  customerId: { type: DataTypes.CHAR(36), field: 'customer_id' },
  idType: { type: DataTypes.STRING, defaultValue: 'NIC', field: 'id_type' },
  patternMode: { type: DataTypes.STRING(1), defaultValue: 'A', field: 'pattern_mode' },
  loanAmount: { type: DataTypes.DECIMAL(18, 2), field: 'loan_amount' },
  remainingBalance: { type: DataTypes.DECIMAL(18, 2), field: 'remaining_balance' },
  interestRateId: { type: DataTypes.CHAR(36), field: 'interest_rate_id' },
  interestRatePercent: { type: DataTypes.DECIMAL(5, 2), field: 'interest_rate_percent' },
  firstMonthInterestRatePercent: { type: DataTypes.DECIMAL(5, 2), field: 'first_month_interest_rate_percent' },
  periodMonths: { type: DataTypes.INTEGER, defaultValue: 6, field: 'period_months' },
  pawnDate: { type: DataTypes.DATEONLY, field: 'pawn_date' },
  maturityDate: { type: DataTypes.DATEONLY, field: 'maturity_date' },
  lastRedemptionDate: { type: DataTypes.DATEONLY, field: 'last_redemption_date' },
  status: { type: DataTypes.STRING(50), defaultValue: 'Active' },
  remarks: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.CHAR(36), field: 'created_by' },
}, {
  tableName: 'pawn_transactions',
  timestamps: false,
});

module.exports = PawnTransaction;

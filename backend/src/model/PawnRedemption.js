'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PawnRedemption = sequelize.define('PawnRedemption', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  transactionId: { type: DataTypes.CHAR(36), allowNull: false, field: 'transaction_id' },
  pawnId: { type: DataTypes.STRING, field: 'pawn_id' },
  redemptionAmount: { type: DataTypes.DECIMAL(12, 2), field: 'redemption_amount' },
  principalPaid: { type: DataTypes.DECIMAL(12, 2), field: 'principal_paid' },
  interestPaid: { type: DataTypes.DECIMAL(12, 2), field: 'interest_paid' },
  chargesPaid: { type: DataTypes.DECIMAL(12, 2), field: 'charges_paid' },
  remainingPrincipal: { type: DataTypes.DECIMAL(12, 2), field: 'remaining_principal' },
  remainingInterest: { type: DataTypes.DECIMAL(12, 2), field: 'remaining_interest' },
  isFullRedemption: { type: DataTypes.BOOLEAN, field: 'is_full_redemption' },
  redemptionType: { type: DataTypes.STRING, field: 'redemption_type' },
  paidBy: { type: DataTypes.CHAR(36), field: 'paid_by' },
  paidByName: { type: DataTypes.STRING, field: 'paid_by_name' },
  notes: { type: DataTypes.STRING(1000) },
}, {
  tableName: 'pawn_redemptions',
  timestamps: false,
});

module.exports = PawnRedemption;

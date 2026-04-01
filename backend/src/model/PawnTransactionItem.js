'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PawnTransactionItem = sequelize.define('PawnTransactionItem', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  transactionId: { type: DataTypes.CHAR(36), allowNull: false, field: 'transaction_id' },
  itemDescription: { type: DataTypes.TEXT, field: 'item_description' },
  itemContent: { type: DataTypes.STRING(255), field: 'item_content' },
  itemCondition: { type: DataTypes.STRING(50), field: 'item_condition' },
  weightGrams: { type: DataTypes.DECIMAL(10, 2), field: 'weight_grams' },
  karat: { type: DataTypes.STRING(10) },
  appraisedValue: { type: DataTypes.DECIMAL(18, 2), field: 'appraised_value' },
  marketValue: { type: DataTypes.DECIMAL(18, 2), field: 'market_value' },
  itemOrder: { type: DataTypes.INTEGER, field: 'item_order' },
}, {
  tableName: 'pawn_transaction_items',
  timestamps: false,
});

module.exports = PawnTransactionItem;

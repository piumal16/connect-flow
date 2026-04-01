'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PawnTransactionItemImage = sequelize.define('PawnTransactionItemImage', {
  id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  itemId: { type: DataTypes.CHAR(36), allowNull: false, field: 'item_id' },
  transactionId: { type: DataTypes.CHAR(36), field: 'transaction_id' },
  imageUrl: { type: DataTypes.TEXT('long'), field: 'image_url' },
  imageOrder: { type: DataTypes.INTEGER, field: 'image_order' },
}, {
  tableName: 'pawn_transaction_item_images',
  timestamps: false,
});

module.exports = PawnTransactionItemImage;

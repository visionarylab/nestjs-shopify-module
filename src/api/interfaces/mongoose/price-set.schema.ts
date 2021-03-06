import { Schema, Document } from 'mongoose';
import { Interfaces } from 'shopify-admin-api';

export type PriceSetDocument = Interfaces.TaxLine & Document;

export const PriceSetSchema = new Schema({
  shop_money: {
    amount: String,
    currency_code: String,
  },
  presentment_money: {
    amount: String,
    currency_code: String,
  }
}, {
  _id: false,
  minimize: false,
});
import { Options } from 'shopify-admin-api';
import { ISyncOptions } from './sync';
import { IAppListSortOptions, IAppListFilterOptions } from './basic';

/**
 * Product options to get a list of products from shopify
 */
export interface IShopifySyncProductListOptions extends Options.ProductListOptions, ISyncOptions {}
export interface IShopifySyncProductGetOptions extends Options.ProductGetOptions, ISyncOptions {}
export interface IShopifySyncProductCountOptions extends Options.ProductCountOptions {}

/**
 * Product options to get a list of products from the app
 */
export interface IAppProductListOptions extends Options.ProductListOptions, IAppListSortOptions, IAppListFilterOptions {
  price_max?: number;
  price_min?: number;
}
export interface IAppProductGetOptions extends Options.ProductGetOptions {}
export interface IAppProductCountOptions extends Options.ProductCountOptions {}
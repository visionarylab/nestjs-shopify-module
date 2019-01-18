import { ISyncOptions } from './options';
import { Options } from 'shopify-prime';
export interface ChildList<ShopifyObjectType, ListOptions extends ISyncOptions & Options.BasicListOptions = ISyncOptions & Options.BasicListOptions> {
  list(parentId: number, options: ListOptions): Promise<ShopifyObjectType[]>;
}
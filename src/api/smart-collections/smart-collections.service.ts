import { Inject, Injectable } from '@nestjs/common';
import { SmartCollections, Options } from 'shopify-prime'; // https://github.com/nozzlegear/Shopify-Prime
import { SmartCollection } from 'shopify-prime/models';
import { IShopifyConnect } from '../../auth/interfaces/connect';
import { SmartCollectionDocument, IListAllCallbackData, SmartCollectionListOptions, SmartCollectionCountOptions, SmartCollectionGetOptions } from '../interfaces';
import { SyncProgressDocument, SubSyncProgressDocument, ISyncOptions, ShopifyModuleOptions } from '../../interfaces';
import { Model } from 'mongoose';
import { EventService } from '../../event.service';
import { ShopifyApiRootCountableService } from '../shopify-api-root-countable.service';
import { ElasticsearchService } from '../../elasticsearch.service';

@Injectable()
export class SmartCollectionsService extends ShopifyApiRootCountableService<
SmartCollection, // ShopifyObjectType
SmartCollections, // ShopifyModelClass
SmartCollectionCountOptions, // CountOptions
SmartCollectionGetOptions, // GetOptions
SmartCollectionListOptions, // ListOptions
SmartCollectionDocument // DatabaseDocumentType
> {

  resourceName = 'smartCollections';
  subResourceNames = [];

  constructor(
    protected readonly esService: ElasticsearchService,
    @Inject('SmartCollectionModelToken')
    private readonly smartCollectionModel: (shopName: string) => Model<SmartCollectionDocument>,
    @Inject('SyncProgressModelToken')
    private readonly syncProgressModel: Model<SyncProgressDocument>,
    private readonly eventService: EventService,
  ) {
    super(esService, smartCollectionModel, SmartCollections, eventService, syncProgressModel);
  }

  /**
   * 
   * @param shopifyConnect 
   * @param subProgress 
   * @param options 
   * @param data 
   */
  async syncedDataCallback(shopifyConnect: IShopifyConnect, subProgress: SubSyncProgressDocument, options: ISyncOptions, data: IListAllCallbackData<SmartCollection>) {
    const products = data.data;
    subProgress.syncedCount += products.length;
    const lastProduct = products[products.length-1];
    subProgress.lastId = lastProduct.id;
    subProgress.info = lastProduct.title;
  }
}

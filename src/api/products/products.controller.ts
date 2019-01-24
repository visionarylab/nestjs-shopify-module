import {
  Controller,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Get,
  Put,
  Post,
  Delete,
  HttpStatus,
  Header,
  Body,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { DebugService } from '../../debug.service';

import { ShopifyApiGuard } from '../../guards/shopify-api.guard';
import { Roles } from '../../guards/roles.decorator';
import { IUserRequest } from '../../interfaces';
import {
  IShopifySyncProductCountOptions,
  IShopifySyncProductGetOptions,
  IShopifySyncProductListOptions,
  IAppProductCountOptions,
  IAppProductGetOptions,
  IAppProductListOptions,
} from '../interfaces';
import { Response } from 'express';
import { ProductUpdateCreate } from 'shopify-prime/models';

@Controller('shopify/api/products')
export class ProductsController {
  constructor(
    protected readonly productsService: ProductsService,
  ) {}
  logger = new DebugService(`shopify:${this.constructor.name}`);

  /**
   * Retrieves a list of products directly from shopify.
   * @param req
   * @param res
   * @param options
   *
   * @see https://help.shopify.com/en/api/reference/products/product#index
   */
  @UseGuards(ShopifyApiGuard)
  @Roles() // Allowed from shop frontend
  @Get()
  async listFromShopify(
    @Req() req: IUserRequest,
    @Res() res: Response,
    @Query('collection_id') collection_id?: string,
    @Query('created_at_max') created_at_max?: string,
    @Query('created_at_min') created_at_min?: string,
    @Query('ids') ids?: string,
    @Query('page') page?: number,
    @Query('fields') fields?: string,
    @Query('limit') limit?: number,
    @Query('product_type') product_type?: string,
    @Query('published_at_max') published_at_max?: string,
    @Query('published_at_min') published_at_min?: string | undefined,
    @Query('published_status') published_status?: 'published' | 'unpublished' | 'any',
    @Query('since_id') since_id?: number,
    @Query('sync_to_db') sync_to_db?: boolean,
    @Query('sync_to_search') sync_to_search?: boolean,
    @Query('title') title?: string,
    @Query('updated_at_max') updated_at_max?: string,
    @Query('updated_at_min') updated_at_min?: string,
    @Query('vendor') vendor?: string,
  ) {
    if (req.session.isThemeClientRequest) {
      published_status = 'published'; // For security reasons, only return public products if the request comes not from a logged in user
      sync_to_db = false;
      sync_to_search = false;
    }
    const options: IShopifySyncProductListOptions = {
      collection_id,
      created_at_max,
      created_at_min,
      ids,
      page,
      fields,
      limit,
      product_type,
      published_at_max,
      published_at_min,
      published_status,
      since_id,
      syncToDb: sync_to_db,
      syncToSearch: sync_to_search,
      title,
      updated_at_max,
      updated_at_min,
      vendor,
    };
    this.logger.debug('[listFromShopify] ShopifySyncProductListOptions', options);
    return this.productsService.listFromShopify(req.shopifyConnect, options)
    .then((products) => {
      this.logger.debug('[listFromShopify] products.length', products.length);
      return res.jsonp(products);
    })
    .catch((error) => {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    });
  }

  /**
   * Retrieves a list of products from mongodb.
   * @param req
   * @param res
   * @param options
   *
   * @see https://help.shopify.com/en/api/reference/products/product#index
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Get('db')
  async listFromDb(
    @Req() req: IUserRequest,
    @Res() res: Response,
    /*
     * Options from shopify
     */
    @Query('collection_id') collection_id?: string,
    @Query('created_at_max') created_at_max?: string,
    @Query('created_at_min') created_at_min?: string,
    @Query('ids') ids?: string,
    @Query('page') page?: number,
    @Query('fields') fields?: string,
    @Query('limit') limit?: number,
    @Query('product_type') product_type?: string,
    @Query('published_at_max') published_at_max?: string,
    @Query('published_at_min') published_at_min?: string,
    @Query('published_status') published_status?: 'published' | 'unpublished' | 'any',
    @Query('since_id') since_id?: number,
    @Query('title') title?: string,
    @Query('updated_at_max') updated_at_max?: string,
    @Query('updated_at_min') updated_at_min?: string,
    @Query('vendor') vendor?: string,
    /*
     * Custom app options
     */
    @Query('price_max') price_max?: number,
    @Query('price_min') price_min?: number,
    @Query('sort_by') sort_by?: string,
    @Query('sort_dir') sort_dir?: 'asc' | 'desc',
  ) {
    try {
      if (req.session.isThemeClientRequest) {
        published_status = 'published'; // For security reasons, only return public products if the request comes not from a logged in user
      }
      const options: IAppProductListOptions = {
        /*
         * Options from shopify
         */
        collection_id,
        created_at_max,
        created_at_min,
        ids,
        page,
        fields,
        limit,
        product_type,
        published_at_max,
        published_at_min,
        published_status,
        since_id,
        title,
        updated_at_max,
        updated_at_min,
        vendor,
        /*
         * Custom app options
         */
        price_max,
        price_min,
        sort_by,
        sort_dir,
      };
      return res.jsonp(await this.productsService.listFromDb(req.shopifyConnect, options));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(statusCode).jsonp(error);
      return res.status(statusCode).jsonp({
        message: error.generic ? error.generic : error.message,
      });
    }
  }

  /**
   * Retrieves a list of products from elasticsearch.
   * @param req
   * @param res
   * @param options
   *
   * @see https://help.shopify.com/en/api/reference/products/product#index
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Get('search')
  async listFromSearch(
    @Req() req: IUserRequest,
    @Res() res: Response,
    /*
     * Options from shopify
     */
    @Query('collection_id') collection_id?: string,
    @Query('created_at_max') created_at_max?: string,
    @Query('created_at_min') created_at_min?: string,
    @Query('ids') ids?: string,
    @Query('page') page?: number,
    @Query('fields') fields?: string,
    @Query('limit') limit?: number,
    @Query('product_type') product_type?: string,
    @Query('published_at_max') published_at_max?: string,
    @Query('published_at_min') published_at_min?: string,
    @Query('published_status') published_status?: 'published' | 'unpublished' | 'any',
    @Query('since_id') since_id?: number,
    @Query('title') title?: string,
    @Query('updated_at_max') updated_at_max?: string,
    @Query('updated_at_min') updated_at_min?: string,
    @Query('vendor') vendor?: string,
    /*
     * Custom app options
     */
    @Query('price_max') price_max?: number,
    @Query('price_min') price_min?: number,
    @Query('sort_by') sort_by?: string,
    @Query('sort_dir') sort_dir?: 'asc' | 'desc',
  ) {
    if (req.session.isThemeClientRequest) {
      published_status = 'published'; // For security reasons, only return public products if the request comes not from a logged in user
    }
    const options: IAppProductListOptions = {
      /*
       * Options from shopify
       */
      collection_id,
      created_at_max,
      created_at_min,
      ids,
      page,
      fields,
      limit,
      product_type,
      published_at_max,
      published_at_min,
      published_status,
      since_id,
      title,
      updated_at_max,
      updated_at_min,
      vendor,
      /*
       * Custom app options
       */
      price_max,
      price_min,
      sort_by,
      sort_dir,
    };
    return this.productsService.listFromSearch(req.shopifyConnect, options)
    .then((products) => {
      return res.jsonp(products);
    })
    .catch((error) => {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(statusCode).jsonp(error);
    });
  }

  /**
   * Retrieves all products as a stream directly from shopify.
   * @param req
   * @param res
   * @param options
   *
   * @see https://help.shopify.com/en/api/reference/products/product#count
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Get('all')
  @Header('Content-type', 'application/json')
  listAllFromShopify(
    @Req() req: IUserRequest,
    @Res() res: Response,
    /*
     * Options from shopify
     */
    @Query('collection_id') collection_id?: string,
    @Query('created_at_max') created_at_max?: string,
    @Query('created_at_min') created_at_min?: string,
    @Query('ids') ids?: string,
    @Query('page') page?: number,
    @Query('fields') fields?: string,
    @Query('limit') limit?: number,
    @Query('product_type') product_type?: string,
    @Query('published_at_max') published_at_max?: string,
    @Query('published_at_min') published_at_min?: string,
    @Query('published_status') published_status?: 'published' | 'unpublished' | 'any',
    @Query('since_id') since_id?: number,
    @Query('sync_to_db') sync_to_db?: boolean,
    @Query('sync_to_search') sync_to_search?: boolean,
    @Query('title') title?: string,
    @Query('updated_at_max') updated_at_max?: string,
    @Query('updated_at_min') updated_at_min?: string,
    @Query('vendor') vendor?: string,
  ) {
    this.productsService.listAllFromShopifyStream(req.shopifyConnect, {
      collection_id,
      created_at_max,
      created_at_min,
      ids,
      page,
      fields,
      limit,
      product_type,
      published_at_max,
      published_at_min,
      published_status,
      since_id,
      syncToDb: sync_to_db,
      syncToSearch: sync_to_search,
      title,
      updated_at_max,
      updated_at_min,
      vendor,
    })
    .pipe(res)
    .on('error', (error) => {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).jsonp(error);
    });
  }

  /**
   * Retrieves a count of products from mongodb.
   * @param req
   * @param res
   * @param options
   *
   * @see https://help.shopify.com/en/api/reference/products/product#count
   */
  @UseGuards(ShopifyApiGuard)
  @Roles() // Empty == Allowed from shop frontend and backend
  @Get('db/count')
  async countFromDb(
    @Req() req: IUserRequest,
    @Res() res: Response,
    @Query('collection_id') collection_id: string | undefined,
    @Query('created_at_max') created_at_max: string | undefined,
    @Query('created_at_min') created_at_min: string | undefined,
    @Query('product_type') product_type: string | undefined,
    @Query('published_at_max') published_at_max: string | undefined,
    @Query('published_at_min') published_at_min: string | undefined,
    @Query('published_status') published_status: 'published' | 'unpublished' | 'any' | undefined,
    @Query('updated_at_max') updated_at_max: string | undefined,
    @Query('updated_at_min') updated_at_min: string | undefined,
    @Query('vendor') vendor: string | undefined,
  ) {
    try {
      if (req.session.isThemeClientRequest) {
        published_status = 'published'; // For security reasons, only return public products if the request comes not from a logged in user
      }
      return res.jsonp(await this.productsService.countFromDb(req.shopifyConnect, {
        collection_id,
        created_at_max,
        created_at_min,
        product_type,
        published_at_max,
        published_at_min,
        published_status,
        updated_at_max,
        updated_at_min,
        vendor,
      }));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    }
  }

  /**
   * Retrieves a count of products directly from shopify.
   * @param req
   * @param res
   * @param options
   */
  @UseGuards(ShopifyApiGuard)
  @Roles() // Allowed from shop frontend
  @Get('count')
  async countFromShopify(
    @Req() req: IUserRequest,
    @Res() res: Response,
    @Query('collection_id') collection_id: string,
    @Query('created_at_max') created_at_max: string,
    @Query('created_at_min') created_at_min: string,
    @Query('product_type') product_type: string,
    @Query('published_status') published_status: 'published' | 'unpublished' | 'any',
    @Query('published_at_max') published_at_max: string,
    @Query('published_at_min') published_at_min: string,
    @Query('updated_at_max') updated_at_max: string,
    @Query('updated_at_min') updated_at_min: string,
    @Query('vendor') vendor: string,
  ) {
    const options: IShopifySyncProductCountOptions = {
      collection_id,
      created_at_max,
      created_at_min,
      product_type,
      published_at_max,
      published_at_min,
      published_status,
      updated_at_max,
      updated_at_min,
      vendor,
    };
    try {
      if (req.session.isThemeClientRequest) {
        published_status = 'published'; // For security reasons, only return public products if the request comes not from a logged in user
      }
      return res.jsonp(await this.productsService.countFromShopify(req.shopifyConnect, options));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    }
  }

  /**
   * Helper route to check the sync
   * @param req
   * @param res
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Get('db/diff')
  async diffSynced(
    @Req() req: IUserRequest,
    @Res() res: Response,
  ) {
    try {
      return res.jsonp(await this.productsService.diffSynced(req.shopifyConnect));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    }
  }

  /**
   * Updates a product and its variants and images directly from shopify.
   * @param req
   * @param res
   * @param id
   * @param product
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Put(':product_id')
  async updateInShopify(
    @Req() req: IUserRequest,
    @Res() res: Response,
    @Param('product_id') id: number,
    @Body() product: ProductUpdateCreate,
  ) {
    this.logger.debug('update product', id, product);
    try {
      return res.jsonp(await this.productsService.updateInShopify(req.shopifyConnect, id, product));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    }
  }

  /**
   * Creates a new product directly from shopify.
   * @param req
   * @param res
   * @param id
   * @param product
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Post()
  async createInShopify(
    @Req() req: IUserRequest,
    @Res() res: Response,
    @Body() product: ProductUpdateCreate,
  ) {
    this.logger.debug('create product', product);
    try {
      return this.productsService.createInShopify(req.shopifyConnect, product)
      .then((result) => {
        return res.jsonp(result);
      })
      .catch((error) => {
        const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
        return res.status(statusCode).jsonp(error);
      });
    } catch (error) {
      this.logger.error(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).jsonp({
        message: error.message,
      });
    }
  }

  /**
   * Get sync progress
   * @param req
   * @param res
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Get('sync-progress/all')
  async listSyncProgress(@Req() req: IUserRequest, @Res() res: Response) {
    try {
      return res.jsonp(await this.productsService.listSyncProgress(req.shopifyConnect));
    } catch (error) {
      this.logger.error(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).jsonp({
        message: error.message,
      });
    }
  }

  /**
   * Get sync progress
   * @param req
   * @param res
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Get('sync-progress')
  async getLastSyncProgress(@Req() req: IUserRequest, @Res() res: Response) {
    try {
      return res.jsonp(await this.productsService.getLastSyncProgress(req.shopifyConnect));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    }
  }

  /**
   * Deletes a product with the given id directly in shopify.
   * @param req
   * @param res
   * @param id Id of the product being deleted.
   */
  @UseGuards(ShopifyApiGuard)
  @Roles('shopify-staff-member')
  @Delete(':product_id')
  async deleteInShopify(
    @Req() req: IUserRequest,
    @Res() res: Response,
    @Param('product_id') id: number,
  ) {
    try {
      return res.jsonp(await this.productsService.deleteInShopify(req.shopifyConnect, id));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    }
  }

  /**
   * Retrieves a single product from mongodb.
   * @param req
   * @param res
   * @param id Product id
   *
   * @see https://help.shopify.com/en/api/reference/products/product#show
   */
  @UseGuards(ShopifyApiGuard)
  @Roles() // Allowed from shop frontend
  @Get(':id/db')
  async getFromDb(@Req() req: IUserRequest, @Res() res: Response, @Param('id') id: number) {
    try {
      return res.jsonp(await this.productsService.getFromDb(req.shopifyConnect, id));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    }
  }

  /**
   * Retrieves a single product directly from shopify.
   * @param req
   * @param res
   * @param id Product id
   *
   * @see https://help.shopify.com/en/api/reference/products/product#show
   */
  @UseGuards(ShopifyApiGuard)
  @Roles() // Allowed from shop frontend
  @Get(':id')
  async getFromShopify(
    @Req() req: IUserRequest,
    @Res() res: Response,
    @Param('id') id: number,
    @Query('fields') fields?: string,
  ) {
    const options: IShopifySyncProductGetOptions = {
      fields,
    };
    try {
      return res.jsonp(await this.productsService.getFromShopify(req.shopifyConnect, id, options));
    } catch (error) {
      this.logger.error(error);
      const statusCode = error.statusCode ? error.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(statusCode).jsonp(error);
    }
  }
}

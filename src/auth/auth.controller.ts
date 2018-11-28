import { Inject, Controller, Get, Req, Res, Next, Session, Query, Param, HttpStatus } from '@nestjs/common';
import * as passport from 'passport';
import { ShopifyAuthStrategy } from './auth.strategy';
import { ShopifyConnectService } from './connect.service';
import { DebugService } from '../debug.service';
import { ShopifyModuleOptions} from '../interfaces/shopify-module-options';
import { SHOPIFY_MODULE_OPTIONS } from '../shopify.constants';

import { Roles } from '../guards/roles.decorator';

@Controller('shopify/auth')
export class ShopifyAuthController {

  protected logger = new DebugService('shopify:AuthController');

  constructor(
    private readonly shopifyConnectService: ShopifyConnectService,
    @Inject(SHOPIFY_MODULE_OPTIONS) private readonly shopifyModuleOptions: ShopifyModuleOptions
  ) {

  }

  /**
   * Starts the OAuth flow to connect this app with shopify
   * @param res
   * @param req
   */
  @Get()
  oAuthConnect(@Query('shop') shop, @Req() req, @Res() res, @Next() next, @Session() session) {
    if (typeof shop !== 'string') {
      return res.send('shop was not a string, e.g. /auth/shopify?shop=your-shop-name');
    }

    session.shop = shop;

    this.logger.debug('auth called', `AuthController:${shop}`);

    passport.use(`shopify-${shop}`, new ShopifyAuthStrategy(shop, this.shopifyConnectService, this.shopifyModuleOptions));

    return passport.authenticate(`shopify-${shop}`, {
      scope: this.shopifyModuleOptions.scope,
      shop: req.query.shop,
    } as any)(req, res, next);
  }

  /**
   * OAuth shopify callback
   * @param res
   * @param req
   */
  @Get('/callback')
  callback(@Query('shop') shop, @Req() req, @Res() res, @Next() next) {
    if (typeof shop !== 'string') {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'shop query param not found',
      });
    }

    this.logger.debug('callback called', `AuthController:${shop}`);

    return passport.authenticate(`shopify-${shop}`, {
      failureRedirect: `failure/${shop}`,
      successRedirect: `success/${shop}`,
      session: true,
      userProperty: 'user', // defaults to 'user' if omitted
    })(req, res, next);
  }

  /**
   * Called if OAuth was success
   * @param res
   * @param req
   */
  @Get('/success/:shop')
  success(@Param('shop') shop, @Res() res, @Req() req) {
    passport.unuse(`shopify-${shop}`);
    return res.json({
      message: 'successfully logged in',
      shop: req.user.shop,
    });
  }

  /**
   * Called if OAuth fails
   * @param res
   * @param req
   */
  @Get('/failure/:shop')
  failure(@Param('shop') shop, @Res() res, @Req() req) {
    passport.unuse(`shopify-${shop}`);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
    .json({ message: `Failure on oauth autentification`, shop });
  }

  /**
   * Get a list of all connected shopify accounts
   * @param res
   * @param req
   */
  @Get('/connected')
  @Roles('admin')
  connects(@Res() res, @Req() req) {
    return this.shopifyConnectService.findAll()
    .then((connects) => {
      return res.json(connects);
    })
    .catch((error: Error) => {
      this.logger.error(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: `Failure on get connected shopify accounts`});
    });
  }

  /**
   * Get a connected instagram account by id
   * @param res
   * @param req
   */
  @Get('/connected/:id')
  @Roles('admin')
  connect(@Param('id') id, @Res() res, @Req() req) {
    return this.shopifyConnectService.findByShopifyId(Number(id))
    .then((connect) => {
      return res.json(connect);
    })
    .catch((error: Error) => {
      this.logger.error(error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        message: `Failure on get connected shopify account with id ${id}.`,
        info: error.message,
        name: error.name,
        id,
      });
    });
  }
}

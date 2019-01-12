import { IPlan } from '../charge/interfaces/plan';
import { Topic } from '../interfaces/webhook';
import { ConfigOptions } from 'elasticsearch';

export interface ShopifyModuleOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  iframeCallbackURL: string;
  // successRedirectURL?: string;
  // failureRedirectURL?: string;
  appHost: string;
  debug: boolean;
  scope: string[];
  charges: {
    plans: IPlan[];
    frontend_return_url: string;
  };
  cache: any;
  webhooks: {
    autoSubscribe: Topic[];
  }
  elasticsearch: ConfigOptions;
}
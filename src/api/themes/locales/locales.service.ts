import { Inject, Injectable } from '@nestjs/common';
import { AssetsService, CustomAssetListOptions, ICustomAsset } from '../assets/assets.service';
import { IShopifyConnect } from '../../../auth/interfaces/connect';
import { Options, Models } from 'shopify-prime';
import { DebugService } from 'debug.service';

import pMap from 'p-map';
import * as path from 'path';
import * as merge from 'deepmerge';

export interface ILocales {
  [langcode: string]: any;
}

export interface ILocaleFile extends ICustomAsset {
  json?: any;
  lang_code?: string;
  is_default?: boolean;
  locales?: ILocales;
}

export interface CustomLocaleListOptions extends CustomAssetListOptions {
  lang_code?: string;
}

@Injectable()
export class LocalesService {
  logger = new DebugService(`shopify:${this.constructor.name}`);

  shopDomain: string;

  constructor(
    protected readonly assetsService: AssetsService) {
  }

  /**
   * Get locale asset file by filename
   * @param id
   * @param filename
   * @param options
   */
  async getLocalFile(user: IShopifyConnect, id: number, filename: string, options: Options.FieldOptions = {}): Promise<ILocaleFile> {
    const key = `locales/${filename}`;
    this.logger.debug('getLocalFile', filename);
    return this.assetsService.get(user, id, key, options)
    .then((asset) => {
      const locale: ILocaleFile = this.parseLangCode(asset);
      return {
        key: locale.key,
        locales: locale.json,
        size: locale.size,
        theme_id: locale.theme_id,
        lang_code: locale.lang_code,
        is_default: locale.is_default,
      };
    });
  }

  async listSections(user: IShopifyConnect, id: number, options: CustomAssetListOptions = {}): Promise<ILocaleFile[]> {
    options.content_type = 'text/x-liquid';
    options.key_starts_with = 'sections/';
    return this.assetsService.list(user, id, options)
    .then((assets) => {
      this.logger.debug('assets', assets);
      const locales: ILocaleFile[] = assets;
      locales.forEach((locale) => {
        locale = this.parseLangCode(locale);
      });
      return assets;
    });
  }

  /**
   * Get locale section file by filename
   * @param id
   * @param filename
   * @param options
   */
  async getSectionFile(user: IShopifyConnect, id: number, filename: string, options: CustomAssetListOptions = {}): Promise<ILocaleFile> {
    const key = `sections/${filename}`;
    return this.assetsService.get(user, id, key, options)
    .then((asset: ICustomAsset) => {
      let locales: any = null;
      if (asset.json && asset.json.locales) {
        locales = asset.json.locales;
      }
      return {
        key: asset.key,
        locales,
        size: asset.size,
        theme_id: asset.theme_id,
        lang_code: null,
        is_default: null,
      };
    });
  }

  /**
   * Get all locales from all sections files
   * @param id
   * @param options
   */
  private async getSectionAll(user: IShopifyConnect, id: number, options: CustomAssetListOptions = {}): Promise<ILocales> {
    // get locales from sections/*.liquid files
    return this.listSections(user, id, options)
    .then(async (sectionLocales) => {
      const result = await pMap(sectionLocales, async (sectionLocale) => {
        const filename = path.basename(sectionLocale.key);
        return await this.getSectionFile(user, id, filename);
      });
      return result;
    })
    // merge locales from sections/*.liquid files
    .then((sectionLocales) => {
      const mergedSectionLocales = {};
      sectionLocales.forEach((sectionLocale) => {
        if (!sectionLocale || !sectionLocale.locales) {
          return;
        }
        const filename = path.basename(sectionLocale.key);
        const filenameWithoutExtion = path.parse(filename).name;
        Object.keys(sectionLocale.locales).forEach((langcode) => {
          if (!sectionLocale.locales || !sectionLocale.locales[langcode]) {
            return;
          }
          if (!mergedSectionLocales[langcode]) {
            mergedSectionLocales[langcode] = {};
          }

          if (!mergedSectionLocales[langcode].sections) {
            mergedSectionLocales[langcode].sections = {};
          }

          mergedSectionLocales[langcode].sections[filenameWithoutExtion] = sectionLocale.locales[langcode];
        });
      });
      return mergedSectionLocales;
    });
  }

  /**
   * Get locale/*.json file by language code
   * @param id
   * @param filename
   * @param options
   */
  async getByLangCode(user: IShopifyConnect, id: number, langCode: string, options: Options.FieldOptions = {}): Promise<ILocaleFile> {
    let filename = `${langCode}.json`;
    return this.getLocalFile(user, id, filename, options)
    .then((locale) => {
      return locale;
    })
    // if file was not found tryp to get the file with .default after the lanuage code
    .catch(async () => {
      filename = `${langCode}.default.json`;
      return this.getLocalFile(user, id, filename, options)
      .then((locale) => {
        return locale;
      });
    });
  }

  /**
   * Get all full locals from locales/*.json
   * @param id
   * @param options {langcode: 'de'} would only return german locales
   */
  async getAll(user: IShopifyConnect, id: number, options: CustomLocaleListOptions = {}): Promise<ILocales> {
    return this.list(user, id, options)
    // get locales from locales/*.json files
    .then(async (locales) => {
      const result = await pMap(locales, async (locale) => {
        const filename = path.basename(locale.key);
        return await this.getLocalFile(user, id, filename);
      });
      return result;
    })
    // merge results from getting from locales/*.json files
    .then((locales) => {
      const mergedLocales = {};
      locales.forEach((locale) => {
        mergedLocales[locale.lang_code] = locale.locales;
      });
      return mergedLocales;
    });
  }

  /**
   * Get json with all locales (local/*.json and section/*.liquid files) for all languages or by lang_code
   * @param id theme id
   * @param filename
   * @param options
   */
  async get(user: IShopifyConnect, id: number, properties?: string[], options: Options.FieldOptions = {}) {
    return this.getAll(user, id, options)
    .then(async (mergedLocales: ILocales) => {
      return this.getSectionAll(user, id, options)
      .then(async (mergedSectionLocales) => {
        // this.logger.debug('merge section', mergedSectionLocales.en.sections, mergedLocales.en.sections);
        return merge(mergedSectionLocales, mergedLocales);
      });
    })
    // applay filter
    .then((mergedLocales) => {
      if (properties && properties.length) {
        this.logger.debug('properties', properties);
        for (const property of properties) {
          this.logger.debug('property', property);
          if (mergedLocales[property]) {
            mergedLocales = mergedLocales[property];
          } else {
            this.logger.debug('null on', property);
            return null;
          }
        }
      }
      return mergedLocales;
    });
  }

  /**
   * Get list of locale asset files
   * @param id theme id
   * @param options
   */
  async list(user: IShopifyConnect, id: number, options: CustomLocaleListOptions = {}): Promise<ILocaleFile[]> {
    options.content_type = 'application/json';
    options.key_starts_with = 'locales/';
    return this.assetsService.list(user, id, options)
    .then((_assets: ICustomAsset[]) => {
      const assets: ILocaleFile[] = _assets;
      assets.forEach((locale) => {
        locale = this.parseLangCode(locale);
      });
      return assets;
    })
    // applay filter
    .then((assets) => {
      assets = assets.filter((asset) => {
        let matches = true;
        if (options.lang_code && options.lang_code !== asset.lang_code) {
          matches = false;
        }
        if (options.key_starts_with && !asset.key.startsWith(options.key_starts_with)) {
          matches = false;
        }
        return matches;
      });
      return assets;
    });
  }

  private parseLangCode(locale: ILocaleFile) {
    if (locale.key.indexOf('sections/') >= 0) {
      locale.is_default = true;
      locale.lang_code = null;
      return null;
    }
    locale.lang_code = locale.key.slice(8, -5); // remove path and extension
    const defaultStrIndex = locale.lang_code.indexOf('.default');
    if (defaultStrIndex >= 0) {
      locale.is_default = true;
      locale.lang_code = locale.lang_code.slice(0, -8); // remove .default
    } else {
      locale.is_default = false;
    }
    return locale;
  }

}

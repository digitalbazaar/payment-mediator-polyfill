/*!
 * Tracks PaymentHandlerRegistrations.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import * as localforage from 'localforage';
import {utils} from 'web-request-rpc';
import {PermissionManager} from 'web-request-mediator';

import {PaymentHandlerRegistration} from './PaymentHandlerRegistration';

// tracks all origins that have registered payment handlers
const ORIGIN_STORAGE = localforage.createInstance({
  name: 'paymentHandlerOrigins'
});

export class PaymentHandlersService {
  constructor(origin, {permissionManager} = {}) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }
    this._origin = origin;

    // manage permissions for this origin
    this._permissionManager = permissionManager;

    // registrations are origin bound and can only be retrieved by
    // payment handler origins
    this._storage = localforage.createInstance({
      name: 'paymentHandlerRegistrations_' + origin
    });
  }

  /**
   * Creates a payment handler registration.
   *
   * @param url the unique URL for the payment handler.
   *
   * @return a Promise that resolves to the PaymentHandlerRegistration.
   */
  async register(url) {
    url = _normalizeUrl(url, this._origin);

    // ensure origin has `paymenthandler` permission
    const status = await this._permissionManager.query(
      {name: 'paymenthandler'});
    if(status !== 'granted') {
      throw new Error('Permission denied.');
    }

    // return existing registration
    const existing = await this.getRegistration(url);
    if(existing) {
      return existing;
    }

    // add new registration
    await ORIGIN_STORAGE.setItem(
      this.origin, 'paymentHandlerRegistrations_' + this.origin);
    // TODO: could map `url` to a UUID or similar -- consider that
    //   `url` either needs to be canonicalized or mapped to avoid confusion
    await this._storage.setItem(url, true);
    return url;
  }

  /**
   * Unregisters a payment handler, destroying its registration.
   *
   * @param url the unique URL for the payment handler.
   *
   * @return a Promise that resolves to `true` if the handler was registered
   *           and `false` if not.
   */
  async unregister(url) {
    url = _normalizeUrl(url, this._origin);
    const registration = await this.get(url);
    if(!registration) {
      return false;
    }
    await PaymentInstrumentService._destroy(registration);
    await this._storage.removeItem(registration);
    return true;
  }

  /**
   * Gets an existing payment handler registration.
   *
   * @param url the URL for the payment handler.
   *
   * @return a Promise that resolves to the PaymentHandlerRegistration or
   *           `null` if no such registration exists.
   */
  async getRegistration(url) {
    url = _normalizeUrl(url, this._origin);
    if(!this.hasRegistration(url)) {
      return null;
    }
    return url;
  }

  /**
   * Returns true if the given payment handler has been registered and
   * false if not.
   *
   * @param url the URL for the payment handler.
   *
   * @return a Promise that resolves to `true` if the registration exists and
   *           `false` if not.
   */
  async hasRegistration(url) {
    url = _normalizeUrl(url, this._origin);
    return await this._storage.getItem(url) === true;
  }

  /**
   * Return all payment handler URLs.
   *
   * @return a Promise that resolves to all registered payment handler URLs.
   */
  static async _getAllRegistrations(request) {
    // asynchronously get a list of promises where each will resolve to the
    // registered payment handler URLs for a particular origin
    const registrations = [];
    const promises = [];
    await ORIGIN_STORAGE.iterate(databaseName => {
      // get origin's payment handler URLs
      const storage = localforage.createInstance({name: databaseName});
      const urls = [];
      promises.push(storage.iterate(value, url => {
        urls.push(url);
      }).then(() => {
        // append all registrations for the origin to `registrations`
        registrations.push(...urls);
      }));
    });
    await Promise.all(promises);
    return registrations;
  }
}

function _normalizeUrl(url, origin) {
  const parsed = utils.parseUrl(url, origin);
  if(parsed.origin !== origin) {
    throw new Error(`Url "${url}" must have an origin of "${origin}"`);
  }
  return parsed.origin + parsed.pathname;
}

async function denyPermission() {
  return {state: 'denied'};
}

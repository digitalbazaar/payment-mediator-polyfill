/*!
 * Tracks PaymentHandlerRegistrations.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import * as localforage from 'localforage';
import {PaymentHandlerRegistration} from './PaymentHandlerRegistration';

const ORIGIN_STORAGE = localforage.createInstance({
  name: 'paymentHandlerOrigins'
});

export class PaymentHandlers {
  constructor(origin) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }

    this._origin = origin;

    // registrations are origin bound and can only be retrieved by
    // payment handler origins
    this._storage = localforage.createInstance({
      name: 'paymentHandlerRegistrations_' + origin
    });
  }

  // TODO: do we do a `paymenthandler` permission check on each of these?

  async register(url) {
    _validateUrl(url);
    await ORIGIN_STORAGE.setItem(
      this.origin, 'paymentHandlerRegistrations_' + this.origin);
    await this._storage.setItem(url, true);
    return new PaymentHandlerRegistration(this._origin, url);
  }

  async unregister(url) {
    const registered = await this.has(url);
    if(!registered) {
      return false;
    }
    await this._storage.removeItem(registered);
    return true;
  }

  async getRegistration(url) {
    if(!this.hasRegistration(url)) {
      return null;
    }
    return new PaymentHandlerRegistration(this._origin, url);
  }

  async hasRegistration(url) {
    _validateUrl(url);
    return await this.get(url) === true;
  }

  static async getOrigins() {
    return ORIGIN_STORAGE.keys();
  }
}

function _validateUrl(url) {
  if(typeof url !== 'string') {
    throw new TypeError('"url" must be a string.');
  }
}

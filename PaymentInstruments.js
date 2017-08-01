/*!
 * A PaymentInstruments container for a Web Payment Mediator.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import * as localforage from 'localforage';

export class PaymentInstruments {
  constructor(url) {
    if(!(url && typeof url === 'string')) {
      throw new TypeError('"url" must be a non-empty string.');
    }

    this._storage = localforage.createInstance({
      name: 'paymentInstruments_' + url
    });
  }

  // TODO: do we need a `paymenthandler` permission check on each of these?

  async delete(instrumentKey) {
    const hasInstrument = await this.has(instrumentKey);
    if(!hasInstrument) {
      return false;
    }
    await this._storage.removeItem(instrumentKey);
    return true;
  }

  async get(instrumentKey) {
    _validateInstrumentKey(instrumentKey);
    return this._storage.getItem(instrumentKey);
  }

  async keys() {
    return this._storage.keys();
  }

  async has(instrumentKey) {
    const instrument = await this.get(instrumentKey);
    return instrument !== null;
  }

  async set(instrumentKey, details) {
    _validateInstrumentKey(instrumentKey);
    _validatePaymentInstrument(details);
    await this._storage.setItem(instrumentKey, details);
    return;
  }

  async clear() {
    return this._storage.clear();
  }

  /**
   * Return all PaymentInstruments that match the given PaymentRequest.
   *
   * @param request the PaymentRequest to check.
   *
   * @return a Promise that resolves to an array of all PaymentInstruments
   *           that match the given PaymentRequest.
   */
  async _match(request) {
    const matches = [];
    await this._storage.iterate(value => {
      // TODO: implement matching algorithm
      matches.push(value);
    });
    return matches;
  }

  async _destroy() {
    // TODO: use this._storage.dropInstance() instead (when available)
    return this._storage.clear();
  }
}

function _validatePaymentInstrument(details) {
  if(!(details && typeof details === 'object')) {
    throw new TypeError('"details" must be an object.');
  }
  if(typeof details.name !== 'string') {
    throw new TypeError('"details.name" must be a string.');
  }
  if(details.icons) {
    if(!Array.isArray(details.icons)) {
      throw new TypeError('"details.icons" must be an array.');
    }
    details.icons.forEach(_validateImageObject);
  }
  if(details.enabledMethods) {
    if(!Array.isArray(details.enabledMethods)) {
      throw new TypeError('"details.icons" must be an array.');
    }
    details.enabledMethods.forEach(_validatePaymentMethod);
  }
  if(!(details.capabilities && typeof details.capabilities === 'object')) {
    throw new TypeError('"capabilities" must be an object.');
  }
}

function _validateImageObject(imageObject) {
  if(!(imageObject && typeof imageObject === 'object')) {
    throw new TypeError('"icon" must be an object.');
  }
  if(typeof imageObject.src !== 'string') {
    throw new TypeError('"icon.src" must be a string.');
  }
  if(typeof imageObject.sizes !== 'string') {
    throw new TypeError('"icon.sizes" must be a string.');
  }
  if(typeof imageObject.type !== 'string') {
    throw new TypeError('"icon.type" must be a string.');
  }
}

function _validatePaymentMethod(paymentMethod) {
  if(typeof paymentMethod !== 'string') {
    throw new TypeError('"paymentMethod" must be a string.');
  }
}

function _validateInstrumentKey(instrumentKey) {
  if(typeof instrumentKey !== 'string') {
    throw new TypeError('"instrumentKey" must be a string.');
  }
}

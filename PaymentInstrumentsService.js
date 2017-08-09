/*!
 * A PaymentInstrumentsService provides the implementation for
 * PaymentInstruments instances on a particular remote origin.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import localforage from 'localforage';
import {utils} from 'web-request-rpc';

export class PaymentInstrumentsService {
  constructor(origin, {permissionManager}) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }
    this._origin = origin;
    this._permissionManager = permissionManager;
  }

  async delete(url, instrumentKey) {
    const hasInstrument = await this.has(instrumentKey);
    if(!hasInstrument) {
      return false;
    }
    await this._getStorage(url).removeItem(instrumentKey);
    return true;
  }

  async get(url, instrumentKey) {
    await this._checkPermission();
    _validateInstrumentKey(instrumentKey);
    return this._getStorage(url).getItem(instrumentKey);
  }

  async keys(url) {
    await this._checkPermission();
    return this._getStorage(url).keys();
  }

  async has(url, instrumentKey) {
    return await this.get(url, instrumentKey) !== null;
  }

  async set(url, instrumentKey, details) {
    await this._checkPermission();
    _validateInstrumentKey(instrumentKey);
    _validatePaymentInstrument(details);
    await this._getStorage(url).setItem(instrumentKey, details);
  }

  async clear(url) {
    await this._checkPermission();
    return this._getStorage(url).clear();
  }

  /**
   * Gets the PaymentInstrument storage API for a particular payment handler
   * after a same remote origin check.
   *
   * @param url the URL for the payment handler.
   *
   * @return the storage API.
   */
  _getStorage(url) {
    utils.isValidOrigin(url, this._origin);
    return PaymentInstrumentsService._getStorage(url);
  }

  /**
   * Checks to make sure that the remote origin has `paymenthandler`
   * permission.
   */
  async _checkPermission() {
    // ensure origin has `paymenthandler` permission
    const status = await this._permissionManager.query(
      {name: 'paymenthandler'});
    if(status.state !== 'granted') {
      throw new Error('Permission denied.');
    }
  }

  /**
   * Gets the PaymentInstrument storage API for a particular payment handler
   * WITHOUT a same remote origin check.
   *
   * @param url the URL for the payment handler.
   *
   * @return the storage API.
   */
  static _getStorage(url) {
    return localforage.createInstance({
      name: 'paymentInstruments_' + url
    });
  }

  /**
   * Return all PaymentInstruments for a payment handler that match the given
   * PaymentRequest. The matches will be returned in an array with the tuples:
   *
   * {
   *   paymentHandler: <url>,
   *   paymentInstrumentKey: <PaymentInstrument key>,
   *   paymentInstrument: <PaymentInstrument>
   * }
   *
   * @param url the URL that identifies the payment handler to check.
   * @param paymentRequest the PaymentRequest to check.
   *
   * @return a Promise that resolves to an array of payment handler and
   *           PaymentInstrument tuples that match the given PaymentRequest.
   */
  static async _matchPaymentRequest(url, paymentRequest) {
    const matches = [];
    const paymentHandler = url;
    const storage = localforage.createInstance({
      name: 'paymentInstruments_' + url
    });
    await storage.iterate((paymentInstrument, paymentInstrumentKey) => {
      // TODO: implement matching algorithm and used `paymentRequest`
      matches.push({paymentHandler, paymentInstrumentKey, paymentInstrument});
    });
    return matches;
  }

  /**
   * Destroys PaymentInstrument storage for a payment handler.
   *
   * @param url the URL that identifies the payment handler.
   */
  static async _destroy(url) {
    // TODO: use _getStorage(url).dropInstance() instead (when available)
    return this._getStorage(url).clear();
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

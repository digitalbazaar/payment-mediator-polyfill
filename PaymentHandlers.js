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

export class PaymentHandlers {
  constructor(origin, {requestPermission = denyPermission} = {}) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }
    if(requestPermission !== 'function') {
      throw new TypeError('"requestPermission" must be a function.');
    }

    this._origin = origin;

    // manage permissions for this origin
    this._permissionManager = new PermissionManager(
      this._origin, {
        request: (permissionDesc) => requestPermission()
      });

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
    const status = await this._permissionManager.request(
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
    return new PaymentHandlerRegistration(url, this._permissionManager);
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
    if(!registered) {
      return false;
    }
    await registration._destroy();
    await this._storage.removeItem(registered);
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
    return new PaymentHandlerRegistration(url, this._permissionManager);
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
    return await this._storage.get(url) === true;
  }

  /**
   * Gets all payment handler registrations for every origin.
   *
   * @return a Promise that resolves to an array of all registrations.
   */
  static async _getAllRegistrations() {
    const registrations = [];
    await ORIGIN_STORAGE.iterate(value => {
      registrations.push(value);
    });
    return registrations;
  }
}

function _normalizeUrl(url, origin) {
  const parsed = parseUrl(url, origin);
  if(parsed.origin !== origin) {
    throw new Error(`Url "${url}" must have an origin of "${origin}"`);
  }
  return parsed.origin + parsed.pathname;
}

async function denyPermission() {
  return {state: 'denied'};
}

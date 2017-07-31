/*!
 * A PaymentManager for a Web Payment Mediator.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import * as localforage from 'localforage';
import {PermissionManager} from 'web-request-mediator';

export class PaymentManager {
  constructor(origin, {requestPermission = denyPermission} = {}) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }
    if(requestPermission !== 'function') {
      throw new TypeError('"requestPermission" must be a function.');
    }

    this._origin = origin;

    this._permissionManager = new PermissionManager(
      this.origin, {
        request: (permissionDesc) => requestPermission()
      });

    this.paymentInstruments = new PaymentInstruments(origin);
  }

  // TODO: add `on('paymentrequest')` support here?

  /**
   * Requests that the user grant 'paymenthandler' permission to the current
   * origin.
   *
   * @return a Promise that resolves to the PermissionStatus containing
   *           the new state of the permission
   *           (e.g. {state: 'granted'/'denied'})).
   */
  static async requestPermission() {
    return this._permissionManager.request({name: 'paymenthandler'});
  }
}

async function denyPermission() {
  return {state: 'denied'};
}

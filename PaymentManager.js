/*!
 * A PaymentManager for a Web Payment Mediator.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {utils} from 'web-request-rpc';

import {PaymentInstruments} from './PaymentInstruments';

export class PaymentManager {
  constructor(url, {permissionManager}) {
    if(!(url && typeof url === 'string')) {
      throw new TypeError('"url" must be a non-empty string.');
    }

    this._origin = utils.parseOrigin(url);
    this._permissionManager = permissionManager;

    this.paymentInstruments = new PaymentInstruments(url);
  }

  async _destroy() {
    await this.paymentManager.paymentInstruments._destroy();
    return this;
  }

  /**
   * Requests that the user grant 'paymenthandler' permission to the current
   * origin.
   *
   * @return a Promise that resolves to the PermissionStatus containing
   *           the new state of the permission
   *           (e.g. {state: 'granted'/'denied'})).
   */
  async requestPermission() {
    return this._permissionManager.request({name: 'paymenthandler'});
  }
}

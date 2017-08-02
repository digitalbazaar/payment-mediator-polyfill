/*!
 * A PaymentHandlerRegistration provides a PaymentManager to web apps that
 * handle payments.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {utils} from 'web-request-rpc';

import {PaymentManager} from './PaymentManager';

// TODO: extends utils.EventEmitter

export class PaymentHandlerRegistration {
  constructor(url, {permissionManager}) {
    if(!(url && typeof url === 'string')) {
      throw new TypeError('"url" must be a non-empty string.');
    }

    this._url = url;
    // TODO: is _origin required here?
    this._origin = utils.parseUrl(url).origin;

    this.paymentManager = new PaymentManager(url, permissionManager);
  }

  // TODO: add `on('paymentrequest')` support here

  // TODO: add `on('abortpayment')` support here

  /**
   * Destroys this payment handler registration.
   */
  async _destroy() {
    await this.paymentManager._destroy();
    return this;
  }
}

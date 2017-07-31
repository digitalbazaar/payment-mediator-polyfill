/*!
 * A PaymentHandlerRegistration provides a PaymentManager to web apps that
 * handle payments.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {PaymentManager} from './PaymentManager';

export class PaymentHandlerRegistration {
  constructor(origin) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }

    this._origin = origin;
    this.paymentManager = new PaymentManager(origin);
  }

  // TODO: unregister method?
}

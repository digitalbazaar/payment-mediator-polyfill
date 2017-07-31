/*!
 * PaymentRequest polyfill.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import * as localforage from 'localforage';
import {PermissionManager} from 'web-request-mediator';

import {PaymentHandlers} from './PaymentHandlers';

// TODO: this is the server-side of PaymentRequest ... working out the details
//   for what needs to be here... essentially only once `show` is called will
//   everything be transmitted
export class PaymentRequest {
  constructor(origin, {show = abortRequest} = {}) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }
    if(show !== 'function') {
      throw new TypeError('"show" must be a function.');
    }

    this.origin = origin;
    this.id = null;
    this.methodData = null;
    this.details = null;
    this.options = null;

    this._show = show;

    // map of request ID => pending payment request
    this._pending = new Map();
  }

  async create({methodData, details, options} = {}) {
    // TODO: run validation here to ensure proper implementation of the
    //   client side of the polyfill; the client side code should have
    //   already done proper validation for the end user -- so in theory, this
    //   validation would only ever fail during client polyfill development
    // TODO: validate methodData
    // TODO: validate details
    // TODO: validate options

    // TODO: return payment request ID
  }

  async show(requestId) {
    // TODO: find pending payment request

    // TODO: call custom `show`
    const response = await this.show();
    // TODO: UI needs methods to call to send a `paymentrequest` event to
    //   the appropriate payment handler ... does that go here or in
    //   paymentManager?

    // TODO: return PaymentResponse
  }

  async canMakePayment({methodData, details, options} = {}) {
    // TODO: run validation like `create`
  }

  // TODO: add method to trigger `paymentrequest` event on the appropriate
  //   handler?

  async _matchPaymentInstruments() {
    // get all payment handler origins
    const origins = await new PaymentHandlers(this.origin)._getOrigins();

    // TODO: run payment method filter algorithm over all payment instruments
    //   from each origin ... potentially implement `._filter` or `._match` via
    //   PaymentInstruments class ... and create a PaymentInstruments class
    //   per `origin`? ... need to determine if PaymentInstruments are
    //   further scoped by service workers or if they all share the same
    //   paymentManager
  }
}

async function abortRequest() {
  // TODO: called when `show` is not implemented and aborts the request
  throw new Error('PaymentRequest aborted.');
}

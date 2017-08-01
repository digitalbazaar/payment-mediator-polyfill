/*!
 * PaymentRequest polyfill.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {utils} from 'web-request-mediator';

import {PaymentHandlers} from './PaymentHandlers';

export class PaymentRequest {
  constructor(origin, {show = abortRequest} = {}) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }
    if(show !== 'function') {
      throw new TypeError('"show" must be a function.');
    }

    this._origin = origin;
    this._show = show;

    // map of request ID => pending payment request
    this._requests = new Map();
  }

  async create({methodData, details, options} = {}) {
    // TODO: run validation here to ensure proper implementation of the
    //   client side of the polyfill; the client side code should have
    //   already done proper validation for the end user -- so in theory, this
    //   validation would only ever fail during client polyfill development
    // TODO: validate methodData
    // TODO: validate details
    // TODO: validate options

    // Note: `handle` is internal, NOT the same as `details.id`
    const requestHandle = utils.uuidv4();
    this._requests[requestHandle] = {methodData, details, options};
    // TODO: set a timeout an expiration of the request or just let it live
    //   as long as the page does?
    return requestHandle;
  }

  async show(requestId) {
    // find pending payment request
    const request = this._requests[requestId];
    if(!request) {
      throw new Error('InvalidStateError');
    }

    // TODO: call custom `show`
    const response = await this._show(request);

    // TODO: UI needs methods to call to send a `paymentrequest` event to
    //   the appropriate payment handler ... does that go here or in
    //   paymentManager?

    // TODO: return PaymentResponse
  }

  async canMakePayment({methodData, details, options} = {}) {
    // TODO: run validation like `create`
  }

  // called by UI presenting `show` once a payment instrument has been
  // selected
  async _selectPaymentInstrument(paymentInstrument) {
    // TODO: emit `paymenrequest` event on appropriate payment handler
    // await `respondWith` via web-request-rpc EventEmitter.promise primitive
  }

  // called by UI presenting `show` when user changes shipping address
  async _shippingAddressChange(details) {
    // TODO: emit PaymentRequestUpdateEvent with new details and
    // await `updateWith` via web-request-rpc EventEmitter.promise primitive
  }

  // called by UI presenting `show` when user changes shipping option
  async _shippingOptionChange(details) {
    // TODO: emit PaymentRequestUpdateEvent with new details and
    // await `updateWith` via web-request-rpc EventEmitter.promise primitive
  }

  async _matchPaymentInstruments() {
    const self = this;

    // get all payment handler registrations
    const registrations = await PaymentHandlers.getAllRegistrations();

    // find all matching payment instruments
    const promises = [];
    registrations.forEach(r => promises.push(
      r.paymentManager.paymentInstruments._match(self)));
    return [...await Promise.all(promises)];
  }
}

async function abortRequest() {
  // TODO: called when `show` is not implemented and aborts the request
  throw new Error('PaymentRequest aborted.');
}

/*!
 * A PaymentRequestService provides the implementation for
 * PaymentRequest instances on a particular remote origin.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global DOMException */
'use strict';

import * as rpc from 'web-request-rpc';

import {PaymentHandlersService} from './PaymentHandlersService';
import {PaymentInstrumentsService} from './PaymentInstrumentsService';

export class PaymentRequestService {
  constructor(origin, {show = _abortRequest, abort = async () => {}} = {}) {
    if(!(origin && typeof origin === 'string')) {
      throw new TypeError('"origin" must be a non-empty string.');
    }
    if(typeof show !== 'function') {
      throw new TypeError('"show" must be a function.');
    }

    this._origin = origin;
    this._show = show;
    this._abort = abort;

    /* Note: Only one PaymentRequest is permitted at a time. A more complex
       implementation that tracks this PaymentRequest via `localForage` is
       required to enforce this across windows, so right now the restriction
       is actually one PaymentRequest per page. */
    this._requestState = null;
  }

  async show({methodData, details, options}) {
    if(this._requestState) {
      throw new DOMException(
        'Another PaymentRequest is already in progress.', 'NotAllowedError');
    }

    // TODO: run validation here to ensure proper implementation of the
    //   client side of the polyfill; the client side code should have
    //   already done proper validation for the end user -- so in theory, this
    //   validation would only ever fail during client polyfill development
    // TODO: validate methodData
    // TODO: validate details
    // TODO: validate options

    this._requestState = {
      topLevelOrigin: (window.location.ancestorOrigins &&
        window.location.ancestorOrigins.length > 0) ?
          window.location.ancestorOrigins[
            window.location.ancestorOrigins.length - 1] : this._origin,
      paymentRequestOrigin: this._origin,
      paymentRequest: {methodData, details, options},
      paymentHandler: null
    };

    // TODO: set a timeout an expiration of the request or just let it live
    //   as long as the page does?

    // TODO: call custom `show`
    let response;
    try {
      response = await this._show(this._requestState);
      // TODO: validate response as a PaymentResponse
      if(!response) {
        throw new Error('Invalid PaymentResponse from payment handler.');
      }
    } catch(e) {
      // always clear pending request
      this._requestState = null;
      throw e;
    }

    return response;
  }

  async abort() {
    const requestState = this._requestState;
    if(!requestState) {
      // TODO: or would it be more useful to just say "yes, aborted"?
      throw new DOMException(
        'The PaymentRequest is not in progress.', 'InvalidStateError');
    }

    if(requestState.paymentHandler) {
      if(requestState.paymentHandler.ready) {
        // ask payment handler to abort
        await requestState.paymentHandler.api.abortPayment({
          topLevelOrigin: requestState.topLevelOrigin,
          paymentRequestOrigin: requestState.paymentRequestOrigin,
          paymentRequestId: requestState.paymentRequest.details.id
        });
      }

      // queue abort request to be handled by payment handler loader
      const abortRequest = requestState.paymentHandler.abort = {
        promise: new Promise((resolve, reject) => {
          abortRequest.resolve = resolve;
          abortRequest.reject = reject;
        })
      };
      await abortRequest;
    }

    // at this point either no payment handler chosen yet or the payment
    // handler accepted the abort request (otherwise this code path would
    // not be hit because the abort request would be rejected)... so abort
    // gracefully
    return this._abort();
  }

  async canMakePayment({methodData, details, options} = {}) {
    // TODO: implement quota

    // TODO: run validation like `show`

    // TODO: do not set `this._requestState`, just process it
    return true;
  }

  // called by UI presenting `show` once a payment instrument has been
  // selected
  async _selectPaymentInstrument(selection) {
    const requestState = this._requestState;
    const {paymentHandler, paymentInstrumentKey} = selection;
    // Note: If an error is raised, it may be recoverable such that the
    //   `show` UI can allow the selection of another payment handler.
    return _handlePaymentRequest({
      requestState,
      paymentHandler,
      paymentInstrumentKey
    });
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

  async _matchPaymentInstruments(paymentRequest) {
    // get all payment handler registrations
    const registrations = await PaymentHandlersService._getAllRegistrations();

    // find all matching payment instruments
    const promises = [];
    registrations.forEach(url => promises.push(
      PaymentInstrumentsService._matchPaymentRequest(url, paymentRequest)));
    return [].concat(...await Promise.all(promises));
  }
}

/**
 * Loads a payment handler to handle the given payment request.
 *
 * @param options the options to use:
 *          requestState the payment request state information.
 *          paymentHandler the payment handler URL.
 *          paymentInstrumentKey the key for the selected payment instrument.
 */
async function _handlePaymentRequest(
  {requestState, paymentHandler, paymentInstrumentKey}) {

  requestState.paymentHandler = {};

  const appContext = new rpc.WebAppContext();

  // `responsePromise` will resolve when the payment handler provides
  // a PaymentResponse or an error
  const responsePromise = new Promise(async (resolve, reject) => {
    // define interface payment handler will use to send PaymentResponse
    appContext.server.define('paymentResponse', {
      resolve,
      reject,
      // called by remote payment handler after receiving an `abort` request
      abort(err) {
        if(err) {
          // TODO: convert vanilla object `err` into `Error`
          return requestState.paymentHandler.abort.reject(err);
        }
        requestState.paymentHandler.abort.resolve();
      }
    });
  });

  // try to load payment handler
  let loadError = null;
  try {
    const injector = await appContext.createWindow(paymentHandler);
    // enable ability to make calls on remote payment handler
    requestState.paymentHandler.api = injector.get('paymentHandler', {
      functions: ['requestPayment', 'abortPayment']
    });
  } catch(e) {
    loadError = e;
  }

  if(!loadError) {
    // send payment request
    try {
      await requestState.paymentHandler.api.requestPayment({
        topLevelOrigin: requestState.topLevelOrigin,
        paymentRequestOrigin: requestState.paymentRequestOrigin,
        paymentRequestId: requestState.paymentRequest.details.id,
        // TODO: any filtering required?
        methodData: requestState.paymentRequest.methodData,
        total: requestState.paymentRequest.details.total,
        // TODO: https://www.w3.org/TR/payment-handler/#dfn-modifiers-population-algorithm
        modifiers: [],
        instrumentKey: paymentInstrumentKey
      });
    } catch(e) {
      loadError = e;
    }
  }

  // if an abort request is already pending handle it
  if(requestState.paymentHandler.abort) {
    if(loadError) {
      // payment handler did not load, abort request and throw error
      requestState.paymentHandler.abort.resolve();
      throw loadError;
    }

    try {
      // pass abort request to payment handler
      await requestState.paymentHandler.api.abortPayment({
        topLevelOrigin: requestState.topLevelOrigin,
        paymentRequestOrigin: requestState.paymentRequestOrigin,
        paymentRequestId: requestState.paymentRequest.details.id
      });
    } catch(e) {
      // abort request failed
      return requestState.paymentHandler.abort.reject(e);
    }
  }

  // wait for payment handler to respond
  return responsePromise;
}

async function _abortRequest() {
  // TODO: called when `show` is not implemented and aborts the request
  throw new Error('PaymentRequest aborted.');
}

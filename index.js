/*!
 * Payment Mediator Polyfill.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
/* global navigator */
'use strict';

import {PermissionManager, WebRequestHandlersService, WebRequestMediator} from
  'web-request-mediator';

import {PaymentInstrumentsService} from './PaymentInstrumentsService';
import {PaymentRequestService} from './PaymentRequestService';

let loaded;
export async function loadOnce(options) {
  if(loaded) {
    return loaded;
  }
  return loaded = await load(options);
}

// TODO: pass in revealing constructor methods like `requestPermission` for
//   providing UI
export async function load({relyingOrigin, requestPermission, showRequest}) {
  const wrm = new WebRequestMediator(relyingOrigin);

  // define custom server API
  const permissionManager = new PermissionManager(
    relyingOrigin, {request: requestPermission});
  permissionManager._registerPermission('paymenthandler');
  wrm.server.define('permissionManager', permissionManager);

  const paymentRequestService = new PaymentRequestService(
    relyingOrigin, {show: showRequest});

  const paymentHandlersService = new WebRequestHandlersService(
    relyingOrigin, {permissionManager});
  paymentHandlersService.addEventListener('unregister', async event => {
    if(event.requestType === 'payment') {
      event.waitUntil(PaymentInstrumentsService._destroy(event.registration));
    }
  });

  wrm.server.define('paymentInstruments', new PaymentInstrumentsService(
    relyingOrigin, {permissionManager}));
  wrm.server.define('paymentHandlers', paymentHandlersService);
  wrm.server.define('paymentRequest', paymentRequestService);

  // connect to relying origin
  const injector = await wrm.connect();

  // TODO: define custom client API
  // paymentHandlers.setInjector(injector);
  // OR injector.define();

  // TODO: move to another file and/or move out of paymentRequestService?
  wrm.ui = {
    async selectPaymentInstrument(selection) {
      return paymentRequestService._selectPaymentInstrument(selection);
    },
    async shippingAddressChange(details) {
      return paymentRequestService._shippingAddressChange(details);
    },
    async shippingOptionChange(details) {
      return paymentRequestService._shippingOptionChange(details);
    },
    async matchPaymentInstruments(paymentRequest) {
      return paymentRequestService._matchPaymentInstruments(paymentRequest);
    }
  };

  navigator.paymentMediator = wrm;
}

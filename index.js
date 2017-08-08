/*!
 * Payment Mediator Polyfill.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {PermissionManager} from 'web-request-rpc';
import {WebRequestMediator} from 'web-request-mediator';

import {PaymentHandlersService} from './PaymentHandlersService';
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
export async function load({origin, requestPermission, showRequest}) {
  const wrm = new WebRequestMediator(origin);

  // define custom server API
  const permissionManager = new PermissionManager(
    origin, {request: requestPermission});
  wrm.server.define('permissionManager', permissionManager);

  wrm.server.define('paymentInstruments', new PaymentInstrumentsService(
    origin, {permissionManager}));
  wrm.server.define('paymentHandlers', new PaymentHandlersService(
    origin, {permissionManager}));
  wrm.server.define('paymentRequest', new PaymentRequestService(
    origin, {show: showRequest}));

  // connect to relying origin
  const injector = await wrm.connect();

  // TODO: define custom client API
  // paymentHandlers.setInjector(injector);
  // OR injector.define();
}

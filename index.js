/*!
 * Payment Mediator Polyfill.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

export {PaymentHandlers} from './PaymentHandlers';

// TODO: pass in revealing constructor methods like `requestPermission` for
//   providing UI
export async function load({requestPermission, showRequest}) {
  const origin = 'https://bedrock.dev:18443';
  const wrm = new WebRequestMediator(origin);

  // define custom server API
  const permissionManager = new PermissionManager(
    origin, {request: requestPermission});
  wrm.server.define('permissionManager', permissionManager);

  wrm.server.define('PaymentInstruments', new PaymentInstrumentsService(
    origin, {permissionManager}));
  wrm.server.define('PaymentHandlers', new PaymentHandlersService(
    origin, {permissionManager}));
  wrm.server.define('PaymentRequest', new PaymentRequestService(
    origin, {show: showRequest});

  // connect to relying origin
  const injector = await wrm.connect();

  // TODO: define custom client API
  // paymentHandlers.setInjector(injector);
  // OR injector.define();
}

/*!
 * A PaymentInstrumentsService provides the implementation for
 * PaymentInstruments instances on a particular remote origin.
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import {SimpleContainerService} from 'web-request-mediator';

const ITEM_TYPE = 'paymentInstrument';

export class PaymentInstrumentsService extends SimpleContainerService {
  constructor(relyingOrigin, {permissionManager}) {
    super(relyingOrigin, {
      itemType: ITEM_TYPE,
      permissionManager,
      requiredPermission: 'paymenthandler',
      validateKey: _validateInstrumentKey,
      validateItem: _validatePaymentInstrument
    });
  }

  /**
   * Gets a PaymentInstrument by its payment handler URL and its key.
   *
   * @param url the payment handler URL.
   * @param key the PaymentInstrument key.
   *
   * @return a Promise that resolves to the PaymentInstrument or `null`.
   */
  async get(url, key) {
    const instrument = await super.get(url, key);
    if(instrument) {
      // do not return fetched images
      instrument.icons.forEach(icon => {
        delete icon.fetchedImage;
      });
    }
    return instrument;
  }

  /**
   * Return all match objects for all PaymentInstruments for a payment handler
   * that match the given PaymentRequest. The matches will be returned in an
   * array with the tuples:
   *
   * {
   *   paymentHandler: <url>,
   *   paymentInstrumentKey: <PaymentInstrument key>,
   *   paymentInstrument: <PaymentInstrument>
   * }
   *
   * @param url the URL that identifies the payment handler to check.
   * @param paymentRequest the PaymentRequest to check.
   *
   * @return a Promise that resolves to an array of payment handler and
   *           PaymentInstrument tuples that match the given PaymentRequest.
   */
  static async _matchPaymentRequest(url, paymentRequest) {
    return SimpleContainerService._match(
      url, ITEM_TYPE, ({handler, key, item}) => {
      // TODO: implement matching algorithm using `paymentRequest`
      return {
        paymentHandler: handler,
        paymentInstrumentKey: key,
        paymentInstrument: item
      };
    });
  }

  static async _destroy(url) {
    return SimpleContainerService._destroy(url, ITEM_TYPE);
  }
}

function _validatePaymentInstrument(details) {
  if(!(details && typeof details === 'object')) {
    throw new TypeError('"details" must be an object.');
  }
  if(typeof details.name !== 'string') {
    throw new TypeError('"details.name" must be a string.');
  }
  if(details.icons) {
    if(!Array.isArray(details.icons)) {
      throw new TypeError('"details.icons" must be an array.');
    }
    details.icons.forEach(_validateImageObject);
  }
  if(details.enabledMethods) {
    if(!Array.isArray(details.enabledMethods)) {
      throw new TypeError('"details.icons" must be an array.');
    }
    details.enabledMethods.forEach(_validatePaymentMethod);
  }
  if(!(details.capabilities && typeof details.capabilities === 'object')) {
    throw new TypeError('"capabilities" must be an object.');
  }
}

function _validateImageObject(imageObject) {
  if(!(imageObject && typeof imageObject === 'object')) {
    throw new TypeError('"icon" must be an object.');
  }
  if(typeof imageObject.src !== 'string') {
    throw new TypeError('"icon.src" must be a string.');
  }
  if(typeof imageObject.sizes !== 'string') {
    throw new TypeError('"icon.sizes" must be a string.');
  }
  if(typeof imageObject.type !== 'string') {
    throw new TypeError('"icon.type" must be a string.');
  }
  // TODO: ensure `imageObject.fetchedImage` is set and contains a data URL
}

function _validatePaymentMethod(paymentMethod) {
  if(typeof paymentMethod !== 'string') {
    throw new TypeError('"paymentMethod" must be a string.');
  }
}

function _validateInstrumentKey(instrumentKey) {
  if(typeof instrumentKey !== 'string') {
    throw new TypeError('"instrumentKey" must be a string.');
  }
}

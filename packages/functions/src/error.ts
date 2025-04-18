/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FunctionsErrorCodeCore as FunctionsErrorCode } from './public-types';
import { decode } from './serializer';
import { HttpResponseBody } from './service';
import { FirebaseError } from '@firebase/util';
import { FUNCTIONS_TYPE } from './constants';

/**
 * Standard error codes for different ways a request can fail, as defined by:
 * https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
 *
 * This map is used primarily to convert from a backend error code string to
 * a client SDK error code string, and make sure it's in the supported set.
 */
const errorCodeMap: { [name: string]: FunctionsErrorCode } = {
  OK: 'ok',
  CANCELLED: 'cancelled',
  UNKNOWN: 'unknown',
  INVALID_ARGUMENT: 'invalid-argument',
  DEADLINE_EXCEEDED: 'deadline-exceeded',
  NOT_FOUND: 'not-found',
  ALREADY_EXISTS: 'already-exists',
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  RESOURCE_EXHAUSTED: 'resource-exhausted',
  FAILED_PRECONDITION: 'failed-precondition',
  ABORTED: 'aborted',
  OUT_OF_RANGE: 'out-of-range',
  UNIMPLEMENTED: 'unimplemented',
  INTERNAL: 'internal',
  UNAVAILABLE: 'unavailable',
  DATA_LOSS: 'data-loss'
};

/**
 * An error returned by the Firebase Functions client SDK.
 *
 * See {@link FunctionsErrorCode} for full documentation of codes.
 *
 * @public
 */
export class FunctionsError extends FirebaseError {
  /**
   * Constructs a new instance of the `FunctionsError` class.
   */
  constructor(
    /**
     * A standard error code that will be returned to the client. This also
     * determines the HTTP status code of the response, as defined in code.proto.
     */
    code: FunctionsErrorCode,
    message?: string,
    /**
     * Additional details to be converted to JSON and included in the error response.
     */
    readonly details?: unknown
  ) {
    super(`${FUNCTIONS_TYPE}/${code}`, message || '');

    // Since the FirebaseError constructor sets the prototype of `this` to FirebaseError.prototype,
    // we also have to do it in all subclasses to allow for correct `instanceof` checks.
    Object.setPrototypeOf(this, FunctionsError.prototype);
  }
}

/**
 * Takes an HTTP status code and returns the corresponding ErrorCode.
 * This is the standard HTTP status code -> error mapping defined in:
 * https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
 *
 * @param status An HTTP status code.
 * @return The corresponding ErrorCode, or ErrorCode.UNKNOWN if none.
 */
function codeForHTTPStatus(status: number): FunctionsErrorCode {
  // Make sure any successful status is OK.
  if (status >= 200 && status < 300) {
    return 'ok';
  }
  switch (status) {
    case 0:
      // This can happen if the server returns 500.
      return 'internal';
    case 400:
      return 'invalid-argument';
    case 401:
      return 'unauthenticated';
    case 403:
      return 'permission-denied';
    case 404:
      return 'not-found';
    case 409:
      return 'aborted';
    case 429:
      return 'resource-exhausted';
    case 499:
      return 'cancelled';
    case 500:
      return 'internal';
    case 501:
      return 'unimplemented';
    case 503:
      return 'unavailable';
    case 504:
      return 'deadline-exceeded';
    default: // ignore
  }
  return 'unknown';
}

/**
 * Takes an HTTP response and returns the corresponding Error, if any.
 */
export function _errorForResponse(
  status: number,
  bodyJSON: HttpResponseBody | null
): Error | null {
  let code = codeForHTTPStatus(status);

  // Start with reasonable defaults from the status code.
  let description: string = code;

  let details: unknown = undefined;

  // Then look through the body for explicit details.
  try {
    const errorJSON = bodyJSON && bodyJSON.error;
    if (errorJSON) {
      const status = errorJSON.status;
      if (typeof status === 'string') {
        if (!errorCodeMap[status]) {
          // They must've included an unknown error code in the body.
          return new FunctionsError('internal', 'internal');
        }
        code = errorCodeMap[status];

        // TODO(klimt): Add better default descriptions for error enums.
        // The default description needs to be updated for the new code.
        description = status;
      }

      const message = errorJSON.message;
      if (typeof message === 'string') {
        description = message;
      }

      details = errorJSON.details;
      if (details !== undefined) {
        details = decode(details);
      }
    }
  } catch (e) {
    // If we couldn't parse explicit error data, that's fine.
  }

  if (code === 'ok') {
    // Technically, there's an edge case where a developer could explicitly
    // return an error code of OK, and we will treat it as success, but that
    // seems reasonable.
    return null;
  }

  return new FunctionsError(code, description, details);
}

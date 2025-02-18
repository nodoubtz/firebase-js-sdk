/**
 * @license
 * Copyright 2025 Google LLC
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

import { DEFAULT_LOCATION } from './constants';
import { VertexAIError } from './errors';
import { Backend, InstanceIdentifier } from './public-types';
import { VertexAIErrorCode } from './types';

/**
 * @internal
 */
export function createInstanceIdentifier(
  backend: Backend,
  location?: string
): string {
  switch(backend) {
    case Backend.VERTEX_AI:
      return `vertexAI/${location || DEFAULT_LOCATION}`;
    case Backend.GEMINI_DEVELOPER_API:
      return 'developerAPI'
    default:
      throw new VertexAIError(VertexAIErrorCode.ERROR, `An internal error occured: Unknown Backend ${backend}. Please submit an issue at https://github.com/firebase/firebase-js-sdk.`)
  }
}

/**
 * @internal
 */
export function parseInstanceIdentifier(instanceIdentifier: string): InstanceIdentifier {
  const identifierParts = instanceIdentifier.split('/');
  const backend = identifierParts[0];
  switch (backend) {
    case Backend.VERTEX_AI:
      const location: string | undefined = identifierParts[1]; // The location may not be a part of the instance identifier
      return {
        backend,
        location
      };
    case Backend.GEMINI_DEVELOPER_API:
      return {
        backend,
        location: undefined
      };
    default:
      throw new VertexAIError(
        VertexAIErrorCode.ERROR,
        `An internal error occured: Invalid instance identifier: ${instanceIdentifier}. Please submit an issue at https://github.com/firebase/firebase-js-sdk`
      );
  }
}

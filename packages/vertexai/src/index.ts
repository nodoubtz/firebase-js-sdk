/**
 * The Vertex AI in Firebase Web SDK.
 *
 * @packageDocumentation
 */

/**
 * @license
 * Copyright 2024 Google LLC
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

import { registerVersion, _registerComponent } from '@firebase/app';
import { VertexAIService } from './service';
import { DEFAULT_INSTANCE_IDENTIFER, VERTEX_TYPE } from './constants';
import { Component, ComponentType } from '@firebase/component';
import { name, version } from '../package.json';
import { parseInstanceIdentifier } from './helpers';
import { InstanceIdentifier, VertexAIOptions } from './public-types';

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

function registerVertex(): void {
  _registerComponent(
    new Component(
      VERTEX_TYPE,
      (container, options) => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const auth = container.getProvider('auth-internal');
        const appCheckProvider = container.getProvider('app-check-internal');

        let instanceIdentifier: InstanceIdentifier;
        if (options.instanceIdentifier) {
          instanceIdentifier = parseInstanceIdentifier(options.instanceIdentifier);
        } else {
          instanceIdentifier = DEFAULT_INSTANCE_IDENTIFER;
        }

        return new VertexAIService(
          app,
          auth,
          appCheckProvider,
          instanceIdentifier.backend,
          {
            location: instanceIdentifier?.location
          },
        );
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version);
  // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}

registerVertex();

export * from './api';
export * from './public-types';

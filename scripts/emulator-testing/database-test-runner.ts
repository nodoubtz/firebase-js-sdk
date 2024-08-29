/**
 * @license
 * Copyright 2018 Google LLC
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

import { spawn } from 'child-process-promise';
import * as path from 'path';
import { DatabaseEmulator } from './emulators/database-emulator';

// Example: karma start
const command = process.argv.slice(2);

(async () => {
  const emulator = new DatabaseEmulator();
  await emulator.download();
  await emulator.setUp();
  await emulator.setPublicRules();

  const options = {
    shell: true,
    cwd: path.resolve(__dirname, '../../packages/database'),
    env: Object.assign({}, process.env, {
      RTDB_EMULATOR_PORT: emulator.port,
      RTDB_EMULATOR_NAMESPACE: emulator.namespace
    }),
    stdio: 'inherit' as const
  };

  spawn('npx', command, options)
    .finally(() => {
      emulator.tearDown();
    });
})();
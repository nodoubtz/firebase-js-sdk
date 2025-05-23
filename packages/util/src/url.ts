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

/**
 * Checks whether host is a cloud workstation or not.
 * @public
 */
export function isCloudWorkstation(host: string): boolean {
  return host.endsWith('.cloudworkstations.dev');
}

/**
 * Makes a fetch request to the given server.
 * Mostly used for forwarding cookies in Firebase Studio.
 * @public
 */
export async function pingServer(endpoint: string): Promise<boolean> {
  const result = await fetch(endpoint, {
    credentials: 'include'
  });
  return result.ok;
}

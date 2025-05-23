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

import { fail } from '../util/assert';

export type FulfilledHandler<T, R> =
  | ((result: T) => R | PersistencePromise<R>)
  | null;
export type RejectedHandler<R> =
  | ((reason: Error) => R | PersistencePromise<R>)
  | null;
export type Resolver<T> = (value?: T) => void;
export type Rejector = (error: Error) => void;

/**
 * PersistencePromise is essentially a re-implementation of Promise except
 * it has a .next() method instead of .then() and .next() and .catch() callbacks
 * are executed synchronously when a PersistencePromise resolves rather than
 * asynchronously (Promise implementations use setImmediate() or similar).
 *
 * This is necessary to interoperate with IndexedDB which will automatically
 * commit transactions if control is returned to the event loop without
 * synchronously initiating another operation on the transaction.
 *
 * NOTE: .then() and .catch() only allow a single consumer, unlike normal
 * Promises.
 */
export class PersistencePromise<T> {
  // NOTE: next/catchCallback will always point to our own wrapper functions,
  // not the user's raw next() or catch() callbacks.
  private nextCallback: FulfilledHandler<T, unknown> = null;
  private catchCallback: RejectedHandler<unknown> = null;

  // When the operation resolves, we'll set result or error and mark isDone.
  private result: T | undefined = undefined;
  private error: Error | undefined = undefined;
  private isDone = false;

  // Set to true when .then() or .catch() are called and prevents additional
  // chaining.
  private callbackAttached = false;

  constructor(callback: (resolve: Resolver<T>, reject: Rejector) => void) {
    callback(
      value => {
        this.isDone = true;
        this.result = value;
        if (this.nextCallback) {
          // value should be defined unless T is Void, but we can't express
          // that in the type system.
          this.nextCallback(value!);
        }
      },
      error => {
        this.isDone = true;
        this.error = error;
        if (this.catchCallback) {
          this.catchCallback(error);
        }
      }
    );
  }

  catch<R>(
    fn: (error: Error) => R | PersistencePromise<R>
  ): PersistencePromise<R> {
    return this.next(undefined, fn);
  }

  next<R>(
    nextFn?: FulfilledHandler<T, R>,
    catchFn?: RejectedHandler<R>
  ): PersistencePromise<R> {
    if (this.callbackAttached) {
      fail(0xe830, 'Called next() or catch() twice for PersistencePromise');
    }
    this.callbackAttached = true;
    if (this.isDone) {
      if (!this.error) {
        return this.wrapSuccess(nextFn, this.result!);
      } else {
        return this.wrapFailure(catchFn, this.error);
      }
    } else {
      return new PersistencePromise<R>((resolve, reject) => {
        this.nextCallback = (value: T) => {
          this.wrapSuccess(nextFn, value).next(resolve, reject);
        };
        this.catchCallback = (error: Error) => {
          this.wrapFailure(catchFn, error).next(resolve, reject);
        };
      });
    }
  }

  toPromise(): Promise<T> {
    return new Promise((resolve, reject) => {
      this.next(resolve, reject);
    });
  }

  private wrapUserFunction<R>(
    fn: () => R | PersistencePromise<R>
  ): PersistencePromise<R> {
    try {
      const result = fn();
      if (result instanceof PersistencePromise) {
        return result;
      } else {
        return PersistencePromise.resolve(result);
      }
    } catch (e) {
      return PersistencePromise.reject<R>(e as Error);
    }
  }

  private wrapSuccess<R>(
    nextFn: FulfilledHandler<T, R> | undefined,
    value: T
  ): PersistencePromise<R> {
    if (nextFn) {
      return this.wrapUserFunction(() => nextFn(value));
    } else {
      // If there's no nextFn, then R must be the same as T
      return PersistencePromise.resolve<R>(value as unknown as R);
    }
  }

  private wrapFailure<R>(
    catchFn: RejectedHandler<R> | undefined,
    error: Error
  ): PersistencePromise<R> {
    if (catchFn) {
      return this.wrapUserFunction(() => catchFn(error));
    } else {
      return PersistencePromise.reject<R>(error);
    }
  }

  static resolve(): PersistencePromise<void>;
  static resolve<R>(result: R): PersistencePromise<R>;
  static resolve<R>(result?: R): PersistencePromise<R | void> {
    return new PersistencePromise<R | void>((resolve, reject) => {
      resolve(result);
    });
  }

  static reject<R>(error: Error): PersistencePromise<R> {
    return new PersistencePromise<R>((resolve, reject) => {
      reject(error);
    });
  }

  static waitFor(
    // Accept all Promise types in waitFor().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all: { forEach: (cb: (el: PersistencePromise<any>) => void) => void }
  ): PersistencePromise<void> {
    return new PersistencePromise<void>((resolve, reject) => {
      let expectedCount = 0;
      let resolvedCount = 0;
      let done = false;

      all.forEach(element => {
        ++expectedCount;
        element.next(
          () => {
            ++resolvedCount;
            if (done && resolvedCount === expectedCount) {
              resolve();
            }
          },
          err => reject(err)
        );
      });

      done = true;
      if (resolvedCount === expectedCount) {
        resolve();
      }
    });
  }

  /**
   * Given an array of predicate functions that asynchronously evaluate to a
   * boolean, implements a short-circuiting `or` between the results. Predicates
   * will be evaluated until one of them returns `true`, then stop. The final
   * result will be whether any of them returned `true`.
   */
  static or(
    predicates: Array<() => PersistencePromise<boolean>>
  ): PersistencePromise<boolean> {
    let p: PersistencePromise<boolean> =
      PersistencePromise.resolve<boolean>(false);
    for (const predicate of predicates) {
      p = p.next(isTrue => {
        if (isTrue) {
          return PersistencePromise.resolve<boolean>(isTrue);
        } else {
          return predicate();
        }
      });
    }
    return p;
  }

  /**
   * Given an iterable, call the given function on each element in the
   * collection and wait for all of the resulting concurrent PersistencePromises
   * to resolve.
   */
  static forEach<R, S>(
    collection: { forEach: (cb: (r: R, s: S) => void) => void },
    f:
      | ((r: R, s: S) => PersistencePromise<void>)
      | ((r: R) => PersistencePromise<void>)
  ): PersistencePromise<void>;
  static forEach<R>(
    collection: { forEach: (cb: (r: R) => void) => void },
    f: (r: R) => PersistencePromise<void>
  ): PersistencePromise<void>;
  static forEach<R, S>(
    collection: { forEach: (cb: (r: R, s?: S) => void) => void },
    f: (r: R, s?: S) => PersistencePromise<void>
  ): PersistencePromise<void> {
    const promises: Array<PersistencePromise<void>> = [];
    collection.forEach((r, s) => {
      promises.push(f.call(this, r, s));
    });
    return this.waitFor(promises);
  }

  /**
   * Concurrently map all array elements through asynchronous function.
   */
  static mapArray<T, U>(
    array: T[],
    f: (t: T) => PersistencePromise<U>
  ): PersistencePromise<U[]> {
    return new PersistencePromise<U[]>((resolve, reject) => {
      const expectedCount = array.length;
      const results: U[] = new Array(expectedCount);
      let resolvedCount = 0;
      for (let i = 0; i < expectedCount; i++) {
        const current = i;
        f(array[current]).next(
          result => {
            results[current] = result;
            ++resolvedCount;
            if (resolvedCount === expectedCount) {
              resolve(results);
            }
          },
          err => reject(err)
        );
      }
    });
  }

  /**
   * An alternative to recursive PersistencePromise calls, that avoids
   * potential memory problems from unbounded chains of promises.
   *
   * The `action` will be called repeatedly while `condition` is true.
   */
  static doWhile(
    condition: () => boolean,
    action: () => PersistencePromise<void>
  ): PersistencePromise<void> {
    return new PersistencePromise<void>((resolve, reject) => {
      const process = (): void => {
        if (condition() === true) {
          action().next(() => {
            process();
          }, reject);
        } else {
          resolve();
        }
      };
      process();
    });
  }
}

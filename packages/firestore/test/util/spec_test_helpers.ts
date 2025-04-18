/**
 * @license
 * Copyright 2020 Google LLC
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

import * as api from '../../src/protos/firestore_proto_api';
import { mapRpcCodeFromCode } from '../../src/remote/rpc_error';
import {
  JsonProtoSerializer,
  toBytes,
  toName,
  toVersion
} from '../../src/remote/serializer';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../src/remote/watch_change';
import { fail } from '../../src/util/assert';
import { TEST_DATABASE_ID } from '../unit/local/persistence_test_helpers';

const serializer = new JsonProtoSerializer(
  TEST_DATABASE_ID,
  /* useProto3Json= */ true
);

export function encodeWatchChange(
  watchChange: WatchChange
): api.ListenResponse {
  if (watchChange instanceof ExistenceFilterChange) {
    return {
      filter: {
        targetId: watchChange.targetId,
        count: watchChange.existenceFilter.count,
        unchangedNames: watchChange.existenceFilter.unchangedNames
      }
    };
  }
  if (watchChange instanceof DocumentWatchChange) {
    if (watchChange.newDoc?.isFoundDocument()) {
      const doc = watchChange.newDoc;
      return {
        documentChange: {
          document: {
            name: toName(serializer, doc.key),
            fields: doc?.data.value.mapValue.fields,
            updateTime: toVersion(serializer, doc.version),
            createTime: toVersion(serializer, doc?.createTime)
          },
          targetIds: watchChange.updatedTargetIds,
          removedTargetIds: watchChange.removedTargetIds
        }
      };
    } else if (watchChange.newDoc?.isNoDocument()) {
      const doc = watchChange.newDoc;
      return {
        documentDelete: {
          document: toName(serializer, doc.key),
          readTime: toVersion(serializer, doc.version),
          removedTargetIds: watchChange.removedTargetIds
        }
      };
    } else if (watchChange.newDoc === null) {
      return {
        documentRemove: {
          document: toName(serializer, watchChange.key),
          removedTargetIds: watchChange.removedTargetIds
        }
      };
    }
  }
  if (watchChange instanceof WatchTargetChange) {
    let cause: api.Status | undefined = undefined;
    if (watchChange.cause) {
      cause = {
        code: mapRpcCodeFromCode(watchChange.cause.code),
        message: watchChange.cause.message
      };
    }
    return {
      targetChange: {
        targetChangeType: encodeTargetChangeTargetChangeType(watchChange.state),
        targetIds: watchChange.targetIds,
        resumeToken: toBytes(serializer, watchChange.resumeToken),
        cause
      }
    };
  }
  return fail(
    0xf8e5,
    'Unrecognized watch change: ' + JSON.stringify(watchChange)
  );
}

function encodeTargetChangeTargetChangeType(
  state: WatchTargetChangeState
): api.TargetChangeTargetChangeType {
  switch (state) {
    case WatchTargetChangeState.Added:
      return 'ADD';
    case WatchTargetChangeState.Current:
      return 'CURRENT';
    case WatchTargetChangeState.NoChange:
      return 'NO_CHANGE';
    case WatchTargetChangeState.Removed:
      return 'REMOVE';
    case WatchTargetChangeState.Reset:
      return 'RESET';
    default:
      return fail(0x368b, 'Unknown WatchTargetChangeState: ' + state);
  }
}

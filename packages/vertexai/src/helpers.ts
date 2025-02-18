import { DEFAULT_LOCATION } from "./constants";

/**
 * @internal
 */
export function createInstanceIdentifier(developerAPIEnabled?: boolean, location?: string): string {
  if (developerAPIEnabled) {
    return 'developerAPI';
  } else {
    return `vertexAI/${location || DEFAULT_LOCATION}`;
  }
}

/**
 * @internal
 */
export function parseInstanceIdentifier(instanceIdentifier: string): { developerAPIEnabled: boolean, location?: string } {
  const identifierParts = instanceIdentifier.split("/");
  if (identifierParts[0] === 'developerAPI') {
    return {
      developerAPIEnabled: true,
      location: undefined
    }
  } else {
    const location = identifierParts[1];
    return {
      developerAPIEnabled: false,
      location
    }
  }
}
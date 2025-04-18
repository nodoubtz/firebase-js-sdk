# Firebase JavaScript SDK

![Build Status](https://img.shields.io/github/actions/workflow/status/firebase/firebase-js-sdk/test-all.yml)
[![Version](https://img.shields.io/npm/v/firebase.svg?label=version)](https://www.npmjs.com/package/firebase)
[![Coverage Status](https://coveralls.io/repos/github/firebase/firebase-js-sdk/badge.svg?branch=main)](https://coveralls.io/github/firebase/firebase-js-sdk?branch=main)

The Firebase JavaScript SDK implements the client-side libraries used by applications utilizing Firebase services. This SDK is available via:

- [CDN](https://firebase.google.com/docs/web/setup/#add-sdks-initialize)
- [npm package](https://www.npmjs.com/package/firebase)

## Getting Started

To start using Firebase in your JavaScript project, refer to the [official Firebase setup guide](https://firebase.google.com/docs/web/setup).

[![Release Notes](https://img.shields.io/npm/v/firebase.svg?style=flat-square&label=Release%20Notes%20for&labelColor=039be5&color=666)](https://firebase.google.com/support/release-notes/js)

---

## Upgrade to Version 9

Version 9 introduces a redesigned API that supports tree-shaking for better optimization. For details, see the [Upgrade Guide](https://firebase.google.com/docs/web/modular-upgrade).

---

## Supported Environments

Refer to Firebase's [Environment Support](https://firebase.google.com/support/guides/environments_js-sdk) for compatibility details.

---

## Developer Setup

### Prerequisites

#### Node.js
- Required version: `20.12.2`
- Install from [Node.js official site](https://nodejs.org/en/download).

> _Tip: Manage multiple Node versions using tools like [`NVM`](https://github.com/creationix/nvm) or [`N`](https://github.com/tj/n)._

#### Yarn
- Required version: `1.x`
- Install Yarn from [its official site](https://yarnpkg.com/en/docs/install).

#### Java
- Required version: Java 11+
- Install from [Oracle's Java Downloads](https://www.oracle.com/java/technologies/downloads/#java11).

#### Verify Tools
Run the following commands to verify your setup:
```bash
$ node -v
$ yarn -v
$ java -version
```

### Install Dependencies

Once prerequisites are installed, set up the development environment:
```bash
$ yarn
```

To build the SDK:
```bash
$ yarn build
```

---

## Testing the SDK

### Setup
1. Create a Firebase project via the [Firebase Console](https://console.firebase.google.com/).
2. Configure:
   - A Web App
   - Firestore Database
   - Realtime Database
   - Storage Bucket (update CORS rules as required)
   - Enable Anonymous Authentication in your project.

3. Run the test setup:
```bash
$ yarn test:setup
```

### Running Tests
Run all test suites:
```bash
$ yarn test
```

---

## Building the SDK

### Overview
The SDK is built using individual packages located in the `packages` directory. Tools like [Lerna](https://lerna.js.org/) and [Yarn Workspaces](https://yarnpkg.com/blog/2017/08/02/introducing-workspaces/) manage the monorepo structure.

### Local Testing
To test locally built SDK changes:
```bash
$ cd packages/firebase
$ yarn link
$ cd ../<your-product>
$ yarn link firebase @firebase/<your-product>
```

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for guidelines.

---

## License
This project is licensed under the [MIT License](./LICENSE).

---

### Acknowledgments

Cross-browser Testing Platform and Open Source support provided by [Sauce Labs](https://saucelabs.com).

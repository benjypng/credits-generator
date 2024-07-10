# Overview

Script to generate key details of a repository's dependencies using `cyclonedx-node-npm`. This script generates 3 files:

- sbom.txt: Main list of dependencies
- unique-licenses.txt: Unique list of licenses found across all dependencies
- undef-licenses.txt: List of dependencies without a defined license

By default, `package.json` files in the `node_modules` and `bruno` folder are ignored.

*Sample Output*

```
======================================================
Name: iterare
Group: undefined
Version: 1.2.1
BOM-Ref: iterare@1.2.1
Author: Felix Becker
Licenses: ISC
======================================================
Name: reflect-metadata
Group: undefined
Version: 0.2.2
BOM-Ref: reflect-metadata@0.2.2
Author: Ron Buckton
Licenses: Apache-2.0
======================================================
```

# Installation

1. Go to the repository's root directory.
2. Run `npx sbom-generator .`.

# Credits

[cyclonedx-node-npm](https://github.com/CycloneDX/cyclonedx-node-npm)

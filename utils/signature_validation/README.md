# Signature Validation Script

The script is used to verify whether a given ID signature (i.e., sha256 hash) is correct, using the public key from the key pair that created the signature. The public key can be copied from the Cloudformation/${timeline stack}/Output.

# Usage

Before using the script make sure to install its dependencies (`npm i` command).

```
Usage: node validate_signature.mjs [OPTIONS]
Options:
  public=<publicKey> ID=<hash> signature=<signature>
    Verify signature of an ID(hash) using provided public key.
  privateKey=<privateKey> file=<dataFile>
    Sign a data file using provided private key.
  file=<dataFile>
    Sign a data file using generated private key.

Examples:
  node validate_signature.mjs publicKey=<publicKey> ID=<hash> signature=<signature>
  node validate_signature.mjs privateKey=<privateKey> file=<dataFile>
  node validate_signature.mjs file=<dataFile>

```

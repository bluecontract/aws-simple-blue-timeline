#!/home/rkzel/.nvm/versions/node/v18.17.1/bin/node

/*
PK           test-1699549185718-timelineE
SK           Entry:6832e44eaa53c1871d2c4f4006d2b4e73b2f575818f345a4111f334eb3ad75c6
Created      1699549201087
ID           6832e44eaa53c1871d2c4f4006d2b4e73b2f575818f345a4111f334eb3ad75c6
Message      {"message":"test-message"}
Signature    304402204eef029eb78b3c38164dd60b0270309507418bb026138464a7a21185b5dded6a022029fa49cc7430457e00e61c048272527528a15cb53b11059fd35c2fa74c64b3fb
SK2          538677226:1699549201087
Timeline     ab9f49cdf8259ed38ae79425b3e30a62a396e05e3f3c90deb9195f8a535f039a
TimelinePrev ab9f49cdf8259ed38ae79425b3e30a62a396e05e3f3c90deb9195f8a535f039a
*/

import canonicalize from 'canonicalize';
import pkg from 'elliptic';
const { ec } = pkg;
import crypto from 'crypto';
import { readFileSync } from 'fs';

const elliptic = new ec('secp256k1');

const getRawDataSignature = data => {
    const canonical = canonicalize(data) || '';
    const hash = crypto.createHash('sha256')
        .update(canonical || '')
        .digest('hex');

    // console.log(data, canonical);
    // console.log(`sig: ${hash}`);

    return hash;
}

const generateSignature = (privateKey, hash) => {
    const key = elliptic.keyFromPrivate(privateKey, 'hex');
    return key.sign(hash).toDER('hex');
}

const validateSignature = (publicKey, hash, signature) => {
    const key = elliptic.keyFromPublic(publicKey, 'hex');
    return key.verify(hash, signature);
}

const usage = () => {
    const scriptName = process.argv[1].split('/').splice(-1, 1);
    console.log(`Usage: node ${scriptName} [OPTIONS]`);
    console.log('Options:');
    console.log('  public=<publicKey> ID=<hash> signature=<signature>');
    console.log('    Verify signature of an ID(hash) using provided public key.');
    console.log('  privateKey=<privateKey> file=<dataFile>');
    console.log('    Sign a data file using provided private key.');
    console.log('  file=<dataFile>');
    console.log('    Sign a data file using generated private key.');
    console.log('');
    console.log('Examples:');
    console.log(`  node ${scriptName} publicKey=<publicKey> ID=<hash> signature=<signature>`);
    console.log(`  node ${scriptName} privateKey=<privateKey> file=<dataFile>`);
    console.log(`  node ${scriptName} file=<dataFile>`);
    process.exit();
}

const parseArgs = () => {
    const args = process.argv.slice(2);

    if (args.length < 1 || args.length > 3) usage();

    let params = {};

    args.forEach(p => {
        const [k, v] = p.split('=');
        if (k && v)
            params[k] = v;
        else
            usage();
    });
    console.log(params)
    return params
}

const params = parseArgs();

if ('publicKey' in params && 'signature' in params && 'ID' in params) {
    const isValid = validateSignature(params.publicKey, params.ID, params.signature);

    console.log(`Signature is valid: ${isValid}`);
    process.exit();
}

if ('privateKey' in params && 'file' in params) {
    const hash = getRawDataSignature(readFileSync(params.file).toString());
    const signature = generateSignature(params.privateKey, hash);

    console.log(`File: ${params.file}`);
    console.log(`Hash: ${hash}`);
    console.log(`Signature: ${signature}`);
    process.exit();
}

if ('file' in params) {
    const schnorrKeyPair = elliptic.genKeyPair();
    const privateKey = schnorrKeyPair.getPrivate('hex');
    const publicKey = schnorrKeyPair.getPublic('hex');
    const hash = getRawDataSignature(readFileSync(params.file).toString());
    const signature = generateSignature(privateKey, hash);

    console.log(`File: ${params.file}`);
    console.log(`Hash: ${hash}`);
    console.log(`Signature: ${signature}`);
    console.log(`Public Key: ${publicKey}`);
    console.log(`Private Key: ${privateKey}`);
    process.exit();
}

usage();

import crypto from 'crypto';
import canonicalize from 'canonicalize';
import { ec } from 'elliptic';

const elliptic = new ec('secp256k1');

export function generateSchnorrKeyPair() {
    const key = elliptic.genKeyPair();

    return {
        privateKey: key.getPrivate('hex'),
        publicKey: key.getPublic('hex') 
    };
}

export function createHash(data: string): string {
    return crypto.createHash('sha256').update(data || '').digest('hex');
}

export function createHashFromJson(data: object): string {
    return createHash(canonicalize(data) || '');
}

export function sign(hash: string, privateKey: string): string {
    const key = elliptic.keyFromPrivate(privateKey, 'hex');
    return key.sign(hash).toDER('hex');
}

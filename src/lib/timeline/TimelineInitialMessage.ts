export default class TimelineInitialMessage {
    type: {
        name: string,
        sha256: string,
    };
    name: string;
    sqs: string;
    publicKey: string;

    constructor(data) {
        this.type = {
            name: "AWS Basic Timeline with Secp256k1 Schnorr Signature",
            sha256: "5f7f807162fc46ca4733d293cffc60dcbfe8c247bfa33f8a2d9b420bbe1415be",
        }
        this.name = data.name;
        this.sqs = data.sqs;
        this.publicKey = data.publicKey;
    }
}

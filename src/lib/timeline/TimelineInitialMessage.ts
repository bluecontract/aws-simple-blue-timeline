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
            sha256: "23aa0524e8c55087599917f05a25fc40fc18b25e8ae1de6b81329de7501727bc",
        }
        this.name = data.name;
        this.sqs = data.sqs;
        this.publicKey = data.publicKey;
    }
}

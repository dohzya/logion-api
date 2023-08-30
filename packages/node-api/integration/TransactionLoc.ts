import { UUID, MetadataItemParams, FileParams, Hash } from "../src/index.js";
import { ALICE, REQUESTER, setup, signAndSend, ISSUER } from "./Util.js";
import { IKeyringPair } from "@polkadot/types/types";

export async function createTransactionLocTest() {
    const { requester, api } = await setup();

    const createLocExtrinsic = api.polkadot.tx.logionLoc.createPolkadotTransactionLoc(
        api.adapters.toLocId(TRANSACTION_LOC_ID),
        ALICE,
    );
    await signAndSend(requester, createLocExtrinsic);

    const loc = await api.queries.getLegalOfficerCase(TRANSACTION_LOC_ID);
    expect(loc?.owner).toBe(ALICE);
    expect(loc?.requesterAddress?.address).toBe(REQUESTER);
    expect(loc?.requesterAddress?.type).toBe("Polkadot");
    expect(loc?.closed).toBe(false);
    expect(loc?.locType).toBe("Transaction");
}

export async function addMetadataToTransactionLocTestAsLLO() {
    const { alice, api } = await setup();
    await addMetadataToTransactionLocTest(
        alice,
        {
            name: Hash.of("Some name"),
            value: Hash.of("Some value"),
            submitter: api.queries.getValidAccountId(ALICE, "Polkadot"),
        },
        true,
        0
    );
}

export async function addMetadataToTransactionLocTestAsRequester() {
    const { api, requester } = await setup();
    await addMetadataToTransactionLocTest(
        requester,
        {
            name: REQUESTER_METADATA_NAME,
            value: Hash.of("Some other value"),
            submitter: api.queries.getValidAccountId(REQUESTER, "Polkadot"),
        },
        false,
        1
    );
}

export async function addMetadataToTransactionLocTestAsIssuer() {
    const { api, requester } = await setup();
    await addMetadataToTransactionLocTest(
        requester,
        {
            name: ISSUER_METADATA_NAME,
            value: Hash.of("Some other value (bis)"),
            submitter: api.queries.getValidAccountId(ISSUER, "Polkadot"),
        },
        false,
        2
    );
}

async function addMetadataToTransactionLocTest(who: IKeyringPair, item: MetadataItemParams, expectedAcknowledgedByOwner: boolean, index: number) {
    const { api } = await setup();
    const { name, value, submitter } = item
    const addMetadataExtrinsic = api.polkadot.tx.logionLoc.addMetadata(
        api.adapters.toLocId(TRANSACTION_LOC_ID),
        api.adapters.toPalletLogionLocMetadataItem(item),
    );
    await signAndSend(who, addMetadataExtrinsic);

    const loc = await api.queries.getLegalOfficerCase(TRANSACTION_LOC_ID);
    expect(loc?.metadata.length).toBe(index + 1);
    expect(loc?.metadata[index].name).toEqual(name);
    expect(loc?.metadata[index].value).toEqual(value);
    expect(loc?.metadata[index].submitter.address).toBe(submitter.address);
    expect(loc?.metadata[index].submitter.type).toBe(submitter.type);
    expect(loc?.metadata[index].acknowledgedByOwner).toBe(expectedAcknowledgedByOwner);
    expect(loc?.metadata[index].acknowledgedByVerifiedIssuer).toBeFalse();
}

export async function acknowledgeMetadataAsOwner() {
    const { alice, api } = await setup();
    const acknowledgeMetadataExtrinsic = api.polkadot.tx.logionLoc.acknowledgeMetadata(
        api.adapters.toLocId(TRANSACTION_LOC_ID),
        REQUESTER_METADATA_NAME.bytes,
    );
    await signAndSend(alice, acknowledgeMetadataExtrinsic);

    const loc = await api.queries.getLegalOfficerCase(TRANSACTION_LOC_ID);
    expect(loc?.metadata[0].acknowledgedByOwner).toBeTrue();
    expect(loc?.metadata[1].acknowledgedByOwner).toBeTrue();
}

export async function acknowledgeMetadataAsIssuer() {
    const { issuer, api } = await setup();
    const acknowledgeMetadataExtrinsic = api.polkadot.tx.logionLoc.acknowledgeMetadata(
        api.adapters.toLocId(TRANSACTION_LOC_ID),
        ISSUER_FILE_HASH.bytes,
    );
    await signAndSend(issuer, acknowledgeMetadataExtrinsic);

    const loc = await api.queries.getLegalOfficerCase(TRANSACTION_LOC_ID);
    expect(loc?.metadata[2].acknowledgedByVerifiedIssuer).toBeTrue();
}

export async function addFileToTransactionLocTestAsLLO() {
    const { alice, api } = await setup();

    await addFileToTransactionLocTest(
        alice,
        {
            hash: Hash.fromHex("0x46d9bb04725470dc8483395f635805e9da5e105c7b2b90935b895a0f4f364d80"),
            nature: Hash.of("Some nature"),
            submitter: api.queries.getValidAccountId(ALICE, "Polkadot"),
            size: BigInt(456),
        },
        true,
        0);
}

export async function addFileToTransactionLocTestAsRequester() {
    const { requester, api } = await setup();

    await addFileToTransactionLocTest(
        requester,
        {
            hash: REQUESTER_FILE_HASH,
            nature: Hash.of("Some other nature"),
            submitter: api.queries.getValidAccountId(REQUESTER, "Polkadot"),
            size: BigInt(123),
        },
        false,
        1);
}

export async function addFileToTransactionLocTestAsIssuer() {
    const { requester, api } = await setup();

    await addFileToTransactionLocTest(
        requester,
        {
            hash: ISSUER_FILE_HASH,
            nature: Hash.of("Some other nature (bis)"),
            submitter: api.queries.getValidAccountId(ISSUER, "Polkadot"),
            size: BigInt(789),
        },
        false,
        2);
}

async function addFileToTransactionLocTest(who: IKeyringPair, file: FileParams, expectedAcknowledgedByOwner: boolean, index: number) {
    const { api } = await setup();

    const { hash, nature, size, submitter } = file;

    const addFileExtrinsic = api.polkadot.tx.logionLoc.addFile(
        api.adapters.toLocId(TRANSACTION_LOC_ID),
        api.adapters.toPalletLogionLocFile(file),
    );
    await signAndSend(who, addFileExtrinsic);

    const loc = await api.queries.getLegalOfficerCase(TRANSACTION_LOC_ID);
    expect(loc?.files.length).toBe(index + 1);
    expect(loc?.files[index].hash).toEqual(hash);
    expect(loc?.files[index].nature).toEqual(nature);
    expect(loc?.files[index].submitter.address).toBe(submitter.address);
    expect(loc?.files[index].submitter.type).toBe(submitter.type);
    expect(loc?.files[index].size).toBe(size);
    expect(loc?.files[index].acknowledgedByOwner).toBe(expectedAcknowledgedByOwner);
    expect(loc?.files[index].acknowledgedByVerifiedIssuer).toBeFalse();
}

export async function acknowledgeFileAsOwner() {
    const { alice, api } = await setup();
    const acknowledgeFileExtrinsic = api.polkadot.tx.logionLoc.acknowledgeFile(
        api.adapters.toLocId(TRANSACTION_LOC_ID),
        REQUESTER_FILE_HASH.bytes,
    );
    await signAndSend(alice, acknowledgeFileExtrinsic);

    const loc = await api.queries.getLegalOfficerCase(TRANSACTION_LOC_ID);
    expect(loc?.files[0].acknowledgedByOwner).toBeTrue();
    expect(loc?.files[1].acknowledgedByOwner).toBeTrue();
}

export async function acknowledgeFileAsIssuer() {
    const { issuer, api } = await setup();
    const acknowledgeFileExtrinsic = api.polkadot.tx.logionLoc.acknowledgeFile(
        api.adapters.toLocId(TRANSACTION_LOC_ID),
        ISSUER_FILE_HASH.bytes,
    );
    await signAndSend(issuer, acknowledgeFileExtrinsic);

    const loc = await api.queries.getLegalOfficerCase(TRANSACTION_LOC_ID);
    expect(loc?.files[2].acknowledgedByVerifiedIssuer).toBeTrue();
}


const TRANSACTION_LOC_ID = new UUID("c1dc4b62-714b-4001-ae55-1b54ad61dd93");
const REQUESTER_METADATA_NAME = Hash.of("Some other name");
const ISSUER_METADATA_NAME = Hash.of("Yet some other name");
const REQUESTER_FILE_HASH = Hash.fromHex("0xb741477ee8b0f12dbf1094487c3832145911f6e55ced5dbe57c3248a18f0461b");
const ISSUER_FILE_HASH = Hash.fromHex("0x4df3c3f68fcc83b27e9d42c90431a72499f17875c81a599b566c9889b9696703");

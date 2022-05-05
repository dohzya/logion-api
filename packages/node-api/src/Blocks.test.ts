jest.mock('@polkadot/api');

import { ApiPromise } from '@polkadot/api';
import { Block, Hash } from '@polkadot/types/interfaces';
import { apiMock, hashMock, TOTAL_BLOCKS, blockMock, extrinsicsMock, ApiPromise as ApiPromiseMock } from './__mocks__/PolkadotApiMock';
import {
    fetchExtrinsics,
    BlockAggregatingVisitor,
    AggregateChainSpecification,
    aggregateChain,
    WalkChainSpecification,
    BlockVisitor,
    walkChain,
    isLimitReached,
    hashEquals,
    ExtrinsicFetchSpecification,
} from './Blocks';

test("Fetch at most 10 extrinsics", async () => {
    const specification: unknown = {
        head: (apiMock as ApiPromiseMock).chain.head.hash,
        api: apiMock,
        maxResults: 10,
        matcher: () => true
    };
    const result = await fetchExtrinsics(specification as ExtrinsicFetchSpecification);
    expect(result.extrinsics.length).toBe(10);
});

test("Fetch matching extrinsics", async () => {
    const specification: unknown = {
        head: (apiMock as ApiPromiseMock).chain.head.hash,
        api: apiMock,
        maxResults: 10,
        matcher: (extrinsic: any) => extrinsic.method.section === "balances"
    };
    const result = await fetchExtrinsics(specification as ExtrinsicFetchSpecification);
    expect(result.extrinsics.length).toBe(10);
    result.extrinsics.forEach(extrinsic => expect(extrinsic.method.section).toBe("balances"));
});

test("Fetch extrinsics since hash and none", async () => {
    const specification: unknown = {
        head: (apiMock as ApiPromiseMock).chain.head.hash,
        api: apiMock,
        maxResults: 10,
        matcher: (extrinsic: any) => extrinsic.method.section === "timestamp",
        since: {head: hashMock(TOTAL_BLOCKS - 3), extrinsics: []}
    };
    const result = await fetchExtrinsics(specification as ExtrinsicFetchSpecification);
    expect(result.extrinsics.length).toBe(2);
});

test("Fetch extrinsics after hash", async () => {
    const specification: unknown = {
        head: (apiMock as ApiPromiseMock).chain.head.hash,
        api: apiMock,
        maxResults: 10,
        matcher: (extrinsic: any) => extrinsic.method.section === "timestamp",
        after: hashMock(TOTAL_BLOCKS - 3),
    };
    const result = await fetchExtrinsics(specification as ExtrinsicFetchSpecification);
    expect(result.extrinsics.length).toBe(2);
});

test("Fetch extrinsics after date", async () => {
    const afterDate = new Date(new Date().valueOf() - 6000);
    const specification: unknown = {
        head: (apiMock as ApiPromiseMock).chain.head.hash,
        api: apiMock,
        maxResults: 10,
        matcher: (extrinsic: any) => extrinsic.method.section === "timestamp",
        after: afterDate,
    };
    const result = await fetchExtrinsics(specification as ExtrinsicFetchSpecification);
    expect(result.extrinsics.length).toBe(1);
});

test("chain aggregator", async () => {
    const specification: AggregateChainSpecification = {
        head: (apiMock as ApiPromiseMock).chain.head.hash,
        api: apiMock as ApiPromise,
        maxResults: 10,
    };
    const visitor: BlockAggregatingVisitor<number> = {
        stopWalk: block => block.header.number.toNumber() < 998,
        continueWalk: _ => true,
        consumeBlock: (block, blockNumbers) => blockNumbers.push(block.header.number.toNumber()),
    };
    const blockNumbers = await aggregateChain(visitor, specification);
    expect(blockNumbers.length).toBe(2);
    expect(blockNumbers[0]).toBe(999);
    expect(blockNumbers[1]).toBe(998);
});

test("chain walk", async () => {
    const specification: WalkChainSpecification = {
        head: (apiMock as ApiPromiseMock).chain.head.hash,
        api: apiMock as ApiPromise,
    };
    const blockNumbers: number[] = [];
    const visitor: BlockVisitor = {
        stopWalk: block => block.header.number.toNumber() < 998,
        continueWalk: _ => true,
        consumeBlock: block => blockNumbers.push(block.header.number.toNumber()),
    };
    await walkChain(visitor, specification);
    expect(blockNumbers.length).toBe(2);
    expect(blockNumbers[0]).toBe(999);
    expect(blockNumbers[1]).toBe(998);
});

test("Limit reached if date and block without timestamp", () => {
    const block: unknown = blockMock({
        extrinsics: []
    });
    const limit = new Date();
    const result = isLimitReached(block as Block, limit);
    expect(result).toBe(true);
});

test("Given h1 null and h2 not, when testing equality, then false", () => {
    const h1 = null;
    const h2 = hashMock(2);
    const result = hashEquals(h1, h2 as Hash);
    expect(result).toBe(false);
});

test("Given h2 null and h1 not, when testing equality, then false", () => {
    const h1 = hashMock(1);
    const h2 = null;
    const result = hashEquals(h1 as Hash, h2);
    expect(result).toBe(false);
});

test("Given h1 null and h1 null, when testing equality, then true", () => {
    const h1 = null;
    const h2 = null;
    const result = hashEquals(h1, h2);
    expect(result).toBe(true);
});

test("Given no stop, when chain walk, the down to genesis", async () => {
    const specification: WalkChainSpecification = {
        head: (apiMock as ApiPromiseMock).chain.head,
        api: apiMock as ApiPromise,
    };
    const blockNumbers: number[] = [];
    const visitor: BlockVisitor = {
        stopWalk: _ => false,
        continueWalk: _ => true,
        consumeBlock: block => blockNumbers.push(block.header.number.toNumber()),
    };
    await walkChain(visitor, specification);
    expect(blockNumbers.length).toBe(1000);
});

test("Fetch extrinsics since block and list", async () => {
    const specification: unknown = {
        head: (apiMock as ApiPromiseMock).chain.head,
        api: apiMock,
        maxResults: 10,
        matcher: (extrinsic: any) => extrinsic.method.section === "timestamp",
        since: {
            head: (apiMock as ApiPromiseMock).chain.chain[TOTAL_BLOCKS - 3].hash,
            extrinsics: extrinsicsMock(10)
        }
    };
    const result = await fetchExtrinsics(specification as ExtrinsicFetchSpecification);
    expect(result.extrinsics.length).toBe(10);
});

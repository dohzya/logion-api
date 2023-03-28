import { transferTokens, failedTransfer } from "./Balances.js";
import { addCollectionItemTest, closeCollectionLocTest, createCollectionLocLimitedInSizeTest } from "./CollectionLoc.js";
import { addGuardian } from "./LoAuthorityList.js";
import { queryInfos } from "./Query.js";
import { addFileToTransactionLocTest, createTransactionLocTest } from "./TransactionLoc.js";
import { createVote } from "./Vote.js";
import { verifiedIssuers } from "./VerifiedIssuers.js";
import { fees } from "./Fees.js";

describe("Logion Node API", () => {

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 300000;

    it("queries extrinsic infos", queryInfos);

    it("transfers logion tokens", transferTokens);
    it("fails transferring more logion tokens than available", failedTransfer);

    it("creates transaction LOCs", createTransactionLocTest);
    it("adds file to transaction LOC", addFileToTransactionLocTest);

    it("creates collection LOC limited in size", createCollectionLocLimitedInSizeTest);
    it("closes collection LOC", closeCollectionLocTest);
    it("adds collection item", addCollectionItemTest);

    it("creates a vote", createVote);

    it("adds guest guardian", addGuardian);

    it("supports verified issuers", verifiedIssuers);

    it("queries file storage fees", fees);
});

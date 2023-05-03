import { Adapters, ItemFile, ItemToken, TermsAndConditionsElement, UUID } from "../src/index.js";

describe("Adapters", () => {

    it("toLocId", () => {
        const locId = new UUID();
        const adapted = Adapters.toLocId(locId);
        expect(adapted).toBe(locId.toHexString());
    });

    it("toCollectionItemFile", () => {
        const itemFile: ItemFile = {
            name: "artwork.png",
            contentType: "image/png",
            size: BigInt(256000),
            hash: "0x91820202c3d0fea0c494b53e3352f1934bc177484e3f41ca2c4bca4572d71cd2",
        };
        const adapted = Adapters.toCollectionItemFile(itemFile);
        expect(adapted.contentType).toBe(itemFile.contentType);
        expect(adapted.hash_).toBe(itemFile.hash);
        expect(adapted.size_).toBe(itemFile.size);
        expect(adapted.name).toBe(itemFile.name);
    });

    it("toCollectionItemToken", () => {
        const itemToken: ItemToken = {
            type: "ethereum_erc721",
            id: '{"contract":"0x765df6da33c1ec1f83be42db171d7ee334a46df5","token":"4391"}',
        };
        const adapted = Adapters.toCollectionItemToken(itemToken);
        expect(adapted?.tokenId).toBe(itemToken.id);
        expect(adapted?.tokenType).toBe(itemToken.type);
    });

    it("toTermsAndConditionsElement", () => {
        const termsAndConditions: TermsAndConditionsElement = {
            tcType: "Logion",
            tcLocId: new UUID(),
            details: "ITEM-A, ITEM-B, ITEM-C"
        };
        const adapted = Adapters.toTermsAndConditionsElement(termsAndConditions);
        expect(adapted.tcType).toBe(termsAndConditions.tcType);
        expect(adapted.tcLoc).toBe(termsAndConditions.tcLocId.toHexString());
        expect(adapted.details).toBe(termsAndConditions.details);
    });
});
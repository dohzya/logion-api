import { ClosedLoc, LocRequestState } from "../src";
import { LegalOfficerWorker, NEW_ADDRESS, State, VTP_ADDRESS } from "./Utils";

export async function verifiedThirdParty(state: State) {
    const { alice } = state;
    const legalOfficer = new LegalOfficerWorker(alice, state);

    const vtpClient = state.client.withCurrentAddress(VTP_ADDRESS);

    let vtpLocsState = await vtpClient.locsState();
    const pendingRequest = await vtpLocsState.requestIdentityLoc({
        legalOfficer: alice,
        description: "This is a VTP Identity LOC",
        userIdentity: {
            email: "john.doe.trusted@invalid.domain",
            firstName: "John",
            lastName: "Trusted",
            phoneNumber: "+1234",
        },
        userPostalAddress: {
            line1: "Peace Street",
            line2: "2nd floor",
            postalCode: "10000",
            city: "MyCity",
            country: "Wonderland"
        },
        draft: false,
    });
    await legalOfficer.createValidIdentityLoc(pendingRequest.locId, VTP_ADDRESS);
    const closedIdentityLoc = await pendingRequest.refresh() as ClosedLoc;

    await legalOfficer.nominateVerifiedThirdParty(closedIdentityLoc.locId);

    const userClient = state.client.withCurrentAddress(NEW_ADDRESS);
    let newLoc: LocRequestState = await (await userClient.locsState()).requestTransactionLoc({
        legalOfficer: alice,
        description: "Some LOC with VTP",
        draft: false,
    });
    await legalOfficer.openTransactionLoc(newLoc.locId, NEW_ADDRESS);
    await legalOfficer.selectVtp(newLoc.locId, closedIdentityLoc.locId);
    newLoc = await newLoc.refresh();
    expect(newLoc.data().selectedParties.length).toBe(1);
    expect(newLoc.data().selectedParties[0].identityLocId).toBe(closedIdentityLoc.locId.toString());

    vtpLocsState = await vtpClient.locsState();
    expect(vtpLocsState.openVerifiedThirdPartyLocs["Transaction"].length).toBe(1);
}

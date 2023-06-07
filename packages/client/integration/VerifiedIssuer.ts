import {
    ClosedLoc,
    EditableRequest,
    HashOrContent,
    LocRequestState,
    AcceptedRequest,
    PendingRequest, OpenLoc
} from "../src/index.js";
import { LegalOfficerWorker, State, ISSUER_ADDRESS, initRequesterBalance, TEST_LOGION_CLIENT_CONFIG } from "./Utils.js";

export async function verifiedIssuer(state: State) {
    const { alice, issuerAccount, newAccount, signer } = state;
    const legalOfficer = new LegalOfficerWorker(alice, state);

    const issuerClient = state.client.withCurrentAddress(issuerAccount);

    await initRequesterBalance(TEST_LOGION_CLIENT_CONFIG, signer, ISSUER_ADDRESS);
    let issuerLocsState = await issuerClient.locsState();
    const pendingRequest = await issuerLocsState.requestIdentityLoc({
        legalOfficer: issuerClient.getLegalOfficer(alice.address),
        description: "This is a verified issuer Identity LOC",
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
    await legalOfficer.acceptLoc(pendingRequest.locId);

    const acceptedIdentityLoc = await pendingRequest.refresh() as AcceptedRequest;
    const openIdentityLoc = await acceptedIdentityLoc.open({ signer });

    await legalOfficer.closeLoc(pendingRequest.locId);
    const closedIdentityLoc = await openIdentityLoc.refresh() as ClosedLoc;

    await legalOfficer.nominateVerifiedIssuer(ISSUER_ADDRESS, closedIdentityLoc.locId);

    const userClient = state.client.withCurrentAddress(newAccount);
    const userLocsState = await userClient.locsState();
    let pendingLocRequest = await userLocsState.requestTransactionLoc({
        legalOfficer: userClient.getLegalOfficer(alice.address),
        description: "Some LOC with verified issuer",
        draft: false,
    }) as PendingRequest;
    const locId = pendingLocRequest.locId;
    await legalOfficer.acceptLoc(locId);

    let acceptedLoc = await pendingLocRequest.refresh() as AcceptedRequest;
    let newLoc = await acceptedLoc.open({ signer });

    await legalOfficer.selectIssuer(locId, ISSUER_ADDRESS, true);
    newLoc = await newLoc.refresh() as OpenLoc;
    expect(newLoc.data().issuers.length).toBe(1);
    expect(newLoc.data().issuers[0].identityLocId).toBe(closedIdentityLoc.locId.toString());
    expect(newLoc.data().issuers[0].selected).toBe(true);

    issuerLocsState = await issuerClient.locsState();
    expect(issuerLocsState.openVerifiedIssuerLocs["Transaction"].length).toBe(1);
    let issuerLoc = issuerLocsState.findById(locId);

    let openIssuerLoc = await issuerLoc.refresh() as EditableRequest;
    openIssuerLoc = await openIssuerLoc.addMetadata({
        name: "Verified issuer data name",
        value: "Verified issuer data value"
    });
    openIssuerLoc = await openIssuerLoc.deleteMetadata({ name: "Verified issuer data name" });

    const file = HashOrContent.fromContent(Buffer.from("test"));
    openIssuerLoc = await openIssuerLoc.addFile({
        fileName: "test.txt",
        nature: "Some file nature",
        file,
    });
    openIssuerLoc = await openIssuerLoc.deleteFile({ hash: file.contentHash });

    await legalOfficer.selectIssuer(newLoc.locId, ISSUER_ADDRESS, false);
    const userLoc = (await userClient.locsState()).findById(locId);
    expect(userLoc.data().issuers.length).toBe(1);
    expect(userLoc.data().issuers[0].identityLocId).toBe(closedIdentityLoc.locId.toString());
    expect(userLoc.data().issuers[0].selected).toBe(false);
}
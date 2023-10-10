import { ValidAccountId, buildApiClass } from "@logion/node-api";

import {
    AcceptedProtection,
    FullSigner,
    LegalOfficer,
    LogionClient,
    NoProtection,
    PendingRecovery,
    PendingProtection,
    RejectedProtection,
    LogionClientConfig,
    ClaimedRecovery,
} from "../src/index.js";
import { acceptRequest, rejectRequest } from "./Protection.js";
import { aliceAcceptsTransfer } from "./Vault.js";
import { initRequesterBalance, NEW_ADDRESS, REQUESTER_ADDRESS, State } from "./Utils.js";

export async function requestRecoveryAndCancel(state: State) {
    const { client, signer, alice, aliceAccount, charlie, charlieAccount } = state;

    const pending = await requestRecovery(state) as PendingProtection;

    console.log("LO's - Alice and Bob Rejecting")
    await rejectRequest(client, signer, charlie, charlieAccount, NEW_ADDRESS, "Your protection request is not complete");
    await rejectRequest(client, signer, alice, aliceAccount, NEW_ADDRESS, "Some info is missing");

    const rejected = await pending.refresh() as RejectedProtection;

    const cancelled = await rejected.cancel();
    expect(cancelled).toBeInstanceOf(NoProtection);
}

export async function requestRecoveryWithResubmit(state: State) {
    const { client, signer, alice, aliceAccount, charlie, charlieAccount } = state;

    const requested = await requestRecovery(state);

    console.log("LO's - Alice Rejecting")
    await rejectRequest(client, signer, alice, aliceAccount, NEW_ADDRESS, "for some reason");

    console.log("User resubmitting to Alice");
    const rejected = await requested.refresh() as RejectedProtection;
    const pending = await rejected.resubmit(alice);

    console.log("LO's - Accepting and vouching")
    await acceptRequestAndVouch(client.config, client, signer, alice, aliceAccount, REQUESTER_ADDRESS, NEW_ADDRESS);
    await acceptRequestAndVouch(client.config, client, signer, charlie, charlieAccount, REQUESTER_ADDRESS, NEW_ADDRESS);

    console.log("Activating")
    const accepted = await pending.refresh() as AcceptedProtection;
    let pendingRecovery = await accepted.activate(signer) as PendingRecovery;
    pendingRecovery = await pendingRecovery.waitForFullyReady();

    console.log("Claiming")
    await pendingRecovery.claimRecovery(signer);
}

export async function recoverLostVault(state: State) {
    const { signer, alice } = state;

    const claimed = await getClaimedRecovery(state);

    console.log("Transfer from recovered vault")
    const newVault = await claimed.vaultState();
    let recoveredVault = await claimed.recoveredVaultState();
    recoveredVault = await recoveredVault.createVaultTransferRequest({
        legalOfficer: alice,
        amount: recoveredVault.balances[0].available,
        destination: newVault.vaultAddress,
        signer,
    });
    const pendingRequest = recoveredVault.pendingVaultTransferRequests[0];

    console.log("Alice accepts transfer from recovered vault")
    await aliceAcceptsTransfer(state, pendingRequest, claimed);
}

async function getClaimedRecovery(state: State) {
    const { client, newAccount } = state;
    const authenticatedClient = client.withCurrentAddress(newAccount);
    const accepted = await authenticatedClient.protectionState() as ClaimedRecovery;
    expect(accepted).toBeInstanceOf(ClaimedRecovery);
    return accepted;
}

export async function recoverLostAccount(state: State) {
    const { signer } = state;

    const claimed = await getClaimedRecovery(state);

    console.log("Transfer from recovered account")
    const recoveredBalance = await claimed.recoveredBalanceState();
    await recoveredBalance.transferAll({
        signer,
        destination: NEW_ADDRESS,
    });
}

async function requestRecovery(state: State): Promise<PendingProtection> {
    const { client, signer, alice, charlie, newAccount } = state;

    await initRequesterBalance(client.config, signer, NEW_ADDRESS);

    const authenticatedClient = client.withCurrentAddress(newAccount);

    const current = await authenticatedClient.protectionState();
    expect(current).toBeInstanceOf(NoProtection);
    if(current instanceof NoProtection) {
        console.log("Requesting recovery")
        return await current.requestRecovery({
            recoveredAddress: REQUESTER_ADDRESS,
            signer,
            legalOfficer1: authenticatedClient.getLegalOfficer(alice.address),
            legalOfficer2: authenticatedClient.getLegalOfficer(charlie.address),
            userIdentity: {
                email: "john.doe@invalid.domain",
                firstName: "John",
                lastName: "Doe",
                phoneNumber: "+1234",
            },
            postalAddress: {
                city: "",
                country: "",
                line1: "",
                line2: "",
                postalCode: "",
            }
        });
    } else {
        throw new Error("Unexpected state, aborting");
    }
}

async function acceptRequestAndVouch(
    config: LogionClientConfig,
    client: LogionClient,
    signer: FullSigner,
    legalOfficer: LegalOfficer,
    legalOfficerAccount: ValidAccountId,
    lostAddress: string,
    requesterAddress: string,
) {
    await acceptRequest(config, client, signer, legalOfficer, legalOfficerAccount, requesterAddress)
    await vouchRecovery(config, signer, legalOfficer, lostAddress, requesterAddress)
}

async function vouchRecovery(
    config: LogionClientConfig,
    signer: FullSigner,
    legalOfficerAddress: LegalOfficer,
    lost: string,
    rescuer: string,
): Promise<void> {
    const api = await buildApiClass(config.rpcEndpoints);
    await signer.signAndSend({
        signerId: legalOfficerAddress.address,
        submittable: api.polkadot.tx.recovery.vouchRecovery(lost, rescuer)
    })
}

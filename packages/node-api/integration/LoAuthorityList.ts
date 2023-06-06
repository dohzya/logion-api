import { ALICE, DAVE, setup, signAndSend } from "./Util.js";

export async function addGuestLegalOfficer() {
    const { alice, api } = await setup();
    const extrinsic = api.polkadot.tx.loAuthorityList.addLegalOfficer(DAVE, {
        Guest: ALICE,
    });
    const sudoExtrinsic = api.polkadot.tx.sudo.sudo(extrinsic);
    const result = await signAndSend(alice, sudoExtrinsic);
    expect(result.dispatchError).not.toBeDefined();
    const entry = await api.polkadot.query.loAuthorityList.legalOfficerSet(DAVE);
    expect(entry.isSome).toBe(true);
    const host = entry.unwrap().asGuest;
    expect(host.toString()).toBe(ALICE);
}

export async function updateHostLegalOfficer() {
    const { alice, api } = await setup();
    const data = api.adapters.toPalletLoAuthorityListLegalOfficerDataHost({
        nodeId: "12D3KooWBmAwcd4PJNJvfV89HwE48nwkRmAgo8Vy3uQEyNNHBox2",
        region: "Europe",
    });
    const extrinsic = api.polkadot.tx.loAuthorityList.updateLegalOfficer(ALICE, data);
    const sudoExtrinsic = api.polkadot.tx.sudo.sudo(extrinsic);
    const result = await signAndSend(alice, sudoExtrinsic);
    expect(result.dispatchError).not.toBeDefined();

    const entry = await api.polkadot.query.loAuthorityList.legalOfficerSet(ALICE);
    expect(entry.isSome).toBe(true);
    const hostData = entry.unwrap().asHost;
    expect(hostData.region.isEurope).toBe(true);
    expect(api.adapters.fromLogionNodeRuntimeRegion(hostData.region)).toBe("Europe");
}

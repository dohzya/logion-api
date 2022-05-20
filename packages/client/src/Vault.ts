import { buildCancelVaultTransferCall, buildVaultTransferCall, cancelVaultTransfer, getVaultAddress, requestVaultTransfer } from "@logion/node-api/dist/Vault";
import { PrefixedNumber, LGNT_SMALLEST_UNIT } from "@logion/node-api";
import { asRecovered } from "@logion/node-api/dist/Recovery";
import { CoinBalance, getBalances } from "@logion/node-api/dist/Balances";
import type { SubmittableExtrinsic } from '@polkadot/api/promise/types';

import { SharedState } from "./SharedClient";
import { SignCallback, Signer } from "./Signer";
import { LegalOfficer } from "./Types";
import { requestSort, VaultClient, VaultTransferRequest } from "./VaultClient";
import { Transaction, TransactionClient } from "./TransactionClient";

export interface VaultSharedState extends SharedState {
    client: VaultClient,
    pendingVaultTransferRequests: VaultTransferRequest[],
    cancelledVaultTransferRequests: VaultTransferRequest[],
    rejectedVaultTransferRequests: VaultTransferRequest[],
    acceptedVaultTransferRequests: VaultTransferRequest[],
    selectedLegalOfficers: LegalOfficer[],
    isRecovery: boolean,
    recoveredAddress?: string,
    balances: CoinBalance[],
    transactions: Transaction[],
}

export type VaultStateCreationParameters = SharedState & { selectedLegalOfficers: LegalOfficer[], isRecovery: boolean, recoveredAddress?: string };

export class VaultState {

    static async create(sharedState: VaultStateCreationParameters): Promise<VaultState> {
        const currentAddress = sharedState.currentAddress!;
        const client = new VaultClient({
            axiosFactory: sharedState.axiosFactory,
            networkState: sharedState.networkState,
            currentAddress,
            token: sharedState.tokens.get(currentAddress)!.value,
            isLegalOfficer: sharedState.legalOfficers.find(legalOfficer => legalOfficer.address === currentAddress) !== undefined,
            isRecovery: sharedState.isRecovery,
        });
        const result = await client.fetchAll(sharedState.selectedLegalOfficers);

        const vaultAddress = VaultState.getVaultAddress(sharedState);
        const transactionClient = VaultState.newTransactionClient(vaultAddress, sharedState);
        const transactions = await transactionClient.fetchTransactions();
        const balances = await getBalances({ api: sharedState.nodeApi, accountId: vaultAddress });

        const isRecovery = sharedState.isRecovery;
        return new VaultState({
            ...sharedState,
            ...result,
            transactions,
            balances,
            client,
            isRecovery,
        });
    }

    private static newTransactionClient(vaultAddress: string, sharedState: VaultStateCreationParameters): TransactionClient {
        return new TransactionClient({
            axiosFactory: sharedState.axiosFactory,
            currentAddress: vaultAddress,
            networkState: sharedState.networkState,
        })
    }

    private static getVaultAddress(sharedState: VaultStateCreationParameters): string {
        if(sharedState.isRecovery) {
            return getVaultAddress(sharedState.recoveredAddress!, sharedState.selectedLegalOfficers.map(legalOfficer => legalOfficer.address));
        } else {
            return getVaultAddress(sharedState.currentAddress!, sharedState.selectedLegalOfficers.map(legalOfficer => legalOfficer.address));
        }
    }

    constructor(state: VaultSharedState) {
        this.sharedState = state;
    }

    private sharedState: VaultSharedState;

    get pendingVaultTransferRequests() {
        return this.sharedState.pendingVaultTransferRequests;
    }

    get cancelledVaultTransferRequests() {
        return this.sharedState.cancelledVaultTransferRequests;
    }

    get rejectedVaultTransferRequests() {
        return this.sharedState.rejectedVaultTransferRequests;
    }

    get acceptedVaultTransferRequests() {
        return this.sharedState.acceptedVaultTransferRequests;
    }

    async createVaultTransferRequest(params: {
        legalOfficer: LegalOfficer,
        amount: PrefixedNumber,
        destination: string,
        signer: Signer,
        callback?: SignCallback,
    }): Promise<VaultState> {
        const { amount, destination, signer, callback, legalOfficer } = params;

        const signerId = this.sharedState.currentAddress!;

        let submittable: SubmittableExtrinsic;
        if(this.sharedState.isRecovery) {
            submittable = await this.recoveryTransferSubmittable({ amount, destination });
        } else {
            submittable = await this.regularTransferSubmittable({ amount, destination });
        }

        const successfulSubmission = await signer.signAndSend({
            signerId,
            submittable,
            callback,
        });

        let origin: string;
        if(this.sharedState.isRecovery) {
            origin = this.sharedState.recoveredAddress!;
        } else {
            origin = signerId;
        }
        const blockHeader = await this.sharedState.nodeApi.rpc.chain.getHeader(successfulSubmission.block);
        const newPendingRequest = await this.sharedState.client.createVaultTransferRequest(legalOfficer, {
            origin,
            destination,
            block: blockHeader.number.toString(),
            index: successfulSubmission.index,
            amount: amount.convertTo(LGNT_SMALLEST_UNIT).coefficient.unnormalize().toString(),
        });

        const pendingVaultTransferRequests = this.sharedState.pendingVaultTransferRequests.concat([ newPendingRequest ]).sort(requestSort);

        return new VaultState({
            ...this.sharedState,
            pendingVaultTransferRequests,
        });
    }

    private async recoveryTransferSubmittable(params: {
        destination: string,
        amount: PrefixedNumber,
    }): Promise<SubmittableExtrinsic> {
        const { destination, amount } = params;
        const call = await buildVaultTransferCall({
            api: this.sharedState.nodeApi,
            requesterAddress: this.sharedState.recoveredAddress!,
            destination,
            legalOfficers: this.sharedState.selectedLegalOfficers.map(legalOfficer => legalOfficer.address),
            amount: amount,
        });
        return asRecovered({
            api: this.sharedState.nodeApi,
            recoveredAccountId: this.sharedState.recoveredAddress!,
            call
        });
    }

    private regularTransferSubmittable(params: {
        destination: string,
        amount: PrefixedNumber,
    }): Promise<SubmittableExtrinsic> {
        const { destination, amount } = params;
        return requestVaultTransfer({
            signerId: this.sharedState.currentAddress!,
            api: this.sharedState.nodeApi,
            amount,
            destination,
            legalOfficers: this.sharedState.selectedLegalOfficers.map(legalOfficer => legalOfficer.address),
        });
    }

    async cancelVaultTransferRequest(
        legalOfficer: LegalOfficer,
        request: VaultTransferRequest,
        signer: Signer,
        callback?: SignCallback,
    ): Promise<VaultState> {
        const signerId = this.sharedState.currentAddress!;
        const amount = new PrefixedNumber(request.amount, LGNT_SMALLEST_UNIT);

        let submittable: SubmittableExtrinsic;
        if(this.sharedState.isRecovery) {
            const call = buildCancelVaultTransferCall({
                api: this.sharedState.nodeApi,
                block: BigInt(request.block),
                index: request.index,
                legalOfficers: this.sharedState.selectedLegalOfficers.map(legalOfficer => legalOfficer.address),
                destination: request.destination,
                amount,
            });
            submittable = asRecovered({
                api: this.sharedState.nodeApi,
                recoveredAccountId: request.origin,
                call
            });
        } else {
            submittable = cancelVaultTransfer({
                api: this.sharedState.nodeApi,
                destination: request.destination,
                amount,
                block: BigInt(request.block),
                index: request.index,
                legalOfficers: this.sharedState.selectedLegalOfficers.map(legalOfficer => legalOfficer.address),
            });
        }

        await signer.signAndSend({
            signerId,
            submittable,
            callback,
        });

        await this.sharedState.client.cancelVaultTransferRequest(legalOfficer, request);

        const cancelledRequest: VaultTransferRequest = {
            ...request,
            status: request.status === "PENDING" ? "CANCELLED" : "REJECTED_CANCELLED",
        };

        let pendingVaultTransferRequests = this.sharedState.pendingVaultTransferRequests;
        if(request.status === "PENDING") {
            pendingVaultTransferRequests = pendingVaultTransferRequests.filter(pendingRequest => request.id !== pendingRequest.id);
        }

        let cancelledVaultTransferRequests = this.sharedState.cancelledVaultTransferRequests.concat([ cancelledRequest ]).sort(requestSort);

        let rejectedVaultTransferRequests = this.sharedState.rejectedVaultTransferRequests;
        if(request.status === "REJECTED") {
            rejectedVaultTransferRequests = rejectedVaultTransferRequests.filter(rejectedRequest => request.id !== rejectedRequest.id);
        }

        return new VaultState({
            ...this.sharedState,
            pendingVaultTransferRequests,
            cancelledVaultTransferRequests,
            rejectedVaultTransferRequests,
        });
    }

    async resubmitVaultTransferRequest(
        legalOfficer: LegalOfficer,
        request: VaultTransferRequest,
    ): Promise<VaultState> {
        await this.sharedState.client.resubmitVaultTransferRequest(legalOfficer, request);

        const resubmittedRequest: VaultTransferRequest = {
            ...request,
            status: "PENDING",
        };

        const pendingVaultTransferRequests = this.sharedState.pendingVaultTransferRequests.concat([ resubmittedRequest ]).sort(requestSort);

        let rejectedVaultTransferRequests = this.sharedState.rejectedVaultTransferRequests;
        if(request.status === "REJECTED") {
            rejectedVaultTransferRequests = rejectedVaultTransferRequests.filter(rejectedRequest => request.id !== rejectedRequest.id);
        }

        return new VaultState({
            ...this.sharedState,
            pendingVaultTransferRequests,
            rejectedVaultTransferRequests,
        });
    }

    async refresh(): Promise<VaultState> {
        const result = await this.sharedState.client.fetchAll(this.sharedState.legalOfficers);
        const transactionClient = VaultState.newTransactionClient(this.vaultAddress, this.sharedState);
        const transactions = await transactionClient.fetchTransactions();
        const balances = await getBalances({ api: this.sharedState.nodeApi, accountId: this.vaultAddress });
        return new VaultState({
            ...this.sharedState,
            ...result,
            transactions,
            balances,
        });
    }

    get vaultAddress(): string {
        return VaultState.getVaultAddress(this.sharedState);
    }

    get transactions(): Transaction[] {
        return this.sharedState.transactions;
    }

    get balances(): CoinBalance[] {
        return this.sharedState.balances;
    }
}

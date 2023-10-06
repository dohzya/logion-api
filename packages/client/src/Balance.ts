import {
    CoinBalance,
    Numbers,
    Currency,
} from "@logion/node-api";
import type { SubmittableExtrinsic } from '@polkadot/api/promise/types'; 

import { Transaction, TransactionClient } from "./TransactionClient.js";
import { SignCallback, Signer } from "./Signer.js";
import { SharedState } from "./SharedClient.js";
import { State } from "./State.js";

export interface TransferParam {
    signer: Signer;
    destination: string;
    amount: Numbers.PrefixedNumber;
    callback?: SignCallback;
}

export interface BalanceSharedState extends SharedState {
    readonly balances: CoinBalance[];
    readonly transactions: Transaction[];
    readonly isRecovery: boolean;
    readonly recoveredAddress?: string;
}

export async function getBalanceState(sharedState: SharedState & { isRecovery: boolean, recoveredAddress?: string }): Promise<BalanceState> {
    let targetAddress;
    if(sharedState.isRecovery) {
        targetAddress = sharedState.recoveredAddress || "";
    } else {
        targetAddress = sharedState.currentAddress?.address || "";
    }
    const client = newTransactionClient(targetAddress, sharedState);
    const transactions = await client.fetchTransactions();
    const balances = await sharedState.nodeApi.queries.getCoinBalances(targetAddress);
    return new BalanceState({
        ...sharedState,
        transactions,
        balances,
    });
}

function newTransactionClient(currentAddress: string, sharedState: SharedState): TransactionClient {
    return new TransactionClient({
        axiosFactory: sharedState.axiosFactory,
        networkState: sharedState.networkState,
        currentAddress,
    })
}

export class BalanceState extends State {

    constructor(state: BalanceSharedState) {
        super();
        this.sharedState = state;
    }

    private sharedState: BalanceSharedState;

    get transactions(): Transaction[] {
        return this.sharedState.transactions;
    }

    get balances(): CoinBalance[] {
        return this.sharedState.balances;
    }

    async transfer(params: TransferParam): Promise<BalanceState> {
        return this.discardOnSuccess<BalanceState>(current => current._transfer(params));
    }

    private async _transfer(params: TransferParam): Promise<BalanceState> {
        const { signer, destination, amount, callback } = params;

        const canonicalAmount = Currency.toCanonicalAmount(amount);

        let submittable: SubmittableExtrinsic;
        if(this.sharedState.isRecovery) {
            submittable = this.sharedState.nodeApi.polkadot.tx.recovery.asRecovered(
                this.sharedState.recoveredAddress || "",
                this.sharedState.nodeApi.polkadot.tx.balances.transferKeepAlive(
                    destination,
                    canonicalAmount,
                )
            );
            await this.ensureFundsForFees(submittable);
            const recoveredAccountData = await this.sharedState.nodeApi.queries.getAccountData(this.sharedState.recoveredAddress || "");
            const transferable = BigInt(recoveredAccountData.available);
            if(transferable < canonicalAmount) {
                throw new Error("Insufficient balance");
            }
        } else {
            submittable = this.sharedState.nodeApi.polkadot.tx.balances.transferKeepAlive(
                destination,
                canonicalAmount,
            );
            const fees = await this.ensureFundsForFees(submittable);
            const available = Currency.toCanonicalAmount(this.balances[0].available);
            const transferable = available - fees;
            if(transferable < canonicalAmount) {
                throw new Error("Insufficient balance");
            }
        }

        await signer.signAndSend({
            signerId: this.sharedState.currentAddress?.address || "",
            submittable,
            callback,
        })

        return this._refresh();
    }

    private async ensureFundsForFees(submittable: SubmittableExtrinsic): Promise<bigint> {
        const fees = await this.sharedState.nodeApi.fees.estimateWithoutStorage({
            origin: this.sharedState.currentAddress?.address || "",
            submittable,
        });
        const available = Currency.toCanonicalAmount(this.balances[0].available);
        if(available < fees.totalFee) {
            throw new Error("Not enough funds available to pay fees");
        }
        return fees.totalFee;
    }

    private async _refresh(): Promise<BalanceState> {
        return getBalanceState(this.sharedState);
    }

    async refresh(): Promise<BalanceState> {
        return this.discardOnSuccess<BalanceState>(current => current._refresh());
    }
}

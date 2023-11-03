import { LogionNodeApiClass, ValidAccountId } from "@logion/node-api";

import { AccountTokens } from "./AuthenticationClient.js";
import { AxiosFactory } from "./AxiosFactory.js";
import { findOrThrow } from "./Collections.js";
import { ComponentFactory, FileUploader } from "./ComponentFactory.js";
import { DirectoryClient } from "./DirectoryClient.js";
import { Endpoint, Token } from "./Http.js";
import { NetworkState } from "./NetworkState.js";
import { LegalOfficerClass } from "./Types.js";

export interface LogionClientConfig {
    rpcEndpoints: string[];
    directoryEndpoint: string;
    buildFileUploader: () => FileUploader;
}

export interface LegalOfficerEndpoint extends Endpoint {
    legalOfficer: string;
}

export interface SharedState {
    config: LogionClientConfig;
    componentFactory: ComponentFactory;
    axiosFactory: AxiosFactory;
    directoryClient: DirectoryClient;
    networkState: NetworkState<LegalOfficerEndpoint>;
    nodeApi: LogionNodeApiClass;
    legalOfficers: LegalOfficerClass[];
    allLegalOfficers: LegalOfficerClass[];
    tokens: AccountTokens;
    currentAddress?: ValidAccountId;
}

export function getLegalOfficer(sharedState: SharedState, address: string): LegalOfficerClass {
    return findOrThrow(sharedState.legalOfficers, lo => lo.address === address, `No legal officer with address ${address}`);
}

export function authenticatedCurrentAddress(sharedState: SharedState): { currentAddress: ValidAccountId, token: Token } {
    const currentAddress = getDefinedCurrentAddress(sharedState);
    const token = sharedState.tokens.get(currentAddress);
    if(!token) {
        throw new Error("Current address is not authenticated");
    }
    return {
        currentAddress,
        token
    };
}

export function getDefinedCurrentAddress(sharedState: SharedState): ValidAccountId {
    const { currentAddress } = sharedState;
    if(!currentAddress) {
        throw new Error("No current address");
    }
    return currentAddress;
}

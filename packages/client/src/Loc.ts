import {
    UUID,
    LegalOfficerCase,
    LocType,
    VoidInfo,
    ValidAccountId,
    LogionNodeApiClass,
    LocBatch,
    Hash,
    Fees as FeesClass,
} from "@logion/node-api";

import {
    LocRequest,
    LocClient,
    AddMetadataParams,
    DeleteMetadataParams,
    LocMultiClient,
    LocLink,
    LocMetadataItem,
    LocFile,
    AddFileParams,
    DeleteFileParams,
    AddCollectionItemParams,
    LocRequestVoidInfo,
    LocRequestStatus,
    Published,
    ItemFileWithContent,
    AuthenticatedLocClient,
    FetchAllLocsParams,
    IdenfyVerificationSession,
    LocVerifiedIssuers,
    EMPTY_LOC_ISSUERS,
    AddTokensRecordParams,
    GetTokensRecordsRequest,
    ReviewFileParams,
    BlockchainSubmissionParams,
    AckFileParams,
    ReviewMetadataParams,
    AckMetadataParams,
    OpenCollectionLocParams,
    AddLinkParams,
    DeleteLinkParams,
    VoidParams,
    VerifiedIssuer,
    UploadableItemFile,
    ItemStatus,
    AddedOn,
    EstimateFeesAckFileParams,
    EstimateFeesAckMetadataParams,
    EstimateFeesPublishFileParams,
    EstimateFeesPublishMetadataParams,
    EstimateFeesPublishLinkParams,
    EstimateFeesOpenCollectionLocParams, OpenPolkadotLocParams,
} from "./LocClient.js";
import { SharedState } from "./SharedClient.js";
import { LegalOfficer, UserIdentity, PostalAddress, LegalOfficerClass } from "./Types.js";
import { CollectionItem as CollectionItemClass } from "./CollectionItem.js";
import { State } from "./State.js";
import { LogionClient } from "./LogionClient.js";
import { TokensRecord as TokensRecordClass } from "./TokensRecord.js";
import { downloadFile, TypedFile } from "./Http.js";
import { requireDefined } from "./assertions.js";
import { Fees } from "./Fees.js";
import { HashString } from "./Hash.js";

export interface LocData extends LocVerifiedIssuers {
    id: UUID
    ownerAddress: string;
    requesterAddress?: ValidAccountId;
    requesterLocId?: UUID;
    description: string;
    locType: LocType;
    closed: boolean;
    createdOn: string;
    decisionOn?: string;
    closedOn?: string;
    status: LocRequestStatus;
    voidInfo?: LocRequestVoidInfo & VoidInfo
    replacerOf?: UUID;
    rejectReason?: string;
    identityLocId?: UUID;
    userIdentity?: UserIdentity;
    userPostalAddress?: PostalAddress;
    collectionLastBlockSubmission?: bigint;
    collectionMaxSize?: number;
    collectionCanUpload?: boolean;
    files: MergedFile[];
    metadata: MergedMetadataItem[];
    links: MergedLink[];
    seal?: string;
    company?: string;
    iDenfy?: IdenfyVerificationSession;
    voteId?: string;
    template?: string;
    sponsorshipId?: UUID;
    valueFee?: bigint;
}

export interface MergedLink extends LocLink, Published {
}

export interface MergedFile extends Partial<AddedOn>, Published {
    hash: Hash;
    nature: string;
    name: string;
    restrictedDelivery: boolean;
    contentType: string;
    fees?: Fees;
    storageFeePaidBy?: string;
    status: ItemStatus;
    rejectReason?: string;
    reviewedOn?: string;
    submitter: ValidAccountId;
    size: bigint;
}

export interface MergedMetadataItem extends Partial<AddedOn>, Published {
    name: string;
    nameHash: Hash;
    value: string;
    fees?: Fees;
    status: ItemStatus;
    rejectReason?: string;
    reviewedOn?: string;
    submitter: ValidAccountId;
}

export class LocsState extends State {
    private readonly sharedState: SharedState;
    private _locs: Record<string, LocRequestState>;
    private _verifiedIssuerLocs: Record<string, LocRequestState>;
    private readonly _client: LogionClient;

    constructor(
        sharedState: SharedState,
        locs: Record<string, LocRequestState>,
        client: LogionClient,
        verifiedIssuerLocs: Record<string, LocRequestState>
    ) {
        super();
        this.sharedState = sharedState;
        this._locs = locs;
        this._verifiedIssuerLocs = verifiedIssuerLocs;
        this._client = client;
    }

    get draftRequests(): Record<LocType, DraftRequest[]> {
        this.ensureCurrent();
        return this.withPredicate(this._locs, loc => loc instanceof DraftRequest);
    }

    get openLocs(): Record<LocType, OpenLoc[]> {
        this.ensureCurrent();
        return this.withPredicate(this._locs, loc => loc instanceof OpenLoc);
    }

    get closedLocs(): Record<LocType, (ClosedLoc | ClosedCollectionLoc)[]> {
        this.ensureCurrent();
        return this.withPredicate(this._locs, loc => loc instanceof ClosedLoc || loc instanceof ClosedCollectionLoc);
    }

    get voidedLocs(): Record<LocType, (VoidedLoc | VoidedCollectionLoc)[]> {
        this.ensureCurrent();
        return this.withPredicate(this._locs, loc => loc instanceof VoidedLoc || loc instanceof VoidedCollectionLoc);
    }

    get pendingRequests(): Record<LocType, PendingRequest[]> {
        this.ensureCurrent();
        return this.withPredicate(this._locs, loc => loc instanceof PendingRequest);
    }

    get rejectedRequests(): Record<LocType, RejectedRequest[]> {
        this.ensureCurrent();
        return this.withPredicate(this._locs, loc => loc instanceof RejectedRequest);
    }

    get acceptedRequests(): Record<LocType, AcceptedRequest[]> {
        this.ensureCurrent();
        return this.withPredicate(this._locs, loc => loc instanceof AcceptedRequest);
    }

    getLocRequestState(index: number): LocRequestState | undefined {
        const allLocs = Object.values(this._locs);
        if (index >= 0 && index < allLocs.length) {
            return allLocs[index];
        }
    }

    hasValidIdentityLoc(legalOfficer: LegalOfficer): boolean {
        this.ensureCurrent();
        return this.filter(this._locs, 'Identity', loc =>
            loc instanceof ClosedLoc &&
            loc.data().ownerAddress === legalOfficer.address
        ).length > 0;
    }

    get legalOfficersWithValidIdentityLoc(): LegalOfficerClass[] {
        this.ensureCurrent();
        return this.sharedState.legalOfficers.filter(lo => this.hasValidIdentityLoc(lo));
    }

    private withPredicate<T extends LocRequestState>(locs: Record<string, LocRequestState>, predicate: (l: LocRequestState) => boolean): Record<LocType, T[]> {
        return {
            'Transaction': this.filter(locs, 'Transaction', predicate),
            'Collection': this.filter(locs, 'Collection', predicate),
            'Identity': this.filter(locs, 'Identity', predicate),
        };
    }

    private filter<T extends LocRequestState>(locs: Record<string, LocRequestState>, locType: LocType, predicate: (loc: LocRequestState) => boolean): T[] {
        const filteredLocs = Object.values(locs)
            .filter(predicate)
            .filter(value => value.data().locType === locType)
        return filteredLocs as T[];
    }

    refreshWith(loc: LocRequestState): LocsState {
        return this.syncDiscardOnSuccess(() => this._refreshWith(loc));
    }

    private _refreshWith(loc: LocRequestState): LocsState {
        const locsState = new LocsState(this.sharedState, {}, this._client, {});
        const refreshedLocs = this.refreshStates(locsState, this._locs);
        const refreshedVerifiedIssuerLocs = this.refreshStates(locsState, this._verifiedIssuerLocs);
        if(this.isVerifiedIssuerLoc(loc)) {
            refreshedVerifiedIssuerLocs[loc.locId.toString()] = loc.withLocs(locsState);
        } else {
            refreshedLocs[loc.locId.toString()] = loc.withLocs(locsState);
        }
        locsState._locs = refreshedLocs;
        locsState._verifiedIssuerLocs = refreshedVerifiedIssuerLocs;
        return locsState;
    }

    private refreshStates(locsState: LocsState, states: Record<string, LocRequestState>): Record<string, LocRequestState> {
        const refreshedLocs: Record<string, LocRequestState> = {};
        for(const locId in states) {
            const state = states[locId];
            refreshedLocs[locId.toString()] = state.withLocs(locsState);
        }
        return refreshedLocs;
    }

    private isVerifiedIssuerLoc(loc: LocRequestState): boolean {
        return loc.locId.toString() in this._verifiedIssuerLocs;
    }

    refreshWithout(locId: UUID): LocsState {
        return this.syncDiscardOnSuccess(() => this._refreshWithout(locId));
    }

    private _refreshWithout(locId: UUID): LocsState {
        const refreshedLocs: Record<string, LocRequestState> = { ...this._locs };
        delete refreshedLocs[locId.toString()];
        const refreshedVerifiedIssuerLocs: Record<string, LocRequestState> = { ...this._verifiedIssuerLocs };
        delete refreshedVerifiedIssuerLocs[locId.toString()];
        return new LocsState(this.sharedState, refreshedLocs, this._client, refreshedVerifiedIssuerLocs);
    }

    static async getInitialLocsState(sharedState: SharedState, client: LogionClient, params?: FetchAllLocsParams): Promise<LocsState> {
        return new LocsState(sharedState, {}, client, {}).refresh(params);
    }

    findById(locId: UUID): LocRequestState {
        const loc = this.findByIdOrUndefined(locId);
        if(!loc) {
            throw new Error("LOC not found");
        } else {
            return loc;
        }
    }

    findByIdOrUndefined(locId: UUID): LocRequestState | undefined {
        this.ensureCurrent();
        const stringLocId = locId.toString();
        if(stringLocId in this._locs) {
            return this._locs[stringLocId];
        } else if(stringLocId in this._verifiedIssuerLocs) {
            return this._verifiedIssuerLocs[stringLocId];
        } else {
            return undefined;
        }
    }

    async requestTransactionLoc(params: CreateLocRequestParams): Promise<DraftRequest | PendingRequest> {
        return this.requestLoc({
            ...params,
            locType: "Transaction"
        });
    }

    async requestCollectionLoc(params: CreateCollectionLocRequestParams): Promise<DraftRequest | PendingRequest> {
        return this.requestLoc({
            ...params,
            locType: "Collection"
        });
    }

    async requestIdentityLoc(params: CreateIdentityLocRequestParams): Promise<DraftRequest | PendingRequest> {
        const { userIdentity, userPostalAddress } = params;
        if (userIdentity === undefined) {
            throw new Error("User Identity is mandatory for an Identity LOC")
        }
        if (userPostalAddress === undefined) {
            throw new Error("User Postal Address is mandatory for an Identity LOC")
        }
        if(this._client.currentAddress?.type === "Ethereum" && !params.sponsorshipId) {
            throw new Error("Identity LOC requests with an Ethereum address must be sponsored");
        }
        return this.requestLoc({
            ...params,
            locType: "Identity"
        });
    }

    private async requestLoc(params: CreateAnyLocRequestParams): Promise<DraftRequest | PendingRequest> {
        const { legalOfficer, locType, description, userIdentity, userPostalAddress, company, draft, template, sponsorshipId } = params;
        const client = LocMultiClient.newLocMultiClient(this.sharedState).newLocClient(legalOfficer);
        const request = await client.createLocRequest({
            ownerAddress: legalOfficer.address,
            description,
            locType,
            userIdentity,
            userPostalAddress,
            company,
            draft,
            template,
            sponsorshipId: sponsorshipId?.toString(),
            valueFee: params.valueFee ? params.valueFee.toString() : undefined,
        });
        const locSharedState: LocSharedState = { ...this.sharedState, legalOfficer, client, locsState: this };
        if(draft) {
            return new DraftRequest(locSharedState, request, undefined, EMPTY_LOC_ISSUERS).veryNew(); // Discards this state
        } else {
            return new PendingRequest(locSharedState, request, undefined, EMPTY_LOC_ISSUERS).veryNew(); // Discards this state
        }
    }

    async refresh(params?: FetchAllLocsParams): Promise<LocsState> {
        const current = this.getCurrentStateOrThrow() as LocsState; // Ensure no state discarded error
        return current.discardOnSuccess(() => current._refresh(params));
    }

    private async _refresh(params?: FetchAllLocsParams): Promise<LocsState> {
        const locsState = new LocsState(this.sharedState, {}, this._client, {});
        const locMultiClient = LocMultiClient.newLocMultiClient(this.sharedState);

        const locRequests = await locMultiClient.fetchAll(params);
        const locIds = locRequests
            .filter(request => request.status === "OPEN" || request.status === "CLOSED")
            .map(request => new UUID(request.id));
        const locBatch = await locMultiClient.getLocBatch(locIds);
        locsState._locs = await this.toStates(locMultiClient, locsState, locRequests, locBatch);

        if(locsState.isVerifiedIssuer) {
            const legalOfficers = this.getVerifiedIssuerLegalOfficers(locsState);
            const verifiedIssuerRequests = await locMultiClient.fetchAllForVerifiedIssuer(legalOfficers);
            const verifiedIssuerLocIds = verifiedIssuerRequests
                .filter(request => request.status === "OPEN" || request.status === "CLOSED")
                .map(request => new UUID(request.id));
            const verifiedIssuerLocBatch = await locMultiClient.getLocBatch(verifiedIssuerLocIds);
            locsState._verifiedIssuerLocs = await this.toStates(locMultiClient, locsState, verifiedIssuerRequests, verifiedIssuerLocBatch);
        }

        return locsState;
    }

    private async toStates(
        locMultiClient: LocMultiClient,
        locsState: LocsState,
        locRequests: LocRequest[],
        locBatch: LocBatch,
    ): Promise<Record<string, LocRequestState>> {
        const refreshedLocs: Record<string, LocRequestState> = {};
        for (const locRequest of locRequests) {
            try {
                const state = await this.toState(locMultiClient, locsState, locRequest, locBatch);
                refreshedLocs[state.locId.toString()] = state;
            } catch(e) {
                console.warn(e);
            }
        }
        return refreshedLocs;
    }

    private async toState(
        locMultiClient: LocMultiClient,
        locsState: LocsState,
        locRequest: LocRequest,
        locBatch: LocBatch,
    ): Promise<AnyLocState> {
        const legalOfficer = this.sharedState.legalOfficers.find(legalOfficer => legalOfficer.address === locRequest.ownerAddress);
        if (legalOfficer) {
            const client = locMultiClient.newLocClient(legalOfficer);
            const locSharedState: LocSharedState = {
                ...this.sharedState,
                legalOfficer,
                client,
                locsState,
            };
            const id = new UUID(locRequest.id);
            const legalOfficerCases = await locBatch.getLocs();
            const legalOfficerCase = legalOfficerCases[id.toDecimalString()];
            const locIssuers = await client.getLocIssuers(locRequest, locBatch);
            if((locRequest.status === "OPEN" || locRequest.status === "CLOSED") && !legalOfficerCase) {
                throw new Error("LOC expected");
            }
            return LocRequestState.createFromRequest(locSharedState, locRequest, locIssuers, legalOfficerCase);
        } else {
            throw new Error(`Can not find owner ${ locRequest.ownerAddress } of LOC ${ locRequest.id } among LO list`);
        }
    }

    private getVerifiedIssuerLegalOfficers(locsState: LocsState): LegalOfficerClass[] {
        return locsState.closedLocs["Identity"]
            .filter(loc => loc.data().verifiedIssuer)
            .map(loc => loc.data().ownerAddress)
            .map(address => locsState.sharedState.legalOfficers.find(legalOfficer => legalOfficer.address === address))
            .filter(this.isDefinedLegalOfficer);
    }

    private isDefinedLegalOfficer(legalOfficer: LegalOfficerClass | undefined): legalOfficer is LegalOfficerClass {
        return legalOfficer !== undefined;
    }

    get client(): LogionClient {
        return this._client;
    }

    /**
     * Tells if current user is a Verified Issuer.
     * 
     * @returns True if it is, false otherwise.
     */
    get isVerifiedIssuer(): boolean {
        this.ensureCurrent();
        this._isVerifiedIssuer ||= this.computeIsVerifiedIssuer();
        return this._isVerifiedIssuer;
    }

    private _isVerifiedIssuer: boolean | undefined;

    private computeIsVerifiedIssuer(): boolean {
        return this.closedLocs["Identity"].find(loc => loc.data().verifiedIssuer
            && loc.data().requesterAddress?.address === this.sharedState.currentAddress?.address
            && loc.data().requesterAddress?.type === this.sharedState.currentAddress?.type) !== undefined;
    }

    get openVerifiedIssuerLocs(): Record<LocType, OpenLoc[]> {
        this.ensureCurrent();
        if(!this.isVerifiedIssuer) {
            throw new Error("Authenticated user is not a Verified Issuer");
        }
        return this.withPredicate(this._verifiedIssuerLocs, loc => loc instanceof OpenLoc);
    }

    get closedVerifiedIssuerLocs(): Record<LocType, (ClosedLoc | ClosedCollectionLoc)[]> {
        this.ensureCurrent();
        if(!this.isVerifiedIssuer) {
            throw new Error("Authenticated user is not a Verified Issuer");
        }
        return this.withPredicate(this._verifiedIssuerLocs, loc => loc instanceof ClosedLoc || loc instanceof ClosedCollectionLoc);
    }

    get legalOfficer(): LegalOfficerLocsStateCommands {
        return new LegalOfficerLocsStateCommands({
            sharedState: this.sharedState,
            locsState: this,
        });
    }
}

/**
 * Encapsulated calls can be used only by a Logion Legal Officer.
 */
export class LegalOfficerLocsStateCommands {

    constructor(args: {
        sharedState: SharedState,
        locsState: LocsState,
    }) {
        this.sharedState = args.sharedState;
        this.locsState = args.locsState;
    }

    private sharedState: SharedState;

    private locsState: LocsState;

    async createLoc(params: OpenLocParams & BlockchainSubmissionParams): Promise<OpenLoc> {
        const { locType, description, userIdentity, userPostalAddress, company, template, signer, callback } = params;
        const legalOfficer = this.sharedState.legalOfficers.find(legalOfficer => legalOfficer.address === this.sharedState.currentAddress?.address);
        if(!legalOfficer) {
            throw new Error("Current user is not a Legal Officer");
        }
        const client = LocMultiClient.newLocMultiClient(this.sharedState).newLocClient(legalOfficer);

        if(locType === "Transaction" && !params.requesterLocId) {
            throw new Error("Cannot create Logion Transaction LOC without a requester");
        }

        const request = await client.createLocRequest({
            ownerAddress: legalOfficer.address,
            requesterIdentityLoc: params.requesterLocId ? params.requesterLocId.toString() : undefined,
            description,
            locType,
            userIdentity,
            userPostalAddress,
            company,
            template,
            valueFee: "0",
        });

        const locId = new UUID(request.id);
        if (request.locType === "Transaction") {
            if(params.requesterLocId) {
                await client.openLogionTransactionLoc({
                    locId,
                    requesterLocId: params.requesterLocId,
                    signer,
                    callback,
                });
            } else {
                throw new Error();
            }
        } else if (request.locType === "Identity") {
            await client.openLogionIdentityLoc({
                locId,
                signer,
                callback,
            });
        } else {
            throw Error("Collection LOCs are opened by Polkadot requesters");
        }

        const locSharedState: LocSharedState = { ...this.sharedState, legalOfficer, client, locsState: this.locsState };
        return new OpenLoc(locSharedState, request, undefined, EMPTY_LOC_ISSUERS).veryNew();
    }
}

export interface OpenLocParams {
    description: string;
    userIdentity?: UserIdentity;
    userPostalAddress?: PostalAddress;
    company?: string;
    template?: string;
    locType: "Identity" | "Transaction";
    requesterLocId?: UUID;
}

export interface LocSharedState extends SharedState {
    legalOfficer: LegalOfficerClass;
    client: AuthenticatedLocClient;
    locsState: LocsState;
}

export interface CreateLocRequestParams {
    legalOfficer: LegalOfficerClass;
    description: string;
    draft: boolean;
    template?: string;
}

export interface CreateIdentityLocRequestParams extends CreateLocRequestParams {
    userIdentity: UserIdentity;
    userPostalAddress: PostalAddress;
    company?: string;
    sponsorshipId?: UUID;
}

export interface CreateCollectionLocRequestParams extends CreateLocRequestParams {
    valueFee: bigint;
}

interface CreateAnyLocRequestParams extends CreateLocRequestParams {
    locType: LocType;
    userIdentity?: UserIdentity;
    userPostalAddress?: PostalAddress;
    company?: string;
    sponsorshipId?: UUID;
    valueFee?: bigint;
}

export interface CreateSofRequestParams {
    itemId: Hash;
}

export interface CheckHashResult {
    file?: MergedFile;
    metadataItem?: MergedMetadataItem;
    collectionItem?: CollectionItemClass;
    collectionItemFile?: UploadableItemFile;
    recordFile?: UploadableItemFile;
}

export type AnyLocState = OffchainLocState | OnchainLocState;

export type OffchainLocState = DraftRequest | PendingRequest | RejectedRequest | AcceptedRequest;

export type OnchainLocState = OpenLoc | ClosedLoc | ClosedCollectionLoc | VoidedLoc | VoidedCollectionLoc;

export abstract class LocRequestState extends State {

    protected readonly locSharedState: LocSharedState;
    protected readonly request: LocRequest;
    protected readonly legalOfficerCase?: LegalOfficerCase;
    protected readonly locIssuers: LocVerifiedIssuers;
    readonly owner: LegalOfficerClass;

    constructor(locSharedState: LocSharedState, request: LocRequest, legalOfficerCase: LegalOfficerCase | undefined, locIssuers: LocVerifiedIssuers) {
        super();
        this.locSharedState = locSharedState;
        this.request = request;
        this.legalOfficerCase = legalOfficerCase;
        this.locIssuers = locIssuers;

        const owner = locSharedState.allLegalOfficers.find(officer => officer.address === request.ownerAddress);
        if(!owner) {
            throw new Error("LOC owner is not a registered legal officer");
        }
        this.owner = owner;
    }

    get locId(): UUID {
        return new UUID(this.request.id);
    }

    static async createFromRequest(locSharedState: LocSharedState, request: LocRequest, locIssuers: LocVerifiedIssuers, legalOfficerCase?: LegalOfficerCase): Promise<AnyLocState> {
        switch (request.status) {
            case "DRAFT":
                return new DraftRequest(locSharedState, request, undefined, locIssuers)
            case "REVIEW_PENDING":
                return new PendingRequest(locSharedState, request, undefined, locIssuers)
            case "REVIEW_ACCEPTED":
                return new AcceptedRequest(locSharedState, request, undefined, locIssuers)
            case "REVIEW_REJECTED":
                return new RejectedRequest(locSharedState, request, undefined, locIssuers)
            default:
                return LocRequestState.refreshLoc(locSharedState, request, legalOfficerCase, locIssuers)
        }
    }

    static async createFromLoc(locSharedState: LocSharedState, request: LocRequest, legalOfficerCase: LegalOfficerCase, locIssuers: LocVerifiedIssuers): Promise<OnchainLocState> {
        return await LocRequestState.refreshLoc(locSharedState, request, legalOfficerCase, locIssuers) as OnchainLocState;
    }

    private static async refreshLoc(locSharedState: LocSharedState, request: LocRequest, loc: LegalOfficerCase | undefined, locIssuers: LocVerifiedIssuers): Promise<OnchainLocState> {
        const legalOfficerCase: LegalOfficerCase = loc ? loc : await locSharedState.client.getLoc({ locId: new UUID(request.id) });
        if (legalOfficerCase.voidInfo) {
            if (legalOfficerCase.locType === 'Collection') {
                return new VoidedCollectionLoc(locSharedState, request, legalOfficerCase, locIssuers);
            } else {
                return new VoidedLoc(locSharedState, request, legalOfficerCase, locIssuers);
            }
        } else if (legalOfficerCase.closed) {
            if (legalOfficerCase.locType === 'Collection') {
                return new ClosedCollectionLoc(locSharedState, request, legalOfficerCase, locIssuers);
            } else {
                return new ClosedLoc(locSharedState, request, legalOfficerCase, locIssuers);
            }
        } else {
            return new OpenLoc(locSharedState, request, legalOfficerCase, locIssuers);
        }
    }

    async refresh(): Promise<LocRequestState> {
        const current = this.getCurrentStateOrThrow() as LocRequestState; // Ensure no state discarded error
        const sharedState = current.locSharedState;
        const client = sharedState.client;
        const request = await client.getLocRequest({ locId: current.locId });
        const locIssuers = await client.getLocIssuers(request, sharedState.nodeApi.batch.locs([ current.locId ]));
        const newState = await LocRequestState.createFromRequest(sharedState, request, locIssuers);
        const newLocsState = sharedState.locsState.refreshWith(newState); // Discards this state
        return newLocsState.findById(current.locId);
    }

    locsState(): LocsState {
        this.ensureCurrent();
        return this.locSharedState.locsState;
    }

    data(): LocData {
        this.ensureCurrent();
        return LocRequestState.buildLocData(this.locSharedState.nodeApi, this.legalOfficerCase, this.request, this.locIssuers);
    }

    static buildLocData(api: LogionNodeApiClass, legalOfficerCase: LegalOfficerCase | undefined, request: LocRequest, locIssuers: LocVerifiedIssuers): LocData {
        if (legalOfficerCase) {
            return LocRequestState.dataFromRequestAndLoc(api, request, legalOfficerCase, locIssuers);
        } else {
            return LocRequestState.dataFromRequest(api, request, locIssuers);
        }
    }

    async supersededLoc(): Promise<VoidedLoc | undefined> {
        this.ensureCurrent();
        const superseded = this.data().replacerOf;
        if (superseded) {
            return this.locSharedState.locsState.findById(superseded) as VoidedLoc;
        }
        return undefined;
    }

    isLogionIdentity(): boolean {
        this.ensureCurrent();
        const loc = this.data();
        return loc.locType === 'Identity' && !loc.requesterAddress && !loc.requesterLocId;
    }

    isLogionData(): boolean {
        this.ensureCurrent();
        const loc = this.data();
        return loc.locType !== 'Identity' && (loc.requesterLocId !== undefined && loc.requesterLocId !== null);
    }

    async checkHash(hash: Hash): Promise<CheckHashResult> {
        this.ensureCurrent();
        return LocRequestState.checkHash(this.data(), hash);
    }

    static checkHash(loc: LocData, hash: Hash): CheckHashResult {
        const result: CheckHashResult = {};

        for (const file of loc.files) {
            if (file.hash.equalTo(hash)) {
                result.file = file;
            }
        }

        for (const item of loc.metadata) {
            if (item.value === hash.toHex()) {
                result.metadataItem = item;
            }
        }

        return result;
    }

    private static dataFromRequest(api: LogionNodeApiClass, request: LocRequest, locIssuers: LocVerifiedIssuers): LocData {
        return {
            ...request,
            ...locIssuers,
            requesterAddress: request.requesterAddress ? api.queries.getValidAccountId(request.requesterAddress.address, request.requesterAddress.type) : undefined,
            requesterLocId: request.requesterIdentityLoc ? new UUID(request.requesterIdentityLoc) : undefined,
            id: new UUID(request.id),
            closed: false,
            replacerOf: undefined,
            voidInfo: undefined,
            identityLocId: request.identityLoc ? new UUID(request.identityLoc) : undefined,
            metadata: request.metadata.map(item => LocRequestState.mergeMetadata(api, item)),
            files: request.files.map(item => LocRequestState.mergeFile(api, item)),
            links: request.links.map(item => LocRequestState.mergeLink(item)),
            voteId: request.voteId ? request.voteId : undefined,
            sponsorshipId: request.sponsorshipId ? new UUID(request.sponsorshipId) : undefined,
            valueFee: request.valueFee ? BigInt(request.valueFee) : undefined,
        };
    }

    private static dataFromRequestAndLoc(api: LogionNodeApiClass, request: LocRequest, loc: LegalOfficerCase, locIssuers: LocVerifiedIssuers): LocData {
        const data: LocData = {
            ...loc,
            ...locIssuers,
            id: new UUID(request.id),
            ownerAddress: loc.owner,
            closedOn: request.closedOn,
            createdOn: request.createdOn,
            decisionOn: request.decisionOn,
            description: request.description,
            rejectReason: request.rejectReason,
            status: request.status,
            identityLocId: request.identityLoc ? new UUID(request.identityLoc) : undefined,
            userIdentity: request.userIdentity,
            userPostalAddress: request.userPostalAddress,
            metadata: request.metadata.map(item => LocRequestState.mergeMetadata(api, item, loc)),
            files: request.files.map(item => LocRequestState.mergeFile(api, item, loc)),
            links: request.links.map(item => LocRequestState.mergeLink(item, loc)),
            seal: loc.closed ? loc.seal : request.seal,
            company: request.company,
            iDenfy: request.iDenfy,
            voteId: request.voteId ? request.voteId : undefined,
            template: request.template,
            valueFee: loc.valueFee,
        };

        if(data.voidInfo && request.voidInfo) {
            data.voidInfo.reason = request.voidInfo.reason;
            data.voidInfo.voidedOn = request.voidInfo.voidedOn;
        }

        return data;
    }

    private static mergeMetadata(api: LogionNodeApiClass, backendMetadataItem: LocMetadataItem, chainLoc?: LegalOfficerCase): MergedMetadataItem {
        const chainMetadataItem = chainLoc ? chainLoc.metadata.find(item => item.name.toHex() === backendMetadataItem.nameHash) : undefined;
        if(chainMetadataItem) {
            return {
                ...backendMetadataItem,
                ...chainMetadataItem,
                nameHash: Hash.fromHex(chainMetadataItem.name.toHex()),
                published: true,
                name: LocRequestState.validatedValue(backendMetadataItem.name, chainMetadataItem.name),
                value: LocRequestState.validatedValue(backendMetadataItem.value, chainMetadataItem.value),
            };
        } else {
            return {
                ...backendMetadataItem,
                nameHash: Hash.fromHex(backendMetadataItem.nameHash),
                submitter: api.queries.getValidAccountId(backendMetadataItem.submitter.address, backendMetadataItem.submitter.type),
                published: false,
            };
        }
    }

    private static mergeFile(api: LogionNodeApiClass, backendFile: LocFile, chainLoc?: LegalOfficerCase): MergedFile {
        const chainFile = chainLoc ? chainLoc.files.find(item => item.hash.toHex() === backendFile.hash) : undefined;
        if(chainFile) {
            return {
                ...backendFile,
                ...chainFile,
                published: true,
                nature: LocRequestState.validatedValue(backendFile.nature, chainFile.nature),
            };
        } else {
            return {
                ...backendFile,
                hash: Hash.fromHex(backendFile.hash),
                submitter: api.queries.getValidAccountId(backendFile.submitter.address, backendFile.submitter.type),
                size: BigInt(backendFile.size),
                published: false,
            }
        }
    }

    private static validatedValue(data: string, hash: Hash): string {
        const hashString = new HashString(hash, data);
        if (hashString.isValidValue()) {
            return data;
        } else {
            return `Deleted data - related hash: ${ hash.toHex() })`;
        }
    }

    private static mergeLink(backendLink: LocLink, chainLoc?: LegalOfficerCase): MergedLink {
        const chainLink = chainLoc ? chainLoc.links.find(link => link.id.toString() === backendLink.target) : undefined;
        if(chainLink) {
            return {
                ...backendLink,
                ...chainLink,
                published: true,
                nature: LocRequestState.validatedValue(backendLink.nature, chainLink.nature),
            };
        } else {
            return {
                ...backendLink,
                published: false,
            }
        }
    }

    abstract withLocs(locsState: LocsState): LocRequestState;

    protected _withLocs<T extends LocRequestState>(locsState: LocsState, constructor: new (locSharedState: LocSharedState, request: LocRequest, legalOfficerCase: LegalOfficerCase | undefined, locIssuers: LocVerifiedIssuers) => T): T {
        return this.syncDiscardOnSuccess(() => new constructor({
            ...this.locSharedState,
            locsState
        }, this.request, this.legalOfficerCase, this.locIssuers));
    }

    async getFile(hash: Hash): Promise<TypedFile> {
        return downloadFile(this.owner.buildAxiosToNode(), `/api/loc-request/${ this.request.id }/files/${ hash.toHex() }`);
    }
}

export abstract class LegalOfficerLocRequestCommands {

    constructor(args: {
        locId: UUID,
        client: AuthenticatedLocClient,
        request: LocRequestState,
    }) {
        this.locId = args.locId;
        this.client = args.client;
        this.request = args.request;
    }

    protected locId: UUID;

    protected client: AuthenticatedLocClient;

    protected request: LocRequestState;

    async setCollectionFileRestrictedDelivery(params: {
        hash: Hash,
        restrictedDelivery: boolean,
    }): Promise<LocRequestState> {
        const { hash, restrictedDelivery } = params;
        if(this.request.data().locType !== "Collection") {
            throw new Error("Restricted delivery is available for collection LOC files only");
        }

        await this.client.setCollectionFileRestrictedDelivery({
            locId: this.request.locId,
            hash,
            restrictedDelivery,
        });

        return this.request.refresh();
    }
}

export abstract class EditableRequest extends LocRequestState {

    async addMetadata(params: AddMetadataParams): Promise<EditableRequest> {
        const client = this.locSharedState.client;
        await client.addMetadata({
            locId: this.locId,
            ...params
        });
        return await this.refresh() as EditableRequest;
    }

    async addFile(params: AddFileParams): Promise<EditableRequest> {
        const client = this.locSharedState.client;
        await client.addFile({
            locId: this.locId,
            ...params
        });
        return await this.refresh() as EditableRequest;
    }

    async deleteMetadata(params: DeleteMetadataParams): Promise<EditableRequest> {
        const client = this.locSharedState.client;
        await client.deleteMetadata({
            locId: this.locId,
            ...params
        })
        return await this.refresh() as EditableRequest
    }

    async deleteFile(params: DeleteFileParams): Promise<EditableRequest> {
        const client = this.locSharedState.client;
        await client.deleteFile({
            locId: this.locId,
            ...params
        })
        return await this.refresh() as EditableRequest
    }

    async requestFileReview(hash: Hash): Promise<EditableRequest> {
        const client = this.locSharedState.client;
        await client.requestFileReview({
            locId: this.locId,
            hash,
        });
        return await this.refresh() as EditableRequest;
    }

    async requestMetadataReview(nameHash: Hash): Promise<EditableRequest> {
        const client = this.locSharedState.client;
        await client.requestMetadataReview({
            locId: this.locId,
            nameHash,
        });
        return await this.refresh() as EditableRequest;
    }

    get legalOfficer(): LegalOfficerEditableRequestCommands {
        return new LegalOfficerEditableRequestCommands({
            locId: this.locId,
            client: this.locSharedState.client,
            request: this,
        });
    }
}

/**
 * Encapsulated calls can be used only by a Logion Legal Officer.
 */
export class LegalOfficerEditableRequestCommands extends LegalOfficerLocRequestCommands {

    async reviewFile(params: ReviewFileParams): Promise<EditableRequest> {
        await this.client.reviewFile({
            ...params,
            locId: this.locId,
        });
        return await this.request.refresh() as EditableRequest;
    }

    async reviewMetadata(params: ReviewMetadataParams): Promise<EditableRequest> {
        await this.client.reviewMetadata({
            ...params,
            locId: this.locId,
        });
        return await this.request.refresh() as EditableRequest;
    }

    async addLink(params: AddLinkParams): Promise<EditableRequest> {
        await this.client.addLink({
            locId: this.locId,
            ...params
        });
        return await this.request.refresh() as EditableRequest;
    }

    async deleteLink(params: DeleteLinkParams): Promise<EditableRequest> {
        await this.client.deleteLink({
            locId: this.locId,
            ...params
        })
        return await this.request.refresh() as EditableRequest
    }
}

export interface IdenfyVerificationCreation {
    successUrl: string;
    errorUrl: string;
    unverifiedUrl: string;
}

export class DraftRequest extends EditableRequest {

    veryNew(): DraftRequest {
        const newLocsState = this.locsState().refreshWith(this);
        return newLocsState.findById(this.locId) as DraftRequest;
    }

    override async refresh(): Promise<DraftRequest> {
        return await super.refresh() as DraftRequest;
    }

    async submit(): Promise<PendingRequest> {
        await this.locSharedState.client.submit(this.locId);
        return await super.refresh() as PendingRequest;
    }

    async cancel(): Promise<LocsState> {
        this.ensureCurrent();
        await this.locSharedState.client.cancel(this.locId);
        this.discard(undefined);
        return this.locSharedState.locsState.refreshWithout(this.locId);
    }

    isIDenfySessionInProgress(): boolean {
        return this.data().iDenfy?.redirectUrl !== undefined;
    }

    async startNewIDenfySession(request: IdenfyVerificationCreation): Promise<DraftRequest> {
        if(this.isIDenfySessionInProgress()) {
            throw new Error("An iDenfy session is already in progress");
        } else {
            const axios = this.locSharedState.legalOfficer.buildAxiosToNode();
            await axios.post(`/api/idenfy/verification-session/${ this.data().id.toString() }`, request);
            return this.refresh();
        }
    }

    get iDenfySessionUrl(): string {
        if(!this.isIDenfySessionInProgress()) {
            throw new Error("No iDenfy session in progress");
        } else {
            return requireDefined(this.data().iDenfy?.redirectUrl);
        }
    }

    override withLocs(locsState: LocsState): DraftRequest {
        return this._withLocs(locsState, DraftRequest);
    }
}

export class PendingRequest extends LocRequestState {

    veryNew(): PendingRequest {
        const newLocsState = this.locsState().refreshWith(this);
        return newLocsState.findById(this.locId) as PendingRequest;
    }

    override withLocs(locsState: LocsState): PendingRequest {
        return this._withLocs(locsState, PendingRequest);
    }

    get legalOfficer(): LegalOfficerPendingRequestCommands {
        return new LegalOfficerPendingRequestCommands({
            locId: this.locId,
            client: this.locSharedState.client,
            request: this,
        });
    }
}

export class LegalOfficerPendingRequestCommands {

    constructor(args: {
        locId: UUID,
        client: AuthenticatedLocClient,
        request: PendingRequest,
    }) {
        this.locId = args.locId;
        this.client = args.client;
        this.request = args.request;
    }

    private readonly locId: UUID;

    private client: AuthenticatedLocClient;

    private request: PendingRequest;

    async reject(reason: string): Promise<RejectedRequest> {
        this.request.ensureCurrent();
        await this.client.rejectLoc({
            locId: this.locId,
            reason,
        });
        return await this.request.refresh() as RejectedRequest;
    }

    async accept(args?: BlockchainSubmissionParams): Promise<AcceptedRequest | OpenLoc> {
        this.request.ensureCurrent();
        const requesterAccount = this.request.data().requesterAddress;
        const requesterLoc = this.request.data().requesterLocId;
        const sponsorshipId = this.request.data().sponsorshipId;
        const locType = this.request.data().locType;
        if(locType === "Transaction") {
            await this.client.acceptTransactionLoc({
                locId: this.locId,
                requesterAccount,
                requesterLoc,
                ...args,
            });
        } else if(locType === "Identity") {
            await this.client.acceptIdentityLoc({
                locId: this.locId,
                requesterAccount,
                sponsorshipId,
                ...args,
            });
        } else {
            if(!requesterAccount) {
                throw new Error("Can only accept LOC with polkadot requester");
            }
            await this.client.acceptCollectionLoc({
                locId: this.locId
            });
        }
        return await this.request.refresh() as AcceptedRequest | OpenLoc;
    }

    async estimateFeesAccept(): Promise<FeesClass | undefined> {
        this.request.ensureCurrent();
        const requesterAccount = this.request.data().requesterAddress;
        const requesterLoc = this.request.data().requesterLocId;
        const sponsorshipId = this.request.data().sponsorshipId;
        const locType = this.request.data().locType;
        if(locType === "Transaction") {
            return this.client.estimateFeesAcceptTransactionLoc({
                locId: this.locId,
                requesterAccount,
                requesterLoc,
            });
        } else if(locType === "Identity") {
            return this.client.estimateFeesAcceptIdentityLoc({
                locId: this.locId,
                requesterAccount,
                sponsorshipId,
            });
        }
    }
}

export class ReviewedRequest extends LocRequestState {

    async cancel(): Promise<LocsState> {
        this.ensureCurrent();
        await this.locSharedState.client.cancel(this.locId);
        this.discard(undefined);
        return this.locSharedState.locsState.refreshWithout(this.locId);
    }

    async rework(): Promise<DraftRequest> {
        await this.locSharedState.client.rework(this.locId);
        return await super.refresh() as DraftRequest;
    }

    override withLocs(locsState: LocsState): RejectedRequest {
        return this._withLocs(locsState, RejectedRequest);
    }
}

export class AcceptedRequest extends ReviewedRequest {

    async open(parameters: BlockchainSubmissionParams): Promise<OpenLoc> {
        if (this.request.locType === "Transaction") {
            await this.locSharedState.client.openTransactionLoc({
                ...this.checkOpenParams(),
                ...parameters
            })
        } else if (this.request.locType === "Identity") {
            await this.locSharedState.client.openIdentityLoc({
                ...this.checkOpenParams(),
                ...parameters
            })
        } else {
            throw Error("Collection LOCs are opened with openCollection()");
        }
        return await this.refresh() as OpenLoc
    }

    private checkOpenParams(): OpenPolkadotLocParams {
        const requesterAddress = this.request.requesterAddress;
        if (requesterAddress === undefined || requesterAddress?.type !== "Polkadot") {
            throw Error("Only Polkadot requester can open LOC");
        }
        return {
            locId: this.locId,
            legalOfficer: this.owner,
        }
    }

    async estimateFeesOpen(): Promise<FeesClass> {
        if (this.request.locType === "Transaction") {
            return this.locSharedState.client.estimateFeesOpenTransactionLoc(this.checkOpenParams())
        } else if (this.request.locType === "Identity") {
            return this.locSharedState.client.estimateFeesOpenIdentityLoc(this.checkOpenParams())
        } else {
            throw Error("Collection LOCs fees are estimated with estimateFeesOpenCollection()");
        }
    }

    async openCollection(parameters: OpenCollectionLocParams): Promise<OpenLoc> {
        await this.locSharedState.client.openCollectionLoc({
            ...this.checkOpenCollectionParams(),
            ...parameters
        });
        return await this.refresh() as OpenLoc;
    }

    private checkOpenCollectionParams(): OpenPolkadotLocParams & { valueFee: bigint } {
        const requesterAddress = this.request.requesterAddress;
        if (requesterAddress === undefined || requesterAddress?.type !== "Polkadot") {
            throw Error("Only Polkadot requester can open, or estimate fees of, a Collection LOC");
        }
        const valueFee = this.request.valueFee;
        if(!valueFee) {
            throw new Error("Missing value fee");
        }
        if (this.request.locType === "Collection") {
            return {
                locId: this.locId,
                legalOfficer: this.owner,
                valueFee: BigInt(valueFee),
            }
        } else {
            throw Error("Other LOCs are opened/estimated with open()/estimateFeesOpen()");
        }
    }

    async estimateFeesOpenCollection(parameters: EstimateFeesOpenCollectionLocParams): Promise<FeesClass> {
        return this.locSharedState.client.estimateFeesOpenCollectionLoc({
            ...this.checkOpenCollectionParams(),
            ...parameters
        });
    }

    withLocs(locsState: LocsState): AcceptedRequest {
        return this._withLocs(locsState, AcceptedRequest);
    }
}

export class RejectedRequest extends ReviewedRequest {

    override withLocs(locsState: LocsState): RejectedRequest {
        return this._withLocs(locsState, RejectedRequest);
    }
}

export class OpenLoc extends EditableRequest {

    veryNew(): OpenLoc {
        const newLocsState = this.locsState().refreshWith(this);
        return newLocsState.findById(this.locId) as OpenLoc;
    }

    async requestSof(): Promise<PendingRequest> {
        return requestSof(this.locSharedState, this.locId);
    }

    override async refresh(): Promise<OnchainLocState> {
        return await super.refresh() as OnchainLocState;
    }

    override withLocs(locsState: LocsState): OpenLoc {
        return this._withLocs(locsState, OpenLoc);
    }

    async publishFile(parameters: { hash: Hash } & BlockchainSubmissionParams): Promise<OpenLoc> {
        const client = this.locSharedState.client;
        const file = this.findFile(parameters.hash);
        await client.publishFile({
            ...file,
            signer: parameters.signer,
            callback: parameters.callback,
        });
        return await this.refresh() as OpenLoc;
    }

    private findFile(hash: Hash): EstimateFeesPublishFileParams {
        const file = this.request.files.find(file => file.hash === hash.toHex() && file.status === "REVIEW_ACCEPTED");
        if(!file) {
            throw new Error("File was not found or was not reviewed and accepted by the LLO yet");
        }
        return {
            locId: this.locId,
            file: {
                hash,
                nature: Hash.of(file.nature),
                size: BigInt(file.size),
                submitter: this.locSharedState.nodeApi.queries.getValidAccountId(file.submitter.address, file.submitter.type),
            }
        }
    }

    async estimateFeesPublishFile(parameters: { hash: Hash }): Promise<FeesClass> {
        const client = this.locSharedState.client;
        const file = this.findFile(parameters.hash);
        return client.estimateFeesPublishFile(file);
    }

    async publishMetadata(parameters: { nameHash: Hash } & BlockchainSubmissionParams): Promise<OpenLoc> {
        const client = this.locSharedState.client;
        const metadata = this.findMetadata(parameters.nameHash);
        await client.publishMetadata({
            ...metadata,
            signer: parameters.signer,
            callback: parameters.callback,
        });
        return await this.refresh() as OpenLoc;
    }

    private findMetadata(nameHash: Hash): EstimateFeesPublishMetadataParams {
        const metadata = this.request.metadata.find(metadata => metadata.nameHash === nameHash.toHex() && metadata.status === "REVIEW_ACCEPTED");
        if (!metadata) {
            throw new Error("File was not found or was not reviewed and accepted by the LLO yet");
        }
        return {
            locId: this.locId,
            metadata: {
                name: metadata.name,
                value: metadata.value,
                submitter: this.locSharedState.nodeApi.queries.getValidAccountId(metadata.submitter.address, metadata.submitter.type),
            }
        }
    }

    async estimateFeesPublishMetadata(parameters: { nameHash: Hash }): Promise<FeesClass> {
        const client = this.locSharedState.client;
        const metadata = this.findMetadata(parameters.nameHash);
        return client.estimatePublishMetadata(metadata);
    }

    override get legalOfficer(): LegalOfficerOpenRequestCommands {
        return new LegalOfficerOpenRequestCommands({
            locId: this.locId,
            client: this.locSharedState.client,
            request: this,
        });
    }
}

/**
 * Encapsulated calls can be used only by a Logion Legal Officer.
 */
export class LegalOfficerOpenRequestCommands
extends LegalOfficerEditableRequestCommands
implements LegalOfficerNonVoidedCommands, LegalOfficerLocWithSelectableIssuersCommands<OpenLoc> {

    constructor(args: {
        locId: UUID,
        client: AuthenticatedLocClient,
        request: EditableRequest,
    }) {
        super(args);

        this.legalOfficerNonVoidedCommands = new LegalOfficerNonVoidedCommandsImpl(args);
        this.legalOfficerLocWithSelectableIssuersCommands = new LegalOfficerLocWithSelectableIssuersCommandsImpl(args);
    }

    private legalOfficerNonVoidedCommands: LegalOfficerNonVoidedCommands;

    private legalOfficerLocWithSelectableIssuersCommands: LegalOfficerLocWithSelectableIssuersCommands<OpenLoc>;

    async publishLink(parameters: { target: UUID } & BlockchainSubmissionParams): Promise<OpenLoc> {
        const link = this.findLink(parameters.target);
        if(!link) {
            throw new Error("Link was not found");
        }
        await this.client.publishLink({
            ...link,
            signer: parameters.signer,
            callback: parameters.callback,
        });
        return await this.request.refresh() as OpenLoc;
    }

    private findLink(target: UUID): EstimateFeesPublishLinkParams {
        const link = this.request.data().links.find(link => link.target === target.toString());
        if(!link) {
            throw new Error("Link was not found");
        }
        return {
            locId: this.locId,
            link: {
                id: target,
                nature: Hash.of(link.nature),
            },
        }
    }

    async estimateFeesPublishLink(parameters: { target: UUID }): Promise<FeesClass> {
        const client = this.client;
        const link = this.findLink(parameters.target);
        return client.estimateFeesPublishLink(link);
    }

    async acknowledgeFile(parameters: AckFileParams): Promise<OpenLoc> {
        this.request.ensureCurrent();
        const file = this.request.data().files.find(file => file.hash.equalTo(parameters.hash) && file.status === "PUBLISHED");
        if(!file) {
            throw new Error("File was not found or was not published yet");
        }
        await this.client.acknowledgeFile({
            locId: this.locId,
            hash: parameters.hash,
            signer: parameters.signer,
            callback: parameters.callback,
        });
        return await this.request.refresh() as OpenLoc;
    }

    async estimateFeesAcknowledgeFile(parameters: EstimateFeesAckFileParams): Promise<FeesClass> {
        return await this.client.estimateFeesAcknowledgeFile({ locId: this.locId, ...parameters });
    }

    async acknowledgeMetadata(parameters: AckMetadataParams): Promise<OpenLoc> {
        this.request.ensureCurrent();
        const metadata = this.request.data().metadata.find(metadata => metadata.nameHash.equalTo(parameters.nameHash) && metadata.status === "PUBLISHED");
        if(!metadata) {
            throw new Error("Data was not found or was not published yet");
        }
        await this.client.acknowledgeMetadata({
            locId: this.locId,
            nameHash: parameters.nameHash,
            signer: parameters.signer,
            callback: parameters.callback,
        });
        return await this.request.refresh() as OpenLoc;
    }

    async estimateFeesAcknowledgeMetadata(parameters: EstimateFeesAckMetadataParams): Promise<FeesClass> {
        return this.client.estimateFeesAcknowledgeMetadata({ locId: this.locId, ...parameters })
    }

    async close(parameters: BlockchainSubmissionParams): Promise<ClosedLoc | ClosedCollectionLoc> {
        this.request.ensureCurrent();
        const file = this.request.data().files.find(file => file.status !== "ACKNOWLEDGED");
        if(file) {
            throw new Error("All files have not been acknowledged yet");
        }
        const metadata = this.request.data().metadata.find(metadata => metadata.status !== "ACKNOWLEDGED");
        if(metadata) {
            throw new Error("All metadata have not been acknowledged yet");
        }

        const seal = this.request.data().seal;
        await this.client.close({
            ...parameters,
            locId: this.locId,
            seal,
        });

        const state = await this.request.refresh();
        if(state.data().locType === "Collection") {
            return state as ClosedCollectionLoc;
        } else {
            return state as ClosedLoc;
        }
    }

    async voidLoc(params: VoidParams): Promise<VoidedLoc | VoidedCollectionLoc> {
        return this.legalOfficerNonVoidedCommands.voidLoc(params);
    }

    async getVerifiedIssuers(): Promise<VerifiedIssuerWithSelect[]> {
        return this.legalOfficerLocWithSelectableIssuersCommands.getVerifiedIssuers();
    }

    async selectIssuer(params: SelectUnselectIssuerParams): Promise<OpenLoc> {
        return this.legalOfficerLocWithSelectableIssuersCommands.selectIssuer(params);
    }

    async unselectIssuer(params: SelectUnselectIssuerParams): Promise<OpenLoc> {
        return this.legalOfficerLocWithSelectableIssuersCommands.unselectIssuer(params);
    }
}

export interface LegalOfficerNonVoidedCommands {
    voidLoc(params: VoidParams): Promise<VoidedLoc | VoidedCollectionLoc>;
}

export class LegalOfficerNonVoidedCommandsImpl extends LegalOfficerLocRequestCommands implements LegalOfficerNonVoidedCommands {

    async voidLoc(params: VoidParams): Promise<VoidedLoc | VoidedCollectionLoc> {
        await this.client.voidLoc({
            ...params,
            locId: this.locId,
        });
        return await this.request.refresh() as (VoidedLoc | VoidedCollectionLoc);
    }
}

export interface LegalOfficerLocWithSelectableIssuersCommands<T extends LocRequestState> {
    getVerifiedIssuers(): Promise<VerifiedIssuerWithSelect[]>;
    selectIssuer(params: SelectUnselectIssuerParams): Promise<T>;
    unselectIssuer(params: SelectUnselectIssuerParams): Promise<T>;
}

export class LegalOfficerLocWithSelectableIssuersCommandsImpl<T extends LocRequestState>
extends LegalOfficerLocRequestCommands
implements LegalOfficerLocWithSelectableIssuersCommands<T> {

    async getVerifiedIssuers(): Promise<VerifiedIssuerWithSelect[]> {
        const allVerifiedIssuers = await this.client.getLegalOfficerVerifiedIssuers();
        const locData = this.request.data();
        const selectedIssuers = locData.issuers;
    
        return allVerifiedIssuers
            .filter(issuer => issuer.address !== locData.requesterAddress?.address)
            .map(issuer => {
                const selected = selectedIssuers.find(selectedIssuer => selectedIssuer.address === issuer.address);
                if(selected && selected.firstName && selected.lastName) {
                    return {
                        firstName: selected.firstName,
                        lastName: selected.lastName,
                        identityLocId: selected.identityLocId,
                        address: selected.address,
                        selected: true,
                    };
                } else {
                    return {
                        firstName: issuer.identity.firstName,
                        lastName: issuer.identity.lastName,
                        identityLocId: issuer.identityLocId,
                        address: issuer.address,
                        selected: selected !== undefined,
                    };
                }
            })
            .sort((issuer1, issuer2) => issuer1.lastName.localeCompare(issuer2.lastName));
    }

    async selectIssuer(params: SelectUnselectIssuerParams): Promise<T> {
        return this.setIssuerSelection({
            ...params,
            selected: true,
        });
    }

    private async setIssuerSelection(params: { issuer: string, selected: boolean } & BlockchainSubmissionParams): Promise<T> {
        await this.client.setIssuerSelection({
            ...params,
            locId: this.request.data().id,
        });
        return await this.request.refresh() as T;
    }

    async unselectIssuer(params: SelectUnselectIssuerParams): Promise<T> {
        return this.setIssuerSelection({
            ...params,
            selected: false,
        });
    }
}

export type VerifiedIssuerWithSelect = VerifiedIssuer & { selected: boolean };

export interface SelectUnselectIssuerParams extends BlockchainSubmissionParams {
    issuer: string;
}

export class ClosedLoc extends LocRequestState {

    async requestSof(): Promise<PendingRequest> {
        return requestSof(this.locSharedState, this.locId);
    }

    override async refresh(): Promise<ClosedLoc | VoidedLoc> {
        return await super.refresh() as ClosedLoc | VoidedLoc;
    }

    override withLocs(locsState: LocsState): ClosedLoc {
        return this._withLocs(locsState, ClosedLoc);
    }

    get legalOfficer(): LegalOfficerClosedLocCommands {
        return new LegalOfficerClosedLocCommands({
            locId: this.locId,
            client: this.locSharedState.client,
            request: this,
        });
    }
}

export class LegalOfficerClosedLocCommands extends LegalOfficerNonVoidedCommandsImpl {

    async nominateIssuer(params: BlockchainSubmissionParams): Promise<ClosedLoc> {
        const data = this.request.data();
        if(data.locType !== "Identity") {
            throw new Error("Not an Identity LOC");
        }

        if(!data.requesterAddress || data.requesterAddress.type !== "Polkadot") {
            throw new Error("Identity LOC has no Polkadot requester");
        }
    
        await this.client.nominateIssuer({
            ...params,
            locId: data.id,
            requester: data.requesterAddress.address,
        });
    
        return await this.request.refresh() as ClosedLoc;
    }

    async dismissIssuer(params: BlockchainSubmissionParams): Promise<ClosedLoc> {
        const data = this.request.data();
        if(data.locType !== "Identity") {
            throw new Error("Not an Identity LOC");
        }

        if(!data.requesterAddress || data.requesterAddress.type !== "Polkadot") {
            throw new Error("Identity LOC has no Polkadot requester");
        }
    
        await this.client.dismissIssuer({
            ...params,
            requester: data.requesterAddress.address,
        });
    
        return await this.request.refresh() as ClosedLoc;
    }

    async requestVote(params: BlockchainSubmissionParams): Promise<string> {
        const data = this.request.data();
        if(data.locType !== "Identity") {
            throw new Error("Not an Identity LOC");
        }

        return this.client.requestVote({
            ...params,
            locId: data.id,
        });
    }
}

export async function getCollectionItem(parameters: { locClient: LocClient, locId: UUID, itemId: Hash }): Promise<CollectionItemClass | undefined> {
    const { locId, itemId, locClient } = parameters;
        const clientItem = await locClient.getCollectionItem({
            locId,
            itemId
        });
        if(clientItem) {
            return new CollectionItemClass({
                locId,
                locClient,
                clientItem,
            });
        } else {
            return undefined;
        }
}

export async function getTokensRecord(parameters: { locClient: LocClient, locId: UUID, recordId: Hash }): Promise<TokensRecordClass | undefined> {
    const { locId, recordId, locClient } = parameters;
        const tokensRecord = await locClient.getTokensRecord({
            locId,
            recordId
        });
        if(tokensRecord) {
            return new TokensRecordClass({
                locId,
                locClient,
                tokensRecord,
            });
        } else {
            return undefined;
        }
}

export async function getTokensRecords(parameters: { locClient: LocClient } & GetTokensRecordsRequest): Promise<TokensRecordClass[]> {
    const { locId, locClient, jwtToken } = parameters;
    const clientRecords = await locClient.getTokensRecords({
        locId,
        jwtToken
    });
    return clientRecords.map(tokensRecord => new TokensRecordClass({
        locId,
        locClient,
        tokensRecord,
    }));
}

abstract class ClosedOrVoidCollectionLoc extends LocRequestState {

    async getCollectionItem(parameters: { itemId: Hash }): Promise<CollectionItemClass | undefined> {
        this.ensureCurrent();
        return getCollectionItem({
            locClient: this.locSharedState.client,
            locId: this.locId,
            itemId: parameters.itemId,
        });
    }

    async getCollectionItems(): Promise<CollectionItemClass[]> {
        this.ensureCurrent();
        const clientItems = await this.locSharedState.client.getCollectionItems({
            locId: this.locId,
        });
        return clientItems.map(clientItem => new CollectionItemClass({
            locId: this.locId,
            locClient: this.locSharedState.client,
            clientItem,
        }));
    }

    override async checkHash(hash: Hash): Promise<CheckHashResult> {
        this.ensureCurrent();
        const result = await super.checkHash(hash);
        const collectionItem = await this.getCollectionItem({ itemId: hash });
        return {
            ...result,
            collectionItem
        };
    }

    async size(): Promise<number | undefined> {
        this.ensureCurrent();
        const client = this.locSharedState.client;
        return await client.getCollectionSize({
            locId: this.locId
        })
    }

    async getTokensRecord(parameters: { recordId: Hash }): Promise<TokensRecordClass | undefined> {
        this.ensureCurrent();
        return getTokensRecord({
            locClient: this.locSharedState.client,
            locId: this.locId,
            recordId: parameters.recordId,
        });
    }

    async getTokensRecords(): Promise<TokensRecordClass[]> {
        this.ensureCurrent();
        return getTokensRecords({
            locClient: this.locSharedState.client,
            locId: this.locId,
        });
    }
}

export interface UploadCollectionItemFileParams {
    itemId: Hash,
    itemFile: ItemFileWithContent,
}

export interface UploadTokensRecordFileParams {
    recordId: Hash,
    file: ItemFileWithContent,
}

export class ClosedCollectionLoc extends ClosedOrVoidCollectionLoc {

    async addCollectionItem(parameters: AddCollectionItemParams): Promise<ClosedCollectionLoc> {
        this.ensureCurrent();
        const client = this.locSharedState.client;
        if(parameters.itemFiles
            && parameters.itemFiles.length > 0
            && (!this.legalOfficerCase?.collectionCanUpload || false)) {
            throw new Error("This Collection LOC does not allow uploading files with items");
        }
        await client.addCollectionItem({
            locId: this.locId,
            ...parameters
        })
        return this;
    }

    async uploadCollectionItemFile(parameters: UploadCollectionItemFileParams): Promise<ClosedCollectionLoc> {
        this.ensureCurrent();
        const client = this.locSharedState.client;
        await client.uploadItemFile({
            locId: this.locId,
            itemId: parameters.itemId,
            file: parameters.itemFile,
        })
        return this;
    }

    async addTokensRecord(parameters: AddTokensRecordParams): Promise<ClosedCollectionLoc> {
        this.ensureCurrent();
        const client = this.locSharedState.client;
        if(parameters.files.length === 0) {
            throw new Error("Cannot add a tokens record without files");
        }
        if(!await client.canAddRecord(this.request)) {
            throw new Error("Current user is not allowed to add a tokens record");
        }
        await client.addTokensRecord({
            locId: this.locId,
            ...parameters
        })
        return this;
    }

    async uploadTokensRecordFile(parameters: UploadTokensRecordFileParams): Promise<ClosedCollectionLoc> {
        this.ensureCurrent();
        const client = this.locSharedState.client;
        await client.uploadTokensRecordFile({
            locId: this.locId,
            recordId: parameters.recordId,
            file: parameters.file,
        })
        return this;
    }

    async requestSof(params: CreateSofRequestParams): Promise<PendingRequest> {
        return requestSof(this.locSharedState, this.locId, params.itemId);
    }

    async refresh(): Promise<ClosedCollectionLoc | VoidedLoc> {
        return await super.refresh() as ClosedCollectionLoc | VoidedLoc;
    }

    override withLocs(locsState: LocsState): ClosedCollectionLoc {
        return this._withLocs(locsState, ClosedCollectionLoc);
    }

    get legalOfficer(): LegalOfficerClosedCollectionLocCommands {
        return new LegalOfficerClosedCollectionLocCommands({
            locId: this.locId,
            client: this.locSharedState.client,
            request: this,
        });
    }
}

export class LegalOfficerClosedCollectionLocCommands
extends LegalOfficerNonVoidedCommandsImpl
implements LegalOfficerLocWithSelectableIssuersCommands<ClosedCollectionLoc> {

    constructor(args: {
        locId: UUID,
        client: AuthenticatedLocClient,
        request: ClosedCollectionLoc,
    }) {
        super(args);

        this.legalOfficerLocWithSelectableIssuersCommands = new LegalOfficerLocWithSelectableIssuersCommandsImpl(args);
    }

    private legalOfficerLocWithSelectableIssuersCommands: LegalOfficerLocWithSelectableIssuersCommands<ClosedCollectionLoc>;

    async getVerifiedIssuers(): Promise<VerifiedIssuerWithSelect[]> {
        return this.legalOfficerLocWithSelectableIssuersCommands.getVerifiedIssuers();
    }

    async selectIssuer(params: SelectUnselectIssuerParams): Promise<ClosedCollectionLoc> {
        return this.legalOfficerLocWithSelectableIssuersCommands.selectIssuer(params);
    }

    async unselectIssuer(params: SelectUnselectIssuerParams): Promise<ClosedCollectionLoc> {
        return this.legalOfficerLocWithSelectableIssuersCommands.unselectIssuer(params);
    }
}

async function requestSof(locSharedState: LocSharedState, locId: UUID, itemId?: Hash): Promise<PendingRequest> {
    const client = locSharedState.client;
    const locRequest = await client.createSofRequest({ locId, itemId });
    return new PendingRequest(locSharedState, locRequest, undefined, EMPTY_LOC_ISSUERS).veryNew(); // Discards this state
}

export class VoidedLoc extends LocRequestState {

    async replacerLoc(): Promise<OpenLoc | ClosedLoc | VoidedLoc | undefined> {
        this.ensureCurrent();
        const replacer = this.data().voidInfo?.replacer;
        if (replacer) {
            return this.locSharedState.locsState.findById(replacer) as OpenLoc | ClosedLoc | VoidedLoc;
        }
        return undefined;
    }

    async refresh(): Promise<VoidedLoc> {
        return await super.refresh() as VoidedLoc;
    }

    override withLocs(locsState: LocsState): VoidedLoc {
        return this._withLocs(locsState, VoidedLoc);
    }
}

export class VoidedCollectionLoc extends ClosedOrVoidCollectionLoc {

    async replacerLoc(): Promise<OpenLoc | ClosedCollectionLoc | VoidedCollectionLoc | undefined> {
        this.ensureCurrent();
        const replacer = this.data().voidInfo?.replacer;
        if (replacer) {
            return this.locSharedState.locsState.findById(replacer) as OpenLoc | ClosedCollectionLoc | VoidedCollectionLoc;
        }
        return undefined;
    }

    async refresh(): Promise<VoidedCollectionLoc> {
        return await super.refresh() as VoidedCollectionLoc;
    }

    override withLocs(locsState: LocsState): VoidedCollectionLoc {
        return this._withLocs(locsState, VoidedCollectionLoc);
    }
}

export class ReadOnlyLocState extends LocRequestState {

    constructor(locSharedState: LocSharedState, request: LocRequest, legalOfficerCase: LegalOfficerCase | undefined, locIssuers: LocVerifiedIssuers) {
        super(locSharedState, request, legalOfficerCase, locIssuers);
    }

    withLocs(locsState: LocsState): LocRequestState {
        return this._withLocs(locsState, ReadOnlyLocState);
    }
}

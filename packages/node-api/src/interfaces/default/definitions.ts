/* eslint-disable */
export default {
    typesAlias: {
        loAuthorityList: {
            StorageVersion: "LoAuthorityListStorageVersion",
        },
        logionLoc: {
            Vote: "LogionVote"
        }
    },
    types: {
        OpaquePeerId: "Vec<u8>",
        AccountInfo: "AccountInfoWithDualRefCount",
        TAssetBalance: "u128",
        AssetDetails: {
            owner: "AccountId",
            issuer: "AccountId",
            admin: "AccountId",
            freezer: "AccountId",
            supply: "Balance",
            deposit: "DepositBalance",
            max_zombies: "u32",
            min_balance: "Balance",
            zombies: "u32",
            accounts: "u32",
            is_frozen: "bool"
        },
        AssetMetadata: {
            deposit: "DepositBalance",
            name: "Vec<u8>",
            symbol: "Vec<u8>",
            decimals: "u8",
        },
        LocId: "u128",
        LegalOfficerCaseOf: {
            owner: "AccountId",
            requester: "Requester",
            metadata: "Vec<MetadataItem>",
            files: "Vec<File>",
            closed: "bool",
            loc_type: "LocType",
            links: "Vec<LocLink>",
            void_info: "Option<LocVoidInfo<LocId>>",
            replacer_of: "Option<LocId>",
            collection_last_block_submission: "Option<BlockNumber>",
            collection_max_size: "Option<CollectionSize>",
            collection_can_upload: "bool",
            seal: "Option<Hash>",
            sponsorship_id: "Option<SponsorshipId>",
            value_fee: "Balance",
            legal_fee: "Option<Balance>",
        },
        MetadataItemParams: {
            name: "Hash",
            value: "Hash",
            submitter: "SupportedAccountId"
        },
        MetadataItem: {
            name: "Hash",
            value: "Hash",
            submitter: "SupportedAccountId",
            acknowledgedByOwner: "bool",
            acknowledgedByVerifiedIssuer: "bool"
        },
        LocType: {
            _enum: [
                "Transaction",
                "Identity",
                "Collection"
            ]
        },
        LocLinkParams: {
            id: "LocId",
            nature: "Hash",
            submitter: "SupportedAccountId"
        },
        LocLink: {
            id: "LocId",
            nature: "Hash",
            submitter: "SupportedAccountId",
            acknowledgedByOwner: "bool",
            acknowledgedByVerifiedIssuer: "bool"
        },
        FileParams: {
            hash: "Hash",
            nature: "Hash",
            submitter: "SupportedAccountId"
        },
        File: {
            hash: "Hash",
            nature: "Hash",
            submitter: "SupportedAccountId",
            acknowledgedByOwner: "bool",
            acknowledgedByVerifiedIssuer: "bool"
        },
        LocVoidInfo: {
            replacer: "Option<LocId>"
        },
        StorageVersion: {
            "_enum": [
                "V1",
                "V2MakeLocVoid",
                "V3RequesterEnum",
                "V4ItemSubmitter",
                "V5Collection",
                "V6ItemUpload",
                "V7ItemToken",
                "V8AddSeal",
                "V9TermsAndConditions",
                "V10AddLocFileSize",
                "V11EnableEthereumSubmitter",
                "V12Sponsorship",
                "V13AcknowledgeItems",
                "V14HashLocPublicData",
                "V15AddTokenIssuance",
                "V16MoveTokenIssuance",
                "V17HashItemRecordPublicData",
                "V18AddValueFee",
                "V19AcknowledgeItemsByIssuer",
                "V20AddCustomLegalFee",
                "V21EnableRequesterLinks",
            ]
        },
        Requester: {
            "_enum": {
                "None": null,
                "Account": "AccountId",
                "Loc": "LocId",
                "OtherAccount": "OtherAccountId",
            }
        },
        CollectionSize: "u32",
        CollectionItemId: "Hash",
        CollectionItem: {
            description: "Hash",
            files: "Vec<CollectionItemFile>",
            token: "Option<CollectionItemToken>",
            restricted_delivery: "bool",
            terms_and_conditions: "Vec<TermsAndConditionsElement>",
        },
        TokenIssuance: "u64",
        CollectionItemFile: {
            name: "Hash",
            content_type: "Hash",
            fileSize: "u32",
            hash: "Hash",
        },
        CollectionItemToken: {
            token_type: "Hash",
	        token_id: "Hash",
            token_issuance: "TokenIssuance",
        },
        LegalOfficerData: {
            "_enum": {
                "Host": "HostData",
                "Guest": "AccountId"
            }
        },
        HostData: {
            node_id: "Option<OpaquePeerId>",
            base_url: "Option<Vec<u8>>",
            region: "Region",
        },
        Region: {
            _enum: [
                "Europe"
            ]
        },
        LoAuthorityListStorageVersion: {
            "_enum": [
                "V1",
                "V2AddOnchainSettings",
                "V3GuestLegalOfficers",
                "V4Region",
            ]
        },
        TermsAndConditionsElement: {
            tcType: "Hash",
            tcLoc: "LocId",
            details: "Hash",
        },
        LogionVote: {
            locId: "LocId",
            ballots: "Vec<Ballot>"
        },
        Ballot: {
            voter: "LocId",
            status: "AccountId"
        },
        BallotStatus: {
            _enum: [
                "NotVoted",
                "VotedYes",
                "VotedNo"
            ]
        },
        VoteId: "u64",
        VoteClosed: "bool",
        VoteApproved: "bool",
        LegalOfficerCaseSummary: {
            owner: "AccountId",
            requester: "Option<AccountId>",
        },
        TokensRecord: {
            description: "Hash",
            files: "Vec<TokensRecordFile>",
            submitter: "AccountId",
        },
        TokensRecordFile: {
            name: "Hash",
            contentType: "Hash",
            file_size: "u32",
            hash: "Hash"
        },
        VerifiedIssuer: {
            identityLoc: "LocId",
        },
        OtherAccountId: {
            _enum: {
                Ethereum: "H160",
            }
        },
        SupportedAccountId: {
            _enum: {
                None: null,
                Polkadot: "AccountId",
                Other: "OtherAccountId",
            }
        },
        SponsorshipId: "u128",
        Sponsorship: {
            sponsor: "AccountId",
            sponsored_account: "SupportedAccountId",
            legal_officer: "AccountId",
            loc_id: "Option<LocId>",
        },
        Beneficiary: {
            _enum: {
                Treasury: null,
                LegalOfficer: "AccountId",
            }
        },
        ItemsParams: {
            metadata: "Vec<MetadataItemParams>",
            files: "Vec<FileParams>",
            links: "Vec<LocLinkParams>",
        }
    }
};

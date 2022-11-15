[API](../API.md) / [Modules](../modules.md) / [Client](../modules/Client.md) / EditableRequest

# Class: EditableRequest

[Client](../modules/Client.md).EditableRequest

A State instance is a state in the "state machine" sense. It comes
with some behavior and state transition methods. A state transition
method returns an instance of the next state given the
executed operation, which discards current object.

This class should be extended by client class. It provides method
enabling the client class to query if it was already discarded
or not as well as methods actually discarding the state.

## Hierarchy

- [`LocRequestState`](Client.LocRequestState.md)

  ↳ **`EditableRequest`**

  ↳↳ [`DraftRequest`](Client.DraftRequest.md)

  ↳↳ [`OpenLoc`](Client.OpenLoc.md)

## Table of contents

### Constructors

- [constructor](Client.EditableRequest.md#constructor)

### Properties

- [legalOfficerCase](Client.EditableRequest.md#legalofficercase)
- [locSharedState](Client.EditableRequest.md#locsharedstate)
- [request](Client.EditableRequest.md#request)

### Accessors

- [discarded](Client.EditableRequest.md#discarded)
- [locId](Client.EditableRequest.md#locid)

### Methods

- [\_withLocs](Client.EditableRequest.md#_withlocs)
- [addFile](Client.EditableRequest.md#addfile)
- [addMetadata](Client.EditableRequest.md#addmetadata)
- [checkHash](Client.EditableRequest.md#checkhash)
- [data](Client.EditableRequest.md#data)
- [deleteFile](Client.EditableRequest.md#deletefile)
- [deleteMetadata](Client.EditableRequest.md#deletemetadata)
- [discard](Client.EditableRequest.md#discard)
- [discardOnSuccess](Client.EditableRequest.md#discardonsuccess)
- [ensureCurrent](Client.EditableRequest.md#ensurecurrent)
- [isLogionData](Client.EditableRequest.md#islogiondata)
- [isLogionIdentity](Client.EditableRequest.md#islogionidentity)
- [locsState](Client.EditableRequest.md#locsstate)
- [refresh](Client.EditableRequest.md#refresh)
- [supersededLoc](Client.EditableRequest.md#supersededloc)
- [syncDiscardOnSuccess](Client.EditableRequest.md#syncdiscardonsuccess)
- [withLocs](Client.EditableRequest.md#withlocs)
- [buildLocData](Client.EditableRequest.md#buildlocdata)
- [checkHash](Client.EditableRequest.md#checkhash-1)
- [createFromLoc](Client.EditableRequest.md#createfromloc)
- [createFromRequest](Client.EditableRequest.md#createfromrequest)

## Constructors

### constructor

• **new EditableRequest**(`locSharedState`, `request`, `legalOfficerCase?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `locSharedState` | [`LocSharedState`](../interfaces/Client.LocSharedState.md) |
| `request` | [`LocRequest`](../interfaces/Client.LocRequest.md) |
| `legalOfficerCase?` | [`LegalOfficerCase`](../interfaces/Node_API.LegalOfficerCase.md) |

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[constructor](Client.LocRequestState.md#constructor)

#### Defined in

[packages/client/src/Loc.ts:294](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L294)

## Properties

### legalOfficerCase

• `Protected` `Optional` `Readonly` **legalOfficerCase**: [`LegalOfficerCase`](../interfaces/Node_API.LegalOfficerCase.md)

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[legalOfficerCase](Client.LocRequestState.md#legalofficercase)

#### Defined in

[packages/client/src/Loc.ts:292](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L292)

___

### locSharedState

• `Protected` `Readonly` **locSharedState**: [`LocSharedState`](../interfaces/Client.LocSharedState.md)

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[locSharedState](Client.LocRequestState.md#locsharedstate)

#### Defined in

[packages/client/src/Loc.ts:290](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L290)

___

### request

• `Protected` `Readonly` **request**: [`LocRequest`](../interfaces/Client.LocRequest.md)

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[request](Client.LocRequestState.md#request)

#### Defined in

[packages/client/src/Loc.ts:291](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L291)

## Accessors

### discarded

• `get` **discarded**(): `boolean`

**`Description`**

True if this state was discarded

#### Returns

`boolean`

#### Inherited from

LocRequestState.discarded

#### Defined in

[packages/client/src/State.ts:22](https://github.com/logion-network/logion-api/blob/main/packages/client/src/State.ts#L22)

___

### locId

• `get` **locId**(): [`UUID`](Node_API.UUID.md)

#### Returns

[`UUID`](Node_API.UUID.md)

#### Inherited from

LocRequestState.locId

#### Defined in

[packages/client/src/Loc.ts:301](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L301)

## Methods

### \_withLocs

▸ `Protected` **_withLocs**<`T`\>(`locsState`, `constructor`): `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`LocRequestState`](Client.LocRequestState.md)<`T`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `locsState` | [`LocsState`](Client.LocsState.md) |
| `constructor` | (`locSharedState`: [`LocSharedState`](../interfaces/Client.LocSharedState.md), `request`: [`LocRequest`](../interfaces/Client.LocRequest.md), `legalOfficerCase?`: [`LegalOfficerCase`](../interfaces/Node_API.LegalOfficerCase.md)) => `T` |

#### Returns

`T`

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[_withLocs](Client.LocRequestState.md#_withlocs)

#### Defined in

[packages/client/src/Loc.ts:508](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L508)

___

### addFile

▸ **addFile**(`params`): `Promise`<[`EditableRequest`](Client.EditableRequest.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`AddFileParams`](../interfaces/Client.AddFileParams.md) |

#### Returns

`Promise`<[`EditableRequest`](Client.EditableRequest.md)\>

#### Defined in

[packages/client/src/Loc.ts:527](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L527)

___

### addMetadata

▸ **addMetadata**(`params`): `Promise`<[`EditableRequest`](Client.EditableRequest.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`AddMetadataParams`](../interfaces/Client.AddMetadataParams.md) |

#### Returns

`Promise`<[`EditableRequest`](Client.EditableRequest.md)\>

#### Defined in

[packages/client/src/Loc.ts:518](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L518)

___

### checkHash

▸ **checkHash**(`hash`): `Promise`<[`CheckHashResult`](../interfaces/Client.CheckHashResult.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `hash` | `string` |

#### Returns

`Promise`<[`CheckHashResult`](../interfaces/Client.CheckHashResult.md)\>

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[checkHash](Client.LocRequestState.md#checkhash)

#### Defined in

[packages/client/src/Loc.ts:388](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L388)

___

### data

▸ **data**(): [`LocData`](../interfaces/Client.LocData.md)

#### Returns

[`LocData`](../interfaces/Client.LocData.md)

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[data](Client.LocRequestState.md#data)

#### Defined in

[packages/client/src/Loc.ts:354](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L354)

___

### deleteFile

▸ **deleteFile**(`params`): `Promise`<[`EditableRequest`](Client.EditableRequest.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`DeleteFileParams`](../interfaces/Client.DeleteFileParams.md) |

#### Returns

`Promise`<[`EditableRequest`](Client.EditableRequest.md)\>

#### Defined in

[packages/client/src/Loc.ts:545](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L545)

___

### deleteMetadata

▸ **deleteMetadata**(`params`): `Promise`<[`EditableRequest`](Client.EditableRequest.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`DeleteMetadataParams`](../interfaces/Client.DeleteMetadataParams.md) |

#### Returns

`Promise`<[`EditableRequest`](Client.EditableRequest.md)\>

#### Defined in

[packages/client/src/Loc.ts:536](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L536)

___

### discard

▸ `Protected` **discard**(): `void`

**`Description`**

Discards current state. One must discard the state only
if the state transition was successfully executed. It may be safer to
use `discardOnSuccess`.

#### Returns

`void`

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[discard](Client.LocRequestState.md#discard)

#### Defined in

[packages/client/src/State.ts:41](https://github.com/logion-network/logion-api/blob/main/packages/client/src/State.ts#L41)

___

### discardOnSuccess

▸ `Protected` **discardOnSuccess**<`T`\>(`action`): `Promise`<`T`\>

**`Descripiton`**

Discards current state only if given state transition logic
executed successfully (i.e. without throwing an error).

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`State`](Client.State.md)<`T`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `action` | () => `Promise`<`T`\> | The state transition logic producing next state |

#### Returns

`Promise`<`T`\>

Next state if state transition logic execution did not throw

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[discardOnSuccess](Client.LocRequestState.md#discardonsuccess)

#### Defined in

[packages/client/src/State.ts:52](https://github.com/logion-network/logion-api/blob/main/packages/client/src/State.ts#L52)

___

### ensureCurrent

▸ `Protected` **ensureCurrent**(): `void`

**`Description`**

Throws an error if this state was discarded.
This should be called by all public methods of client class.

#### Returns

`void`

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[ensureCurrent](Client.LocRequestState.md#ensurecurrent)

#### Defined in

[packages/client/src/State.ts:30](https://github.com/logion-network/logion-api/blob/main/packages/client/src/State.ts#L30)

___

### isLogionData

▸ **isLogionData**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[isLogionData](Client.LocRequestState.md#islogiondata)

#### Defined in

[packages/client/src/Loc.ts:382](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L382)

___

### isLogionIdentity

▸ **isLogionIdentity**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[isLogionIdentity](Client.LocRequestState.md#islogionidentity)

#### Defined in

[packages/client/src/Loc.ts:376](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L376)

___

### locsState

▸ **locsState**(): [`LocsState`](Client.LocsState.md)

#### Returns

[`LocsState`](Client.LocsState.md)

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[locsState](Client.LocRequestState.md#locsstate)

#### Defined in

[packages/client/src/Loc.ts:349](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L349)

___

### refresh

▸ **refresh**(): `Promise`<[`LocRequestState`](Client.LocRequestState.md)\>

#### Returns

`Promise`<[`LocRequestState`](Client.LocRequestState.md)\>

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[refresh](Client.LocRequestState.md#refresh)

#### Defined in

[packages/client/src/Loc.ts:341](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L341)

___

### supersededLoc

▸ **supersededLoc**(): `Promise`<`undefined` \| [`VoidedLoc`](Client.VoidedLoc.md)\>

#### Returns

`Promise`<`undefined` \| [`VoidedLoc`](Client.VoidedLoc.md)\>

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[supersededLoc](Client.LocRequestState.md#supersededloc)

#### Defined in

[packages/client/src/Loc.ts:367](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L367)

___

### syncDiscardOnSuccess

▸ `Protected` **syncDiscardOnSuccess**<`T`\>(`action`): `T`

**`Descripiton`**

Same as `discardOnSuccess` but with a synchronous action.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`State`](Client.State.md)<`T`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `action` | () => `T` | The state transition logic producing next state |

#### Returns

`T`

Next state if state transition logic execution did not throw

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[syncDiscardOnSuccess](Client.LocRequestState.md#syncdiscardonsuccess)

#### Defined in

[packages/client/src/State.ts:66](https://github.com/logion-network/logion-api/blob/main/packages/client/src/State.ts#L66)

___

### withLocs

▸ `Abstract` **withLocs**(`locsState`): [`LocRequestState`](Client.LocRequestState.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `locsState` | [`LocsState`](Client.LocsState.md) |

#### Returns

[`LocRequestState`](Client.LocRequestState.md)

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[withLocs](Client.LocRequestState.md#withlocs)

#### Defined in

[packages/client/src/Loc.ts:506](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L506)

___

### buildLocData

▸ `Static` **buildLocData**(`legalOfficerCase`, `request`): [`LocData`](../interfaces/Client.LocData.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `legalOfficerCase` | `undefined` \| [`LegalOfficerCase`](../interfaces/Node_API.LegalOfficerCase.md) |
| `request` | [`LocRequest`](../interfaces/Client.LocRequest.md) |

#### Returns

[`LocData`](../interfaces/Client.LocData.md)

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[buildLocData](Client.LocRequestState.md#buildlocdata)

#### Defined in

[packages/client/src/Loc.ts:359](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L359)

___

### checkHash

▸ `Static` **checkHash**(`loc`, `hash`): [`CheckHashResult`](../interfaces/Client.CheckHashResult.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `loc` | [`LocData`](../interfaces/Client.LocData.md) |
| `hash` | `string` |

#### Returns

[`CheckHashResult`](../interfaces/Client.CheckHashResult.md)

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[checkHash](Client.LocRequestState.md#checkhash-1)

#### Defined in

[packages/client/src/Loc.ts:393](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L393)

___

### createFromLoc

▸ `Static` **createFromLoc**(`locSharedState`, `request`, `legalOfficerCase`): `Promise`<[`OnchainLocState`](../modules/Client.md#onchainlocstate)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `locSharedState` | [`LocSharedState`](../interfaces/Client.LocSharedState.md) |
| `request` | [`LocRequest`](../interfaces/Client.LocRequest.md) |
| `legalOfficerCase` | [`LegalOfficerCase`](../interfaces/Node_API.LegalOfficerCase.md) |

#### Returns

`Promise`<[`OnchainLocState`](../modules/Client.md#onchainlocstate)\>

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[createFromLoc](Client.LocRequestState.md#createfromloc)

#### Defined in

[packages/client/src/Loc.ts:318](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L318)

___

### createFromRequest

▸ `Static` **createFromRequest**(`locSharedState`, `request`): `Promise`<[`AnyLocState`](../modules/Client.md#anylocstate)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `locSharedState` | [`LocSharedState`](../interfaces/Client.LocSharedState.md) |
| `request` | [`LocRequest`](../interfaces/Client.LocRequest.md) |

#### Returns

`Promise`<[`AnyLocState`](../modules/Client.md#anylocstate)\>

#### Inherited from

[LocRequestState](Client.LocRequestState.md).[createFromRequest](Client.LocRequestState.md#createfromrequest)

#### Defined in

[packages/client/src/Loc.ts:305](https://github.com/logion-network/logion-api/blob/main/packages/client/src/Loc.ts#L305)
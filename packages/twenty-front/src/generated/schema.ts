export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A custom scalar type for representing big floating point numbers */
  BigFloat: { input: any; output: any; }
  /** Cursor for paging through collections */
  ConnectionCursor: { input: any; output: any; }
  /** A custom scalar that represents a cursor for pagination */
  Cursor: { input: any; output: any; }
  /** Date custom scalar type, as a string in format yyyy-MM-dd (ex: 2025-12-31), we don't signify time nor timezone for DATE. */
  Date: { input: any; output: any; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: any; output: any; }
  /** A custom scalar type for representing record position in a list */
  Position: { input: any; output: any; }
  /** A custom scalar type for PostgreSQL tsvector fields */
  TSVector: { input: any; output: any; }
  /** A UUID scalar type */
  UUID: { input: string; output: string; }
};

export type Actor = {
  __typename?: 'Actor';
  context?: Maybe<ActorContext>;
  name: Scalars['String']['output'];
  source: ActorSourceEnum;
  workspaceMemberId?: Maybe<Scalars['UUID']['output']>;
};

export type ActorContext = {
  __typename?: 'ActorContext';
  applicationId?: Maybe<Scalars['String']['output']>;
  provider?: Maybe<Scalars['String']['output']>;
};

export type ActorContextInput = {
  provider?: InputMaybe<Scalars['String']['input']>;
};

export type ActorCreateInput = {
  context?: InputMaybe<ActorContextInput>;
  source: ActorSourceEnum;
};

export type ActorFilterInput = {
  context?: InputMaybe<RawJsonFilter>;
  name?: InputMaybe<StringFilter>;
  source?: InputMaybe<ActorSourceEnumFilter>;
  workspaceMemberId?: InputMaybe<UuidFilter>;
};

export type ActorGroupByInput = {
  name?: InputMaybe<Scalars['Boolean']['input']>;
  source?: InputMaybe<Scalars['Boolean']['input']>;
  workspaceMemberId?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ActorOrderByInput = {
  context?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<OrderByDirection>;
  source?: InputMaybe<OrderByDirection>;
  workspaceMemberId?: InputMaybe<OrderByDirection>;
};

export enum ActorSourceEnum {
  /** agent */
  AGENT = 'AGENT',
  /** api */
  API = 'API',
  /** application */
  APPLICATION = 'APPLICATION',
  /** calendar */
  CALENDAR = 'CALENDAR',
  /** email */
  EMAIL = 'EMAIL',
  /** import */
  IMPORT = 'IMPORT',
  /** manual */
  MANUAL = 'MANUAL',
  /** system */
  SYSTEM = 'SYSTEM',
  /** webhook */
  WEBHOOK = 'WEBHOOK',
  /** workflow */
  WORKFLOW = 'WORKFLOW'
}

export type ActorSourceEnumFilter = {
  containsAny?: InputMaybe<Array<InputMaybe<ActorSourceEnum>>>;
  eq?: InputMaybe<ActorSourceEnum>;
  gt?: InputMaybe<ActorSourceEnum>;
  gte?: InputMaybe<ActorSourceEnum>;
  in?: InputMaybe<Array<InputMaybe<ActorSourceEnum>>>;
  is?: InputMaybe<FilterIs>;
  isEmptyArray?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<ActorSourceEnum>;
  lte?: InputMaybe<ActorSourceEnum>;
  neq?: InputMaybe<ActorSourceEnum>;
};

export type ActorUpdateInput = {
  context?: InputMaybe<ActorContextInput>;
  source?: InputMaybe<ActorSourceEnum>;
};

export type AdditionalPhone = {
  __typename?: 'AdditionalPhone';
  callingCode?: Maybe<Scalars['String']['output']>;
  countryCode?: Maybe<Scalars['String']['output']>;
  number?: Maybe<Scalars['String']['output']>;
};

export type AdditionalPhoneInput = {
  callingCode?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  number?: InputMaybe<Scalars['String']['input']>;
};

export type Address = {
  __typename?: 'Address';
  addressCity?: Maybe<Scalars['String']['output']>;
  addressCountry?: Maybe<Scalars['String']['output']>;
  addressLat?: Maybe<Scalars['BigFloat']['output']>;
  addressLng?: Maybe<Scalars['BigFloat']['output']>;
  addressPostcode?: Maybe<Scalars['String']['output']>;
  addressState?: Maybe<Scalars['String']['output']>;
  addressStreet1?: Maybe<Scalars['String']['output']>;
  addressStreet2?: Maybe<Scalars['String']['output']>;
};

export type AddressCreateInput = {
  addressCity?: InputMaybe<Scalars['String']['input']>;
  addressCountry?: InputMaybe<Scalars['String']['input']>;
  addressLat?: InputMaybe<Scalars['BigFloat']['input']>;
  addressLng?: InputMaybe<Scalars['BigFloat']['input']>;
  addressPostcode?: InputMaybe<Scalars['String']['input']>;
  addressState?: InputMaybe<Scalars['String']['input']>;
  addressStreet1?: InputMaybe<Scalars['String']['input']>;
  addressStreet2?: InputMaybe<Scalars['String']['input']>;
};

export type AddressFilterInput = {
  addressCity?: InputMaybe<StringFilter>;
  addressCountry?: InputMaybe<StringFilter>;
  addressLat?: InputMaybe<BigFloatFilter>;
  addressLng?: InputMaybe<BigFloatFilter>;
  addressPostcode?: InputMaybe<StringFilter>;
  addressState?: InputMaybe<StringFilter>;
  addressStreet1?: InputMaybe<StringFilter>;
  addressStreet2?: InputMaybe<StringFilter>;
};

export type AddressGroupByInput = {
  addressCity?: InputMaybe<Scalars['Boolean']['input']>;
  addressCountry?: InputMaybe<Scalars['Boolean']['input']>;
  addressLat?: InputMaybe<Scalars['Boolean']['input']>;
  addressLng?: InputMaybe<Scalars['Boolean']['input']>;
  addressPostcode?: InputMaybe<Scalars['Boolean']['input']>;
  addressState?: InputMaybe<Scalars['Boolean']['input']>;
  addressStreet1?: InputMaybe<Scalars['Boolean']['input']>;
  addressStreet2?: InputMaybe<Scalars['Boolean']['input']>;
};

export type AddressOrderByInput = {
  addressCity?: InputMaybe<OrderByDirection>;
  addressCountry?: InputMaybe<OrderByDirection>;
  addressLat?: InputMaybe<OrderByDirection>;
  addressLng?: InputMaybe<OrderByDirection>;
  addressPostcode?: InputMaybe<OrderByDirection>;
  addressState?: InputMaybe<OrderByDirection>;
  addressStreet1?: InputMaybe<OrderByDirection>;
  addressStreet2?: InputMaybe<OrderByDirection>;
};

export type AddressUpdateInput = {
  addressCity?: InputMaybe<Scalars['String']['input']>;
  addressCountry?: InputMaybe<Scalars['String']['input']>;
  addressLat?: InputMaybe<Scalars['BigFloat']['input']>;
  addressLng?: InputMaybe<Scalars['BigFloat']['input']>;
  addressPostcode?: InputMaybe<Scalars['String']['input']>;
  addressState?: InputMaybe<Scalars['String']['input']>;
  addressStreet1?: InputMaybe<Scalars['String']['input']>;
  addressStreet2?: InputMaybe<Scalars['String']['input']>;
};

export type Attachment = {
  __typename?: 'Attachment';
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  file?: Maybe<Array<Maybe<FileObject>>>;
  fileCategory?: Maybe<AttachmentFileCategoryEnum>;
  fullPath?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  targetCompany?: Maybe<Company>;
  targetCompanyId?: Maybe<Scalars['ID']['output']>;
  targetNote?: Maybe<Note>;
  targetNoteId?: Maybe<Scalars['ID']['output']>;
  targetOpportunity?: Maybe<Opportunity>;
  targetOpportunityId?: Maybe<Scalars['ID']['output']>;
  targetPerson?: Maybe<Person>;
  targetPersonId?: Maybe<Scalars['ID']['output']>;
  targetTask?: Maybe<Task>;
  targetTaskId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
};

export type AttachmentConnectInput = {
  where?: InputMaybe<AttachmentWhereUniqueInput>;
};

export type AttachmentConnection = {
  __typename?: 'AttachmentConnection';
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyFile?: Maybe<Scalars['Int']['output']>;
  countEmptyFileCategory?: Maybe<Scalars['Int']['output']>;
  countEmptyFullPath?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyFile?: Maybe<Scalars['Int']['output']>;
  countNotEmptyFileCategory?: Maybe<Scalars['Int']['output']>;
  countNotEmptyFullPath?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesFile?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesFileCategory?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesFullPath?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<AttachmentEdge>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyFile?: Maybe<Scalars['Float']['output']>;
  percentageEmptyFileCategory?: Maybe<Scalars['Float']['output']>;
  percentageEmptyFullPath?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyFile?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyFileCategory?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyFullPath?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type AttachmentCreateInput = {
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  file?: InputMaybe<Array<InputMaybe<FileItemInput>>>;
  fileCategory?: InputMaybe<AttachmentFileCategoryEnum>;
  fullPath?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  targetCompany?: InputMaybe<CompanyRelationInput>;
  targetCompanyId?: InputMaybe<Scalars['ID']['input']>;
  targetNote?: InputMaybe<NoteRelationInput>;
  targetNoteId?: InputMaybe<Scalars['ID']['input']>;
  targetOpportunity?: InputMaybe<OpportunityRelationInput>;
  targetOpportunityId?: InputMaybe<Scalars['ID']['input']>;
  targetPerson?: InputMaybe<PersonRelationInput>;
  targetPersonId?: InputMaybe<Scalars['ID']['input']>;
  targetTask?: InputMaybe<TaskRelationInput>;
  targetTaskId?: InputMaybe<Scalars['ID']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
};

export type AttachmentEdge = {
  __typename?: 'AttachmentEdge';
  cursor: Scalars['Cursor']['output'];
  node: Attachment;
};

export enum AttachmentFileCategoryEnum {
  ARCHIVE = 'ARCHIVE',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
  OTHER = 'OTHER',
  PRESENTATION = 'PRESENTATION',
  SPREADSHEET = 'SPREADSHEET',
  TEXT_DOCUMENT = 'TEXT_DOCUMENT',
  VIDEO = 'VIDEO'
}

export type AttachmentFileCategoryEnumFilter = {
  containsAny?: InputMaybe<Array<InputMaybe<AttachmentFileCategoryEnum>>>;
  eq?: InputMaybe<AttachmentFileCategoryEnum>;
  gt?: InputMaybe<AttachmentFileCategoryEnum>;
  gte?: InputMaybe<AttachmentFileCategoryEnum>;
  in?: InputMaybe<Array<InputMaybe<AttachmentFileCategoryEnum>>>;
  is?: InputMaybe<FilterIs>;
  isEmptyArray?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<AttachmentFileCategoryEnum>;
  lte?: InputMaybe<AttachmentFileCategoryEnum>;
  neq?: InputMaybe<AttachmentFileCategoryEnum>;
};

export type AttachmentFilterInput = {
  and?: InputMaybe<Array<InputMaybe<AttachmentFilterInput>>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  file?: InputMaybe<RawJsonFilter>;
  fileCategory?: InputMaybe<AttachmentFileCategoryEnumFilter>;
  fullPath?: InputMaybe<StringFilter>;
  id?: InputMaybe<UuidFilter>;
  name?: InputMaybe<StringFilter>;
  not?: InputMaybe<AttachmentFilterInput>;
  or?: InputMaybe<Array<InputMaybe<AttachmentFilterInput>>>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  targetCompany?: InputMaybe<CompanyFilterInput>;
  targetCompanyId?: InputMaybe<UuidFilter>;
  targetNote?: InputMaybe<NoteFilterInput>;
  targetNoteId?: InputMaybe<UuidFilter>;
  targetOpportunity?: InputMaybe<OpportunityFilterInput>;
  targetOpportunityId?: InputMaybe<UuidFilter>;
  targetPerson?: InputMaybe<PersonFilterInput>;
  targetPersonId?: InputMaybe<UuidFilter>;
  targetTask?: InputMaybe<TaskFilterInput>;
  targetTaskId?: InputMaybe<UuidFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
};

export type AttachmentGroupByConnection = {
  __typename?: 'AttachmentGroupByConnection';
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyFile?: Maybe<Scalars['Int']['output']>;
  countEmptyFileCategory?: Maybe<Scalars['Int']['output']>;
  countEmptyFullPath?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyFile?: Maybe<Scalars['Int']['output']>;
  countNotEmptyFileCategory?: Maybe<Scalars['Int']['output']>;
  countNotEmptyFullPath?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesFile?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesFileCategory?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesFullPath?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<AttachmentEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyFile?: Maybe<Scalars['Float']['output']>;
  percentageEmptyFileCategory?: Maybe<Scalars['Float']['output']>;
  percentageEmptyFullPath?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyFile?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyFileCategory?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyFullPath?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type AttachmentGroupByInput = {
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  fileCategory?: InputMaybe<Scalars['Boolean']['input']>;
  fullPath?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['Boolean']['input']>;
  targetCompany?: InputMaybe<CompanyGroupByInput>;
  targetNote?: InputMaybe<NoteGroupByInput>;
  targetOpportunity?: InputMaybe<OpportunityGroupByInput>;
  targetPerson?: InputMaybe<PersonGroupByInput>;
  targetTask?: InputMaybe<TaskGroupByInput>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
};

export type AttachmentOrderByInput = {
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  file?: InputMaybe<OrderByDirection>;
  fileCategory?: InputMaybe<OrderByDirection>;
  fullPath?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  targetCompany?: InputMaybe<CompanyOrderByInput>;
  targetCompanyId?: InputMaybe<OrderByDirection>;
  targetNote?: InputMaybe<NoteOrderByInput>;
  targetNoteId?: InputMaybe<OrderByDirection>;
  targetOpportunity?: InputMaybe<OpportunityOrderByInput>;
  targetOpportunityId?: InputMaybe<OrderByDirection>;
  targetPerson?: InputMaybe<PersonOrderByInput>;
  targetPersonId?: InputMaybe<OrderByDirection>;
  targetTask?: InputMaybe<TaskOrderByInput>;
  targetTaskId?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type AttachmentOrderByWithGroupByAggregateInput = {
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyFile?: InputMaybe<OrderByDirection>;
  countEmptyFileCategory?: InputMaybe<OrderByDirection>;
  countEmptyFullPath?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyName?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyFile?: InputMaybe<OrderByDirection>;
  countNotEmptyFileCategory?: InputMaybe<OrderByDirection>;
  countNotEmptyFullPath?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyName?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesFile?: InputMaybe<OrderByDirection>;
  countUniqueValuesFileCategory?: InputMaybe<OrderByDirection>;
  countUniqueValuesFullPath?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesName?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyFile?: InputMaybe<OrderByDirection>;
  percentageEmptyFileCategory?: InputMaybe<OrderByDirection>;
  percentageEmptyFullPath?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyName?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyFile?: InputMaybe<OrderByDirection>;
  percentageNotEmptyFileCategory?: InputMaybe<OrderByDirection>;
  percentageNotEmptyFullPath?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyName?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type AttachmentOrderByWithGroupByInput = {
  aggregate?: InputMaybe<AttachmentOrderByWithGroupByAggregateInput>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  file?: InputMaybe<OrderByDirection>;
  fileCategory?: InputMaybe<OrderByDirection>;
  fullPath?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  targetCompany?: InputMaybe<CompanyOrderByWithGroupByInput>;
  targetCompanyId?: InputMaybe<OrderByDirection>;
  targetNote?: InputMaybe<NoteOrderByWithGroupByInput>;
  targetNoteId?: InputMaybe<OrderByDirection>;
  targetOpportunity?: InputMaybe<OpportunityOrderByWithGroupByInput>;
  targetOpportunityId?: InputMaybe<OrderByDirection>;
  targetPerson?: InputMaybe<PersonOrderByWithGroupByInput>;
  targetPersonId?: InputMaybe<OrderByDirection>;
  targetTask?: InputMaybe<TaskOrderByWithGroupByInput>;
  targetTaskId?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type AttachmentRelationInput = {
  connect?: InputMaybe<AttachmentConnectInput>;
  create?: InputMaybe<AttachmentCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export type AttachmentUpdateInput = {
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  file?: InputMaybe<Array<InputMaybe<FileItemInput>>>;
  fileCategory?: InputMaybe<AttachmentFileCategoryEnum>;
  fullPath?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  targetCompany?: InputMaybe<CompanyRelationInput>;
  targetCompanyId?: InputMaybe<Scalars['ID']['input']>;
  targetNote?: InputMaybe<NoteRelationInput>;
  targetNoteId?: InputMaybe<Scalars['ID']['input']>;
  targetOpportunity?: InputMaybe<OpportunityRelationInput>;
  targetOpportunityId?: InputMaybe<Scalars['ID']['input']>;
  targetPerson?: InputMaybe<PersonRelationInput>;
  targetPersonId?: InputMaybe<Scalars['ID']['input']>;
  targetTask?: InputMaybe<TaskRelationInput>;
  targetTaskId?: InputMaybe<Scalars['ID']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
};

export type AttachmentWhereUniqueInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type BigFloatFilter = {
  eq?: InputMaybe<Scalars['BigFloat']['input']>;
  gt?: InputMaybe<Scalars['BigFloat']['input']>;
  gtField?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['BigFloat']['input']>;
  gteField?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['BigFloat']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['BigFloat']['input']>;
  ltField?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['BigFloat']['input']>;
  lteField?: InputMaybe<Scalars['String']['input']>;
  neq?: InputMaybe<Scalars['BigFloat']['input']>;
};

export type Company = {
  __typename?: 'Company';
  accountOwner?: Maybe<WorkspaceMember>;
  accountOwnerId?: Maybe<Scalars['ID']['output']>;
  address?: Maybe<Address>;
  annualRevenue?: Maybe<Currency>;
  attachments?: Maybe<AttachmentConnection>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  domainName?: Maybe<Links>;
  id: Scalars['UUID']['output'];
  linkedinLink?: Maybe<Links>;
  name?: Maybe<Scalars['String']['output']>;
  noteTargets?: Maybe<NoteTargetConnection>;
  opportunities?: Maybe<OpportunityConnection>;
  people?: Maybe<PersonConnection>;
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  taskTargets?: Maybe<TaskTargetConnection>;
  timelineActivities?: Maybe<TimelineActivityConnection>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
};


export type CompanyAttachmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<AttachmentFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<AttachmentOrderByInput>>>;
};


export type CompanyNoteTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<NoteTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<NoteTargetOrderByInput>>>;
};


export type CompanyOpportunitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<OpportunityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<OpportunityOrderByInput>>>;
};


export type CompanyPeopleArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PersonFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<PersonOrderByInput>>>;
};


export type CompanyTaskTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TaskTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskTargetOrderByInput>>>;
};


export type CompanyTimelineActivitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TimelineActivityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByInput>>>;
};

export type CompanyConnectInput = {
  where?: InputMaybe<CompanyWhereUniqueInput>;
};

export type CompanyConnection = {
  __typename?: 'CompanyConnection';
  avgAnnualRevenueAmountMicros?: Maybe<Scalars['Float']['output']>;
  countEmptyAddress?: Maybe<Scalars['Int']['output']>;
  countEmptyAnnualRevenue?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyDomainName?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAddress?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAnnualRevenue?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDomainName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAddress?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAnnualRevenue?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDomainName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<CompanyEdge>;
  maxAnnualRevenueAmountMicros?: Maybe<Scalars['Float']['output']>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minAnnualRevenueAmountMicros?: Maybe<Scalars['Float']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyAddress?: Maybe<Scalars['Float']['output']>;
  percentageEmptyAnnualRevenue?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDomainName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedinLink?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAddress?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAnnualRevenue?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDomainName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedinLink?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  sumAnnualRevenueAmountMicros?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type CompanyCreateInput = {
  accountOwner?: InputMaybe<WorkspaceMemberRelationInput>;
  accountOwnerId?: InputMaybe<Scalars['ID']['input']>;
  address?: InputMaybe<AddressCreateInput>;
  annualRevenue?: InputMaybe<CurrencyCreateInput>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  domainName?: InputMaybe<LinksCreateInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
  linkedinLink?: InputMaybe<LinksCreateInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
};

export type CompanyDomainNameWhereInput = {
  primaryLinkUrl?: InputMaybe<Scalars['String']['input']>;
};

export type CompanyEdge = {
  __typename?: 'CompanyEdge';
  cursor: Scalars['Cursor']['output'];
  node: Company;
};

export type CompanyFilterInput = {
  accountOwner?: InputMaybe<WorkspaceMemberFilterInput>;
  accountOwnerId?: InputMaybe<UuidFilter>;
  address?: InputMaybe<AddressFilterInput>;
  and?: InputMaybe<Array<InputMaybe<CompanyFilterInput>>>;
  annualRevenue?: InputMaybe<CurrencyFilterInput>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  domainName?: InputMaybe<LinksFilterInput>;
  id?: InputMaybe<UuidFilter>;
  linkedinLink?: InputMaybe<LinksFilterInput>;
  name?: InputMaybe<StringFilter>;
  not?: InputMaybe<CompanyFilterInput>;
  or?: InputMaybe<Array<InputMaybe<CompanyFilterInput>>>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
};

export type CompanyGroupByConnection = {
  __typename?: 'CompanyGroupByConnection';
  avgAnnualRevenueAmountMicros?: Maybe<Scalars['Float']['output']>;
  countEmptyAddress?: Maybe<Scalars['Int']['output']>;
  countEmptyAnnualRevenue?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyDomainName?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAddress?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAnnualRevenue?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDomainName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAddress?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAnnualRevenue?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDomainName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<CompanyEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxAnnualRevenueAmountMicros?: Maybe<Scalars['Float']['output']>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minAnnualRevenueAmountMicros?: Maybe<Scalars['Float']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyAddress?: Maybe<Scalars['Float']['output']>;
  percentageEmptyAnnualRevenue?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDomainName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedinLink?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAddress?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAnnualRevenue?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDomainName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedinLink?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  sumAnnualRevenueAmountMicros?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type CompanyGroupByInput = {
  accountOwner?: InputMaybe<WorkspaceMemberGroupByInput>;
  address?: InputMaybe<AddressGroupByInput>;
  annualRevenue?: InputMaybe<CurrencyGroupByInput>;
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  domainName?: InputMaybe<LinksGroupByInput>;
  linkedinLink?: InputMaybe<LinksGroupByInput>;
  name?: InputMaybe<Scalars['Boolean']['input']>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
};

export type CompanyOrderByInput = {
  accountOwner?: InputMaybe<WorkspaceMemberOrderByInput>;
  accountOwnerId?: InputMaybe<OrderByDirection>;
  address?: InputMaybe<AddressOrderByInput>;
  annualRevenue?: InputMaybe<CurrencyOrderByInput>;
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  domainName?: InputMaybe<LinksOrderByInput>;
  id?: InputMaybe<OrderByDirection>;
  linkedinLink?: InputMaybe<LinksOrderByInput>;
  name?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type CompanyOrderByWithGroupByAggregateInput = {
  avgAnnualRevenueAmountMicros?: InputMaybe<OrderByDirection>;
  countEmptyAddress?: InputMaybe<OrderByDirection>;
  countEmptyAnnualRevenue?: InputMaybe<OrderByDirection>;
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyDomainName?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyLinkedinLink?: InputMaybe<OrderByDirection>;
  countEmptyName?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyAddress?: InputMaybe<OrderByDirection>;
  countNotEmptyAnnualRevenue?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyDomainName?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyLinkedinLink?: InputMaybe<OrderByDirection>;
  countNotEmptyName?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesAddress?: InputMaybe<OrderByDirection>;
  countUniqueValuesAnnualRevenue?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesDomainName?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesLinkedinLink?: InputMaybe<OrderByDirection>;
  countUniqueValuesName?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxAnnualRevenueAmountMicros?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minAnnualRevenueAmountMicros?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyAddress?: InputMaybe<OrderByDirection>;
  percentageEmptyAnnualRevenue?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyDomainName?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyLinkedinLink?: InputMaybe<OrderByDirection>;
  percentageEmptyName?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyAddress?: InputMaybe<OrderByDirection>;
  percentageNotEmptyAnnualRevenue?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDomainName?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyLinkedinLink?: InputMaybe<OrderByDirection>;
  percentageNotEmptyName?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  sumAnnualRevenueAmountMicros?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type CompanyOrderByWithGroupByInput = {
  accountOwner?: InputMaybe<WorkspaceMemberOrderByWithGroupByInput>;
  accountOwnerId?: InputMaybe<OrderByDirection>;
  address?: InputMaybe<AddressOrderByInput>;
  aggregate?: InputMaybe<CompanyOrderByWithGroupByAggregateInput>;
  annualRevenue?: InputMaybe<CurrencyOrderByInput>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  domainName?: InputMaybe<LinksOrderByInput>;
  id?: InputMaybe<OrderByDirection>;
  linkedinLink?: InputMaybe<LinksOrderByInput>;
  name?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type CompanyRelationInput = {
  connect?: InputMaybe<CompanyConnectInput>;
  create?: InputMaybe<CompanyCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CompanyUpdateInput = {
  accountOwner?: InputMaybe<WorkspaceMemberRelationInput>;
  accountOwnerId?: InputMaybe<Scalars['ID']['input']>;
  address?: InputMaybe<AddressUpdateInput>;
  annualRevenue?: InputMaybe<CurrencyUpdateInput>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  domainName?: InputMaybe<LinksUpdateInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
  linkedinLink?: InputMaybe<LinksUpdateInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
};

export type CompanyWhereUniqueInput = {
  domainName?: InputMaybe<CompanyDomainNameWhereInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Currency = {
  __typename?: 'Currency';
  amountMicros?: Maybe<Scalars['BigFloat']['output']>;
  currencyCode?: Maybe<Scalars['String']['output']>;
};

export type CurrencyCreateInput = {
  amountMicros?: InputMaybe<Scalars['BigFloat']['input']>;
  currencyCode?: InputMaybe<Scalars['String']['input']>;
};

export type CurrencyFilterInput = {
  amountMicros?: InputMaybe<BigFloatFilter>;
  currencyCode?: InputMaybe<StringFilter>;
};

export type CurrencyGroupByInput = {
  amountMicros?: InputMaybe<Scalars['Boolean']['input']>;
  currencyCode?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CurrencyOrderByInput = {
  amountMicros?: InputMaybe<OrderByDirection>;
  currencyCode?: InputMaybe<OrderByDirection>;
};

export type CurrencyUpdateInput = {
  amountMicros?: InputMaybe<Scalars['BigFloat']['input']>;
  currencyCode?: InputMaybe<Scalars['String']['input']>;
};

/** Date granularity (e.g. day, month, quarter, year, week, day of the week, quarter of the year, month of the year) */
export enum DateGranularityEnum {
  DAY = 'DAY',
  DAY_OF_THE_WEEK = 'DAY_OF_THE_WEEK',
  MONTH = 'MONTH',
  MONTH_OF_THE_YEAR = 'MONTH_OF_THE_YEAR',
  NONE = 'NONE',
  QUARTER = 'QUARTER',
  QUARTER_OF_THE_YEAR = 'QUARTER_OF_THE_YEAR',
  WEEK = 'WEEK',
  YEAR = 'YEAR'
}

export type DateTimeFilter = {
  eq?: InputMaybe<Scalars['DateTime']['input']>;
  gt?: InputMaybe<Scalars['DateTime']['input']>;
  gtField?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['DateTime']['input']>;
  gteField?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['DateTime']['input']>;
  ltField?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['DateTime']['input']>;
  lteField?: InputMaybe<Scalars['String']['input']>;
  neq?: InputMaybe<Scalars['DateTime']['input']>;
};

export type Emails = {
  __typename?: 'Emails';
  additionalEmails?: Maybe<Array<Scalars['String']['output']>>;
  primaryEmail?: Maybe<Scalars['String']['output']>;
};

export type EmailsCreateInput = {
  additionalEmails?: InputMaybe<Array<Scalars['String']['input']>>;
  primaryEmail?: InputMaybe<Scalars['String']['input']>;
};

export type EmailsFilterInput = {
  additionalEmails?: InputMaybe<RawJsonFilter>;
  primaryEmail?: InputMaybe<StringFilter>;
};

export type EmailsGroupByInput = {
  primaryEmail?: InputMaybe<Scalars['Boolean']['input']>;
};

export type EmailsOrderByInput = {
  additionalEmails?: InputMaybe<OrderByDirection>;
  primaryEmail?: InputMaybe<OrderByDirection>;
};

export type EmailsUpdateInput = {
  additionalEmails?: InputMaybe<Array<Scalars['String']['input']>>;
  primaryEmail?: InputMaybe<Scalars['String']['input']>;
};

export type FileItemInput = {
  fileId: Scalars['UUID']['input'];
  label: Scalars['String']['input'];
};

export type FileObject = {
  __typename?: 'FileObject';
  extension?: Maybe<Scalars['String']['output']>;
  fileId: Scalars['UUID']['output'];
  label: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

/** This enum to filter by nullability */
export enum FilterIs {
  /** Non-nulish values */
  NOT_NULL = 'NOT_NULL',
  /** Nulish values */
  NULL = 'NULL'
}

/** First day of the week (MONDAY, SUNDAY, SATURDAY) */
export enum FirstDayOfTheWeek {
  MONDAY = 'MONDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

export type FloatFilter = {
  eq?: InputMaybe<Scalars['Float']['input']>;
  gt?: InputMaybe<Scalars['Float']['input']>;
  gtField?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['Float']['input']>;
  gteField?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['Float']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['Float']['input']>;
  ltField?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['Float']['input']>;
  lteField?: InputMaybe<Scalars['String']['input']>;
  neq?: InputMaybe<Scalars['Float']['input']>;
};

export type FullName = {
  __typename?: 'FullName';
  firstName?: Maybe<Scalars['String']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
};

export type FullNameCreateInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type FullNameFilterInput = {
  firstName?: InputMaybe<StringFilter>;
  lastName?: InputMaybe<StringFilter>;
};

export type FullNameGroupByInput = {
  firstName?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<Scalars['Boolean']['input']>;
};

export type FullNameOrderByInput = {
  firstName?: InputMaybe<OrderByDirection>;
  lastName?: InputMaybe<OrderByDirection>;
};

export type FullNameUpdateInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type GroupByDateGranularityInput = {
  /** Date granularity (e.g. day, month, quarter, year, week, day of the week, quarter of the year, month of the year) */
  granularity?: InputMaybe<DateGranularityEnum>;
  /** Timezone used to compute the aggregate value and in which is expressed the granular period, for example a day in UTC-12 is not the same period as a day in UTC+3, the requester needs to precise this otherwise the server will assume a timezone and the requester cannot know in which timezone the aggregate values are computed. */
  timeZone?: InputMaybe<Scalars['String']['input']>;
  /** First day of the week (only applicable when granularity is WEEK). Defaults to MONDAY if not specified. */
  weekStartDay?: InputMaybe<FirstDayOfTheWeek>;
};

export type Links = {
  __typename?: 'Links';
  primaryLinkLabel?: Maybe<Scalars['String']['output']>;
  primaryLinkUrl?: Maybe<Scalars['String']['output']>;
  secondaryLinks?: Maybe<Array<SecondaryLink>>;
};

export type LinksCreateInput = {
  primaryLinkLabel?: InputMaybe<Scalars['String']['input']>;
  primaryLinkUrl?: InputMaybe<Scalars['String']['input']>;
  secondaryLinks?: InputMaybe<Array<SecondaryLinkInput>>;
};

export type LinksFilterInput = {
  primaryLinkLabel?: InputMaybe<StringFilter>;
  primaryLinkUrl?: InputMaybe<StringFilter>;
  secondaryLinks?: InputMaybe<RawJsonFilter>;
};

export type LinksGroupByInput = {
  primaryLinkLabel?: InputMaybe<Scalars['Boolean']['input']>;
  primaryLinkUrl?: InputMaybe<Scalars['Boolean']['input']>;
};

export type LinksOrderByInput = {
  primaryLinkLabel?: InputMaybe<OrderByDirection>;
  primaryLinkUrl?: InputMaybe<OrderByDirection>;
  secondaryLinks?: InputMaybe<OrderByDirection>;
};

export type LinksUpdateInput = {
  primaryLinkLabel?: InputMaybe<Scalars['String']['input']>;
  primaryLinkUrl?: InputMaybe<Scalars['String']['input']>;
  secondaryLinks?: InputMaybe<Array<SecondaryLinkInput>>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createAttachment?: Maybe<Attachment>;
  createAttachments?: Maybe<Array<Attachment>>;
  createCompanies?: Maybe<Array<Company>>;
  createCompany?: Maybe<Company>;
  createNote?: Maybe<Note>;
  createNoteTarget?: Maybe<NoteTarget>;
  createNoteTargets?: Maybe<Array<NoteTarget>>;
  createNotes?: Maybe<Array<Note>>;
  createOpportunities?: Maybe<Array<Opportunity>>;
  createOpportunity?: Maybe<Opportunity>;
  createPeople?: Maybe<Array<Person>>;
  createPerson?: Maybe<Person>;
  createTask?: Maybe<Task>;
  createTaskTarget?: Maybe<TaskTarget>;
  createTaskTargets?: Maybe<Array<TaskTarget>>;
  createTasks?: Maybe<Array<Task>>;
  createTimelineActivities?: Maybe<Array<TimelineActivity>>;
  createTimelineActivity?: Maybe<TimelineActivity>;
  createWorkspaceMember?: Maybe<WorkspaceMember>;
  createWorkspaceMembers?: Maybe<Array<WorkspaceMember>>;
  deleteAttachment?: Maybe<Attachment>;
  deleteAttachments?: Maybe<Array<Attachment>>;
  deleteCompanies?: Maybe<Array<Company>>;
  deleteCompany?: Maybe<Company>;
  deleteNote?: Maybe<Note>;
  deleteNoteTarget?: Maybe<NoteTarget>;
  deleteNoteTargets?: Maybe<Array<NoteTarget>>;
  deleteNotes?: Maybe<Array<Note>>;
  deleteOpportunities?: Maybe<Array<Opportunity>>;
  deleteOpportunity?: Maybe<Opportunity>;
  deletePeople?: Maybe<Array<Person>>;
  deletePerson?: Maybe<Person>;
  deleteTask?: Maybe<Task>;
  deleteTaskTarget?: Maybe<TaskTarget>;
  deleteTaskTargets?: Maybe<Array<TaskTarget>>;
  deleteTasks?: Maybe<Array<Task>>;
  deleteTimelineActivities?: Maybe<Array<TimelineActivity>>;
  deleteTimelineActivity?: Maybe<TimelineActivity>;
  deleteWorkspaceMember?: Maybe<WorkspaceMember>;
  deleteWorkspaceMembers?: Maybe<Array<WorkspaceMember>>;
  destroyAttachment?: Maybe<Attachment>;
  destroyAttachments?: Maybe<Array<Attachment>>;
  destroyCompanies?: Maybe<Array<Company>>;
  destroyCompany?: Maybe<Company>;
  destroyNote?: Maybe<Note>;
  destroyNoteTarget?: Maybe<NoteTarget>;
  destroyNoteTargets?: Maybe<Array<NoteTarget>>;
  destroyNotes?: Maybe<Array<Note>>;
  destroyOpportunities?: Maybe<Array<Opportunity>>;
  destroyOpportunity?: Maybe<Opportunity>;
  destroyPeople?: Maybe<Array<Person>>;
  destroyPerson?: Maybe<Person>;
  destroyTask?: Maybe<Task>;
  destroyTaskTarget?: Maybe<TaskTarget>;
  destroyTaskTargets?: Maybe<Array<TaskTarget>>;
  destroyTasks?: Maybe<Array<Task>>;
  destroyTimelineActivities?: Maybe<Array<TimelineActivity>>;
  destroyTimelineActivity?: Maybe<TimelineActivity>;
  destroyWorkspaceMember?: Maybe<WorkspaceMember>;
  destroyWorkspaceMembers?: Maybe<Array<WorkspaceMember>>;
  mergeAttachments?: Maybe<Attachment>;
  mergeCompanies?: Maybe<Company>;
  mergeNoteTargets?: Maybe<NoteTarget>;
  mergeNotes?: Maybe<Note>;
  mergeOpportunities?: Maybe<Opportunity>;
  mergePeople?: Maybe<Person>;
  mergeTaskTargets?: Maybe<TaskTarget>;
  mergeTasks?: Maybe<Task>;
  mergeTimelineActivities?: Maybe<TimelineActivity>;
  mergeWorkspaceMembers?: Maybe<WorkspaceMember>;
  restoreAttachment?: Maybe<Attachment>;
  restoreAttachments?: Maybe<Array<Attachment>>;
  restoreCompanies?: Maybe<Array<Company>>;
  restoreCompany?: Maybe<Company>;
  restoreNote?: Maybe<Note>;
  restoreNoteTarget?: Maybe<NoteTarget>;
  restoreNoteTargets?: Maybe<Array<NoteTarget>>;
  restoreNotes?: Maybe<Array<Note>>;
  restoreOpportunities?: Maybe<Array<Opportunity>>;
  restoreOpportunity?: Maybe<Opportunity>;
  restorePeople?: Maybe<Array<Person>>;
  restorePerson?: Maybe<Person>;
  restoreTask?: Maybe<Task>;
  restoreTaskTarget?: Maybe<TaskTarget>;
  restoreTaskTargets?: Maybe<Array<TaskTarget>>;
  restoreTasks?: Maybe<Array<Task>>;
  restoreTimelineActivities?: Maybe<Array<TimelineActivity>>;
  restoreTimelineActivity?: Maybe<TimelineActivity>;
  restoreWorkspaceMember?: Maybe<WorkspaceMember>;
  restoreWorkspaceMembers?: Maybe<Array<WorkspaceMember>>;
  updateAttachment?: Maybe<Attachment>;
  updateAttachments?: Maybe<Array<Attachment>>;
  updateCompanies?: Maybe<Array<Company>>;
  updateCompany?: Maybe<Company>;
  updateNote?: Maybe<Note>;
  updateNoteTarget?: Maybe<NoteTarget>;
  updateNoteTargets?: Maybe<Array<NoteTarget>>;
  updateNotes?: Maybe<Array<Note>>;
  updateOpportunities?: Maybe<Array<Opportunity>>;
  updateOpportunity?: Maybe<Opportunity>;
  updatePeople?: Maybe<Array<Person>>;
  updatePerson?: Maybe<Person>;
  updateTask?: Maybe<Task>;
  updateTaskTarget?: Maybe<TaskTarget>;
  updateTaskTargets?: Maybe<Array<TaskTarget>>;
  updateTasks?: Maybe<Array<Task>>;
  updateTimelineActivities?: Maybe<Array<TimelineActivity>>;
  updateTimelineActivity?: Maybe<TimelineActivity>;
  updateWorkspaceMember?: Maybe<WorkspaceMember>;
  updateWorkspaceMembers?: Maybe<Array<WorkspaceMember>>;
};


export type MutationCreateAttachmentArgs = {
  data: AttachmentCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateAttachmentsArgs = {
  data: Array<AttachmentCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateCompaniesArgs = {
  data: Array<CompanyCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateCompanyArgs = {
  data: CompanyCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateNoteArgs = {
  data: NoteCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateNoteTargetArgs = {
  data: NoteTargetCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateNoteTargetsArgs = {
  data: Array<NoteTargetCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateNotesArgs = {
  data: Array<NoteCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateOpportunitiesArgs = {
  data: Array<OpportunityCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateOpportunityArgs = {
  data: OpportunityCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreatePeopleArgs = {
  data: Array<PersonCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreatePersonArgs = {
  data: PersonCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateTaskArgs = {
  data: TaskCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateTaskTargetArgs = {
  data: TaskTargetCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateTaskTargetsArgs = {
  data: Array<TaskTargetCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateTasksArgs = {
  data: Array<TaskCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateTimelineActivitiesArgs = {
  data: Array<TimelineActivityCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateTimelineActivityArgs = {
  data: TimelineActivityCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateWorkspaceMemberArgs = {
  data: WorkspaceMemberCreateInput;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateWorkspaceMembersArgs = {
  data: Array<WorkspaceMemberCreateInput>;
  upsert?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationDeleteAttachmentArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteAttachmentsArgs = {
  filter: AttachmentFilterInput;
};


export type MutationDeleteCompaniesArgs = {
  filter: CompanyFilterInput;
};


export type MutationDeleteCompanyArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteNoteArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteNoteTargetArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteNoteTargetsArgs = {
  filter: NoteTargetFilterInput;
};


export type MutationDeleteNotesArgs = {
  filter: NoteFilterInput;
};


export type MutationDeleteOpportunitiesArgs = {
  filter: OpportunityFilterInput;
};


export type MutationDeleteOpportunityArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeletePeopleArgs = {
  filter: PersonFilterInput;
};


export type MutationDeletePersonArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteTaskArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteTaskTargetArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteTaskTargetsArgs = {
  filter: TaskTargetFilterInput;
};


export type MutationDeleteTasksArgs = {
  filter: TaskFilterInput;
};


export type MutationDeleteTimelineActivitiesArgs = {
  filter: TimelineActivityFilterInput;
};


export type MutationDeleteTimelineActivityArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteWorkspaceMemberArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDeleteWorkspaceMembersArgs = {
  filter: WorkspaceMemberFilterInput;
};


export type MutationDestroyAttachmentArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyAttachmentsArgs = {
  filter: AttachmentFilterInput;
};


export type MutationDestroyCompaniesArgs = {
  filter: CompanyFilterInput;
};


export type MutationDestroyCompanyArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyNoteArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyNoteTargetArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyNoteTargetsArgs = {
  filter: NoteTargetFilterInput;
};


export type MutationDestroyNotesArgs = {
  filter: NoteFilterInput;
};


export type MutationDestroyOpportunitiesArgs = {
  filter: OpportunityFilterInput;
};


export type MutationDestroyOpportunityArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyPeopleArgs = {
  filter: PersonFilterInput;
};


export type MutationDestroyPersonArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyTaskArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyTaskTargetArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyTaskTargetsArgs = {
  filter: TaskTargetFilterInput;
};


export type MutationDestroyTasksArgs = {
  filter: TaskFilterInput;
};


export type MutationDestroyTimelineActivitiesArgs = {
  filter: TimelineActivityFilterInput;
};


export type MutationDestroyTimelineActivityArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyWorkspaceMemberArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationDestroyWorkspaceMembersArgs = {
  filter: WorkspaceMemberFilterInput;
};


export type MutationMergeAttachmentsArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergeCompaniesArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergeNoteTargetsArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergeNotesArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergeOpportunitiesArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergePeopleArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergeTaskTargetsArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergeTasksArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergeTimelineActivitiesArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationMergeWorkspaceMembersArgs = {
  conflictPriorityIndex: Scalars['Int']['input'];
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['UUID']['input']>;
};


export type MutationRestoreAttachmentArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreAttachmentsArgs = {
  filter: AttachmentFilterInput;
};


export type MutationRestoreCompaniesArgs = {
  filter: CompanyFilterInput;
};


export type MutationRestoreCompanyArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreNoteArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreNoteTargetArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreNoteTargetsArgs = {
  filter: NoteTargetFilterInput;
};


export type MutationRestoreNotesArgs = {
  filter: NoteFilterInput;
};


export type MutationRestoreOpportunitiesArgs = {
  filter: OpportunityFilterInput;
};


export type MutationRestoreOpportunityArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestorePeopleArgs = {
  filter: PersonFilterInput;
};


export type MutationRestorePersonArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreTaskArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreTaskTargetArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreTaskTargetsArgs = {
  filter: TaskTargetFilterInput;
};


export type MutationRestoreTasksArgs = {
  filter: TaskFilterInput;
};


export type MutationRestoreTimelineActivitiesArgs = {
  filter: TimelineActivityFilterInput;
};


export type MutationRestoreTimelineActivityArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreWorkspaceMemberArgs = {
  id: Scalars['UUID']['input'];
};


export type MutationRestoreWorkspaceMembersArgs = {
  filter: WorkspaceMemberFilterInput;
};


export type MutationUpdateAttachmentArgs = {
  data: AttachmentUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateAttachmentsArgs = {
  data: AttachmentUpdateInput;
  filter: AttachmentFilterInput;
};


export type MutationUpdateCompaniesArgs = {
  data: CompanyUpdateInput;
  filter: CompanyFilterInput;
};


export type MutationUpdateCompanyArgs = {
  data: CompanyUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateNoteArgs = {
  data: NoteUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateNoteTargetArgs = {
  data: NoteTargetUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateNoteTargetsArgs = {
  data: NoteTargetUpdateInput;
  filter: NoteTargetFilterInput;
};


export type MutationUpdateNotesArgs = {
  data: NoteUpdateInput;
  filter: NoteFilterInput;
};


export type MutationUpdateOpportunitiesArgs = {
  data: OpportunityUpdateInput;
  filter: OpportunityFilterInput;
};


export type MutationUpdateOpportunityArgs = {
  data: OpportunityUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdatePeopleArgs = {
  data: PersonUpdateInput;
  filter: PersonFilterInput;
};


export type MutationUpdatePersonArgs = {
  data: PersonUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateTaskArgs = {
  data: TaskUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateTaskTargetArgs = {
  data: TaskTargetUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateTaskTargetsArgs = {
  data: TaskTargetUpdateInput;
  filter: TaskTargetFilterInput;
};


export type MutationUpdateTasksArgs = {
  data: TaskUpdateInput;
  filter: TaskFilterInput;
};


export type MutationUpdateTimelineActivitiesArgs = {
  data: TimelineActivityUpdateInput;
  filter: TimelineActivityFilterInput;
};


export type MutationUpdateTimelineActivityArgs = {
  data: TimelineActivityUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateWorkspaceMemberArgs = {
  data: WorkspaceMemberUpdateInput;
  id: Scalars['UUID']['input'];
};


export type MutationUpdateWorkspaceMembersArgs = {
  data: WorkspaceMemberUpdateInput;
  filter: WorkspaceMemberFilterInput;
};

export type Note = {
  __typename?: 'Note';
  attachments?: Maybe<AttachmentConnection>;
  bodyV2?: Maybe<RichText>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  noteTargets?: Maybe<NoteTargetConnection>;
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  timelineActivities?: Maybe<TimelineActivityConnection>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
};


export type NoteAttachmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<AttachmentFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<AttachmentOrderByInput>>>;
};


export type NoteNoteTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<NoteTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<NoteTargetOrderByInput>>>;
};


export type NoteTimelineActivitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TimelineActivityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByInput>>>;
};

export type NoteConnectInput = {
  where?: InputMaybe<NoteWhereUniqueInput>;
};

export type NoteConnection = {
  __typename?: 'NoteConnection';
  countEmptyBodyV2?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyTitle?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyBodyV2?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTitle?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesBodyV2?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTitle?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<NoteEdge>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyBodyV2?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTitle?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyBodyV2?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTitle?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type NoteCreateInput = {
  bodyV2?: InputMaybe<RichTextCreateInput>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
};

export type NoteEdge = {
  __typename?: 'NoteEdge';
  cursor: Scalars['Cursor']['output'];
  node: Note;
};

export type NoteFilterInput = {
  and?: InputMaybe<Array<InputMaybe<NoteFilterInput>>>;
  bodyV2?: InputMaybe<RichTextFilterInput>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<UuidFilter>;
  not?: InputMaybe<NoteFilterInput>;
  or?: InputMaybe<Array<InputMaybe<NoteFilterInput>>>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  title?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
};

export type NoteGroupByConnection = {
  __typename?: 'NoteGroupByConnection';
  countEmptyBodyV2?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyTitle?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyBodyV2?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTitle?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesBodyV2?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTitle?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<NoteEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyBodyV2?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTitle?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyBodyV2?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTitle?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type NoteGroupByInput = {
  bodyV2?: InputMaybe<RichTextGroupByInput>;
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  title?: InputMaybe<Scalars['Boolean']['input']>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
};

export type NoteOrderByInput = {
  bodyV2?: InputMaybe<RichTextOrderByInput>;
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  title?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type NoteOrderByWithGroupByAggregateInput = {
  countEmptyBodyV2?: InputMaybe<OrderByDirection>;
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyTitle?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyBodyV2?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyTitle?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesBodyV2?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesTitle?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyBodyV2?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyTitle?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyBodyV2?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyTitle?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type NoteOrderByWithGroupByInput = {
  aggregate?: InputMaybe<NoteOrderByWithGroupByAggregateInput>;
  bodyV2?: InputMaybe<RichTextOrderByInput>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  id?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  title?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type NoteRelationInput = {
  connect?: InputMaybe<NoteConnectInput>;
  create?: InputMaybe<NoteCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export type NoteTarget = {
  __typename?: 'NoteTarget';
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  note?: Maybe<Note>;
  noteId?: Maybe<Scalars['ID']['output']>;
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  targetCompany?: Maybe<Company>;
  targetCompanyId?: Maybe<Scalars['ID']['output']>;
  targetOpportunity?: Maybe<Opportunity>;
  targetOpportunityId?: Maybe<Scalars['ID']['output']>;
  targetPerson?: Maybe<Person>;
  targetPersonId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
};

export type NoteTargetConnectInput = {
  where?: InputMaybe<NoteTargetWhereUniqueInput>;
};

export type NoteTargetConnection = {
  __typename?: 'NoteTargetConnection';
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<NoteTargetEdge>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type NoteTargetCreateInput = {
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  note?: InputMaybe<NoteRelationInput>;
  noteId?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  targetCompany?: InputMaybe<CompanyRelationInput>;
  targetCompanyId?: InputMaybe<Scalars['ID']['input']>;
  targetOpportunity?: InputMaybe<OpportunityRelationInput>;
  targetOpportunityId?: InputMaybe<Scalars['ID']['input']>;
  targetPerson?: InputMaybe<PersonRelationInput>;
  targetPersonId?: InputMaybe<Scalars['ID']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
};

export type NoteTargetEdge = {
  __typename?: 'NoteTargetEdge';
  cursor: Scalars['Cursor']['output'];
  node: NoteTarget;
};

export type NoteTargetFilterInput = {
  and?: InputMaybe<Array<InputMaybe<NoteTargetFilterInput>>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<UuidFilter>;
  not?: InputMaybe<NoteTargetFilterInput>;
  note?: InputMaybe<NoteFilterInput>;
  noteId?: InputMaybe<UuidFilter>;
  or?: InputMaybe<Array<InputMaybe<NoteTargetFilterInput>>>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  targetCompany?: InputMaybe<CompanyFilterInput>;
  targetCompanyId?: InputMaybe<UuidFilter>;
  targetOpportunity?: InputMaybe<OpportunityFilterInput>;
  targetOpportunityId?: InputMaybe<UuidFilter>;
  targetPerson?: InputMaybe<PersonFilterInput>;
  targetPersonId?: InputMaybe<UuidFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
};

export type NoteTargetGroupByConnection = {
  __typename?: 'NoteTargetGroupByConnection';
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<NoteTargetEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type NoteTargetGroupByInput = {
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  note?: InputMaybe<NoteGroupByInput>;
  targetCompany?: InputMaybe<CompanyGroupByInput>;
  targetOpportunity?: InputMaybe<OpportunityGroupByInput>;
  targetPerson?: InputMaybe<PersonGroupByInput>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
};

export type NoteTargetOrderByInput = {
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  note?: InputMaybe<NoteOrderByInput>;
  noteId?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  targetCompany?: InputMaybe<CompanyOrderByInput>;
  targetCompanyId?: InputMaybe<OrderByDirection>;
  targetOpportunity?: InputMaybe<OpportunityOrderByInput>;
  targetOpportunityId?: InputMaybe<OrderByDirection>;
  targetPerson?: InputMaybe<PersonOrderByInput>;
  targetPersonId?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type NoteTargetOrderByWithGroupByAggregateInput = {
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type NoteTargetOrderByWithGroupByInput = {
  aggregate?: InputMaybe<NoteTargetOrderByWithGroupByAggregateInput>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  id?: InputMaybe<OrderByDirection>;
  note?: InputMaybe<NoteOrderByWithGroupByInput>;
  noteId?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  targetCompany?: InputMaybe<CompanyOrderByWithGroupByInput>;
  targetCompanyId?: InputMaybe<OrderByDirection>;
  targetOpportunity?: InputMaybe<OpportunityOrderByWithGroupByInput>;
  targetOpportunityId?: InputMaybe<OrderByDirection>;
  targetPerson?: InputMaybe<PersonOrderByWithGroupByInput>;
  targetPersonId?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type NoteTargetRelationInput = {
  connect?: InputMaybe<NoteTargetConnectInput>;
  create?: InputMaybe<NoteTargetCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export type NoteTargetUpdateInput = {
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  note?: InputMaybe<NoteRelationInput>;
  noteId?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  targetCompany?: InputMaybe<CompanyRelationInput>;
  targetCompanyId?: InputMaybe<Scalars['ID']['input']>;
  targetOpportunity?: InputMaybe<OpportunityRelationInput>;
  targetOpportunityId?: InputMaybe<Scalars['ID']['input']>;
  targetPerson?: InputMaybe<PersonRelationInput>;
  targetPersonId?: InputMaybe<Scalars['ID']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
};

export type NoteTargetWhereUniqueInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type NoteUpdateInput = {
  bodyV2?: InputMaybe<RichTextUpdateInput>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
};

export type NoteWhereUniqueInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type ObjectRecordFilterInput = {
  and?: InputMaybe<Array<ObjectRecordFilterInput>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<UuidFilter>;
  not?: InputMaybe<ObjectRecordFilterInput>;
  or?: InputMaybe<Array<ObjectRecordFilterInput>>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type Opportunity = {
  __typename?: 'Opportunity';
  amount?: Maybe<Currency>;
  attachments?: Maybe<AttachmentConnection>;
  closeDate?: Maybe<Scalars['DateTime']['output']>;
  company?: Maybe<Company>;
  companyId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  noteTargets?: Maybe<NoteTargetConnection>;
  owner?: Maybe<WorkspaceMember>;
  ownerId?: Maybe<Scalars['ID']['output']>;
  pointOfContact?: Maybe<Person>;
  pointOfContactId?: Maybe<Scalars['ID']['output']>;
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  stage?: Maybe<OpportunityStageEnum>;
  taskTargets?: Maybe<TaskTargetConnection>;
  timelineActivities?: Maybe<TimelineActivityConnection>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
};


export type OpportunityAttachmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<AttachmentFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<AttachmentOrderByInput>>>;
};


export type OpportunityNoteTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<NoteTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<NoteTargetOrderByInput>>>;
};


export type OpportunityTaskTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TaskTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskTargetOrderByInput>>>;
};


export type OpportunityTimelineActivitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TimelineActivityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByInput>>>;
};

export type OpportunityConnectInput = {
  where?: InputMaybe<OpportunityWhereUniqueInput>;
};

export type OpportunityConnection = {
  __typename?: 'OpportunityConnection';
  avgAmountAmountMicros?: Maybe<Scalars['Float']['output']>;
  countEmptyAmount?: Maybe<Scalars['Int']['output']>;
  countEmptyCloseDate?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyStage?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAmount?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCloseDate?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyStage?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAmount?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCloseDate?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesStage?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<OpportunityEdge>;
  maxAmountAmountMicros?: Maybe<Scalars['Float']['output']>;
  maxCloseDate?: Maybe<Scalars['DateTime']['output']>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minAmountAmountMicros?: Maybe<Scalars['Float']['output']>;
  minCloseDate?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyAmount?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCloseDate?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyStage?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAmount?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCloseDate?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyStage?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  sumAmountAmountMicros?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type OpportunityCreateInput = {
  amount?: InputMaybe<CurrencyCreateInput>;
  closeDate?: InputMaybe<Scalars['DateTime']['input']>;
  company?: InputMaybe<CompanyRelationInput>;
  companyId?: InputMaybe<Scalars['ID']['input']>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  owner?: InputMaybe<WorkspaceMemberRelationInput>;
  ownerId?: InputMaybe<Scalars['ID']['input']>;
  pointOfContact?: InputMaybe<PersonRelationInput>;
  pointOfContactId?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  stage?: InputMaybe<OpportunityStageEnum>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
};

export type OpportunityEdge = {
  __typename?: 'OpportunityEdge';
  cursor: Scalars['Cursor']['output'];
  node: Opportunity;
};

export type OpportunityFilterInput = {
  amount?: InputMaybe<CurrencyFilterInput>;
  and?: InputMaybe<Array<InputMaybe<OpportunityFilterInput>>>;
  closeDate?: InputMaybe<DateTimeFilter>;
  company?: InputMaybe<CompanyFilterInput>;
  companyId?: InputMaybe<UuidFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<UuidFilter>;
  name?: InputMaybe<StringFilter>;
  not?: InputMaybe<OpportunityFilterInput>;
  or?: InputMaybe<Array<InputMaybe<OpportunityFilterInput>>>;
  owner?: InputMaybe<WorkspaceMemberFilterInput>;
  ownerId?: InputMaybe<UuidFilter>;
  pointOfContact?: InputMaybe<PersonFilterInput>;
  pointOfContactId?: InputMaybe<UuidFilter>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  stage?: InputMaybe<OpportunityStageEnumFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
};

export type OpportunityGroupByConnection = {
  __typename?: 'OpportunityGroupByConnection';
  avgAmountAmountMicros?: Maybe<Scalars['Float']['output']>;
  countEmptyAmount?: Maybe<Scalars['Int']['output']>;
  countEmptyCloseDate?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyStage?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAmount?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCloseDate?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyStage?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAmount?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCloseDate?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesStage?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<OpportunityEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxAmountAmountMicros?: Maybe<Scalars['Float']['output']>;
  maxCloseDate?: Maybe<Scalars['DateTime']['output']>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minAmountAmountMicros?: Maybe<Scalars['Float']['output']>;
  minCloseDate?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyAmount?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCloseDate?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyStage?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAmount?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCloseDate?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyStage?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  sumAmountAmountMicros?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type OpportunityGroupByInput = {
  amount?: InputMaybe<CurrencyGroupByInput>;
  closeDate?: InputMaybe<GroupByDateGranularityInput>;
  company?: InputMaybe<CompanyGroupByInput>;
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  name?: InputMaybe<Scalars['Boolean']['input']>;
  owner?: InputMaybe<WorkspaceMemberGroupByInput>;
  pointOfContact?: InputMaybe<PersonGroupByInput>;
  stage?: InputMaybe<Scalars['Boolean']['input']>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
};

export type OpportunityOrderByInput = {
  amount?: InputMaybe<CurrencyOrderByInput>;
  closeDate?: InputMaybe<OrderByDirection>;
  company?: InputMaybe<CompanyOrderByInput>;
  companyId?: InputMaybe<OrderByDirection>;
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<OrderByDirection>;
  owner?: InputMaybe<WorkspaceMemberOrderByInput>;
  ownerId?: InputMaybe<OrderByDirection>;
  pointOfContact?: InputMaybe<PersonOrderByInput>;
  pointOfContactId?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  stage?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type OpportunityOrderByWithGroupByAggregateInput = {
  avgAmountAmountMicros?: InputMaybe<OrderByDirection>;
  countEmptyAmount?: InputMaybe<OrderByDirection>;
  countEmptyCloseDate?: InputMaybe<OrderByDirection>;
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyName?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyStage?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyAmount?: InputMaybe<OrderByDirection>;
  countNotEmptyCloseDate?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyName?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyStage?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesAmount?: InputMaybe<OrderByDirection>;
  countUniqueValuesCloseDate?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesName?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesStage?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxAmountAmountMicros?: InputMaybe<OrderByDirection>;
  maxCloseDate?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minAmountAmountMicros?: InputMaybe<OrderByDirection>;
  minCloseDate?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyAmount?: InputMaybe<OrderByDirection>;
  percentageEmptyCloseDate?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyName?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyStage?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyAmount?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCloseDate?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyName?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyStage?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  sumAmountAmountMicros?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type OpportunityOrderByWithGroupByInput = {
  aggregate?: InputMaybe<OpportunityOrderByWithGroupByAggregateInput>;
  amount?: InputMaybe<CurrencyOrderByInput>;
  closeDate?: InputMaybe<OrderByDateGranularityInput>;
  company?: InputMaybe<CompanyOrderByWithGroupByInput>;
  companyId?: InputMaybe<OrderByDirection>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  id?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<OrderByDirection>;
  owner?: InputMaybe<WorkspaceMemberOrderByWithGroupByInput>;
  ownerId?: InputMaybe<OrderByDirection>;
  pointOfContact?: InputMaybe<PersonOrderByWithGroupByInput>;
  pointOfContactId?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  stage?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type OpportunityRelationInput = {
  connect?: InputMaybe<OpportunityConnectInput>;
  create?: InputMaybe<OpportunityCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum OpportunityStageEnum {
  CUSTOMER = 'CUSTOMER',
  MEETING = 'MEETING',
  NEW = 'NEW',
  PROPOSAL = 'PROPOSAL',
  SCREENING = 'SCREENING'
}

export type OpportunityStageEnumFilter = {
  containsAny?: InputMaybe<Array<InputMaybe<OpportunityStageEnum>>>;
  eq?: InputMaybe<OpportunityStageEnum>;
  gt?: InputMaybe<OpportunityStageEnum>;
  gte?: InputMaybe<OpportunityStageEnum>;
  in?: InputMaybe<Array<InputMaybe<OpportunityStageEnum>>>;
  is?: InputMaybe<FilterIs>;
  isEmptyArray?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<OpportunityStageEnum>;
  lte?: InputMaybe<OpportunityStageEnum>;
  neq?: InputMaybe<OpportunityStageEnum>;
};

export type OpportunityUpdateInput = {
  amount?: InputMaybe<CurrencyUpdateInput>;
  closeDate?: InputMaybe<Scalars['DateTime']['input']>;
  company?: InputMaybe<CompanyRelationInput>;
  companyId?: InputMaybe<Scalars['ID']['input']>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  owner?: InputMaybe<WorkspaceMemberRelationInput>;
  ownerId?: InputMaybe<Scalars['ID']['input']>;
  pointOfContact?: InputMaybe<PersonRelationInput>;
  pointOfContactId?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  stage?: InputMaybe<OpportunityStageEnum>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
};

export type OpportunityWhereUniqueInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type OrderByDateGranularityInput = {
  granularity?: InputMaybe<DateGranularityEnum>;
  orderBy?: InputMaybe<OrderByDirection>;
};

/** This enum is used to specify the order of results */
export enum OrderByDirection {
  /** Ascending order, nulls first */
  AscNullsFirst = 'AscNullsFirst',
  /** Ascending order, nulls last */
  AscNullsLast = 'AscNullsLast',
  /** Descending order, nulls first */
  DescNullsFirst = 'DescNullsFirst',
  /** Descending order, nulls last */
  DescNullsLast = 'DescNullsLast'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['ConnectionCursor']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['ConnectionCursor']['output']>;
};

export type Person = {
  __typename?: 'Person';
  attachments?: Maybe<AttachmentConnection>;
  avatarFile?: Maybe<Array<Maybe<FileObject>>>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Company>;
  companyId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  emails?: Maybe<Emails>;
  id: Scalars['UUID']['output'];
  jobTitle?: Maybe<Scalars['String']['output']>;
  linkedinLink?: Maybe<Links>;
  name?: Maybe<FullName>;
  noteTargets?: Maybe<NoteTargetConnection>;
  phones?: Maybe<Phones>;
  pointOfContactForOpportunities?: Maybe<OpportunityConnection>;
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  taskTargets?: Maybe<TaskTargetConnection>;
  timelineActivities?: Maybe<TimelineActivityConnection>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
};


export type PersonAttachmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<AttachmentFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<AttachmentOrderByInput>>>;
};


export type PersonNoteTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<NoteTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<NoteTargetOrderByInput>>>;
};


export type PersonPointOfContactForOpportunitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<OpportunityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<OpportunityOrderByInput>>>;
};


export type PersonTaskTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TaskTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskTargetOrderByInput>>>;
};


export type PersonTimelineActivitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TimelineActivityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByInput>>>;
};

export type PersonConnectInput = {
  where?: InputMaybe<PersonWhereUniqueInput>;
};

export type PersonConnection = {
  __typename?: 'PersonConnection';
  countEmptyAvatarFile?: Maybe<Scalars['Int']['output']>;
  countEmptyAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyEmails?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyJobTitle?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyPhones?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAvatarFile?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyEmails?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyJobTitle?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPhones?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAvatarFile?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesEmails?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesJobTitle?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPhones?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<PersonEdge>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyAvatarFile?: Maybe<Scalars['Float']['output']>;
  percentageEmptyAvatarUrl?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyEmails?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyJobTitle?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedinLink?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPhones?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAvatarFile?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAvatarUrl?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyEmails?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyJobTitle?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedinLink?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPhones?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type PersonCreateInput = {
  avatarFile?: InputMaybe<Array<InputMaybe<FileItemInput>>>;
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<CompanyRelationInput>;
  companyId?: InputMaybe<Scalars['ID']['input']>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  emails?: InputMaybe<EmailsCreateInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  linkedinLink?: InputMaybe<LinksCreateInput>;
  name?: InputMaybe<FullNameCreateInput>;
  phones?: InputMaybe<PhonesCreateInput>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
};

export type PersonEdge = {
  __typename?: 'PersonEdge';
  cursor: Scalars['Cursor']['output'];
  node: Person;
};

export type PersonEmailsWhereInput = {
  primaryEmail?: InputMaybe<Scalars['String']['input']>;
};

export type PersonFilterInput = {
  and?: InputMaybe<Array<InputMaybe<PersonFilterInput>>>;
  avatarFile?: InputMaybe<RawJsonFilter>;
  avatarUrl?: InputMaybe<StringFilter>;
  company?: InputMaybe<CompanyFilterInput>;
  companyId?: InputMaybe<UuidFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  emails?: InputMaybe<EmailsFilterInput>;
  id?: InputMaybe<UuidFilter>;
  jobTitle?: InputMaybe<StringFilter>;
  linkedinLink?: InputMaybe<LinksFilterInput>;
  name?: InputMaybe<FullNameFilterInput>;
  not?: InputMaybe<PersonFilterInput>;
  or?: InputMaybe<Array<InputMaybe<PersonFilterInput>>>;
  phones?: InputMaybe<PhonesFilterInput>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
};

export type PersonGroupByConnection = {
  __typename?: 'PersonGroupByConnection';
  countEmptyAvatarFile?: Maybe<Scalars['Int']['output']>;
  countEmptyAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyEmails?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyJobTitle?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyPhones?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAvatarFile?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyEmails?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyJobTitle?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPhones?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAvatarFile?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesEmails?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesJobTitle?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedinLink?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPhones?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<PersonEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyAvatarFile?: Maybe<Scalars['Float']['output']>;
  percentageEmptyAvatarUrl?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyEmails?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyJobTitle?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedinLink?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPhones?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAvatarFile?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAvatarUrl?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyEmails?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyJobTitle?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedinLink?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPhones?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type PersonGroupByInput = {
  avatarUrl?: InputMaybe<Scalars['Boolean']['input']>;
  company?: InputMaybe<CompanyGroupByInput>;
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  emails?: InputMaybe<EmailsGroupByInput>;
  jobTitle?: InputMaybe<Scalars['Boolean']['input']>;
  linkedinLink?: InputMaybe<LinksGroupByInput>;
  name?: InputMaybe<FullNameGroupByInput>;
  phones?: InputMaybe<PhonesGroupByInput>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
};

export type PersonOrderByInput = {
  avatarFile?: InputMaybe<OrderByDirection>;
  avatarUrl?: InputMaybe<OrderByDirection>;
  company?: InputMaybe<CompanyOrderByInput>;
  companyId?: InputMaybe<OrderByDirection>;
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  emails?: InputMaybe<EmailsOrderByInput>;
  id?: InputMaybe<OrderByDirection>;
  jobTitle?: InputMaybe<OrderByDirection>;
  linkedinLink?: InputMaybe<LinksOrderByInput>;
  name?: InputMaybe<FullNameOrderByInput>;
  phones?: InputMaybe<PhonesOrderByInput>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type PersonOrderByWithGroupByAggregateInput = {
  countEmptyAvatarFile?: InputMaybe<OrderByDirection>;
  countEmptyAvatarUrl?: InputMaybe<OrderByDirection>;
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyEmails?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyJobTitle?: InputMaybe<OrderByDirection>;
  countEmptyLinkedinLink?: InputMaybe<OrderByDirection>;
  countEmptyName?: InputMaybe<OrderByDirection>;
  countEmptyPhones?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyAvatarFile?: InputMaybe<OrderByDirection>;
  countNotEmptyAvatarUrl?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyEmails?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyJobTitle?: InputMaybe<OrderByDirection>;
  countNotEmptyLinkedinLink?: InputMaybe<OrderByDirection>;
  countNotEmptyName?: InputMaybe<OrderByDirection>;
  countNotEmptyPhones?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesAvatarFile?: InputMaybe<OrderByDirection>;
  countUniqueValuesAvatarUrl?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesEmails?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesJobTitle?: InputMaybe<OrderByDirection>;
  countUniqueValuesLinkedinLink?: InputMaybe<OrderByDirection>;
  countUniqueValuesName?: InputMaybe<OrderByDirection>;
  countUniqueValuesPhones?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyAvatarFile?: InputMaybe<OrderByDirection>;
  percentageEmptyAvatarUrl?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyEmails?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyJobTitle?: InputMaybe<OrderByDirection>;
  percentageEmptyLinkedinLink?: InputMaybe<OrderByDirection>;
  percentageEmptyName?: InputMaybe<OrderByDirection>;
  percentageEmptyPhones?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyAvatarFile?: InputMaybe<OrderByDirection>;
  percentageNotEmptyAvatarUrl?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyEmails?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyJobTitle?: InputMaybe<OrderByDirection>;
  percentageNotEmptyLinkedinLink?: InputMaybe<OrderByDirection>;
  percentageNotEmptyName?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPhones?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type PersonOrderByWithGroupByInput = {
  aggregate?: InputMaybe<PersonOrderByWithGroupByAggregateInput>;
  avatarFile?: InputMaybe<OrderByDirection>;
  avatarUrl?: InputMaybe<OrderByDirection>;
  company?: InputMaybe<CompanyOrderByWithGroupByInput>;
  companyId?: InputMaybe<OrderByDirection>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  emails?: InputMaybe<EmailsOrderByInput>;
  id?: InputMaybe<OrderByDirection>;
  jobTitle?: InputMaybe<OrderByDirection>;
  linkedinLink?: InputMaybe<LinksOrderByInput>;
  name?: InputMaybe<FullNameOrderByInput>;
  phones?: InputMaybe<PhonesOrderByInput>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type PersonRelationInput = {
  connect?: InputMaybe<PersonConnectInput>;
  create?: InputMaybe<PersonCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export type PersonUpdateInput = {
  avatarFile?: InputMaybe<Array<InputMaybe<FileItemInput>>>;
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  company?: InputMaybe<CompanyRelationInput>;
  companyId?: InputMaybe<Scalars['ID']['input']>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  emails?: InputMaybe<EmailsUpdateInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  linkedinLink?: InputMaybe<LinksUpdateInput>;
  name?: InputMaybe<FullNameUpdateInput>;
  phones?: InputMaybe<PhonesUpdateInput>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
};

export type PersonWhereUniqueInput = {
  emails?: InputMaybe<PersonEmailsWhereInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Phones = {
  __typename?: 'Phones';
  additionalPhones?: Maybe<Array<AdditionalPhone>>;
  primaryPhoneCallingCode?: Maybe<Scalars['String']['output']>;
  primaryPhoneCountryCode?: Maybe<Scalars['String']['output']>;
  primaryPhoneNumber?: Maybe<Scalars['String']['output']>;
};

export type PhonesCreateInput = {
  additionalPhones?: InputMaybe<Array<AdditionalPhoneInput>>;
  primaryPhoneCallingCode?: InputMaybe<Scalars['String']['input']>;
  primaryPhoneCountryCode?: InputMaybe<Scalars['String']['input']>;
  primaryPhoneNumber?: InputMaybe<Scalars['String']['input']>;
};

export type PhonesFilterInput = {
  additionalPhones?: InputMaybe<RawJsonFilter>;
  primaryPhoneCallingCode?: InputMaybe<StringFilter>;
  primaryPhoneCountryCode?: InputMaybe<StringFilter>;
  primaryPhoneNumber?: InputMaybe<StringFilter>;
};

export type PhonesGroupByInput = {
  primaryPhoneCallingCode?: InputMaybe<Scalars['Boolean']['input']>;
  primaryPhoneCountryCode?: InputMaybe<Scalars['Boolean']['input']>;
  primaryPhoneNumber?: InputMaybe<Scalars['Boolean']['input']>;
};

export type PhonesOrderByInput = {
  additionalPhones?: InputMaybe<OrderByDirection>;
  primaryPhoneCallingCode?: InputMaybe<OrderByDirection>;
  primaryPhoneCountryCode?: InputMaybe<OrderByDirection>;
  primaryPhoneNumber?: InputMaybe<OrderByDirection>;
};

export type PhonesUpdateInput = {
  additionalPhones?: InputMaybe<Array<AdditionalPhoneInput>>;
  primaryPhoneCallingCode?: InputMaybe<Scalars['String']['input']>;
  primaryPhoneCountryCode?: InputMaybe<Scalars['String']['input']>;
  primaryPhoneNumber?: InputMaybe<Scalars['String']['input']>;
};

export type Query = {
  __typename?: 'Query';
  attachment?: Maybe<Attachment>;
  attachmentDuplicates?: Maybe<Array<AttachmentConnection>>;
  attachments?: Maybe<AttachmentConnection>;
  attachmentsGroupBy?: Maybe<Array<AttachmentGroupByConnection>>;
  companies?: Maybe<CompanyConnection>;
  companiesGroupBy?: Maybe<Array<CompanyGroupByConnection>>;
  company?: Maybe<Company>;
  companyDuplicates?: Maybe<Array<CompanyConnection>>;
  note?: Maybe<Note>;
  noteDuplicates?: Maybe<Array<NoteConnection>>;
  noteTarget?: Maybe<NoteTarget>;
  noteTargetDuplicates?: Maybe<Array<NoteTargetConnection>>;
  noteTargets?: Maybe<NoteTargetConnection>;
  noteTargetsGroupBy?: Maybe<Array<NoteTargetGroupByConnection>>;
  notes?: Maybe<NoteConnection>;
  notesGroupBy?: Maybe<Array<NoteGroupByConnection>>;
  opportunities?: Maybe<OpportunityConnection>;
  opportunitiesGroupBy?: Maybe<Array<OpportunityGroupByConnection>>;
  opportunity?: Maybe<Opportunity>;
  opportunityDuplicates?: Maybe<Array<OpportunityConnection>>;
  people?: Maybe<PersonConnection>;
  peopleGroupBy?: Maybe<Array<PersonGroupByConnection>>;
  person?: Maybe<Person>;
  personDuplicates?: Maybe<Array<PersonConnection>>;
  search: SearchResultConnection;
  task?: Maybe<Task>;
  taskDuplicates?: Maybe<Array<TaskConnection>>;
  taskTarget?: Maybe<TaskTarget>;
  taskTargetDuplicates?: Maybe<Array<TaskTargetConnection>>;
  taskTargets?: Maybe<TaskTargetConnection>;
  taskTargetsGroupBy?: Maybe<Array<TaskTargetGroupByConnection>>;
  tasks?: Maybe<TaskConnection>;
  tasksGroupBy?: Maybe<Array<TaskGroupByConnection>>;
  timelineActivities?: Maybe<TimelineActivityConnection>;
  timelineActivitiesGroupBy?: Maybe<Array<TimelineActivityGroupByConnection>>;
  timelineActivity?: Maybe<TimelineActivity>;
  timelineActivityDuplicates?: Maybe<Array<TimelineActivityConnection>>;
  workspaceMember?: Maybe<WorkspaceMember>;
  workspaceMemberDuplicates?: Maybe<Array<WorkspaceMemberConnection>>;
  workspaceMembers?: Maybe<WorkspaceMemberConnection>;
  workspaceMembersGroupBy?: Maybe<Array<WorkspaceMemberGroupByConnection>>;
};


export type QueryAttachmentArgs = {
  filter: AttachmentFilterInput;
};


export type QueryAttachmentDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<AttachmentCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryAttachmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<AttachmentFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<AttachmentOrderByInput>>>;
};


export type QueryAttachmentsGroupByArgs = {
  filter?: InputMaybe<AttachmentFilterInput>;
  groupBy: Array<AttachmentGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<AttachmentOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<AttachmentOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryCompaniesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<CompanyFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<CompanyOrderByInput>>>;
};


export type QueryCompaniesGroupByArgs = {
  filter?: InputMaybe<CompanyFilterInput>;
  groupBy: Array<CompanyGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<CompanyOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<CompanyOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryCompanyArgs = {
  filter: CompanyFilterInput;
};


export type QueryCompanyDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<CompanyCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryNoteArgs = {
  filter: NoteFilterInput;
};


export type QueryNoteDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<NoteCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryNoteTargetArgs = {
  filter: NoteTargetFilterInput;
};


export type QueryNoteTargetDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<NoteTargetCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryNoteTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<NoteTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<NoteTargetOrderByInput>>>;
};


export type QueryNoteTargetsGroupByArgs = {
  filter?: InputMaybe<NoteTargetFilterInput>;
  groupBy: Array<NoteTargetGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<NoteTargetOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<NoteTargetOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryNotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<NoteFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<NoteOrderByInput>>>;
};


export type QueryNotesGroupByArgs = {
  filter?: InputMaybe<NoteFilterInput>;
  groupBy: Array<NoteGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<NoteOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<NoteOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryOpportunitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<OpportunityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<OpportunityOrderByInput>>>;
};


export type QueryOpportunitiesGroupByArgs = {
  filter?: InputMaybe<OpportunityFilterInput>;
  groupBy: Array<OpportunityGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<OpportunityOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<OpportunityOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryOpportunityArgs = {
  filter: OpportunityFilterInput;
};


export type QueryOpportunityDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<OpportunityCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryPeopleArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PersonFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<PersonOrderByInput>>>;
};


export type QueryPeopleGroupByArgs = {
  filter?: InputMaybe<PersonFilterInput>;
  groupBy: Array<PersonGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<PersonOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<PersonOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryPersonArgs = {
  filter: PersonFilterInput;
};


export type QueryPersonDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<PersonCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QuerySearchArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  excludedObjectNameSingulars?: InputMaybe<Array<Scalars['String']['input']>>;
  filter?: InputMaybe<ObjectRecordFilterInput>;
  includedObjectNameSingulars?: InputMaybe<Array<Scalars['String']['input']>>;
  limit: Scalars['Int']['input'];
  searchInput: Scalars['String']['input'];
};


export type QueryTaskArgs = {
  filter: TaskFilterInput;
};


export type QueryTaskDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<TaskCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryTaskTargetArgs = {
  filter: TaskTargetFilterInput;
};


export type QueryTaskTargetDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<TaskTargetCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryTaskTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TaskTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskTargetOrderByInput>>>;
};


export type QueryTaskTargetsGroupByArgs = {
  filter?: InputMaybe<TaskTargetFilterInput>;
  groupBy: Array<TaskTargetGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskTargetOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<TaskTargetOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryTasksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TaskFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskOrderByInput>>>;
};


export type QueryTasksGroupByArgs = {
  filter?: InputMaybe<TaskFilterInput>;
  groupBy: Array<TaskGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<TaskOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryTimelineActivitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TimelineActivityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByInput>>>;
};


export type QueryTimelineActivitiesGroupByArgs = {
  filter?: InputMaybe<TimelineActivityFilterInput>;
  groupBy: Array<TimelineActivityGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryTimelineActivityArgs = {
  filter: TimelineActivityFilterInput;
};


export type QueryTimelineActivityDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<TimelineActivityCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryWorkspaceMemberArgs = {
  filter: WorkspaceMemberFilterInput;
};


export type QueryWorkspaceMemberDuplicatesArgs = {
  data?: InputMaybe<Array<InputMaybe<WorkspaceMemberCreateInput>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
};


export type QueryWorkspaceMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<WorkspaceMemberFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<WorkspaceMemberOrderByInput>>>;
};


export type QueryWorkspaceMembersGroupByArgs = {
  filter?: InputMaybe<WorkspaceMemberFilterInput>;
  groupBy: Array<WorkspaceMemberGroupByInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offsetForRecords?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<WorkspaceMemberOrderByWithGroupByInput>>>;
  orderByForRecords?: InputMaybe<Array<InputMaybe<WorkspaceMemberOrderByInput>>>;
  viewId?: InputMaybe<Scalars['UUID']['input']>;
};

export type RawJsonFilter = {
  /** Case-insensitive pattern match with % wildcard (e.g. %value%) */
  ilike?: InputMaybe<Scalars['String']['input']>;
  is?: InputMaybe<FilterIs>;
  /** Pattern match with % wildcard (e.g. %value%) */
  like?: InputMaybe<Scalars['String']['input']>;
};

export type RichText = {
  __typename?: 'RichText';
  /** @deprecated Use markdown or tiptap instead. This value is cleared whenever the field is written in another format. */
  blocknote?: Maybe<Scalars['String']['output']>;
  markdown?: Maybe<Scalars['String']['output']>;
  tiptap?: Maybe<Scalars['String']['output']>;
};

export type RichTextCreateInput = {
  blocknote?: InputMaybe<Scalars['String']['input']>;
  markdown?: InputMaybe<Scalars['String']['input']>;
  tiptap?: InputMaybe<Scalars['String']['input']>;
};

export type RichTextFilterInput = {
  markdown?: InputMaybe<StringFilter>;
  tiptap?: InputMaybe<StringFilter>;
};

export type RichTextGroupByInput = {
  blocknote?: InputMaybe<Scalars['Boolean']['input']>;
  markdown?: InputMaybe<Scalars['Boolean']['input']>;
  tiptap?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RichTextOrderByInput = {
  blocknote?: InputMaybe<OrderByDirection>;
  markdown?: InputMaybe<OrderByDirection>;
  tiptap?: InputMaybe<OrderByDirection>;
};

export type RichTextUpdateInput = {
  blocknote?: InputMaybe<Scalars['String']['input']>;
  markdown?: InputMaybe<Scalars['String']['input']>;
  tiptap?: InputMaybe<Scalars['String']['input']>;
};

export type SearchRecord = {
  __typename?: 'SearchRecord';
  imageUrl?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  objectLabelSingular: Scalars['String']['output'];
  objectNameSingular: Scalars['String']['output'];
  recordId: Scalars['UUID']['output'];
  tsRank: Scalars['Float']['output'];
  tsRankCD: Scalars['Float']['output'];
};

export type SearchResultConnection = {
  __typename?: 'SearchResultConnection';
  edges: Array<SearchResultEdge>;
  pageInfo: SearchResultPageInfo;
};

export type SearchResultEdge = {
  __typename?: 'SearchResultEdge';
  cursor: Scalars['String']['output'];
  node: SearchRecord;
};

export type SearchResultPageInfo = {
  __typename?: 'SearchResultPageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
};

export type SecondaryLink = {
  __typename?: 'SecondaryLink';
  label?: Maybe<Scalars['String']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type SecondaryLinkInput = {
  label?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type StringFilter = {
  endsWith?: InputMaybe<Scalars['String']['input']>;
  eq?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  /** Case-insensitive match with % wildcard (e.g. %value%) */
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  iregex?: InputMaybe<Scalars['String']['input']>;
  is?: InputMaybe<FilterIs>;
  /** Pattern match with % wildcard (e.g. %value%) */
  like?: InputMaybe<Scalars['String']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  neq?: InputMaybe<Scalars['String']['input']>;
  regex?: InputMaybe<Scalars['String']['input']>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type TsVectorFilter = {
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Task = {
  __typename?: 'Task';
  assignee?: Maybe<WorkspaceMember>;
  assigneeId?: Maybe<Scalars['ID']['output']>;
  attachments?: Maybe<AttachmentConnection>;
  bodyV2?: Maybe<RichText>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  status?: Maybe<TaskStatusEnum>;
  taskTargets?: Maybe<TaskTargetConnection>;
  timelineActivities?: Maybe<TimelineActivityConnection>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
};


export type TaskAttachmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<AttachmentFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<AttachmentOrderByInput>>>;
};


export type TaskTaskTargetsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TaskTargetFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskTargetOrderByInput>>>;
};


export type TaskTimelineActivitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TimelineActivityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByInput>>>;
};

export type TaskConnectInput = {
  where?: InputMaybe<TaskWhereUniqueInput>;
};

export type TaskConnection = {
  __typename?: 'TaskConnection';
  countEmptyBodyV2?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyDueAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyStatus?: Maybe<Scalars['Int']['output']>;
  countEmptyTitle?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyBodyV2?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDueAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyStatus?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTitle?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesBodyV2?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDueAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesStatus?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTitle?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<TaskEdge>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDueAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minDueAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyBodyV2?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDueAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyStatus?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTitle?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyBodyV2?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDueAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyStatus?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTitle?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type TaskCreateInput = {
  assignee?: InputMaybe<WorkspaceMemberRelationInput>;
  assigneeId?: InputMaybe<Scalars['ID']['input']>;
  bodyV2?: InputMaybe<RichTextCreateInput>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  status?: InputMaybe<TaskStatusEnum>;
  title?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
};

export type TaskEdge = {
  __typename?: 'TaskEdge';
  cursor: Scalars['Cursor']['output'];
  node: Task;
};

export type TaskFilterInput = {
  and?: InputMaybe<Array<InputMaybe<TaskFilterInput>>>;
  assignee?: InputMaybe<WorkspaceMemberFilterInput>;
  assigneeId?: InputMaybe<UuidFilter>;
  bodyV2?: InputMaybe<RichTextFilterInput>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  dueAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<UuidFilter>;
  not?: InputMaybe<TaskFilterInput>;
  or?: InputMaybe<Array<InputMaybe<TaskFilterInput>>>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  status?: InputMaybe<TaskStatusEnumFilter>;
  title?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
};

export type TaskGroupByConnection = {
  __typename?: 'TaskGroupByConnection';
  countEmptyBodyV2?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyDueAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyStatus?: Maybe<Scalars['Int']['output']>;
  countEmptyTitle?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyBodyV2?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDueAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyStatus?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTitle?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesBodyV2?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDueAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesStatus?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTitle?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<TaskEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDueAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minDueAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyBodyV2?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDueAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyStatus?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTitle?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyBodyV2?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDueAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyStatus?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTitle?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type TaskGroupByInput = {
  assignee?: InputMaybe<WorkspaceMemberGroupByInput>;
  bodyV2?: InputMaybe<RichTextGroupByInput>;
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  dueAt?: InputMaybe<GroupByDateGranularityInput>;
  status?: InputMaybe<Scalars['Boolean']['input']>;
  title?: InputMaybe<Scalars['Boolean']['input']>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
};

export type TaskOrderByInput = {
  assignee?: InputMaybe<WorkspaceMemberOrderByInput>;
  assigneeId?: InputMaybe<OrderByDirection>;
  bodyV2?: InputMaybe<RichTextOrderByInput>;
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  dueAt?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  status?: InputMaybe<OrderByDirection>;
  title?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type TaskOrderByWithGroupByAggregateInput = {
  countEmptyBodyV2?: InputMaybe<OrderByDirection>;
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyDueAt?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyStatus?: InputMaybe<OrderByDirection>;
  countEmptyTitle?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyBodyV2?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyDueAt?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyStatus?: InputMaybe<OrderByDirection>;
  countNotEmptyTitle?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesBodyV2?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesDueAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesStatus?: InputMaybe<OrderByDirection>;
  countUniqueValuesTitle?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxDueAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minDueAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyBodyV2?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyDueAt?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyStatus?: InputMaybe<OrderByDirection>;
  percentageEmptyTitle?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyBodyV2?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDueAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyStatus?: InputMaybe<OrderByDirection>;
  percentageNotEmptyTitle?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type TaskOrderByWithGroupByInput = {
  aggregate?: InputMaybe<TaskOrderByWithGroupByAggregateInput>;
  assignee?: InputMaybe<WorkspaceMemberOrderByWithGroupByInput>;
  assigneeId?: InputMaybe<OrderByDirection>;
  bodyV2?: InputMaybe<RichTextOrderByInput>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  dueAt?: InputMaybe<OrderByDateGranularityInput>;
  id?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  status?: InputMaybe<OrderByDirection>;
  title?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type TaskRelationInput = {
  connect?: InputMaybe<TaskConnectInput>;
  create?: InputMaybe<TaskCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum TaskStatusEnum {
  DONE = 'DONE',
  IN_PROGRESS = 'IN_PROGRESS',
  TODO = 'TODO'
}

export type TaskStatusEnumFilter = {
  containsAny?: InputMaybe<Array<InputMaybe<TaskStatusEnum>>>;
  eq?: InputMaybe<TaskStatusEnum>;
  gt?: InputMaybe<TaskStatusEnum>;
  gte?: InputMaybe<TaskStatusEnum>;
  in?: InputMaybe<Array<InputMaybe<TaskStatusEnum>>>;
  is?: InputMaybe<FilterIs>;
  isEmptyArray?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<TaskStatusEnum>;
  lte?: InputMaybe<TaskStatusEnum>;
  neq?: InputMaybe<TaskStatusEnum>;
};

export type TaskTarget = {
  __typename?: 'TaskTarget';
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  targetCompany?: Maybe<Company>;
  targetCompanyId?: Maybe<Scalars['ID']['output']>;
  targetOpportunity?: Maybe<Opportunity>;
  targetOpportunityId?: Maybe<Scalars['ID']['output']>;
  targetPerson?: Maybe<Person>;
  targetPersonId?: Maybe<Scalars['ID']['output']>;
  task?: Maybe<Task>;
  taskId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
};

export type TaskTargetConnectInput = {
  where?: InputMaybe<TaskTargetWhereUniqueInput>;
};

export type TaskTargetConnection = {
  __typename?: 'TaskTargetConnection';
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<TaskTargetEdge>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type TaskTargetCreateInput = {
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  targetCompany?: InputMaybe<CompanyRelationInput>;
  targetCompanyId?: InputMaybe<Scalars['ID']['input']>;
  targetOpportunity?: InputMaybe<OpportunityRelationInput>;
  targetOpportunityId?: InputMaybe<Scalars['ID']['input']>;
  targetPerson?: InputMaybe<PersonRelationInput>;
  targetPersonId?: InputMaybe<Scalars['ID']['input']>;
  task?: InputMaybe<TaskRelationInput>;
  taskId?: InputMaybe<Scalars['ID']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
};

export type TaskTargetEdge = {
  __typename?: 'TaskTargetEdge';
  cursor: Scalars['Cursor']['output'];
  node: TaskTarget;
};

export type TaskTargetFilterInput = {
  and?: InputMaybe<Array<InputMaybe<TaskTargetFilterInput>>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<UuidFilter>;
  not?: InputMaybe<TaskTargetFilterInput>;
  or?: InputMaybe<Array<InputMaybe<TaskTargetFilterInput>>>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  targetCompany?: InputMaybe<CompanyFilterInput>;
  targetCompanyId?: InputMaybe<UuidFilter>;
  targetOpportunity?: InputMaybe<OpportunityFilterInput>;
  targetOpportunityId?: InputMaybe<UuidFilter>;
  targetPerson?: InputMaybe<PersonFilterInput>;
  targetPersonId?: InputMaybe<UuidFilter>;
  task?: InputMaybe<TaskFilterInput>;
  taskId?: InputMaybe<UuidFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
};

export type TaskTargetGroupByConnection = {
  __typename?: 'TaskTargetGroupByConnection';
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<TaskTargetEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type TaskTargetGroupByInput = {
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  targetCompany?: InputMaybe<CompanyGroupByInput>;
  targetOpportunity?: InputMaybe<OpportunityGroupByInput>;
  targetPerson?: InputMaybe<PersonGroupByInput>;
  task?: InputMaybe<TaskGroupByInput>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
};

export type TaskTargetOrderByInput = {
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  targetCompany?: InputMaybe<CompanyOrderByInput>;
  targetCompanyId?: InputMaybe<OrderByDirection>;
  targetOpportunity?: InputMaybe<OpportunityOrderByInput>;
  targetOpportunityId?: InputMaybe<OrderByDirection>;
  targetPerson?: InputMaybe<PersonOrderByInput>;
  targetPersonId?: InputMaybe<OrderByDirection>;
  task?: InputMaybe<TaskOrderByInput>;
  taskId?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type TaskTargetOrderByWithGroupByAggregateInput = {
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type TaskTargetOrderByWithGroupByInput = {
  aggregate?: InputMaybe<TaskTargetOrderByWithGroupByAggregateInput>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  id?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  targetCompany?: InputMaybe<CompanyOrderByWithGroupByInput>;
  targetCompanyId?: InputMaybe<OrderByDirection>;
  targetOpportunity?: InputMaybe<OpportunityOrderByWithGroupByInput>;
  targetOpportunityId?: InputMaybe<OrderByDirection>;
  targetPerson?: InputMaybe<PersonOrderByWithGroupByInput>;
  targetPersonId?: InputMaybe<OrderByDirection>;
  task?: InputMaybe<TaskOrderByWithGroupByInput>;
  taskId?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
};

export type TaskTargetRelationInput = {
  connect?: InputMaybe<TaskTargetConnectInput>;
  create?: InputMaybe<TaskTargetCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export type TaskTargetUpdateInput = {
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  targetCompany?: InputMaybe<CompanyRelationInput>;
  targetCompanyId?: InputMaybe<Scalars['ID']['input']>;
  targetOpportunity?: InputMaybe<OpportunityRelationInput>;
  targetOpportunityId?: InputMaybe<Scalars['ID']['input']>;
  targetPerson?: InputMaybe<PersonRelationInput>;
  targetPersonId?: InputMaybe<Scalars['ID']['input']>;
  task?: InputMaybe<TaskRelationInput>;
  taskId?: InputMaybe<Scalars['ID']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
};

export type TaskTargetWhereUniqueInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type TaskUpdateInput = {
  assignee?: InputMaybe<WorkspaceMemberRelationInput>;
  assigneeId?: InputMaybe<Scalars['ID']['input']>;
  bodyV2?: InputMaybe<RichTextUpdateInput>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  status?: InputMaybe<TaskStatusEnum>;
  title?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
};

export type TaskWhereUniqueInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type TimelineActivity = {
  __typename?: 'TimelineActivity';
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  happensAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  linkedObjectMetadataId?: Maybe<Scalars['UUID']['output']>;
  linkedRecordCachedName?: Maybe<Scalars['String']['output']>;
  linkedRecordId?: Maybe<Scalars['UUID']['output']>;
  position: Scalars['Position']['output'];
  properties?: Maybe<Scalars['JSON']['output']>;
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  targetCompany?: Maybe<Company>;
  targetCompanyId?: Maybe<Scalars['ID']['output']>;
  targetNote?: Maybe<Note>;
  targetNoteId?: Maybe<Scalars['ID']['output']>;
  targetOpportunity?: Maybe<Opportunity>;
  targetOpportunityId?: Maybe<Scalars['ID']['output']>;
  targetPerson?: Maybe<Person>;
  targetPersonId?: Maybe<Scalars['ID']['output']>;
  targetTask?: Maybe<Task>;
  targetTaskId?: Maybe<Scalars['ID']['output']>;
  timelineActivityTypeId?: Maybe<Scalars['UUID']['output']>;
  timelineActivityTypeSnapshot?: Maybe<Scalars['JSON']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
  workspaceMember?: Maybe<WorkspaceMember>;
  workspaceMemberId?: Maybe<Scalars['ID']['output']>;
};

export type TimelineActivityConnectInput = {
  where?: InputMaybe<TimelineActivityWhereUniqueInput>;
};

export type TimelineActivityConnection = {
  __typename?: 'TimelineActivityConnection';
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyHappensAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedObjectMetadataId?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedRecordCachedName?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedRecordId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptyProperties?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyTimelineActivityTypeId?: Maybe<Scalars['Int']['output']>;
  countEmptyTimelineActivityTypeSnapshot?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyHappensAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedObjectMetadataId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedRecordCachedName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedRecordId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptyProperties?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTimelineActivityTypeId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTimelineActivityTypeSnapshot?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesHappensAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedObjectMetadataId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedRecordCachedName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedRecordId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesProperties?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTimelineActivityTypeId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTimelineActivityTypeSnapshot?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<TimelineActivityEdge>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxHappensAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minHappensAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyHappensAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedObjectMetadataId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedRecordCachedName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedRecordId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptyProperties?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTimelineActivityTypeId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTimelineActivityTypeSnapshot?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyHappensAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedObjectMetadataId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedRecordCachedName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedRecordId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyProperties?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTimelineActivityTypeId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTimelineActivityTypeSnapshot?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type TimelineActivityCreateInput = {
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  happensAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  linkedObjectMetadataId?: InputMaybe<Scalars['UUID']['input']>;
  linkedRecordCachedName?: InputMaybe<Scalars['String']['input']>;
  linkedRecordId?: InputMaybe<Scalars['UUID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  properties?: InputMaybe<Scalars['JSON']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  targetCompany?: InputMaybe<CompanyRelationInput>;
  targetCompanyId?: InputMaybe<Scalars['ID']['input']>;
  targetNote?: InputMaybe<NoteRelationInput>;
  targetNoteId?: InputMaybe<Scalars['ID']['input']>;
  targetOpportunity?: InputMaybe<OpportunityRelationInput>;
  targetOpportunityId?: InputMaybe<Scalars['ID']['input']>;
  targetPerson?: InputMaybe<PersonRelationInput>;
  targetPersonId?: InputMaybe<Scalars['ID']['input']>;
  targetTask?: InputMaybe<TaskRelationInput>;
  targetTaskId?: InputMaybe<Scalars['ID']['input']>;
  timelineActivityTypeId?: InputMaybe<Scalars['UUID']['input']>;
  timelineActivityTypeSnapshot?: InputMaybe<Scalars['JSON']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
  workspaceMember?: InputMaybe<WorkspaceMemberRelationInput>;
  workspaceMemberId?: InputMaybe<Scalars['ID']['input']>;
};

export type TimelineActivityEdge = {
  __typename?: 'TimelineActivityEdge';
  cursor: Scalars['Cursor']['output'];
  node: TimelineActivity;
};

export type TimelineActivityFilterInput = {
  and?: InputMaybe<Array<InputMaybe<TimelineActivityFilterInput>>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  happensAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<UuidFilter>;
  linkedObjectMetadataId?: InputMaybe<UuidFilter>;
  linkedRecordCachedName?: InputMaybe<StringFilter>;
  linkedRecordId?: InputMaybe<UuidFilter>;
  not?: InputMaybe<TimelineActivityFilterInput>;
  or?: InputMaybe<Array<InputMaybe<TimelineActivityFilterInput>>>;
  position?: InputMaybe<FloatFilter>;
  properties?: InputMaybe<RawJsonFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  targetCompany?: InputMaybe<CompanyFilterInput>;
  targetCompanyId?: InputMaybe<UuidFilter>;
  targetNote?: InputMaybe<NoteFilterInput>;
  targetNoteId?: InputMaybe<UuidFilter>;
  targetOpportunity?: InputMaybe<OpportunityFilterInput>;
  targetOpportunityId?: InputMaybe<UuidFilter>;
  targetPerson?: InputMaybe<PersonFilterInput>;
  targetPersonId?: InputMaybe<UuidFilter>;
  targetTask?: InputMaybe<TaskFilterInput>;
  targetTaskId?: InputMaybe<UuidFilter>;
  timelineActivityTypeId?: InputMaybe<UuidFilter>;
  timelineActivityTypeSnapshot?: InputMaybe<RawJsonFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
  workspaceMember?: InputMaybe<WorkspaceMemberFilterInput>;
  workspaceMemberId?: InputMaybe<UuidFilter>;
};

export type TimelineActivityGroupByConnection = {
  __typename?: 'TimelineActivityGroupByConnection';
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyHappensAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedObjectMetadataId?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedRecordCachedName?: Maybe<Scalars['Int']['output']>;
  countEmptyLinkedRecordId?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptyProperties?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyTimelineActivityTypeId?: Maybe<Scalars['Int']['output']>;
  countEmptyTimelineActivityTypeSnapshot?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyHappensAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedObjectMetadataId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedRecordCachedName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLinkedRecordId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptyProperties?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTimelineActivityTypeId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTimelineActivityTypeSnapshot?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesHappensAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedObjectMetadataId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedRecordCachedName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLinkedRecordId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesProperties?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTimelineActivityTypeId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTimelineActivityTypeSnapshot?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  edges: Array<TimelineActivityEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxHappensAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minHappensAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyHappensAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedObjectMetadataId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedRecordCachedName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLinkedRecordId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptyProperties?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTimelineActivityTypeId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTimelineActivityTypeSnapshot?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyHappensAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedObjectMetadataId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedRecordCachedName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLinkedRecordId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyProperties?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTimelineActivityTypeId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTimelineActivityTypeSnapshot?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type TimelineActivityGroupByInput = {
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  happensAt?: InputMaybe<GroupByDateGranularityInput>;
  linkedObjectMetadataId?: InputMaybe<Scalars['Boolean']['input']>;
  linkedRecordCachedName?: InputMaybe<Scalars['Boolean']['input']>;
  linkedRecordId?: InputMaybe<Scalars['Boolean']['input']>;
  targetCompany?: InputMaybe<CompanyGroupByInput>;
  targetNote?: InputMaybe<NoteGroupByInput>;
  targetOpportunity?: InputMaybe<OpportunityGroupByInput>;
  targetPerson?: InputMaybe<PersonGroupByInput>;
  targetTask?: InputMaybe<TaskGroupByInput>;
  timelineActivityTypeId?: InputMaybe<Scalars['Boolean']['input']>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
  workspaceMember?: InputMaybe<WorkspaceMemberGroupByInput>;
};

export type TimelineActivityOrderByInput = {
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDirection>;
  happensAt?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  linkedObjectMetadataId?: InputMaybe<OrderByDirection>;
  linkedRecordCachedName?: InputMaybe<OrderByDirection>;
  linkedRecordId?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  properties?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  targetCompany?: InputMaybe<CompanyOrderByInput>;
  targetCompanyId?: InputMaybe<OrderByDirection>;
  targetNote?: InputMaybe<NoteOrderByInput>;
  targetNoteId?: InputMaybe<OrderByDirection>;
  targetOpportunity?: InputMaybe<OpportunityOrderByInput>;
  targetOpportunityId?: InputMaybe<OrderByDirection>;
  targetPerson?: InputMaybe<PersonOrderByInput>;
  targetPersonId?: InputMaybe<OrderByDirection>;
  targetTask?: InputMaybe<TaskOrderByInput>;
  targetTaskId?: InputMaybe<OrderByDirection>;
  timelineActivityTypeId?: InputMaybe<OrderByDirection>;
  timelineActivityTypeSnapshot?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
  workspaceMember?: InputMaybe<WorkspaceMemberOrderByInput>;
  workspaceMemberId?: InputMaybe<OrderByDirection>;
};

export type TimelineActivityOrderByWithGroupByAggregateInput = {
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyHappensAt?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyLinkedObjectMetadataId?: InputMaybe<OrderByDirection>;
  countEmptyLinkedRecordCachedName?: InputMaybe<OrderByDirection>;
  countEmptyLinkedRecordId?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptyProperties?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyTimelineActivityTypeId?: InputMaybe<OrderByDirection>;
  countEmptyTimelineActivityTypeSnapshot?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyHappensAt?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyLinkedObjectMetadataId?: InputMaybe<OrderByDirection>;
  countNotEmptyLinkedRecordCachedName?: InputMaybe<OrderByDirection>;
  countNotEmptyLinkedRecordId?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptyProperties?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyTimelineActivityTypeId?: InputMaybe<OrderByDirection>;
  countNotEmptyTimelineActivityTypeSnapshot?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesHappensAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesLinkedObjectMetadataId?: InputMaybe<OrderByDirection>;
  countUniqueValuesLinkedRecordCachedName?: InputMaybe<OrderByDirection>;
  countUniqueValuesLinkedRecordId?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesProperties?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesTimelineActivityTypeId?: InputMaybe<OrderByDirection>;
  countUniqueValuesTimelineActivityTypeSnapshot?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxHappensAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minHappensAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyHappensAt?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyLinkedObjectMetadataId?: InputMaybe<OrderByDirection>;
  percentageEmptyLinkedRecordCachedName?: InputMaybe<OrderByDirection>;
  percentageEmptyLinkedRecordId?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptyProperties?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyTimelineActivityTypeId?: InputMaybe<OrderByDirection>;
  percentageEmptyTimelineActivityTypeSnapshot?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyHappensAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyLinkedObjectMetadataId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyLinkedRecordCachedName?: InputMaybe<OrderByDirection>;
  percentageNotEmptyLinkedRecordId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptyProperties?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyTimelineActivityTypeId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyTimelineActivityTypeSnapshot?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type TimelineActivityOrderByWithGroupByInput = {
  aggregate?: InputMaybe<TimelineActivityOrderByWithGroupByAggregateInput>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  happensAt?: InputMaybe<OrderByDateGranularityInput>;
  id?: InputMaybe<OrderByDirection>;
  linkedObjectMetadataId?: InputMaybe<OrderByDirection>;
  linkedRecordCachedName?: InputMaybe<OrderByDirection>;
  linkedRecordId?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  properties?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  targetCompany?: InputMaybe<CompanyOrderByWithGroupByInput>;
  targetCompanyId?: InputMaybe<OrderByDirection>;
  targetNote?: InputMaybe<NoteOrderByWithGroupByInput>;
  targetNoteId?: InputMaybe<OrderByDirection>;
  targetOpportunity?: InputMaybe<OpportunityOrderByWithGroupByInput>;
  targetOpportunityId?: InputMaybe<OrderByDirection>;
  targetPerson?: InputMaybe<PersonOrderByWithGroupByInput>;
  targetPersonId?: InputMaybe<OrderByDirection>;
  targetTask?: InputMaybe<TaskOrderByWithGroupByInput>;
  targetTaskId?: InputMaybe<OrderByDirection>;
  timelineActivityTypeId?: InputMaybe<OrderByDirection>;
  timelineActivityTypeSnapshot?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
  workspaceMember?: InputMaybe<WorkspaceMemberOrderByWithGroupByInput>;
  workspaceMemberId?: InputMaybe<OrderByDirection>;
};

export type TimelineActivityRelationInput = {
  connect?: InputMaybe<TimelineActivityConnectInput>;
  create?: InputMaybe<TimelineActivityCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export type TimelineActivityUpdateInput = {
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  happensAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  linkedObjectMetadataId?: InputMaybe<Scalars['UUID']['input']>;
  linkedRecordCachedName?: InputMaybe<Scalars['String']['input']>;
  linkedRecordId?: InputMaybe<Scalars['UUID']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  properties?: InputMaybe<Scalars['JSON']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  targetCompany?: InputMaybe<CompanyRelationInput>;
  targetCompanyId?: InputMaybe<Scalars['ID']['input']>;
  targetNote?: InputMaybe<NoteRelationInput>;
  targetNoteId?: InputMaybe<Scalars['ID']['input']>;
  targetOpportunity?: InputMaybe<OpportunityRelationInput>;
  targetOpportunityId?: InputMaybe<Scalars['ID']['input']>;
  targetPerson?: InputMaybe<PersonRelationInput>;
  targetPersonId?: InputMaybe<Scalars['ID']['input']>;
  targetTask?: InputMaybe<TaskRelationInput>;
  targetTaskId?: InputMaybe<Scalars['ID']['input']>;
  timelineActivityTypeId?: InputMaybe<Scalars['UUID']['input']>;
  timelineActivityTypeSnapshot?: InputMaybe<Scalars['JSON']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
  workspaceMember?: InputMaybe<WorkspaceMemberRelationInput>;
  workspaceMemberId?: InputMaybe<Scalars['ID']['input']>;
};

export type TimelineActivityWhereUniqueInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type UuidFilter = {
  eq?: InputMaybe<Scalars['UUID']['input']>;
  gt?: InputMaybe<Scalars['UUID']['input']>;
  gte?: InputMaybe<Scalars['UUID']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['UUID']['input']>>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['UUID']['input']>;
  lte?: InputMaybe<Scalars['UUID']['input']>;
  neq?: InputMaybe<Scalars['UUID']['input']>;
};

export type WorkspaceMember = {
  __typename?: 'WorkspaceMember';
  accountOwnerForCompanies?: Maybe<CompanyConnection>;
  assignedTasks?: Maybe<TaskConnection>;
  avatarUrl?: Maybe<Scalars['String']['output']>;
  calendarStartDay?: Maybe<Scalars['Float']['output']>;
  colorScheme?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Actor;
  dateFormat?: Maybe<WorkspaceMemberDateFormatEnum>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  jobTitle?: Maybe<Scalars['String']['output']>;
  locale?: Maybe<Scalars['String']['output']>;
  name?: Maybe<FullName>;
  numberFormat?: Maybe<WorkspaceMemberNumberFormatEnum>;
  openRecordIn?: Maybe<Scalars['String']['output']>;
  ownedOpportunities?: Maybe<OpportunityConnection>;
  position: Scalars['Position']['output'];
  searchVector?: Maybe<Scalars['TSVector']['output']>;
  timeFormat?: Maybe<WorkspaceMemberTimeFormatEnum>;
  timeZone?: Maybe<Scalars['String']['output']>;
  timelineActivities?: Maybe<TimelineActivityConnection>;
  uiScale?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Actor;
  userEmail?: Maybe<Scalars['String']['output']>;
  userId?: Maybe<Scalars['UUID']['output']>;
};


export type WorkspaceMemberAccountOwnerForCompaniesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<CompanyFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<CompanyOrderByInput>>>;
};


export type WorkspaceMemberAssignedTasksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TaskFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TaskOrderByInput>>>;
};


export type WorkspaceMemberOwnedOpportunitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<OpportunityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<OpportunityOrderByInput>>>;
};


export type WorkspaceMemberTimelineActivitiesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<TimelineActivityFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<InputMaybe<TimelineActivityOrderByInput>>>;
};

export type WorkspaceMemberConnectInput = {
  where?: InputMaybe<WorkspaceMemberWhereUniqueInput>;
};

export type WorkspaceMemberConnection = {
  __typename?: 'WorkspaceMemberConnection';
  avgCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  countEmptyAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countEmptyCalendarStartDay?: Maybe<Scalars['Int']['output']>;
  countEmptyColorScheme?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDateFormat?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyJobTitle?: Maybe<Scalars['Int']['output']>;
  countEmptyLocale?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyNumberFormat?: Maybe<Scalars['Int']['output']>;
  countEmptyOpenRecordIn?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyTimeFormat?: Maybe<Scalars['Int']['output']>;
  countEmptyTimeZone?: Maybe<Scalars['Int']['output']>;
  countEmptyUiScale?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyUserEmail?: Maybe<Scalars['Int']['output']>;
  countEmptyUserId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCalendarStartDay?: Maybe<Scalars['Int']['output']>;
  countNotEmptyColorScheme?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDateFormat?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyJobTitle?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLocale?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyNumberFormat?: Maybe<Scalars['Int']['output']>;
  countNotEmptyOpenRecordIn?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTimeFormat?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTimeZone?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUiScale?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUserEmail?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUserId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCalendarStartDay?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesColorScheme?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDateFormat?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesJobTitle?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLocale?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesNumberFormat?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesOpenRecordIn?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTimeFormat?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTimeZone?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUiScale?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUserEmail?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUserId?: Maybe<Scalars['Int']['output']>;
  edges: Array<WorkspaceMemberEdge>;
  maxCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyAvatarUrl?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  percentageEmptyColorScheme?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDateFormat?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyJobTitle?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLocale?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyNumberFormat?: Maybe<Scalars['Float']['output']>;
  percentageEmptyOpenRecordIn?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTimeFormat?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTimeZone?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUiScale?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUserEmail?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUserId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAvatarUrl?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyColorScheme?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDateFormat?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyJobTitle?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLocale?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyNumberFormat?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyOpenRecordIn?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTimeFormat?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTimeZone?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUiScale?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUserEmail?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUserId?: Maybe<Scalars['Float']['output']>;
  sumCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type WorkspaceMemberCreateInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  calendarStartDay?: InputMaybe<Scalars['Float']['input']>;
  colorScheme?: InputMaybe<Scalars['String']['input']>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorCreateInput>;
  dateFormat?: InputMaybe<WorkspaceMemberDateFormatEnum>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<FullNameCreateInput>;
  numberFormat?: InputMaybe<WorkspaceMemberNumberFormatEnum>;
  openRecordIn?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  timeFormat?: InputMaybe<WorkspaceMemberTimeFormatEnum>;
  timeZone?: InputMaybe<Scalars['String']['input']>;
  uiScale?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorCreateInput>;
  userEmail?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['UUID']['input']>;
};

export enum WorkspaceMemberDateFormatEnum {
  DAY_FIRST = 'DAY_FIRST',
  MONTH_FIRST = 'MONTH_FIRST',
  SYSTEM = 'SYSTEM',
  YEAR_FIRST = 'YEAR_FIRST'
}

export type WorkspaceMemberDateFormatEnumFilter = {
  containsAny?: InputMaybe<Array<InputMaybe<WorkspaceMemberDateFormatEnum>>>;
  eq?: InputMaybe<WorkspaceMemberDateFormatEnum>;
  gt?: InputMaybe<WorkspaceMemberDateFormatEnum>;
  gte?: InputMaybe<WorkspaceMemberDateFormatEnum>;
  in?: InputMaybe<Array<InputMaybe<WorkspaceMemberDateFormatEnum>>>;
  is?: InputMaybe<FilterIs>;
  isEmptyArray?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<WorkspaceMemberDateFormatEnum>;
  lte?: InputMaybe<WorkspaceMemberDateFormatEnum>;
  neq?: InputMaybe<WorkspaceMemberDateFormatEnum>;
};

export type WorkspaceMemberEdge = {
  __typename?: 'WorkspaceMemberEdge';
  cursor: Scalars['Cursor']['output'];
  node: WorkspaceMember;
};

export type WorkspaceMemberFilterInput = {
  and?: InputMaybe<Array<InputMaybe<WorkspaceMemberFilterInput>>>;
  avatarUrl?: InputMaybe<StringFilter>;
  calendarStartDay?: InputMaybe<FloatFilter>;
  colorScheme?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdBy?: InputMaybe<ActorFilterInput>;
  dateFormat?: InputMaybe<WorkspaceMemberDateFormatEnumFilter>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<UuidFilter>;
  jobTitle?: InputMaybe<StringFilter>;
  locale?: InputMaybe<StringFilter>;
  name?: InputMaybe<FullNameFilterInput>;
  not?: InputMaybe<WorkspaceMemberFilterInput>;
  numberFormat?: InputMaybe<WorkspaceMemberNumberFormatEnumFilter>;
  openRecordIn?: InputMaybe<StringFilter>;
  or?: InputMaybe<Array<InputMaybe<WorkspaceMemberFilterInput>>>;
  position?: InputMaybe<FloatFilter>;
  searchVector?: InputMaybe<TsVectorFilter>;
  timeFormat?: InputMaybe<WorkspaceMemberTimeFormatEnumFilter>;
  timeZone?: InputMaybe<StringFilter>;
  uiScale?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  updatedBy?: InputMaybe<ActorFilterInput>;
  userEmail?: InputMaybe<StringFilter>;
  userId?: InputMaybe<UuidFilter>;
};

export type WorkspaceMemberGroupByConnection = {
  __typename?: 'WorkspaceMemberGroupByConnection';
  avgCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  countEmptyAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countEmptyCalendarStartDay?: Maybe<Scalars['Int']['output']>;
  countEmptyColorScheme?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyDateFormat?: Maybe<Scalars['Int']['output']>;
  countEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyId?: Maybe<Scalars['Int']['output']>;
  countEmptyJobTitle?: Maybe<Scalars['Int']['output']>;
  countEmptyLocale?: Maybe<Scalars['Int']['output']>;
  countEmptyName?: Maybe<Scalars['Int']['output']>;
  countEmptyNumberFormat?: Maybe<Scalars['Int']['output']>;
  countEmptyOpenRecordIn?: Maybe<Scalars['Int']['output']>;
  countEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countEmptyTimeFormat?: Maybe<Scalars['Int']['output']>;
  countEmptyTimeZone?: Maybe<Scalars['Int']['output']>;
  countEmptyUiScale?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countEmptyUserEmail?: Maybe<Scalars['Int']['output']>;
  countEmptyUserId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCalendarStartDay?: Maybe<Scalars['Int']['output']>;
  countNotEmptyColorScheme?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyCreatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDateFormat?: Maybe<Scalars['Int']['output']>;
  countNotEmptyDeletedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyId?: Maybe<Scalars['Int']['output']>;
  countNotEmptyJobTitle?: Maybe<Scalars['Int']['output']>;
  countNotEmptyLocale?: Maybe<Scalars['Int']['output']>;
  countNotEmptyName?: Maybe<Scalars['Int']['output']>;
  countNotEmptyNumberFormat?: Maybe<Scalars['Int']['output']>;
  countNotEmptyOpenRecordIn?: Maybe<Scalars['Int']['output']>;
  countNotEmptyPosition?: Maybe<Scalars['Int']['output']>;
  countNotEmptySearchVector?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTimeFormat?: Maybe<Scalars['Int']['output']>;
  countNotEmptyTimeZone?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUiScale?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUserEmail?: Maybe<Scalars['Int']['output']>;
  countNotEmptyUserId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesAvatarUrl?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCalendarStartDay?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesColorScheme?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesCreatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDateFormat?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesDeletedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesId?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesJobTitle?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesLocale?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesName?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesNumberFormat?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesOpenRecordIn?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesPosition?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesSearchVector?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTimeFormat?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesTimeZone?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUiScale?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedAt?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUpdatedBy?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUserEmail?: Maybe<Scalars['Int']['output']>;
  countUniqueValuesUserId?: Maybe<Scalars['Int']['output']>;
  edges: Array<WorkspaceMemberEdge>;
  groupByDimensionValues: Scalars['JSON']['output'];
  maxCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  maxCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  maxDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  maxUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  minCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  minCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  minDeletedAt?: Maybe<Scalars['DateTime']['output']>;
  minUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  pageInfo: PageInfo;
  percentageEmptyAvatarUrl?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  percentageEmptyColorScheme?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDateFormat?: Maybe<Scalars['Float']['output']>;
  percentageEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageEmptyJobTitle?: Maybe<Scalars['Float']['output']>;
  percentageEmptyLocale?: Maybe<Scalars['Float']['output']>;
  percentageEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageEmptyNumberFormat?: Maybe<Scalars['Float']['output']>;
  percentageEmptyOpenRecordIn?: Maybe<Scalars['Float']['output']>;
  percentageEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTimeFormat?: Maybe<Scalars['Float']['output']>;
  percentageEmptyTimeZone?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUiScale?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUserEmail?: Maybe<Scalars['Float']['output']>;
  percentageEmptyUserId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyAvatarUrl?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyColorScheme?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyCreatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDateFormat?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyDeletedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyId?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyJobTitle?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyLocale?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyName?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyNumberFormat?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyOpenRecordIn?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyPosition?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptySearchVector?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTimeFormat?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyTimeZone?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUiScale?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedAt?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUpdatedBy?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUserEmail?: Maybe<Scalars['Float']['output']>;
  percentageNotEmptyUserId?: Maybe<Scalars['Float']['output']>;
  sumCalendarStartDay?: Maybe<Scalars['Float']['output']>;
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type WorkspaceMemberGroupByInput = {
  avatarUrl?: InputMaybe<Scalars['Boolean']['input']>;
  calendarStartDay?: InputMaybe<Scalars['Boolean']['input']>;
  colorScheme?: InputMaybe<Scalars['Boolean']['input']>;
  createdAt?: InputMaybe<GroupByDateGranularityInput>;
  createdBy?: InputMaybe<ActorGroupByInput>;
  dateFormat?: InputMaybe<Scalars['Boolean']['input']>;
  jobTitle?: InputMaybe<Scalars['Boolean']['input']>;
  locale?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<FullNameGroupByInput>;
  numberFormat?: InputMaybe<Scalars['Boolean']['input']>;
  openRecordIn?: InputMaybe<Scalars['Boolean']['input']>;
  timeFormat?: InputMaybe<Scalars['Boolean']['input']>;
  timeZone?: InputMaybe<Scalars['Boolean']['input']>;
  uiScale?: InputMaybe<Scalars['Boolean']['input']>;
  updatedAt?: InputMaybe<GroupByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorGroupByInput>;
  userEmail?: InputMaybe<Scalars['Boolean']['input']>;
  userId?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum WorkspaceMemberNumberFormatEnum {
  APOSTROPHE_AND_DOT = 'APOSTROPHE_AND_DOT',
  COMMAS_AND_DOT = 'COMMAS_AND_DOT',
  DOTS_AND_COMMA = 'DOTS_AND_COMMA',
  SPACES_AND_COMMA = 'SPACES_AND_COMMA',
  SYSTEM = 'SYSTEM'
}

export type WorkspaceMemberNumberFormatEnumFilter = {
  containsAny?: InputMaybe<Array<InputMaybe<WorkspaceMemberNumberFormatEnum>>>;
  eq?: InputMaybe<WorkspaceMemberNumberFormatEnum>;
  gt?: InputMaybe<WorkspaceMemberNumberFormatEnum>;
  gte?: InputMaybe<WorkspaceMemberNumberFormatEnum>;
  in?: InputMaybe<Array<InputMaybe<WorkspaceMemberNumberFormatEnum>>>;
  is?: InputMaybe<FilterIs>;
  isEmptyArray?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<WorkspaceMemberNumberFormatEnum>;
  lte?: InputMaybe<WorkspaceMemberNumberFormatEnum>;
  neq?: InputMaybe<WorkspaceMemberNumberFormatEnum>;
};

export type WorkspaceMemberOrderByInput = {
  avatarUrl?: InputMaybe<OrderByDirection>;
  calendarStartDay?: InputMaybe<OrderByDirection>;
  colorScheme?: InputMaybe<OrderByDirection>;
  createdAt?: InputMaybe<OrderByDirection>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  dateFormat?: InputMaybe<OrderByDirection>;
  deletedAt?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  jobTitle?: InputMaybe<OrderByDirection>;
  locale?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<FullNameOrderByInput>;
  numberFormat?: InputMaybe<OrderByDirection>;
  openRecordIn?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  timeFormat?: InputMaybe<OrderByDirection>;
  timeZone?: InputMaybe<OrderByDirection>;
  uiScale?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDirection>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
  userEmail?: InputMaybe<OrderByDirection>;
  userId?: InputMaybe<OrderByDirection>;
};

export type WorkspaceMemberOrderByWithGroupByAggregateInput = {
  avgCalendarStartDay?: InputMaybe<OrderByDirection>;
  countEmptyAvatarUrl?: InputMaybe<OrderByDirection>;
  countEmptyCalendarStartDay?: InputMaybe<OrderByDirection>;
  countEmptyColorScheme?: InputMaybe<OrderByDirection>;
  countEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countEmptyDateFormat?: InputMaybe<OrderByDirection>;
  countEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countEmptyId?: InputMaybe<OrderByDirection>;
  countEmptyJobTitle?: InputMaybe<OrderByDirection>;
  countEmptyLocale?: InputMaybe<OrderByDirection>;
  countEmptyName?: InputMaybe<OrderByDirection>;
  countEmptyNumberFormat?: InputMaybe<OrderByDirection>;
  countEmptyOpenRecordIn?: InputMaybe<OrderByDirection>;
  countEmptyPosition?: InputMaybe<OrderByDirection>;
  countEmptySearchVector?: InputMaybe<OrderByDirection>;
  countEmptyTimeFormat?: InputMaybe<OrderByDirection>;
  countEmptyTimeZone?: InputMaybe<OrderByDirection>;
  countEmptyUiScale?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countEmptyUserEmail?: InputMaybe<OrderByDirection>;
  countEmptyUserId?: InputMaybe<OrderByDirection>;
  countNotEmptyAvatarUrl?: InputMaybe<OrderByDirection>;
  countNotEmptyCalendarStartDay?: InputMaybe<OrderByDirection>;
  countNotEmptyColorScheme?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyDateFormat?: InputMaybe<OrderByDirection>;
  countNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyId?: InputMaybe<OrderByDirection>;
  countNotEmptyJobTitle?: InputMaybe<OrderByDirection>;
  countNotEmptyLocale?: InputMaybe<OrderByDirection>;
  countNotEmptyName?: InputMaybe<OrderByDirection>;
  countNotEmptyNumberFormat?: InputMaybe<OrderByDirection>;
  countNotEmptyOpenRecordIn?: InputMaybe<OrderByDirection>;
  countNotEmptyPosition?: InputMaybe<OrderByDirection>;
  countNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  countNotEmptyTimeFormat?: InputMaybe<OrderByDirection>;
  countNotEmptyTimeZone?: InputMaybe<OrderByDirection>;
  countNotEmptyUiScale?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  countNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  countNotEmptyUserEmail?: InputMaybe<OrderByDirection>;
  countNotEmptyUserId?: InputMaybe<OrderByDirection>;
  countUniqueValuesAvatarUrl?: InputMaybe<OrderByDirection>;
  countUniqueValuesCalendarStartDay?: InputMaybe<OrderByDirection>;
  countUniqueValuesColorScheme?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesCreatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesDateFormat?: InputMaybe<OrderByDirection>;
  countUniqueValuesDeletedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesId?: InputMaybe<OrderByDirection>;
  countUniqueValuesJobTitle?: InputMaybe<OrderByDirection>;
  countUniqueValuesLocale?: InputMaybe<OrderByDirection>;
  countUniqueValuesName?: InputMaybe<OrderByDirection>;
  countUniqueValuesNumberFormat?: InputMaybe<OrderByDirection>;
  countUniqueValuesOpenRecordIn?: InputMaybe<OrderByDirection>;
  countUniqueValuesPosition?: InputMaybe<OrderByDirection>;
  countUniqueValuesSearchVector?: InputMaybe<OrderByDirection>;
  countUniqueValuesTimeFormat?: InputMaybe<OrderByDirection>;
  countUniqueValuesTimeZone?: InputMaybe<OrderByDirection>;
  countUniqueValuesUiScale?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedAt?: InputMaybe<OrderByDirection>;
  countUniqueValuesUpdatedBy?: InputMaybe<OrderByDirection>;
  countUniqueValuesUserEmail?: InputMaybe<OrderByDirection>;
  countUniqueValuesUserId?: InputMaybe<OrderByDirection>;
  maxCalendarStartDay?: InputMaybe<OrderByDirection>;
  maxCreatedAt?: InputMaybe<OrderByDirection>;
  maxDeletedAt?: InputMaybe<OrderByDirection>;
  maxUpdatedAt?: InputMaybe<OrderByDirection>;
  minCalendarStartDay?: InputMaybe<OrderByDirection>;
  minCreatedAt?: InputMaybe<OrderByDirection>;
  minDeletedAt?: InputMaybe<OrderByDirection>;
  minUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyAvatarUrl?: InputMaybe<OrderByDirection>;
  percentageEmptyCalendarStartDay?: InputMaybe<OrderByDirection>;
  percentageEmptyColorScheme?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyDateFormat?: InputMaybe<OrderByDirection>;
  percentageEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyId?: InputMaybe<OrderByDirection>;
  percentageEmptyJobTitle?: InputMaybe<OrderByDirection>;
  percentageEmptyLocale?: InputMaybe<OrderByDirection>;
  percentageEmptyName?: InputMaybe<OrderByDirection>;
  percentageEmptyNumberFormat?: InputMaybe<OrderByDirection>;
  percentageEmptyOpenRecordIn?: InputMaybe<OrderByDirection>;
  percentageEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageEmptyTimeFormat?: InputMaybe<OrderByDirection>;
  percentageEmptyTimeZone?: InputMaybe<OrderByDirection>;
  percentageEmptyUiScale?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageEmptyUserEmail?: InputMaybe<OrderByDirection>;
  percentageEmptyUserId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyAvatarUrl?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCalendarStartDay?: InputMaybe<OrderByDirection>;
  percentageNotEmptyColorScheme?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyCreatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDateFormat?: InputMaybe<OrderByDirection>;
  percentageNotEmptyDeletedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyId?: InputMaybe<OrderByDirection>;
  percentageNotEmptyJobTitle?: InputMaybe<OrderByDirection>;
  percentageNotEmptyLocale?: InputMaybe<OrderByDirection>;
  percentageNotEmptyName?: InputMaybe<OrderByDirection>;
  percentageNotEmptyNumberFormat?: InputMaybe<OrderByDirection>;
  percentageNotEmptyOpenRecordIn?: InputMaybe<OrderByDirection>;
  percentageNotEmptyPosition?: InputMaybe<OrderByDirection>;
  percentageNotEmptySearchVector?: InputMaybe<OrderByDirection>;
  percentageNotEmptyTimeFormat?: InputMaybe<OrderByDirection>;
  percentageNotEmptyTimeZone?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUiScale?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedAt?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUpdatedBy?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUserEmail?: InputMaybe<OrderByDirection>;
  percentageNotEmptyUserId?: InputMaybe<OrderByDirection>;
  sumCalendarStartDay?: InputMaybe<OrderByDirection>;
  totalCount?: InputMaybe<OrderByDirection>;
};

export type WorkspaceMemberOrderByWithGroupByInput = {
  aggregate?: InputMaybe<WorkspaceMemberOrderByWithGroupByAggregateInput>;
  avatarUrl?: InputMaybe<OrderByDirection>;
  calendarStartDay?: InputMaybe<OrderByDirection>;
  colorScheme?: InputMaybe<OrderByDirection>;
  createdAt?: InputMaybe<OrderByDateGranularityInput>;
  createdBy?: InputMaybe<ActorOrderByInput>;
  dateFormat?: InputMaybe<OrderByDirection>;
  deletedAt?: InputMaybe<OrderByDateGranularityInput>;
  id?: InputMaybe<OrderByDirection>;
  jobTitle?: InputMaybe<OrderByDirection>;
  locale?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<FullNameOrderByInput>;
  numberFormat?: InputMaybe<OrderByDirection>;
  openRecordIn?: InputMaybe<OrderByDirection>;
  position?: InputMaybe<OrderByDirection>;
  searchVector?: InputMaybe<OrderByDirection>;
  timeFormat?: InputMaybe<OrderByDirection>;
  timeZone?: InputMaybe<OrderByDirection>;
  uiScale?: InputMaybe<OrderByDirection>;
  updatedAt?: InputMaybe<OrderByDateGranularityInput>;
  updatedBy?: InputMaybe<ActorOrderByInput>;
  userEmail?: InputMaybe<OrderByDirection>;
  userId?: InputMaybe<OrderByDirection>;
};

export type WorkspaceMemberRelationInput = {
  connect?: InputMaybe<WorkspaceMemberConnectInput>;
  create?: InputMaybe<WorkspaceMemberCreateInput>;
  disconnect?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum WorkspaceMemberTimeFormatEnum {
  HOUR_12 = 'HOUR_12',
  HOUR_24 = 'HOUR_24',
  SYSTEM = 'SYSTEM'
}

export type WorkspaceMemberTimeFormatEnumFilter = {
  containsAny?: InputMaybe<Array<InputMaybe<WorkspaceMemberTimeFormatEnum>>>;
  eq?: InputMaybe<WorkspaceMemberTimeFormatEnum>;
  gt?: InputMaybe<WorkspaceMemberTimeFormatEnum>;
  gte?: InputMaybe<WorkspaceMemberTimeFormatEnum>;
  in?: InputMaybe<Array<InputMaybe<WorkspaceMemberTimeFormatEnum>>>;
  is?: InputMaybe<FilterIs>;
  isEmptyArray?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<WorkspaceMemberTimeFormatEnum>;
  lte?: InputMaybe<WorkspaceMemberTimeFormatEnum>;
  neq?: InputMaybe<WorkspaceMemberTimeFormatEnum>;
};

export type WorkspaceMemberUpdateInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  calendarStartDay?: InputMaybe<Scalars['Float']['input']>;
  colorScheme?: InputMaybe<Scalars['String']['input']>;
  createdAt?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<ActorUpdateInput>;
  dateFormat?: InputMaybe<WorkspaceMemberDateFormatEnum>;
  deletedAt?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<FullNameUpdateInput>;
  numberFormat?: InputMaybe<WorkspaceMemberNumberFormatEnum>;
  openRecordIn?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Position']['input']>;
  searchVector?: InputMaybe<Scalars['TSVector']['input']>;
  timeFormat?: InputMaybe<WorkspaceMemberTimeFormatEnum>;
  timeZone?: InputMaybe<Scalars['String']['input']>;
  uiScale?: InputMaybe<Scalars['String']['input']>;
  updatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  updatedBy?: InputMaybe<ActorUpdateInput>;
  userEmail?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['UUID']['input']>;
};

export type WorkspaceMemberWhereUniqueInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
  userEmail?: InputMaybe<Scalars['String']['input']>;
};

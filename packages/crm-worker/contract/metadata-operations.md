# 前端调用的操作清单

由阶段 0 根据 `fixtures/index.json` 整理，覆盖 fixture 里出现的每一个操作名。"新增"表示该操作不在 CLOUDFLARE_MIGRATION.md 原先的阶段任务里，由阶段 0 分配。

未实现的 Query 按 7.3 返回零值，未实现的 Mutation 抛 `NOT_IMPLEMENTED`；表里写"返回空列表"等的操作，是前端在核心流程里一定会调用、必须给出明确返回值的。

## /metadata

| 操作 | 阶段 | 出现的流程 | 说明 |
|---|---|---|---|
| `ActivateWorkspace` | 3 | auth-signup-onboarding |  |
| `AddQueryToEventStream` | 4 / 11 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles | 阶段 4 返回 true，阶段 11 实现注册 |
| `CheckUserExists` | 3 | auth-signup-onboarding, auth-signout-signin, auth-api, members-roles, removed-member-api |  |
| `CompleteFileUpload` | 9 | files | FILES 字段和附件 |
| `CompleteWorkspaceLogoUpload` | 9 | files | workspace logo |
| `CompleteWorkspaceMemberProfilePictureUpload` | 9 | files | 头像 |
| `CreateFileUpload` | 9 | files |  |
| `CreateManyNavigationMenuItems` | 8 | views | 收藏 |
| `CreateManyViewFields` | 8 | views |  |
| `CreateOneFieldMetadataItem` | 8 | data-model, data-model-api, permissions-api |  |
| `CreateOneObjectMetadataItem` | 8 | data-model, data-model-api |  |
| `CreateOneRole` | 10 | members-roles |  |
| `CreateView` | 8 | views |  |
| `CreateViewFilter` | 8 | views |  |
| `CreateViewSort` | 8 | views |  |
| `CurrentUserSessions` | 3 | auth-signout-signin, files, members-roles | 新增。个人资料页列出当前用户的 session |
| `DeleteManyNavigationMenuItems` | 8 | views | 取消收藏 |
| `DeleteOneFieldMetadataItem` | 8 | data-model, cleanup-api |  |
| `DeleteUserWorkspace` | 10 | members-roles | 移除成员。旧系统在用户没有其他 workspace 时连 user 一起删除 |
| `FindAllRecordFormPageLayouts` | 4 | auth-signup-onboarding, data-model, views, files, members-roles |  |
| `FindAllRecordPageLayouts` | 4 | auth-signup-onboarding, data-model, views, files, members-roles |  |
| `FindAllViews` | 4 | auth-signup-onboarding, data-model, views, files, members-roles |  |
| `FindFieldsWidgetViews` | 4 | auth-signup-onboarding, data-model, views, files, members-roles |  |
| `FindManyApplications` | 4 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles | 每次启动调用，按种子返回 Standard 和 Custom 两条应用（见 fixture） |
| `FindManyCommandMenuItems` | 4 | auth-signup-onboarding, data-model |  |
| `FindManyFrontComponents` | 4 | auth-signup-onboarding, data-model | 返回空列表 |
| `FindManyLogicFunctions` | 4 | auth-signup-onboarding, data-model | 返回空列表 |
| `FindManyNavigationMenuItems` | 4 | auth-signup-onboarding, data-model, custom-object-records, views |  |
| `FindManyTimelineActivityTypes` | 4 | record-detail, record-lifecycle, notes-tasks, custom-object-records, views, files | 新增。时间线渲染需要，数据来自 standard-metadata.json 的 timelineActivityType |
| `FindManyValidationRules` | 4 | record-lifecycle, custom-object-records | 新增。范围外（Organization 功能），返回空列表 |
| `FindManyViews` | 4 | data-model | 新增。设置里对象详情页按 objectMetadataId 读视图 |
| `FindMinimalMetadata` | 4 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles |  |
| `FindTableWidgetViews` | 4 | auth-signup-onboarding, data-model, views, files, members-roles |  |
| `FindValidationRulesReadingField` | 4 | data-model | 新增。同上，返回空列表 |
| `GetAgentChatChannels` | 4 | members-roles | 新增。AI 范围外，返回空列表 |
| `GetAgentChatChannelSummaries` | 4 | members-roles | 新增。AI 范围外，返回空列表 |
| `GetApprovedAccessDomains` | 10 | members-roles | 新增。范围外，返回空列表 |
| `getAuthTokensFromLoginToken` | 3 | auth-signup-onboarding, auth-signout-signin, auth-api, record-field-types-api, data-model-api, custom-object-records-api, members-roles, permissions-api, cleanup-api | 操作名首字母小写，前端原样如此 |
| `GetCurrentUser` | 3 / 4 | auth-signup-onboarding, auth-signout-signin, auth-api, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles, permissions-api | 阶段 3 返回引导所需字段，阶段 4 补全 |
| `GetInviteSuggestions` | 3 | auth-signup-onboarding, members-roles | 新增。引导的邀请步骤和成员页调用，返回空列表 |
| `GetLoginTokenFromCredentials` | 3 | auth-signout-signin, auth-api, record-field-types-api, data-model-api, custom-object-records-api, members-roles, permissions-api, removed-member-api, cleanup-api |  |
| `GetPublicWorkspaceDataByDomain` | 3 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles |  |
| `GetRecordPermissions` | 4 / 10 | auth-signup-onboarding, auth-signout-signin, data-model, members-roles | 新增。阶段 4 用占位权限，阶段 10 真实计算 |
| `GetRoles` | 10 | members-roles |  |
| `GetWorkspaceCreationDefaults` | 3 | auth-signup-onboarding | 新增。创建 workspace 页面的默认名称，返回空字符串即可 |
| `GetWorkspaceFromInviteHash` | 10 | members-roles | 邀请链接落地页 |
| `GetWorkspaceInvitations` | 10 | members-roles | 邮件邀请列表，v1 返回空列表 |
| `MostlyEmptyFieldMetadataIds` | 8 | data-model | 新增。数据模型页提示"大部分为空"的字段，可先返回空列表 |
| `MyCalendarChannels` | 4 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles | 新增。范围外，返回空列表 |
| `MyConnectedAccounts` | 4 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles | 新增。范围外，返回空列表 |
| `MyMessageChannels` | 4 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles | 新增。范围外，返回空列表 |
| `ObjectMetadataItems` | 4 | auth-signup-onboarding, data-model, views, files, members-roles |  |
| `ObjectRecordCounts` | 8 | data-model | 新增。数据模型页的记录数，按对象 count |
| `OnEventSubscription` | 4 / 11 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles | graphql-sse 订阅，阶段 4 只发心跳。fixture 只有请求，SSE 流体未采集 |
| `RemoveQueryFromEventStream` | 4 / 11 | records-list, record-detail, record-lifecycle, notes-tasks, views, files | 同上 |
| `SendInvitations` | 3 | auth-signup-onboarding | 新增。引导"跳过"时以空 emails 调用，返回 success。真正发邮件在 12a |
| `SignOut` | 3 | auth-signout-signin, auth-api, members-roles |  |
| `SignUp` | 3 | auth-signup-onboarding, auth-api |  |
| `SignUpInNewWorkspace` | 3 | auth-signup-onboarding |  |
| `SignUpInWorkspace` | 3 | members-roles | 邀请链接注册，阶段 10 的验收也依赖它 |
| `SkipSyncEmailOnboardingStep` | 3 | auth-signup-onboarding, members-roles | 新增。引导流程跳过邮件同步，返回成功并推进引导状态 |
| `TrackAnalytics` | 4 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles | 新增。几乎每个页面都调用，直接返回成功，不记录 |
| `twoFactorAuthenticationRecoveryStatus` | 10 | members-roles | 新增。成员详情页调用，2FA 范围外，返回全 false/空 |
| `UpdateOneFieldMetadataItem` | 8 | data-model, cleanup-api | 改名、改选项、停用 |
| `UpdateOneObjectMetadataItem` | 8 | data-model | 改名、停用、启用 |
| `UpdateViewField` | 8 | views |  |
| `UpdateWorkspace` | 10 | files | 设置页修改 workspace（fixture 里上传 logo 后以 displayName 调用） |
| `UpdateWorkspaceMemberRole` | 10 | members-roles |  |
| `UpdateWorkspaceMemberSettings` | 3 | auth-signup-onboarding, auth-api, data-model, files, members-roles | 引导填写个人资料、切换语言；阶段 10 的个人资料修改复用 |
| `UpsertFieldPermissions` | 10 | members-roles |  |

## /graphql

记录 API 的操作名由前端按对象名拼出（`FindManyPeople`、`UpdateOneCompany`、`OpportunitiesGroupByAggregates` 等），不在生成的类型文件里。读操作归阶段 5，写操作归阶段 6，`Search` 归阶段 7。

| 操作 | 阶段 | 出现的流程 | 说明 |
|---|---|---|---|
| `AggregateCompanies` | 5 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, views, members-roles |  |
| `AggregateInitiatives` | 5 | custom-object-records, views |  |
| `AggregateNotes` | 5 | notes-tasks |  |
| `AggregateOpportunities` | 5 | records-list, record-detail, record-lifecycle, notes-tasks, views, files |  |
| `AggregatePeople` | 5 | records-list, record-detail, record-lifecycle, notes-tasks, search, views, files |  |
| `CombinedFindManyRecords` | 5 | record-detail, notes-tasks, views, files |  |
| `CreateNoteTargets` | 6 | notes-tasks |  |
| `CreateOneAttachment` | 6 | files |  |
| `CreateOneInitiative` | 6 | custom-object-records |  |
| `CreateOneNote` | 6 | notes-tasks |  |
| `CreateOnePerson` | 6 | record-lifecycle |  |
| `CreateOneTask` | 6 | notes-tasks |  |
| `CreatePeople` | 6 | records-bulk-create-api, records-list |  |
| `CreateTaskTargets` | 6 | notes-tasks |  |
| `DeleteManyPeople` | 6 | record-lifecycle, permissions-api |  |
| `DestroyManyPeople` | 6 | record-lifecycle |  |
| `FilterPeopleByJobTitle` | 10 | permissions-api | 权限场景脚本手写的查询，不是前端发出的 |
| `FindManyAgentChatThreads` | — | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles | AI 范围外。前端只有在有 AI 权限标志且元数据里有 agentChatThread 对象时才发，裁剪后不会出现 |
| `FindManyAttachments` | 5 | notes-tasks, files |  |
| `FindManyCompanies` | 5 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, notes-tasks, data-model, views, files, members-roles |  |
| `FindManyInitiatives` | 5 | data-model, custom-object-records, views, files |  |
| `FindManyNotes` | 5 | notes-tasks |  |
| `FindManyNoteTargets` | 5 | notes-tasks |  |
| `FindManyOpportunities` | 5 | record-detail |  |
| `FindManyPeople` | 5 | records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files |  |
| `FindManyProjects` | 5 | data-model |  |
| `FindManyTaskTargets` | 5 | notes-tasks |  |
| `FindManyTimelineActivities` | 5 | record-detail, record-lifecycle, notes-tasks, custom-object-records, views, files |  |
| `FindManyWorkspaceMembers` | 5 | record-detail, notes-tasks, views, files, members-roles |  |
| `FindOneCompany` | 5 | record-detail, record-lifecycle, notes-tasks, search, views, files |  |
| `FindOneInitiative` | 5 | custom-object-records, custom-object-records-api, files |  |
| `FindOneNote` | 5 | notes-tasks, search |  |
| `FindOneOpportunity` | 5 | record-detail, notes-tasks, views, files |  |
| `FindOnePerson` | 5 | record-detail, record-lifecycle, notes-tasks, search, views, files |  |
| `FindOneTask` | 5 | notes-tasks |  |
| `FindOneWorkspaceMember` | 5 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, custom-object-records, views, files, members-roles |  |
| `FindPeopleWithJobTitle` | 10 | permissions-api | 同上 |
| `FindPeopleWithoutJobTitle` | 10 | permissions-api | 同上 |
| `InitiativesGroupByRecords` | 5 | views |  |
| `MergePeople` | 6 | record-lifecycle |  |
| `OpportunitiesGroupByAggregates` | 5 | records-list, record-detail |  |
| `OpportunitiesGroupByRecords` | 5 | records-list, record-detail |  |
| `RestoreManyPeople` | 6 | record-lifecycle |  |
| `Search` | 7 | record-detail, record-lifecycle, notes-tasks, search |  |
| `SortPeopleByJobTitle` | 10 | permissions-api | 同上 |
| `UpdateOneCompany` | 6 | record-detail, record-field-types-api |  |
| `UpdateOneInitiative` | 6 | custom-object-records, custom-object-records-api, files |  |
| `UpdateOneNote` | 6 | notes-tasks |  |
| `UpdateOneOpportunity` | 6 | records-list, record-detail, record-field-types-api, custom-object-records-api |  |
| `UpdateOnePerson` | 6 | record-detail, record-field-types-api, permissions-api |  |
| `UpdateOneTask` | 6 | notes-tasks |  |

## 非 GraphQL 端点

| 请求 | 阶段 | 出现的流程 | 说明 |
|---|---|---|---|
| `GET /client-config` | 1 | auth-signup-onboarding, auth-signout-signin, records-list, record-detail, record-lifecycle, notes-tasks, search, data-model, custom-object-records, views, files, members-roles |  |
| `PUT /file-upload` | 9 | files | 成功返回 204 |
| `GET /file/core-picture` | 9 | files, file-access-api, members-roles | 头像和 logo，token 不检查过期 |
| `GET /file/files-field` | 9 | files, file-access-api | 附件和 FILES 字段，支持 Range（206 + content-range） |

// Standard objects every custom object is linked to on creation, with the
// labels and icons the old server used (standard-relation-field-properties
// and compute-system-morph-target-field-label). agentChatThreadTarget is out
// of scope. A null reverseLabel means "the custom object's capitalized name".
export const CUSTOM_OBJECT_RELATION_TARGETS = [
  {
    objectNameSingular: 'timelineActivity',
    forwardLabel: 'Timeline Activities',
    forwardIcon: 'IconTimelineEvent',
    reverseLabel: null,
    reverseIcon: 'IconTimelineEvent',
  },
  {
    objectNameSingular: 'attachment',
    forwardLabel: 'Attachments',
    forwardIcon: 'IconPaperclip',
    reverseLabel: 'Attached to',
    reverseIcon: 'IconFileImport',
  },
  {
    objectNameSingular: 'noteTarget',
    forwardLabel: 'Notes',
    forwardIcon: 'IconNotes',
    reverseLabel: 'Linked to',
    reverseIcon: 'IconCheckbox',
  },
  {
    objectNameSingular: 'taskTarget',
    forwardLabel: 'Tasks',
    forwardIcon: 'IconCheckbox',
    reverseLabel: 'Linked to',
    reverseIcon: 'IconCheckbox',
  },
] as const;

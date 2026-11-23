import {
  getArgumentValues,
  getNamedType,
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
  getDirectiveValues,
  isObjectType,
  Kind,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type SelectionSetNode,
} from 'graphql';

import { type RecordSelection } from '@/workspace/record-api/types/record-query.type';

export const mergeRecordSelections = (
  left: RecordSelection,
  right: RecordSelection,
): RecordSelection => {
  const result = new Map(left);
  for (const [key, field] of right) {
    const existing = result.get(key);
    result.set(
      key,
      existing
        ? {
            ...field,
            selection: mergeRecordSelections(
              existing.selection,
              field.selection,
            ),
          }
        : field,
    );
  }
  return result;
};

export const parseRecordSelection = (
  info: GraphQLResolveInfo,
): RecordSelection => {
  const collect = (
    sets: (SelectionSetNode | undefined)[],
    type: GraphQLObjectType,
  ): RecordSelection => {
    const fields: RecordSelection = new Map();
    const visit = (set: SelectionSetNode | undefined) => {
      for (const selection of set?.selections ?? []) {
        if (
          getDirectiveValues(
            GraphQLSkipDirective,
            selection,
            info.variableValues,
          )?.if === true ||
          getDirectiveValues(
            GraphQLIncludeDirective,
            selection,
            info.variableValues,
          )?.if === false
        )
          continue;
        if (selection.kind === Kind.FRAGMENT_SPREAD) {
          visit(info.fragments[selection.name.value]?.selectionSet);
          continue;
        }
        if (selection.kind === Kind.INLINE_FRAGMENT) {
          visit(selection.selectionSet);
          continue;
        }
        const name = selection.name.value;
        const key = selection.alias?.value ?? name;
        const definition = type.getFields()[name];
        if (!definition) continue;
        const target = getNamedType(definition.type);
        const children = isObjectType(target)
          ? collect([selection.selectionSet], target)
          : new Map();
        const existing = fields.get(key);
        fields.set(key, {
          name,
          arguments: getArgumentValues(
            definition,
            selection,
            info.variableValues,
          ),
          selection: mergeRecordSelections(
            existing?.selection ?? new Map(),
            children,
          ),
        });
      }
    };
    sets.forEach(visit);
    return fields;
  };
  const type = getNamedType(info.returnType);
  return isObjectType(type)
    ? collect(
        info.fieldNodes.map((node) => node.selectionSet),
        type,
      )
    : new Map();
};

import { type ChildNode, type Plugin } from 'postcss';

import { isDefined } from '../src/utilities/utils/isDefined';
import { CRM_UI_CASCADE_LAYER_NAME } from './crmUiCascadeLayerName';

const TOP_LEVEL_AT_RULE_NAMES = ['charset', 'import', 'namespace'];

const GLOBAL_SELECTOR_PREFIX = ':global(';

const isTopLevelAtRule = (node: ChildNode) =>
  node.type === 'atrule' && TOP_LEVEL_AT_RULE_NAMES.includes(node.name);

const isGlobalRule = (node: ChildNode) =>
  node.type === 'rule' && node.selector.includes(GLOBAL_SELECTOR_PREFIX);

const isCrmUiStylesheet = ({
  filePath,
  sourceDirectory,
}: {
  filePath: string;
  sourceDirectory: string;
}) => {
  const filePathWithoutQuery = filePath.replace(/\?.*$/, '');

  return (
    filePathWithoutQuery.startsWith(`${sourceDirectory}/`) &&
    filePathWithoutQuery.endsWith('.scss') &&
    !filePathWithoutQuery.includes('/__stories__/')
  );
};

export const wrapInCrmUiCascadeLayer = ({
  sourceDirectory,
}: {
  sourceDirectory: string;
}): Plugin => ({
  postcssPlugin: 'wrap-in-crm-ui-cascade-layer',
  Once(root, { AtRule }) {
    const filePath = root.source?.input.file;

    if (
      !isDefined(filePath) ||
      !isCrmUiStylesheet({ filePath, sourceDirectory })
    ) {
      return;
    }

    root.walkRules((rule) => {
      if (
        rule.parent !== root &&
        rule.selector.includes(GLOBAL_SELECTOR_PREFIX)
      ) {
        throw rule.error(
          `Keep :global(...) rules at the top level so they stay outside the ${CRM_UI_CASCADE_LAYER_NAME} cascade layer`,
        );
      }
    });

    const layer = new AtRule({
      name: 'layer',
      params: CRM_UI_CASCADE_LAYER_NAME,
    });

    const layeredNodes = root.nodes.filter(
      (node) => !isTopLevelAtRule(node) && !isGlobalRule(node),
    );

    for (const node of layeredNodes) {
      layer.append(node);
    }

    root.append(layer);
  },
});

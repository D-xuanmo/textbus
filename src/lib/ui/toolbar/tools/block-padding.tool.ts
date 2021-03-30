import { Form, FormTextField } from '../../uikit/forms/_api';
import { FormatMatcher } from '../matcher/format.matcher';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';
import { blockPaddingFormatter } from '../../../formatter/padding.formatter';
import { BlockPaddingCommander } from '../commands/_api';

export const blockPaddingToolConfig: DropdownToolConfig = {
  label: i18n => i18n.get('plugins.toolbar.blockPaddingTool.label'),
  tooltip: i18n => i18n.get('plugins.toolbar.blockPaddingTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.blockPaddingTool.view')
    return new Form({
      mini: true,
      editProperty: 'styles',
      items: [
        new FormTextField({
          label: childI18n.get('topLabel'),
          name: 'paddingTop',
          placeholder: childI18n.get('topPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('rightLabel'),
          name: 'paddingRight',
          placeholder: childI18n.get('rightPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('bottomLabel'),
          name: 'paddingBottom',
          placeholder: childI18n.get('bottomPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('leftLabel'),
          name: 'paddingLeft',
          placeholder: childI18n.get('leftPlaceholder')
        }),
      ]
    });
  },
  matcher: new FormatMatcher(blockPaddingFormatter, [PreComponent]),
  commanderFactory() {
    return new BlockPaddingCommander(blockPaddingFormatter)
  }
};
export const blockPaddingTool = new DropdownTool(blockPaddingToolConfig);

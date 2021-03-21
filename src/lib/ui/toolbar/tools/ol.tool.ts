import { ListMatcher } from '../matcher/list.matcher';
import { ListCommander } from '../commands/list.commander';
import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const olToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-list-numbered'],
  tooltip: '有序列表',
  keymap: {
    shiftKey: true,
    ctrlKey: true,
    key: 'o'
  },
  matcher: new ListMatcher('ol', [PreComponent]),
  commanderFactory() {
    return new ListCommander('ol');
  }
};
export const olTool = Toolkit.makeButtonTool(olToolConfig);

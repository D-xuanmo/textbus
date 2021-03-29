import { backgroundColorFormatter } from '../../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { Palette } from './utils/palette';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const textBackgroundToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-background-color'],
  tooltip: '文字背景颜色',
  viewFactory() {
    return new Palette('backgroundColor')
  },
  matcher: new FormatMatcher(backgroundColorFormatter, [PreComponent]),
  commanderFactory() {
    return new StyleCommander('backgroundColor', backgroundColorFormatter);
  }
};
export const textBackgroundTool = new DropdownTool(textBackgroundToolConfig);

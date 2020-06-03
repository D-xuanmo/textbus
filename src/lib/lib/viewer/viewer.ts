import { fromEvent, merge, Observable, Subject } from 'rxjs';

import {
  Contents,
  EventType,
  Fragment, MediaTemplate,
  Parser,
  Renderer,
  TBRangePosition,
  TBSelection,
  VElement
} from '../core/_api';
import { template } from './template-html';
import { BlockTemplate, SingleTemplate } from '../templates/_api';
import { Input, Keymap, KeymapAction } from './input';
import { Editor } from '../editor';
import { CursorMoveDirection } from './tools';
import { TBRange } from '../core/range';

export class Viewer {
  onSelectionChange: Observable<TBSelection>;
  onReady: Observable<Document>;
  onCanEditable: Observable<void>;
  onUserWrite: Observable<void>;

  elementRef = document.createElement('div');
  contentWindow: Window;
  contentDocument: Document;
  private frame = document.createElement('iframe');
  private input: Input;
  private nativeSelection: Selection;
  private rootFragment: Fragment;

  private readyEvent = new Subject<Document>();
  private selectionChangeEvent = new Subject<TBSelection>();
  private canEditableEvent = new Subject<void>();
  private userWriteEvent = new Subject<void>();

  private selection: TBSelection;

  private selectionSnapshot: TBSelection;
  private fragmentSnapshot: Fragment;

  private oldCursorPosition: { left: number, top: number } = null;
  private cleanOldCursorTimer: any;

  constructor(private renderer: Renderer,
              private context: Editor,
              private parser: Parser) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();
    this.onCanEditable = this.canEditableEvent.asObservable();
    this.onUserWrite = this.userWriteEvent.asObservable();

    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;
      this.input = new Input(doc);
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.input.elementRef);

      (this.context.options.styleSheets || []).forEach(s => {
        const style = doc.createElement('style');
        style.innerHTML = s;
        doc.head.appendChild(style);
      });

      (context.options.hooks || []).forEach(hooks => {
        if (typeof hooks.setup === 'function') {
          hooks.setup(doc);
        }
      })

      this.listenEvents();
    };

    this.frame.setAttribute('scrolling', 'no');
    this.frame.src = `javascript:void((function () {
                      document.open();
                      document.write('${template}');
                      document.close();
                    })())`;


    this.elementRef.classList.add('tbus-wrap');
    this.frame.classList.add('tbus-frame');

    this.elementRef.appendChild(this.frame);
  }

  listenEvents() {
    merge(...['selectstart', 'mousedown'].map(type => fromEvent(this.contentDocument, type)))
      .subscribe(() => {
        this.nativeSelection = this.contentDocument.getSelection();
        this.nativeSelection.removeAllRanges();
        this.canEditableEvent.next();
      });
    fromEvent(this.contentDocument, 'selectionchange').subscribe(() => {
      this.selection = new TBSelection(this.contentDocument, this.renderer);
      this.input.updateStateBySelection(this.nativeSelection);
      this.selectionChangeEvent.next(this.selection);
    })
    this.input.events.onFocus.subscribe(() => {
      this.recordSnapshotFromEditingBefore();
    })
    this.input.events.onInput.subscribe(() => {
      const selection = this.selection;
      const collapsed = selection.collapsed;
      let isNext = true;
      (this.context.options.hooks || []).forEach(lifecycle => {
        if (typeof lifecycle.onInput === 'function') {
          if (lifecycle.onInput(this.renderer, selection) === false) {
            isNext = false;
          } else {
            if (!selection.collapsed) {
              throw new Error('输入前选区必须闭合！');
            }
          }
        }
      })
      if (isNext) {
        if (!collapsed) {
          this.recordSnapshotFromEditingBefore(true);
        }
        this.write(selection);
      }
      this.render(this.rootFragment);
      selection.restore();
      this.input.updateStateBySelection(this.nativeSelection);
    })
    this.input.events.onPaste.subscribe(() => {
      const div = document.createElement('div');
      div.style.cssText = 'width:10px; height:10px; overflow: hidden; position: fixed; left: -9999px';
      div.contentEditable = 'true';
      document.body.appendChild(div);
      div.focus();
      setTimeout(() => {
        const fragment = this.parser.parse(div);
        const contents = new Contents();
        fragment.sliceContents(0).forEach(i => contents.append(i));
        document.body.removeChild(div);
        let isNext = true;
        (this.context.options.hooks || []).forEach(lifecycle => {
          if (typeof lifecycle.onPaste === 'function') {
            if (lifecycle.onPaste(contents, this.renderer, this.selection) === false) {
              isNext = false;
            }
          }
        })
        if (isNext) {
          this.paste(contents);
        }
      });
    });
    this.dispatchEvent({
      key: 'Enter'
    }, EventType.onEnter);
    this.dispatchEvent({
      key: 'Backspace'
    }, EventType.onDelete);
    this.input.keymap({
      keymap: {
        key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
      },
      action: (ev: KeyboardEvent) => {
        const map: { [key: string]: CursorMoveDirection } = {
          ArrowLeft: CursorMoveDirection.Left,
          ArrowRight: CursorMoveDirection.Right,
          ArrowUp: CursorMoveDirection.Up,
          ArrowDown: CursorMoveDirection.Down
        };
        this.moveCursor(map[ev.key]);
      }
    });
    this.input.keymap({
      keymap: {
        key: 'a',
        ctrlKey: true
      },
      action: () => {
        this.selectAll();
      }
    });
  }

  dispatchEvent(keymap: Keymap, eventType: EventType) {
    this.input.events.addKeymap({
      keymap,
      action: () => {
        const focusNode = this.nativeSelection.focusNode;
        let el = focusNode.nodeType === 3 ? focusNode.parentNode : focusNode;
        const vElement = this.renderer.getVDomByNativeNode(el) as VElement;
        if (!vElement) {
          return;
        }
        const selection = this.selection;
        let isNext = true;
        (this.context.options.hooks || []).forEach(lifecycle => {
          if (eventType === EventType.onEnter && typeof lifecycle.onEnter === 'function') {
            if (lifecycle.onEnter(this.renderer, selection) === false) {
              isNext = false;
            }
          } else if (eventType === EventType.onDelete && typeof lifecycle.onDelete === 'function') {
            if (lifecycle.onDelete(this.renderer, selection) === false) {
              isNext = false;
            }
          }
        })
        if (isNext) {
          this.renderer.dispatchEvent(vElement, eventType, selection);
        }
        if (eventType === EventType.onDelete) {
          if (this.rootFragment.contentLength === 0) {
            const p = new BlockTemplate('p');
            const fragment = new Fragment();
            fragment.append(new SingleTemplate('br'));
            p.childSlots.push(fragment);
            this.rootFragment.append(p);
            selection.firstRange.setStart(fragment, 0);
            selection.firstRange.collapse();
          }
        }
        this.render(this.rootFragment);
        selection.restore();
        this.input.updateStateBySelection(this.nativeSelection);
        this.recordSnapshotFromEditingBefore();
        this.userWriteEvent.next();
      }
    })
  }

  registerKeymap(action: KeymapAction) {
    this.input.keymap(action);
  }

  render(rootFragment: Fragment) {
    this.rootFragment = rootFragment;
    const last = rootFragment.sliceContents(rootFragment.contentLength - 1)[0];
    if (!(last instanceof BlockTemplate) || last.tagName !== 'p') {
      const p = new BlockTemplate('p');
      const fragment = new Fragment();
      fragment.append(new SingleTemplate('br'));
      p.childSlots.push(fragment);
      rootFragment.append(p);
    }
    this.renderer.render(rootFragment, this.contentDocument.body).events.subscribe(event => {
      if (event.type === EventType.onDelete) {
        this.selection.ranges.forEach(range => {
          if (!range.collapsed) {
            range.connect();
            return;
          }
          if (range.startIndex > 0) {
            range.commonAncestorFragment.delete(range.startIndex - 1, 1);
            range.startIndex = range.endIndex = range.startIndex - 1;
            if (range.commonAncestorFragment.contentLength === 0) {
              range.commonAncestorFragment.append(new SingleTemplate('br'));
            }
          } else {
            const firstContent = range.startFragment.getContentAtIndex(0);
            if (firstContent instanceof MediaTemplate && firstContent.tagName === 'br') {
              range.startFragment.delete(0, 1);
              if (range.startFragment.contentLength === 0) {
                let position = range.getPreviousPosition();
                if (position.fragment === range.startFragment && position.index === range.startIndex) {
                  position = range.getNextPosition();
                }
                range.deleteEmptyTree(range.startFragment);
                range.setStart(position.fragment, position.index);
                range.collapse();
              }
            } else {
              const prevPosition = range.getPreviousPosition();
              if (prevPosition.fragment !== range.startFragment) {
                range.setStart(prevPosition.fragment, prevPosition.index);
                const last = prevPosition.fragment.getContentAtIndex(prevPosition.index - 1);
                if (last instanceof MediaTemplate && last.tagName === 'br') {
                  range.startIndex--;
                }
                range.connect();
              }
            }
          }
        });
      }
    });

    this.updateFrameHeight();
  }

  /**
   * 记录编辑前的快照
   */
  recordSnapshotFromEditingBefore(keepInputStatus = false) {
    if (!keepInputStatus) {
      this.input.cleanValue();
    }
    this.selectionSnapshot = this.selection.clone();
    this.fragmentSnapshot = this.selectionSnapshot.commonAncestorFragment.clone();
  }

  write(selection: TBSelection) {
    const startIndex = this.selectionSnapshot.firstRange.startIndex;
    const commonAncestorFragment = selection.commonAncestorFragment;
    const fragmentSnapshot = this.fragmentSnapshot.clone();

    commonAncestorFragment.delete(0);
    fragmentSnapshot.sliceContents(0).forEach(item => commonAncestorFragment.append(item));
    fragmentSnapshot.getFormatRanges().forEach(f => commonAncestorFragment.mergeFormat(f));

    let index = 0;
    this.input.input.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new SingleTemplate('br');
          commonAncestorFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        commonAncestorFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    selection.firstRange.startIndex = selection.firstRange.endIndex = startIndex + this.input.input.selectionStart;
    const last = commonAncestorFragment.getContentAtIndex(commonAncestorFragment.contentLength - 1);
    if (startIndex + this.input.input.selectionStart === commonAncestorFragment.contentLength &&
      last instanceof SingleTemplate && last.tagName === 'br') {
      commonAncestorFragment.append(new SingleTemplate('br'));
    }
    this.userWriteEvent.next();
  }

  paste(contents: Contents) {
    const firstRange = this.selection.firstRange;
    const fragment = firstRange.startFragment;
    let i = 0
    contents.slice(0).forEach(item => {
      fragment.insert(item, firstRange.startIndex + i);
      i += item.length;
    });
    // firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + contents.length;
    this.render(this.rootFragment);
    this.updateFrameHeight();
    // this.selection.restore();
  }

  private selectAll() {
    const selection = this.selection;
    const firstRange = selection.firstRange;
    const firstPosition = firstRange.findFirstPosition(this.rootFragment);
    const lastPosition = firstRange.findLastChild(this.rootFragment);
    selection.removeAllRanges();

    firstRange.setStart(firstPosition.fragment, firstPosition.index);
    firstRange.setEnd(lastPosition.fragment, lastPosition.index);

    selection.addRange(firstRange);
    selection.restore();
  }

  private moveCursor(direction: CursorMoveDirection) {
    const selection = this.selection;
    selection.ranges.forEach(range => {
      let p: TBRangePosition;
      let range2: TBRange;
      switch (direction) {
        case CursorMoveDirection.Left:
          p = range.getPreviousPosition();
          break;
        case CursorMoveDirection.Right:
          p = range.getNextPosition();
          break;
        case CursorMoveDirection.Up:
          clearTimeout(this.cleanOldCursorTimer);
          range2 = range.clone().restore();

          if (this.oldCursorPosition) {
            p = range2.getPreviousLinePosition(this.oldCursorPosition.left, this.oldCursorPosition.top);
          } else {
            const rect = range2.getRangePosition();
            this.oldCursorPosition = rect;
            p = range.getPreviousLinePosition(rect.left, rect.top);
          }
          this.cleanOldCursorTimer = setTimeout(() => {
            this.oldCursorPosition = null;
          }, 3000);
          break;
        case CursorMoveDirection.Down:
          clearTimeout(this.cleanOldCursorTimer);
          range2 = range.clone().restore();

          if (this.oldCursorPosition) {
            p = range2.getNextLinePosition(this.oldCursorPosition.left, this.oldCursorPosition.top);
          } else {
            const rect = range2.getRangePosition();
            this.oldCursorPosition = rect;
            p = range.getNextLinePosition(rect.left, rect.top);
          }
          this.cleanOldCursorTimer = setTimeout(() => {
            this.oldCursorPosition = null;
          }, 3000);
          break;
      }
      range.startFragment = range.endFragment = p.fragment;
      range.startIndex = range.endIndex = p.index;
    });
    selection.restore();
    this.recordSnapshotFromEditingBefore();
  }

  private updateFrameHeight() {
    const childBody = this.contentDocument.body;
    const lastChild = childBody.lastChild;
    let height = 0;
    if (lastChild) {
      if (lastChild.nodeType === 1) {
        height = (lastChild as HTMLElement).getBoundingClientRect().bottom;
      } else {
        const div = this.contentDocument.createElement('div');
        childBody.appendChild(div);
        height = div.getBoundingClientRect().bottom;
        childBody.removeChild(div);
      }
    }
    this.frame.style.height = height + 30 + 'px';
  }
}

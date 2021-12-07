import { Injector } from '@tanbo/di'
import {
  ComponentInstance,
  ContentType,
  defineComponent,
  Slot,
  SlotLiteral,
  SlotRender,
  Translator,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'

export interface WordExplainData {
  title: Slot
  subtitle: Slot
  detail: Slot
}

export interface WordExplainLiteral {
  title: SlotLiteral
  subtitle: SlotLiteral
  detail: SlotLiteral
}

export const wordExplainComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'WordExplainComponent',
  transform(translator: Translator, state: WordExplainLiteral): WordExplainData {
    return {
      title: translator.createSlot(state.title),
      subtitle: translator.createSlot(state.subtitle),
      detail: translator.createSlot(state.detail)
    }

  },
  setup(initState: WordExplainData) {
    const slots = useSlots([initState.title, initState.subtitle, initState.detail], state => {
      return new Slot(state.schema)
    })
    return {
      toJSON() {
        return {
          title: slots.get(0)!.toJSON(),
          subtitle: slots.get(1)!.toJSON(),
          detail: slots.get(2)!.toJSON()
        }
      },
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return (
          <tb-word-explain>
            <div class="tb-word-explain-title-group" style={{width: '140px'}}>
              {slotRender(slots.get(0)!, () => {
                return <div class="tb-word-explain-title"/>
              })}
              {slotRender(slots.get(1)!, () => {
                return <div class="tb-word-explain-subtitle"/>
              })}
            </div>
            {slotRender(slots.get(2)!, () => {
              return <div class="tb-word-explain-detail"/>
            })}
            {
              !isOutputMode && <span class="tb-word-explain-close" onClick={() => {
                // const parentFragment = this.parentFragment
                // const index = parentFragment.indexOf(this)
                // parentFragment.remove(index, index + 1)
              }
              }/>
            }
          </tb-word-explain>
        )
      }
    }
  }
})

export const wordExplainComponentLoader: ComponentLoader = {
  component: wordExplainComponent,
  metadata: {
    styles: [
      `
tb-word-explain {
  display: flex;
  margin-top: 1em;
  margin-bottom: 1em;
  padding: 10px 20px;
  background-color: #f8f8f9;
  border-radius: 10px;
}

.tb-word-explain-title-group {
  width: 140px;
  padding-right: 20px;
}
.tb-word-explain-title {
  margin:0;
  font-size: inherit;
}
.tb-word-explain-subtitle {
  margin: 0;
  font-weight: 300;
  font-size: 0.9em;
}
.tb-word-explain-detail {
  flex: 1;
  padding-left: 20px;
  border-left: 1px dashed #ddd;
}
@media screen and (max-width: 767px) {
  tb-word-explain {
    display: block;
  }
  .tb-word-explain-title-group {
    width: auto !important;
    padding-right: 0;
    display: flex;
    align-items: baseline;
    padding-bottom: 0.5em;
    margin-bottom: 0.5em;
    border-bottom: 1px dashed #ddd;
  }
  .tb-word-explain-subtitle {
    margin-left: 0.5em;
    font-weight: 300;
    font-size: 0.9em;
  }
  .tb-word-explain-detail {
    padding-left: 0;
    border-left: none;
  }
}
`
    ],
    editModeStyles: [
      `
tb-word-explain {
  position: relative;
}
tb-word-explain:hover .tb-word-explain-close {
  display: block;
}
.tb-word-explain-close {
  display: none;
  position: absolute;
  right: 10px;
  top: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.tb-word-explain-close:hover {
  transform: scale(1.2);
}
.tb-word-explain-close:before {
  content: "\u00d7";
}
`
    ]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-word-explain'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const title = element.querySelector('.tb-word-explain-title')!
    const subtitle = element.querySelector('.tb-word-explain-subtitle')!
    const detail = element.querySelector('.tb-word-explain-detail')!
    return wordExplainComponent.createInstance(injector, {
      title: slotParser(new Slot([
        ContentType.Text
      ]), title as HTMLElement),
      subtitle: slotParser(new Slot([
        ContentType.Text
      ]), subtitle as HTMLElement),
      detail: slotParser(new Slot([
        ContentType.Text
      ]), detail as HTMLElement)
    })
  },
}

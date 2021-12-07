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

export interface JumbotronComponentData {
  minHeight: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  slot: Slot
}

export interface JumbotronComponentState {
  minHeight: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  slot: SlotLiteral
}

export const jumbotronComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'JumbotronComponent',
  transform(translator: Translator, state: JumbotronComponentState): JumbotronComponentData {
    return {
      ...state,
      slot: translator.createSlot(state.slot)
    }
  },
  setup(initState: JumbotronComponentData) {
    const slots = useSlots([initState.slot], state => {
      return new Slot(state.schema)
    })
    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return slotRender(slots.get(0)!, () => {
          return (
            <tb-jumbotron style={{
              backgroundImage: `url("${initState.backgroundImage}")`,
              backgroundSize: initState.backgroundSize || 'cover',
              backgroundPosition: initState.backgroundPosition || 'center',
              minHeight: initState.minHeight
            }}/>
          )
        })
      },
      toJSON() {
        return {
          ...initState,
          slot: slots.get(0)!.toJSON()
        }
      }
    }
  }
})

export const jumbotronComponentLoader: ComponentLoader = {
  component: jumbotronComponent,
  metadata: {
    styles: [`tb-jumbotron {
  display: block;
  min-height: 200px;
  margin-bottom: 1em;
  background-color: #eee;
  padding: 20px;
}`]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-jumbotron'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    const style = element.style
    return jumbotronComponent.createInstance(injector, {
      backgroundImage: (style.backgroundImage || '').replace(/^url\(['"]?|['"]?\)$/g, ''),
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
      minHeight: style.minHeight,
      slot: slotParser(new Slot([
        ContentType.BlockComponent
      ]), element)
    })
  },
}

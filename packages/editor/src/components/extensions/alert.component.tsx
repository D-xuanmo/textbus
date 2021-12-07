import { Injector } from '@tanbo/di'
import { ComponentLoader, SlotParser } from '@textbus/browser'
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

export interface AlertComponentState {
  type: string
  fill: boolean
  slot: SlotLiteral
}

export interface AlertComponentData {
  type: string
  fill: boolean
  slot: Slot
}

export const alertComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'AlertComponent',
  transform(translator: Translator, state: AlertComponentState): AlertComponentData {
    return {
      slot: translator.createSlot(state.slot),
      type: state.type,
      fill: state.fill
    }
  },
  setup(initState: AlertComponentData) {
    const fill = initState.fill
    const type = initState.type
    const slots = useSlots([initState?.slot || new Slot([
      ContentType.Text
    ])], state => {
      return new Slot(state.schema)
    })
    return {
      render(isOutputMode: boolean, slotRender: SlotRender) {
        const classes = ['tb-alert']
        if (fill) {
          classes.push('tb-alert-fill')
        }
        if (type) {
          classes.push('tb-alert-' + type)
        }
        return slotRender(slots.get(0)!, () => {
          return new VElement('div', {
            class: classes.join(' ')
          })
        })
      },
      toJSON(): AlertComponentState {
        return {
          type,
          fill,
          slot: slots.get(0)!.toJSON()
        }
      }
    }
  }
})

export const alertComponentLoader: ComponentLoader = {
  component: alertComponent,
  metadata: {
    styles: [`.tb-alert {
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid #e9eaec;
  background-color: #f8f8f9;
  margin-top: 1em;
  margin-bottom: 1em
}

.tb-alert.tb-alert-primary {
  border-color: rgba(18, 150, 219, 0.3);
  background-color: rgba(18, 150, 219, 0.15)
}

.tb-alert.tb-alert-primary.tb-alert-fill {
  color: #fff;
  background-color: #1296db
}

.tb-alert.tb-alert-success {
  border-color: rgba(21, 189, 154, 0.3);
  background-color: rgba(21, 189, 154, 0.15)
}

.tb-alert.tb-alert-success.tb-alert-fill {
  color: #fff;
  background-color: #15bd9a
}

.tb-alert.tb-alert-info {
  border-color: rgba(106, 209, 236, 0.3);
  background-color: rgba(106, 209, 236, 0.15)
}

.tb-alert.tb-alert-info.tb-alert-fill {
  color: #fff;
  background-color: #6ad1ec
}

.tb-alert.tb-alert-warning {
  border-color: rgba(255, 153, 0, 0.3);
  background-color: rgba(255, 153, 0, 0.15)
}

.tb-alert.tb-alert-warning.tb-alert-fill {
  color: #fff;
  background-color: #f90
}

.tb-alert.tb-alert-danger {
  border-color: rgba(231, 79, 94, 0.3);
  background-color: rgba(231, 79, 94, 0.15)
}

.tb-alert.tb-alert-danger.tb-alert-fill {
  color: #fff;
  background-color: #E74F5E
}

.tb-alert.tb-alert-dark {
  border-color: rgba(73, 80, 96, 0.3);
  background-color: rgba(73, 80, 96, 0.15)
}

.tb-alert.tb-alert-dark.tb-alert-fill {
  color: #fff;
  background-color: #495060
}

.tb-alert.tb-alert-gray {
  border-color: rgba(187, 190, 196, 0.3);
  background-color: rgba(187, 190, 196, 0.15)
}

.tb-alert.tb-alert-gray.tb-alert-fill {
  color: #fff;
  background-color: #bbbec4
}

.tb-alert-fill code {
  background-color: rgba(255, 255, 255, 0.2);
  border: none
}`]
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'DIV' && element.classList.contains('tb-alert')
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    return alertComponent.createInstance(injector, {
      type: '',
      fill: false,
      slot: slotParser(new Slot([
        ContentType.Text
      ]), element)
    })
  },
}

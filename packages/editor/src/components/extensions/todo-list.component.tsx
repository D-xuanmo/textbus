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

export interface TodoListSlotLiteral extends SlotLiteral {
  active: boolean
  disabled: boolean
}

export class TodoListSlot extends Slot {
  constructor(public active: boolean, public disabled: boolean) {
    super([
      ContentType.Text
    ])
  }

  override toJSON(): TodoListSlotLiteral {
    return {
      ...super.toJSON(),
      active: this.active,
      disabled: this.disabled
    }
  }
}

export const todoListComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TodoListComponent',
  transform(translator: Translator, state: TodoListSlotLiteral[]): TodoListSlot[] {
    return state.map(i => {
      return translator.fillSlot(i, new TodoListSlot(i.active, i.disabled))
    })
  },
  setup(initState: TodoListSlot[]) {
    const slots = useSlots(initState, (state: TodoListSlotLiteral) => {
      return new TodoListSlot(state.active, state.disabled)
    })
    const stateCollection = [{
      active: false,
      disabled: false
    }, {
      active: true,
      disabled: false
    }, {
      active: false,
      disabled: true
    }, {
      active: true,
      disabled: true
    }]

    function getStateIndex(active: boolean, disabled: boolean) {
      for (let i = 0; i < 4; i++) {
        const item = stateCollection[i]
        if (item.active === active && item.disabled === disabled) {
          return i
        }
      }
      return -1
    }

    return {
      toJSON() {
        return slots.toJSON()
      },
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return (
          <tb-todo-list>
            {
              slots.toArray().map(slot => {
                const state = ['tb-todo-list-state']

                if (slot.active) {
                  state.push('tb-todo-list-state-active')
                }
                if (slot.disabled) {
                  state.push('tb-todo-list-state-disabled')
                }
                return (
                  <div class="tb-todo-list-item">
                    <div class="tb-todo-list-btn">
                      <div class={state.join(' ')} onClick={() => {
                        const i = (getStateIndex(slot.active, slot.disabled) + 1) % 4
                        const newState = stateCollection[i]
                        slot.active = newState.active
                        slot.disabled = newState.disabled
                        // slot.markAsDirtied()
                      }}/>
                    </div>
                    {
                      slotRender(slot, () => {
                        return <div class="tb-todo-list-content"/>
                      })
                    }
                  </div>
                )
              })
            }
          </tb-todo-list>
        )
      }
    }
  }
})

export const todoListComponentLoader: ComponentLoader = {
  component: todoListComponent,
  metadata: {
    styles: [
      `
tb-todo-list {
  display: block;
  margin-top: 1em;
  margin-bottom: 1em;
}
.tb-todo-list-item {
  padding-top: 0.2em;
  padding-bottom: 0.2em;
  display: flex;
}
.tb-todo-list-btn {
  margin-right: 0.6em;
}
.tb-todo-list-state {
  display: inline-block;
  margin-top: 3px;
  width: 12px;
  height: 12px;
  border: 2px solid #1296db;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
}
.tb-todo-list-state:after {
  content: "";
  position: absolute;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  left: 3px;
  top: 1px;
  width: 4px;
  height: 6px;
  transform: rotateZ(45deg);
}
.tb-todo-list-state-active:after {
  border-color: #1296db;
}
.tb-todo-list-state-disabled {
  opacity: 0.5;
}
.tb-todo-list-content {
  flex: 1;
}
`
    ]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-todo-list'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    return todoListComponent.createInstance(injector, Array.from(element.children).map(child => {
      const stateElement = child.querySelector('.tb-todo-list-state') || document.createElement('div')
      const slot = new TodoListSlot(
        stateElement?.classList.contains('tb-todo-list-state-active'),
        stateElement?.classList.contains('tb-todo-list-state-disabled'))
      return slotParser(slot, child.querySelector('.tb-todo-list-content') || document.createElement('div'))
    }))
  },
}

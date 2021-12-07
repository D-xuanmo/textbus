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

export interface StepComponentState {
  slots: SlotLiteral[]
  step: number
}

export interface StepComponentData {
  slots: Slot[]
  step: number
}

export const stepComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'StepComponent',
  transform(translator: Translator, state: StepComponentState): StepComponentData {
    return {
      step: state.step,
      slots: state.slots.map(i => translator.createSlot(i))
    }
  },
  setup(data: StepComponentData) {
    const slots = useSlots(data.slots, state => {
      return new Slot(state.schema)
    })
    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return (
          <tb-step step={data.step}>
            {
              slots.toArray().map(slot => {
                const index = slots.indexOf(slot)
                let state = 'tb-waiting'
                if (index < data.step) {
                  state = 'tb-complete'
                } else if (index === data.step) {
                  state = 'tb-current'
                }
                return (
                  <div class={'tb-step-item ' + state}>
                    <div class="tb-step-item-header">
                      <div class="tb-step-item-line"/>
                      <div class="tb-step-item-icon" onClick={() => {
                        const currentStep = data.step
                        if (index === currentStep) {
                          data.step = index + 1
                        } else if (index + 1 === currentStep) {
                          data.step = index - 1
                        } else {
                          data.step = index
                        }
                        // slots.forEach(i => i.markAsDirtied())
                        // this.markAsDirtied()
                      }}>{index + 1}</div>
                    </div>
                    {
                      slotRender(slot, () => {
                        return <div class="tb-step-item-content"/>
                      })
                    }
                    {
                      !isOutputMode && <span class="tb-step-item-add" onClick={
                        () => {
                          // this.slots.splice(index + 1, 0, createItem())
                          // 当前新插入的item后面的item需要更新序号
                          // this.slots.forEach(i => i.markAsDirtied())
                        }
                      }/>
                    }
                  </div>
                )
              })
            }
          </tb-step>
        )
      },
      toJSON() {
        return {
          step: data.step,
          slots: slots.toJSON()
        }
      }
    }
  }
})

export const stepComponentLoader: ComponentLoader = {
  component: stepComponent,
  metadata: {
    styles: [`tb-step {
  display: flex;
}
.tb-step-item {
  position: relative;
  flex: 1;
}

.tb-step-item:last-child .tb-step-item-line {
  display: none;
}

.tb-step-item.tb-complete .tb-step-item-line {
  border-top-color: #15bd9a;
}
.tb-step-item.tb-complete .tb-step-item-icon {
  background-color: #15bd9a;
}

.tb-step-item.tb-current .tb-step-item-line {
  border-top-style: dashed;
}
.tb-step-item.tb-current .tb-step-item-icon {
  background-color: #1296db;
}

.tb-step-item.tb-waiting .tb-step-item-line {
  border-top-style: dashed;
}

.tb-step-item.tb-waiting .tb-step-item-icon {
  background-color: #bbbec4;
}
.tb-step-item.tb-waiting .tb-step-item-content {
  opacity: .8;
}

.tb-step-item-header {
  position: relative;
  margin-bottom: 1em;
}

.tb-step-item-icon {
  width: 1.6em;
  height: 1.6em;
  border-radius: 50%;
  position: relative;
  text-align: center;
  line-height: 1.6em;
  color: #fff;
  font-weight: 500;
}

.tb-step-item-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  border-top: 1px solid #dddee1;
}

.tb-step-item-content {
  padding-right: 15px;
}

.tb-step-title {
  font-weight: 500;
  margin: 0;
  font-size: 1.2em;
}

.tb-step-title > small {
  font-weight: normal;
  opacity: .8;
}

.tb-step-content {
  font-weight: normal;
  margin: 0;
}`],
    editModeStyles: [`.tb-step-item-add {
  position: absolute;
  right:0;
  top: 0;
  display: none;
  cursor: pointer;
}

.tb-step-item-add:hover {
  transform: scale(1.2);
}

.tb-step-item-add:after {
  content: "+"
}
.tb-step-item:hover .tb-step-item-add {
  display: block;
}

.tb-step-item-icon {
  cursor: pointer;
}`]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-step'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    return stepComponent.createInstance(injector, {
      step: 1,
      slots: Array.from(element.children).map(i => {
        return slotParser(new Slot([
          ContentType.Text,
          ContentType.InlineComponent,
          ContentType.BlockComponent
        ]), i.querySelector('.tb-step-item-content') as HTMLElement)
      })
    })
  },
}

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

const timelineTypes = ['primary', 'info', 'success', 'warning', 'danger', 'dark', 'gray']
const colors = ['#1296db', '#6ad1ec', '#15bd9a', '#ff9900', '#E74F5E', '#495060', '#bbbec4']

export type TimelineStyle = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'dark' | 'gray';

export interface TimelineSlotLiteral extends SlotLiteral {
  style: TimelineStyle
}

export class TimeLineSlot extends Slot {
  constructor(public style: TimelineStyle) {
    super([
      ContentType.BlockComponent
    ])
  }

  override toJSON(): TimelineSlotLiteral {
    return {
      ...super.toJSON(),
      style: this.style
    }
  }
}

export const timelineComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TimelineComponent',
  transform(translator: Translator, state: TimelineSlotLiteral[]): TimeLineSlot[] {
    return state.map(i => {
      return translator.fillSlot(i, new TimeLineSlot(i.style))
    })
  },
  setup(initState: TimeLineSlot[]) {
    const slots = useSlots(initState, (state: TimelineSlotLiteral) => {
      return new TimeLineSlot(state.style)
    })
    return {
      toJSON() {
        return slots.toArray().map(i => i.toJSON())
      },
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        return (
          <tb-timeline>
            {
              slots.toArray().map(slot => {
                const classes = ['tb-timeline-item']
                if (slot.style) {
                  classes.push('tb-timeline-item-' + slot.style)
                }
                return (
                  <div class={classes.join(' ')}>
                    <div class="tb-timeline-line"/>
                    <div class="tb-timeline-icon" title={isOutputMode ? null : '点击切换颜色'} onClick={() => {
                      const currentType = slot.style
                      if (!currentType) {
                        slot.style = timelineTypes[0] as TimelineStyle
                      } else {
                        slot.style = timelineTypes[timelineTypes.indexOf(currentType) + 1] as TimelineStyle || null
                      }
                      // slot.markAsDirtied()
                    }}/>
                    {
                      !isOutputMode && <span class="tb-timeline-add" onClick={() => {
                        slots.insertAfter(new TimeLineSlot('primary'), slot)
                        // const index = this.slots.indexOf(slot) + 1
                        // this.slots.splice(index, 0, createTimelineItem())
                      }}/>
                    }
                    {
                      slotRender(slot, () => {
                        return <div class="tb-timeline-content"/>
                      })
                    }
                  </div>
                )
              })
            }
          </tb-timeline>
        )
      }
    }
  }
})

export const timelineComponentLoader: ComponentLoader = {
  component: timelineComponent,
  metadata: {
    styles: [
      `
tb-timeline {
  display: block;
  padding-top: 1em;
  padding-left: 5px;
}
.tb-timeline-item {
  display: block;
  position: relative;
  padding-left: 1.5em;
  padding-bottom: 0.5em;
  opacity: .76;
}

.tb-timeline-item:first-of-type > .tb-timeline-line{
  top: 1em;
}

.tb-timeline-item:last-of-type > .tb-timeline-line{
  bottom: calc(100% - 1em);
}

.tb-timeline-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px solid #dddee1;
}

.tb-timeline-icon {
  box-sizing: border-box;
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  left: -4px;
  top: .5em;
  background-color: #fff;
  border: 1px solid #bbbec4;
}

` + colors.map((value, index) => {
        return `
  .tb-timeline-item-${timelineTypes[index]} {
    opacity: 1;
  }
  .tb-timeline-item-${timelineTypes[index]} >.tb-timeline-icon {
    border-color: ${value};
    background-color: ${value};
  }
  .tb-timeline-item-${timelineTypes[index]} >.tb-timeline-line {
    border-color: ${value};
  }
  `
      }).join('\n')
    ],
    editModeStyles: [
      `
.tb-timeline-icon:hover {
  transform: scale(1.2);
  cursor: pointer;
}
.tb-timeline-add {
  display: none;
  position: absolute;
  right: 0;
  top: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.tb-timeline-add:before {
  content: "+";
}
.tb-timeline-add:hover {
  transform: scale(1.2);
}

.tb-timeline-item:hover .tb-timeline-add {
  display: block;
}
.tb-timeline-content {
  overflow: hidden;
}
`
    ]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-timeline'
  },
  read(element: HTMLElement, injector: Injector, slotParser: SlotParser): ComponentInstance {
    return timelineComponent.createInstance(injector, Array.from(element.children).map(child => {
      let type!: TimelineStyle
      for (const k of timelineTypes) {
        if (child.classList.contains('tb-timeline-item-' + k)) {
          type = k as TimelineStyle
          break
        }
      }
      const slot = new TimeLineSlot(type || 'primary')
      return slotParser(slot, child.querySelector('div.tb-timeline-content') || document.createElement('div'))
    }))
  },
}

import { fromEvent, Subscription } from '@tanbo/stream'
import {
  ComponentInstance,
  Renderer,
  TBSelection,
} from '@textbus/core'
import { Injector } from '@tanbo/di'
import { EDITABLE_DOCUMENT, EDITOR_CONTAINER, TBPlugin } from '@textbus/browser'

import { ImageComponentInstance } from '../components/_api'

function matchAngle(x: number, y: number, startAngle: number, endAngle: number) {
  let angle = Math.atan(x / y) / (Math.PI / 180)
  if (x <= 0 && y >= 0 || x >= 0 && y >= 0) {
    angle = 180 + angle
  }
  if (x >= 0 && y <= 0) {
    angle = 360 + angle
  }
  if (startAngle <= endAngle) {
    return angle >= startAngle && angle <= endAngle
  }
  return angle >= startAngle && angle <= 360 || angle <= endAngle && angle <= 0
}

export class ImageAndVideoDragResizePlugin implements TBPlugin {
  private mask = document.createElement('div')
  private text = document.createElement('div')
  private handlers: HTMLButtonElement[] = []

  private currentComponent: ComponentInstance<ImageComponentInstance> | null = null
  private currentElement: HTMLImageElement | HTMLVideoElement | null = null

  private subs: Subscription[] = []

  setup(injector: Injector) {
    const renderer = injector.get(Renderer)
    const selection = injector.get(TBSelection)
    this.subs.push(
      renderer.onViewChecked.subscribe(() => {
        this.onViewUpdated()
      }),
      selection.onChange.subscribe(() => {
        if (selection.isCollapsed) {
          this.currentElement = null
          this.mask.parentNode?.removeChild(this.mask)
        }
      })
    )

    this.run(injector)
  }

  run(injector: Injector) {
    const docContainer = injector.get(EDITOR_CONTAINER)
    this.mask.className = 'textbus-image-video-resize-plugin-handler'
    for (let i = 0; i < 8; i++) {
      const button = document.createElement('button')
      button.type = 'button'
      this.handlers.push(button)
    }
    this.mask.append(...this.handlers)
    this.mask.append(this.text)

    const sub = fromEvent<MouseEvent>(this.mask, 'mousedown').subscribe(ev => {
      if (!this.currentComponent) {
        return
      }

      docContainer.style.pointerEvents = 'none'

      const startRect = this.currentElement!.getBoundingClientRect()
      // this.currentComponent.width = startRect.width + 'px'
      // this.currentComponent.height = startRect.height + 'px'

      const startX = ev.clientX
      const startY = ev.clientY

      const startWidth = startRect.width
      const startHeight = startRect.height
      const startHypotenuse = Math.sqrt(startWidth * startWidth + startHeight * startHeight)

      let endWidth = startWidth
      let endHeight = startHeight
      const index = this.handlers.indexOf(ev.target as HTMLButtonElement)

      const unMove = fromEvent<MouseEvent>(document, 'mousemove').subscribe(ev => {
        const moveX = ev.clientX
        const moveY = ev.clientY

        const offsetX = moveX - startX
        const offsetY = moveY - startY

        if ([0, 2, 4, 6].includes(index)) {

          const gainHypotenuse = Math.sqrt(offsetX * offsetX + offsetY * offsetY)
          let proportion = gainHypotenuse / startHypotenuse

          if (!(index === 0 && matchAngle(offsetX, offsetY, 315, 135) ||
            index === 2 && matchAngle(offsetX, offsetY, 225, 45) ||
            index === 4 && matchAngle(offsetX, offsetY, 135, 315) ||
            index === 6 && matchAngle(offsetX, offsetY, 45, 225))) {
            proportion = -proportion
          }

          endWidth = Math.round(startWidth + startWidth * proportion)
          endHeight = Math.round(startHeight + startHeight * proportion)

        } else if ([1, 5].includes(index)) {
          endHeight = Math.round(startHeight + (index === 1 ? -offsetY : offsetY))
        } else if ([3, 7].includes(index)) {
          endWidth = Math.round(startWidth + (index === 3 ? offsetX : -offsetX))
        }
        this.currentElement!.style.width = endWidth + 'px'
        this.currentElement!.style.height = endHeight + 'px'
        this.updateStyle()
      })

      const unUp = fromEvent(document, 'mouseup').subscribe(() => {
        this.currentComponent!.methods.merge({
          width: endWidth + 'px',
          height: endHeight + 'px'
        })
        docContainer.style.pointerEvents = ''
        unMove.unsubscribe()
        unUp.unsubscribe()
      })
    })
    this.subs.push(sub)
    this.init(injector)
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
  }

  private init(injector: Injector) {
    const renderer = injector.get(Renderer)
    // const selection = injector.get(TBSelection)
    const contextDocument = injector.get(EDITABLE_DOCUMENT)
    const docContainer = injector.get(EDITOR_CONTAINER)
    this.subs.push(fromEvent(contextDocument, 'click').subscribe(ev => {
      const srcElement = ev.target as HTMLImageElement
      if (/^img$|video/i.test(srcElement.nodeName)) {
        const position = renderer.getLocationByNativeNode(srcElement)
        if (!position) {
          return
        }
        this.currentElement = srcElement
        this.currentComponent = position.slot.getContentAtIndex(position.startIndex) as ComponentInstance<ImageComponentInstance>
        const selection = contextDocument.getSelection()!
        // this.selection.removeAllRanges(true)
        selection.removeAllRanges()
        const range = contextDocument.createRange()
        range.selectNode(srcElement)
        selection.addRange(range)
        this.updateStyle()
        docContainer.append(this.mask)
      } else {
        this.currentElement = null
        this.currentComponent = null
        if (this.mask.parentNode) {
          this.mask.parentNode.removeChild(this.mask)
        }
      }
    }))
  }

  private onViewUpdated() {
    if (this.currentElement?.parentNode) {
      this.updateStyle()
    } else {
      this.currentElement = null
      this.mask.parentNode?.removeChild(this.mask)
    }
  }

  private updateStyle() {
    const rect = this.currentElement!.getBoundingClientRect()
    this.mask.style.cssText = `left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px;`
    this.text.innerText = `${Math.round(rect.width)}px * ${Math.round(rect.height)}px`
  }
}

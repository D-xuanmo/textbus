import { Injector } from '@tanbo/di'
import { CubicBezier } from '@tanbo/bezier'
import { Subscription } from '@tanbo/stream'

import { Slot, ComponentInstance, TBSelection, Renderer, Query, QueryStateType, SelectedScope } from '@textbus/core'
import { EDITABLE_DOCUMENT, EDITOR_CONTAINER, TBPlugin } from '@textbus/browser'

import { TableCellPosition, TableCellSlot, tableComponent, TableComponentInstance } from '../components/table.component'

interface ElementPosition {
  left: number
  top: number
  width: number
  height: number
}

function findParentByTagName(node: Node, tagNames: string[]): HTMLElement | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return findParentByTagName(node.parentNode!, tagNames)
  }
  const regs = tagNames.map(tagName => new RegExp(`^${tagName}$`, 'i'))
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (regs.map(reg => reg.test(node.nodeName)).indexOf(true) > -1) {
      return node as HTMLElement
    }
    return findParentByTagName(node.parentNode!, tagNames)
  }
  return null
}

export class TableEditEnhancePlugin implements TBPlugin {
  private mask = document.createElement('div')
  private firstMask = document.createElement('div')
  private insertMask = false
  private insertStyle = false
  private styleElement!: HTMLStyleElement
  private selectedCells: Slot[] = []
  private startPosition?: TableCellPosition
  private endPosition?: TableCellPosition

  private tableElement: HTMLTableElement | null = null
  private startCell: HTMLTableCellElement | null = null
  private endCell: HTMLTableCellElement | null = null
  private animateBezier = new CubicBezier(0.25, 0.1, 0.25, 0.1)
  private animateId: any
  private tableComponent: ComponentInstance<TableComponentInstance> | null = null
  private inTable = true

  private subs: Subscription[] = []

  setup(injector: Injector) {
    const selection = injector.get(TBSelection)
    const renderer = injector.get(Renderer)
    const document = injector.get(EDITABLE_DOCUMENT)
    selection.addMiddleware({
      getSelectedScopes: (currentSelectedScope) => {
        if (this.selectedCells.length > 1) {
          return this.selectedCells.map<SelectedScope>(i => {
            return {
              slot: i,
              startIndex: 0,
              endIndex: i.length
            }
          })
        }
        return currentSelectedScope
      }
    })
    this.subs.push(
      selection.onChange.subscribe(() => {
        this.onSelectionChange(injector)
      }),
      renderer.onViewChecked.subscribe(() => {
        this.onViewUpdated(injector)
      })
    )
    this.mask.classList.add('textbus-table-editor-plugin-mask')
    this.firstMask.classList.add('textbus-table-editor-plugin-first-cell')
    this.mask.appendChild(this.firstMask)
    const style = document.createElement('style')
    this.styleElement = style
    style.innerText = '::selection { background: transparent; }'
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
  }

  private onSelectionChange(injector: Injector) {
    const document = injector.get(EDITABLE_DOCUMENT)
    const query = injector.get(Query)
    this.inTable = false
    this.startCell = null
    this.endCell = null
    this.tableElement = null
    this.selectedCells = []

    const state = query.queryComponent(tableComponent)

    if (state.state !== QueryStateType.Enabled) {
      this.showNativeSelectionMask()
      this.removeMask()
      return
    }

    this.tableComponent = state.value

    const nativeSelection = document.getSelection()!

    if (nativeSelection.rangeCount === 0) {
      return
    }

    this.startCell = findParentByTagName(nativeSelection.anchorNode!, ['th', 'td']) as HTMLTableCellElement
    this.endCell = findParentByTagName(nativeSelection.focusNode!, ['th', 'td']) as HTMLTableCellElement
    this.tableElement = findParentByTagName(nativeSelection.anchorNode!, ['table']) as HTMLTableElement

    if (this.startCell === this.endCell) {
      this.showNativeSelectionMask()
    } else {
      this.hideNativeSelectionMask(document)
    }
    this.inTable = true

    this.setSelectedCellsAndUpdateMaskStyle(injector)
  }

  private onViewUpdated(injector: Injector) {
    if (this.startPosition && this.endPosition && this.tableComponent) {
      const renderer = injector.get(Renderer)
      this.startCell = renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(this.startPosition.cell!)!) as HTMLTableCellElement
      this.endCell = renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(this.endPosition.cell!)!) as HTMLTableCellElement
      if (this.startCell && this.endCell && this.inTable) {
        this.setSelectedCellsAndUpdateMaskStyle(injector)
      } else {
        this.removeMask()
        this.showNativeSelectionMask()
      }
    }
  }

  private hideNativeSelectionMask(contentDocument: Document) {
    if (!this.insertStyle) {

      contentDocument.head.appendChild(this.styleElement)
      this.insertStyle = true
    }
  }

  private showNativeSelectionMask() {
    this.insertStyle = false
    this.styleElement.parentNode?.removeChild(this.styleElement)
  }

  private removeMask() {
    this.insertMask = false
    this.mask.parentNode?.removeChild(this.mask)
  }

  private addMask(injector) {
    const container = injector.get(EDITOR_CONTAINER)
    container.appendChild(this.mask)
    this.insertMask = true
  }

  private setSelectedCellsAndUpdateMaskStyle(injector: Injector, animate = true) {
    const selection = injector.get(TBSelection)
    const renderer = injector.get(Renderer)
    const {startPosition, endPosition, selectedCells} = this.tableComponent!.methods.selectCells(
      selection.startSlot as TableCellSlot,
      selection.endSlot as TableCellSlot)

    const startRect = (renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(startPosition.cell!)!) as HTMLElement).getBoundingClientRect()
    const endRect = (renderer.getNativeNodeByVNode(renderer.getVNodeBySlot(endPosition.cell!)!) as HTMLElement).getBoundingClientRect()

    const firstCellRect = this.startCell!.getBoundingClientRect()

    this.firstMask.style.width = firstCellRect.width + 'px'
    this.firstMask.style.height = firstCellRect.height + 'px'
    if (animate && this.insertMask) {
      this.animate({
        left: this.mask.offsetLeft,
        top: this.mask.offsetTop,
        width: this.mask.offsetWidth,
        height: this.mask.offsetHeight
      }, {
        left: startRect.left,
        top: startRect.top,
        width: endRect.right - startRect.left,
        height: endRect.bottom - startRect.top
      }, {
        left: firstCellRect.left - startRect.left,
        top: firstCellRect.top - startRect.top,
        width: firstCellRect.width,
        height: firstCellRect.height
      })
    } else {
      this.addMask(injector)
      this.mask.style.left = startRect.left + 'px'
      this.mask.style.top = startRect.top + 'px'
      this.mask.style.width = endRect.right - startRect.left + 'px'
      this.mask.style.height = endRect.bottom - startRect.top + 'px'

      this.firstMask.style.left = firstCellRect.left - startRect.left + 'px'
      this.firstMask.style.top = firstCellRect.top - startRect.top + 'px'
    }

    this.startPosition = startPosition
    this.endPosition = endPosition
    this.selectedCells = selectedCells
  }

  private animate(start: ElementPosition, target: ElementPosition, firstCellPosition: ElementPosition) {
    cancelAnimationFrame(this.animateId)

    function toInt(n: number) {
      return n < 0 ? Math.ceil(n) : Math.floor(n)
    }

    let step = 0
    const maxStep = 6
    const animate = () => {
      step++
      const ratio = this.animateBezier.update(step / maxStep).y
      const left = start.left + toInt((target.left - start.left) * ratio)
      const top = start.top + toInt((target.top - start.top) * ratio)
      const width = start.width + toInt((target.width - start.width) * ratio)
      const height = start.height + toInt((target.height - start.height) * ratio)

      this.mask.style.left = left + 'px'
      this.mask.style.top = top + 'px'
      this.mask.style.width = width + 'px'
      this.mask.style.height = height + 'px'

      this.firstMask.style.left = target.left - left + firstCellPosition.left + 'px'
      this.firstMask.style.top = target.top - top + firstCellPosition.top + 'px'
      if (step < maxStep) {
        this.animateId = requestAnimationFrame(animate)
      }
    }
    this.animateId = requestAnimationFrame(animate)
  }
}

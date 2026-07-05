/**
 * Drag bridge — module-level state for mouse-based drag from NodeLibrary to FlowCanvas.
 *
 * WebView2 does not properly support HTML5 Drag and Drop API (onDrop never fires).
 * This module stores the in-flight drag state: which node type is being dragged,
 * its label/color for the ghost preview, and current mouse screen coordinates.
 */

interface DragState {
  nodeType: string;
  label: string;
  color: string;
  clientX: number;
  clientY: number;
}

let _dragState: DragState | null = null;

export function startDrag(nodeType: string, label: string, color: string, clientX: number, clientY: number) {
  _dragState = { nodeType, label, color, clientX, clientY };
}

export function updateDragPosition(clientX: number, clientY: number) {
  if (_dragState) {
    _dragState.clientX = clientX;
    _dragState.clientY = clientY;
  }
}

export function getDragState(): DragState | null {
  return _dragState;
}

export function clearDrag() {
  _dragState = null;
}

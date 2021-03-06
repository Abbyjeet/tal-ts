import { Device } from '../devices/device';
import { Widget } from './widget';
export interface IContainer {
    hasChildWidget(id: string): boolean;
    getChildWidget(id: string): Widget;
    getChildWidgets(): Widget[];
    render(device: Device): void;
    appendChildWidget(widget: Widget): void;
    setActiveChildWidget(widget: Widget): boolean;
}
export declare class Container extends Widget implements IContainer {
    activeChildWidget: Container;
    childWidgets: {
        [key: string]: Widget;
    };
    protected childWidgetOrder: Widget[];
    protected autoRenderChildren: boolean;
    constructor(id?: string);
    back(): void;
    /**
     * Inserts a child widget at the specified index.
     * @param index The index where to insert the child widget.
     * @param widget The child widget to add.
     */
    insertChildWidget(index: number, widget: Widget): Widget;
    /**
     * Remove all child widgets from this widget.
     */
    removeChildWidgets(): void;
    /**
     * Removes a specific child widget from this widget.
     * @param widget The child widget to remove.
     * @param retainElement Pass `true` to retain the child output element of the given widget
     */
    removeChildWidget(widget: Widget, retainElement?: boolean): void;
    /**
     * Checks to see if a specific widget is a direct child of this widget.
     * @param id The widget id of the widget to check to see if it is a direct child of this widget.
     */
    hasChildWidget(id: string): boolean;
    /**
     * Get a child widget from its unique ID.
     * Returns widget with the given ID, otherwise undefined if the child does not exist.
     * @param id The id of the child widget to return.
     */
    getChildWidget(id: string): Widget;
    /**
     * Get an array of all this widget's children.
     * @return An array of all this widget's children.
     */
    getChildWidgets(): Widget[];
    getIndexOfChildWidget(widget: Widget): number;
    /**
     * Renders the widget and any child widgets to device-specific output.
     *
     * Returns a device-specific object that represents the widget as displayed on
     * the device (in a browser, a DOMElement);
     *
     * @param device The device to render to.
     */
    render(device: Device): HTMLElement;
    /**
     * Appends a child widget to this widget.
     * @param widget The child widget to add.
     */
    appendChildWidget(widget: Widget): Widget;
    /**
     * Attempt to set focus to the given child widget.
     *
     * Note: You can only set focus to a focusable widget. A focusable widget is one that
     * contains an enabled antie.widgets.Button as either a direct or indirect child.
     *
     * Note: Widgets have 2 independent states: active and focussed. A focussed widget is
     * either the Button with focus, or any parent of that Button. An active widget is
     * one which is the active child of its parent Container. When the parent widget
     * receives focus, focus will be placed on the active child.
     *
     * Classes 'active' and 'focus' are appended to widgets with these states.
     *
     * Returns true if the child widget was focusable, otherwise false.
     *
     * @param widget The child widget to set focus to.
     */
    setActiveChildWidget(widget: Widget): boolean;
    /**
     * Attempts to set focus to the child widget at the given index.
     * @see #setActiveChildWidget
     * @param index Index of the child widget to set focus to.
     * @return true if the child widget was focusable, otherwise boolean false.
     */
    setActiveChildIndex(index: number): boolean;
    /**
     * Get the current active widget.
     * @return The current active widget
     */
    getActiveChildWidget(): Container;
    /**
     * Gets the number of direct child widgets.
     * @return The number of direct child widgets.
     */
    getChildWidgetCount(): number;
    /**
     * Checks to see if a widget is focussable, i.e. contains an enabled button.
     */
    isFocusable(): boolean;
    /**
     * Moves focus to a button within this container. Focused button will be that which follows
     * the current 'active' path.
     * Returns `true` if focus has been moved to a button. Otherwise returns `false`.
     */
    focus(): boolean;
    /**
     * Flags the active child as focussed or blurred.
     * @param focus `true` if the active child is to be focussed, `false` if the active child is to be blurred.
     */
    protected setActiveChildFocussed(focus: boolean): void;
}

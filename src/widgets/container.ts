import { BaseClass } from '../class';
import { Device } from '../devices/device';
import { BlurEvent } from '../events/blurevent';
import { FocusEvent } from '../events/focusevent';
import { Button } from './button';
import { ComponentContainer } from './componentcontainer';
import { IWidget, Widget } from './widget';

export interface IContainer {
  hasChildWidget(id: string): boolean;
  getChildWidget(id: string): Widget;
  getChildWidgets(): Widget[];
  render(device: Device): void;
  appendChildWidget(widget: Widget): void;
  setActiveChildWidget(widget: Widget): boolean;
}

export class Container extends Widget implements IContainer {
  public activeChildWidget: Container;
  public childWidgets: { [key: string]: Widget };
  protected childWidgetOrder: Widget[];
  private autoRenderChildren: boolean;

  constructor(id?: string) {
    super(id);

    this.childWidgets = {};
    this.childWidgetOrder = [];
    this.activeChildWidget = null;
    this.autoRenderChildren = true;

    this.addClass('container');
  }

  /**
   * Removes a specific child widget from this widget.
   * @param widget The child widget to remove.
   * @param retainElement Pass `true` to retain the child output element of the given widget
   */
  public removeChildWidget(widget: Widget, retainElement?: boolean): void {
    if (!widget) {
      return;
    }

    const widgetIndex = this.getIndexOfChildWidget(widget);
    if (widgetIndex < 0) {
      return;
    }

    if (widget.isFocussed()) {
      const logger = this.getCurrentApplication()
        .getDevice()
        .getLogger();
      logger.warn('Removing widget that currently has focus: ' + widget.id);
    }

    if (!retainElement && widget.outputElement) {
      const device = this.getCurrentApplication().getDevice();
      device.removeElement(widget.outputElement);
    }

    this.childWidgetOrder.splice(widgetIndex, 1);
    delete this.childWidgets[widget.id];

    widget.parentWidget = null;
  }

  /**
   * Checks to see if a specific widget is a direct child of this widget.
   * @param id The widget id of the widget to check to see if it is a direct child of this widget.
   */
  public hasChildWidget(id: string): boolean {
    return !!this.childWidgets[id];
  }

  /**
   * Get a child widget from its unique ID.
   * Returns widget with the given ID, otherwise undefined if the child does not exist.
   * @param id The id of the child widget to return.
   */
  public getChildWidget(id: string): Widget {
    return this.childWidgets[id];
  }

  /**
   * Get an array of all this widget's children.
   * @returns An array of all this widget's children.
   */
  public getChildWidgets(): Widget[] {
    return this.childWidgetOrder;
  }

  public getIndexOfChildWidget(widget: Widget): number {
    return this.childWidgetOrder.indexOf(widget);
  }

  /**
   * Renders the widget and any child widgets to device-specific output.
   *
   * Returns a device-specific object that represents the widget as displayed on
   * the device (in a browser, a DOMElement);
   *
   * @param device The device to render to.
   */
  public render(device: Device) {
    let i;
    if (!this.outputElement) {
      this.outputElement = device.createContainer(this.id, this.getClasses());
    } else {
      device.clearElement(this.outputElement);
    }
    for (i = 0; i < this.childWidgetOrder.length; i++) {
      device.appendChildElement(this.outputElement, this.childWidgetOrder[i].render(device));
    }
    return this.outputElement;
  }

  /**
   * Appends a child widget to this widget.
   * @param widget The child widget to add.
   */
  public appendChildWidget<K extends Widget>(widget: K) {
    if (!this.hasChildWidget(widget.id)) {
      this.childWidgets[widget.id] = widget;
      this.childWidgetOrder.push(widget);
      widget.parentWidget = this;

      // If there's no active child widget set, try and set it to this
      // (Will only have an affect if it's focusable (i.e. contains a button))
      if (!this.activeChildWidget) {
        this.setActiveChildWidget(widget);
      }

      if (this.outputElement && this.autoRenderChildren) {
        const device = this.getCurrentApplication().getDevice();
        device.appendChildElement(this.outputElement, widget.render(device));
      }

      return widget;
    }
  }

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
  public setActiveChildWidget(widget: Widget): boolean {
    if (!widget) {
      return false;
    }
    if (this.hasChildWidget(widget.id) && widget.isFocusable() && widget instanceof Button) {
      if (this.activeChildWidget && this.activeChildWidget !== widget) {
        this.activeChildWidget.removeClass('active');
        this.setActiveChildFocussed(false);
      }
      widget.addClass('active');
      this.activeChildWidget = widget;

      if (!this.getCurrentApplication().getFocussedWidget()) {
        // tslint:disable-next-line
        let widgetIterator: Container = this;
        while (widgetIterator.parentWidget) {
          widgetIterator.parentWidget.activeChildWidget = widgetIterator;
          widgetIterator.focussed = true;

          widgetIterator = widgetIterator.parentWidget;
        }
      }
      if (this.focussed) {
        this.setActiveChildFocussed(true);
      }
      return true;
    }
    return false;
  }

  /**
   * Flags the active child as focussed or blurred.
   * @param focus `true` if the active child is to be focussed, `false` if the active child is to be blurred.
   */
  protected setActiveChildFocussed(focus) {
    if (
      this.activeChildWidget &&
      this.activeChildWidget.focussed !== focus &&
      this.activeChildWidget instanceof Button // TODO: check if this breaks stuff
    ) {
      this.activeChildWidget.focussed = focus;
      if (focus) {
        this.activeChildWidget.addClass('focus');
        this.activeChildWidget.bubbleEvent(new FocusEvent(this.activeChildWidget));
        // TODO: force focus to change in the application (rather than relying on the above
        // TODO: even to propagate to the application level
      } else {
        this.activeChildWidget.removeClass('focus');
        this.activeChildWidget.bubbleEvent(new BlurEvent(this.activeChildWidget));
      }
      if (this.activeChildWidget instanceof Container) {
        this.activeChildWidget.setActiveChildFocussed(focus);
      }
    }
  }
}

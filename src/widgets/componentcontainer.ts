import { Button } from './button';
import { Component } from './component';
import { Container } from './container';
import { Widget } from './widget';

export interface IComponentContainer {
  show(module: string, args?: object, keepHistory?: boolean, state?: object, fromBack?: boolean, focus?: Button): void;
  pushComponent(module: string, args?: object): void;
  getContent(): Container;
  back(): void;
  hide(focusToComponent, args, keepHistory, state, fromBack): void;
  getCurrentModule(): string;
  getCurrentArguments(): object;
}

export interface IHistoryItem {
  module: string;
  args: object;
  state: object;
  previousFocus: Button;
}

export class ComponentContainer extends Container implements IComponentContainer {
  public static destroy() {
    for (const module in this.knownComponents) {
      if (this.knownComponents.hasOwnProperty(module)) {
        delete this.knownComponents[module];
      }
    }
  }

  private static knownComponents: object = {};

  private loadingIndex: number;
  private loadingModule: string;
  private currentModule: string;
  private currentComponent: Component;
  private currentArgs: object;
  private historyStack: IHistoryItem[];
  private previousFocus: Button;

  /**
   *
   * @param id
   */
  constructor(id?: string) {
    super(id);

    this.loadingIndex = 0;
    this.loadingModule = null;
    this.currentModule = null;
    this.currentComponent = null;
    this.currentArgs = null;
    this.historyStack = [];
    this.previousFocus = null;
    this.addClass('componentcontainer');
  }

  /**
   *
   * @param module
   * @param args
   * @param keepHistory
   * @param state
   * @param fromBack
   * @param focus
   */
  public show(
    module: string,
    args?: object,
    keepHistory?: boolean,
    state?: object,
    fromBack?: boolean,
    focus?: Button
  ) {
    this.loadingModule = module;

    this.loadingIndex++;
    const loadingIndex = this.loadingIndex;

    if (ComponentContainer.knownComponents[module]) {
      const device = this.getCurrentApplication().getDevice();

      const focussedButton = this.getCurrentApplication().getFocussedWidget();
      if (this.currentComponent) {
        this.hide(null, args, keepHistory, state, fromBack);
      }

      this.currentModule = module;
      this.currentComponent = ComponentContainer.knownComponents[module];
      this.currentArgs = args;
      if (!fromBack) {
        this.previousFocus = focus;
      }

      if (!this.isFocussed) {
        // We don't have focus, so any of our children shouldn't
        // (_isFocussed state can be set to true if focussed widget is in a unloaded component)
        let p = this.currentComponent;
        while (p) {
          p.removeFocus();
          p = p.activeChildWidget;
        }
      }

      // set the parent widget so the next event bubbles correctly through the tree
      this.currentComponent.parentWidget = this;

      this.currentComponent.bubbleEvent(
        new ComponentEvent('beforerender', this, this.currentComponent, args, state, fromBack)
      );

      this.currentComponent.render(device);

      // and clear it again
      this.currentComponent.parentWidget = null;

      device.hideElement({
        el: this.currentComponent.outputElement,
        skipAnim: true
      });

      this.appendChildWidget(this.currentComponent);

      const evt = new ComponentEvent('beforeshow', this, this.currentComponent, args, state, fromBack);
      this.currentComponent.bubbleEvent(evt);

      if (focussedButton) {
        focussedButton.focus();
      }

      if (!evt.isDefaultPrevented()) {
        const config = device.getConfig();
        const animate =
          !config.widgets || !config.widgets.componentcontainer || config.widgets.componentcontainer.fade !== false;
        device.showElement({
          el: this.currentComponent.outputElement,
          skipAnim: !animate
        });
      }

      this.currentComponent.bubbleEvent(
        new ComponentEvent('aftershow', this, this.currentComponent, args, state, fromBack)
      );

      const focusRemoved = this.setActiveChildWidget(this.currentComponent);
      if (!focusRemoved) {
        this.activeChildWidget = this.currentComponent;
        this.getCurrentApplication()
          .getDevice()
          .getLogger()
          .warn('active component is not currently focusable', this.activeChildWidget);
      }
    } else {
      // hook into requirejs to load the component from the module and call us again
      requirejs([module], (componentClass: new () => Widget) => {
        // Check we've not navigated elsewhere whilst requirejs has been loading the module
        if (this.loadingModule === module && this.loadingIndex === loadingIndex) {
          this.loadComponentCallback(module, componentClass, args, keepHistory, state /*, fromBack, focussedButton*/);
        }
      });
    }
  }

  /**
   *
   */
  public pushComponent(module: string, args?: object) {
    this.show(module, args, true);
  }

  /**
   *
   */
  public getContent(): Container {
    return this.currentComponent;
  }

  /**
   *
   */
  public back() {
    const focus = this.currentComponent.getIsModal() ? this.previousFocus : null;

    const lastComponent = this.historyStack.pop();
    if (lastComponent) {
      this.previousFocus = lastComponent.previousFocus;
      this.show(lastComponent.module, lastComponent.args, true, lastComponent.state, true, _focus);
    } else {
      this.hide(null, null, false, null, false);
    }
  }

  /**
   *
   * @param focusToComponent
   * @param args
   * @param keepHistory
   * @param state
   * @param fromBack
   */
  public hide(focusToComponent, args, keepHistory, state: object, fromBack) {
    if (this.currentComponent) {
      const evt = new ComponentEvent('beforehide', this, this.currentComponent, args, state, fromBack);
      this._currentComponent.bubbleEvent(evt);

      var _state = keepHistory ? this.currentComponent.getCurrentState() : null;

      // remove the child widget, but if default event is prevented, keep the output element in the DOM
      this.removeChildWidget(this.currentComponent, evt.isDefaultPrevented());

      const _component = this.currentComponent;
      this.currentComponent = null;

      // set the parent widget so the next event bubbles correctly through the tree
      _component.parentWidget = this;
      _component.bubbleEvent(new ComponentEvent('afterhide', this, _component, args, state, fromBack));
      // and clear it again
      _component.parentWidget = null;

      if (keepHistory) {
        if (!fromBack) {
          this.historyStack.push({
            module: this.currentModule,
            args: this.currentArgs,
            state,
            previousFocus: this.previousFocus
          });
        }
      } else {
        // Reset the history stack when a component is shown in this container without explicitly
        // enabling history.
        if (_component.getIsModal() && !fromBack) {
          if (this.historyStack.length > 0) {
            this.historyStack[0].previousFocus.focus();
          } else if (this.previousFocus) {
            this.previousFocus.focus();
          }
        }
        this.historyStack = [];
      }
    }
    if (this.isFocussed && focusToComponent) {
      this.parentWidget.setActiveChildWidget(this.parentWidget.childWidgets[focusToComponent]);
    }
  }

  /**
   *
   */
  public getCurrentModule(): string {
    return this.currentModule;
  }

  /**
   *
   */
  public getCurrentArguments(): object {
    return this.currentArgs;
  }

  /**
   *
   * @param module
   * @param componentClass
   * @param args
   * @param keepHistory
   * @param state
   */
  private loadComponentCallback(
    module: string,
    componentClass: new () => Widget,
    args?: object,
    keepHistory?: boolean,
    state?: object
  ) {
    if (!this.getCurrentApplication()) {
      // Application has been destroyed, abort
      return;
    }

    const newComponent = new componentClass();

    // Add the component to our table of known components.
    ComponentContainer.knownComponents[module] = newComponent;

    // set the parent widget so the next event bubbles correctly through the tree
    newComponent.parentWidget = this;
    newComponent.bubbleEvent(new ComponentEvent('load', this, ComponentContainer.knownComponents[module], args));
    // clear the parent widget again
    newComponent.parentWidget = null;

    // Show the component.
    this.show(module, args, keepHistory, state);
  }
}
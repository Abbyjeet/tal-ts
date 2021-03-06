import { KeyEvent } from '../events/keyevent';
import { Historian } from '../historian';
import { HTML5MediaPlayer } from '../mediaplayer/html5';
import { MediaPlayer } from '../mediaplayer/mediaplayer';
import { ISize } from '../widgets/image';
import { getAnimator } from './anim/css3transform/animationfactory';
import { Device, IAnimator, IAnimOptions, IDevice } from './device';

export class BrowserDevice extends Device {
  private mediaPlayer = new HTML5MediaPlayer();
  private windowLocation: Location;

  public preloadImage(url: string) {
    const img = new Image();
    img.src = url;
  }

  public getCurrentRoute() {
    const unescaped = decodeURI(window.location.hash).split(Historian.HISTORY_TOKEN, 1)[0];
    return unescaped.replace(/^#/, '').split('/');
  }

  public getWindowLocation(): Location {
    const windowLocation = this.windowLocation || window.location; // Allow stubbing for unit testing

    // Has the device missed the route off the href? Fix this.
    if (
      windowLocation.hash &&
      windowLocation.hash.length > 1 &&
      windowLocation.href &&
      windowLocation.href.lastIndexOf('#') === -1
    ) {
      // Copy properties to new object, as modifying href on the original window.location triggers a navigation.
      const newLocation = {};
      const copyProps = ['assign', 'hash', 'host', 'href', 'pathname', 'protocol', 'search'];
      for (const prop of copyProps) {
        if (windowLocation.hasOwnProperty(prop)) {
          // newLocation[prop] = windowLocation[prop];
        }
      }
      // newLocation.href = newLocation.href + newLocation.hash;
    }

    // Use copy of window.location if it was created, otherwise the original.
    // return newLocation || windowLocation;
    return windowLocation;
  }

  /**
   * Browse to the specified location. Use launchAppFromURL() and setCurrentRoute() under Application
   * to manipulate the current location more easily.
   * @param url Full URL to navigate to, including search and hash if applicable.
   */
  public setWindowLocationUrl(url: string) {
    const windowLocation: Location = this.windowLocation || window.location; // Allow stubbing for unit testing

    // Prefer assign(), but some devices don't have this function.
    if (typeof windowLocation.assign === 'function') {
      windowLocation.assign(url);
    } else {
      windowLocation.href = url;
    }
  }

  /**
   * Prepends an element as a child of another.
   * @param to Prepend as a child of this element.
   * @param el The new child element.
   */
  public prependChildElement(to: HTMLElement, el: HTMLElement) {
    if (to.childNodes.length > 0) {
      to.insertBefore(el, to.childNodes[0]);
    } else {
      to.appendChild(el);
    }
  }

  /**
   * Inserts an element as a child of another before a reference element.
   * @param to Append as a child of this element.
   * @param el The new child element.
   * @param ref The reference element which will appear after the inserted element.
   */
  public insertChildElementBefore(to: HTMLElement, el: HTMLElement, ref: HTMLElement) {
    to.insertBefore(el, ref);
  }

  public appendChildElement(to: Element, el: Element) {
    to.appendChild(el);
  }

  public setElementClasses(el: Element, classNames: string[]) {
    el.className = classNames.join(' ');
  }

  /**
   * Removes a class from an element (and optionally descendants)
   * @param el The element from which to remove the class.
   * @param className The class to remove.
   * @param deep If true, and this element has the given class, remove the class from it's children recursively.
   */
  public removeClassFromElement(el: Element, className: string, deep?: boolean) {
    if (new RegExp(` ${className} `).test(` ${el.className} `)) {
      el.className = this.trim(` ${el.className} `.replace(` ${className} `, ' '));
    }
    if (deep) {
      // set up recursion
      // tslint:disable-next-line
      for (let i = 0; i < el.childNodes.length; i++) {
        this.removeClassFromElement(el.childNodes[i] as Element, className, true);
      }
    }
  }

  /**
   * Adds a class name to an element
   * @param el The element which will receive new class name.
   * @param className The new class name to add.
   */
  public addClassToElement(el: Element, className: string) {
    this.removeClassFromElement(el, className, false);
    el.className = this.trim(`${el.className} ${className}`);
  }

  /**
   * Adds global key event listener(s) to the user-agent.
   * This must be added in a way that all key events within the user-agent
   * cause this.application.bubbleEvent(...) to be called with a {@link KeyEvent}
   * object with the mapped keyCode.
   */
  public addKeyEventListener() {
    const keyMap = this.getKeyMap();
    const pressed: { [key: string]: boolean } = {};

    // We need to normalise these events on so that for every key pressed there's
    // one keydown event, followed by multiple keypress events whilst the key is
    // held down, followed by a single keyup event.

    document.onkeydown = e => {
      // e = e || window.event;
      const keyCode: number = keyMap[e.keyCode.toString()];
      if (keyCode) {
        if (!pressed[e.keyCode.toString()]) {
          this.application.bubbleEvent(new KeyEvent('keydown', keyCode));
          pressed[e.keyCode.toString()] = true;
        } else {
          this.application.bubbleEvent(new KeyEvent('keypress', keyCode));
        }
        e.preventDefault();
      }
    };

    document.onkeyup = e => {
      // e = e || window.event;
      const keyCode: number = keyMap[e.keyCode.toString()];
      if (keyCode) {
        delete pressed[e.keyCode.toString()];
        this.application.bubbleEvent(new KeyEvent('keyup', keyCode));
        e.preventDefault();
      }
    };

    document.onkeypress = e => {
      // e = e || window.event;
      const keyCode: number = keyMap[e.keyCode.toString()];
      if (keyCode) {
        this.application.bubbleEvent(new KeyEvent('keypress', keyCode));
        e.preventDefault();
      }
    };
  }

  /**
   * Returns all direct children of an element which have the provided tagName.
   * @param el The element who's children you wish to search.
   * @param tagName The tag name you are looking for.
   */
  public getChildElementsByTagName(el: Node, tagName: string) {
    const children: Element[] = [];
    const name = tagName.toLowerCase();
    // tslint:disable-next-line
    for (var i = 0; i < el.childNodes.length; i++) {
      const element = el.childNodes[i] as Element;
      if (element.tagName) {
        if (element.tagName.toLowerCase() === name) {
          children.push(element);
        }
      }
    }
    return children;
  }

  /**
   * Returns the top-level DOM element. This is the target of layout class names.
   */
  public getTopLevelElement(): Node {
    return document.documentElement || document.body.parentNode || document;
  }

  /**
   * Returns all the loaded stylesheet elements, an array containing all stylesheet
   * related DOM elements (link and style elements)
   */
  public getStylesheetElements(): Node[] {
    const stylesheetElements: Node[] = [];

    const linkElements = document.getElementsByTagName('link');
    const styleElements = document.getElementsByTagName('style');

    // Loop over the node lists and push the dom elements into an array
    // tslint:disable-next-line
    for (let i = 0; i < linkElements.length; i++) {
      stylesheetElements.push(linkElements[i]);
    }

    // tslint:disable-next-line
    for (let i = 0; i < styleElements.length; i++) {
      stylesheetElements.push(styleElements[i]);
    }

    return stylesheetElements;
  }

  /**
   * Returns the offset of the element within its offset container.
   * @param el The element you wish to know the offset of.
   */
  public getElementOffset(el: HTMLElement): { top: number; left: number } {
    return {
      top: el.offsetTop,
      left: el.offsetLeft
    };
  }

  /**
   * Returns a size object containing the width and height of the element.
   * @param el The element of which to return the size.
   */
  public getElementSize(el: HTMLElement): { width: number; height: number } {
    return {
      width: el.clientWidth || el.offsetWidth,
      height: el.clientHeight || el.offsetHeight
    };
  }

  /**
   * Sets the size of an element.
   * @param el The element of which to set the size.
   * @param size The new size of the element.
   */
  public setElementSize(el: HTMLElement, size: { width?: number; height?: number }) {
    if (size.width !== undefined) {
      el.style.width = size.width + 'px';
    }
    if (size.height !== undefined) {
      el.style.height = size.height + 'px';
    }
  }

  public scrollElementTo(options: IAnimOptions) {
    if (!(/_mask$/.test(options.el.id) && options.el.childNodes.length > 0)) {
      return null;
    }

    options.el = options.el.childNodes[0] as HTMLElement;

    if (options.to.top) {
      // options.to.top = parseInt(options.to.top, 10) * -1;
      options.to.top *= -1;
    }
    if (options.to.left) {
      // options.to.left = parseInt(options.to.left, 10) * -1;
      options.to.left *= -1;
    }

    const animator = getAnimator(options);
    animator.start();
    return options.skipAnim ? null : animator;
  }

  public moveElementTo(options: IAnimOptions) {
    const animator = getAnimator(options);
    animator.start();
    return options.skipAnim ? null : animator;
  }

  public hideElement(options: IAnimOptions) {
    const onComplete = () => {
      options.el.style.visibility = 'hidden';
      if (options.onComplete) {
        options.onComplete();
      }
    };

    const fadeOptions: IAnimOptions = {
      el: options.el,
      to: {
        opacity: 0
      },
      duration: options.duration,
      easing: options.easing || 'linear',
      onComplete,
      skipAnim: options.skipAnim
    };

    return this.tweenElementStyle(fadeOptions);
  }

  public showElement(options: IAnimOptions) {
    const fadeOptions: IAnimOptions = {
      el: options.el,
      to: {
        opacity: 1
      },
      from: {
        opacity: 0
      },
      duration: options.duration,
      easing: options.easing || 'linear',
      onComplete: options.onComplete,
      skipAnim: options.skipAnim
    };

    options.el.style.visibility = 'visible';
    return this.tweenElementStyle(fadeOptions);
  }

  public tweenElementStyle(options: IAnimOptions) {
    const animator = getAnimator(options);
    if (!animator) {
      return;
    }
    animator.start();
    return options.skipAnim ? null : animator;
  }

  public stopAnimation(animator?: IAnimator) {
    if (animator) {
      animator.stop();
    }
  }

  public isAnimationDisabled() {
    return false;
  }

  public loadStyleSheet(url: string, callback?: (res: string) => void) {
    const supportsCssRules = (): boolean => {
      document.createElement('style');
      const style = this.createElement('style');
      style.type = 'text/css';
      style.innerHTML = 'body {};';
      style.className = 'added-by-antie';
      document.getElementsByTagName('head')[0].appendChild(style);
      const styleTest: any = style; // Workaround for TS Error: Property 'cssRules' does not exist on type 'StyleSheet'.
      if (styleTest.sheet && styleTest.sheet.cssRules) {
        return true;
      }
      this.removeElement(style);
      return false;
    };

    if (callback && supportsCssRules()) {
      const style = this.createElement('style');
      style.type = 'text/css';
      style.innerHTML = "@import url('" + url + "');";
      style.className = 'added-by-antie';
      document.getElementsByTagName('head')[0].appendChild(style);
      const interval = window.setInterval(() => {
        const styleTest: any = style; // Workaround for TS Error: Property 'cssRules' does not exist on type 'StyleSheet'.
        if (styleTest.sheet && styleTest.sheet.cssRules) {
          window.clearInterval(interval);
        } else {
          return;
        }
        callback(url);
      }, 200);
    } else {
      const link = this.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = url;
      link.className = 'added-by-antie';
      document.getElementsByTagName('head')[0].appendChild(link);
      // Onload trickery from:
      // http://www.backalleycoder.com/2011/03/20/link-tag-css-stylesheet-load-event/
      if (callback) {
        const img = this.createElement('img');
        const done = () => {
          img.onerror = () => null;
          callback(url);
          this.removeElement(img);
        };
        img.onerror = done;
        this.getTopLevelElement().appendChild(img);
        img.src = url;
      }
    }
  }

  public clearElement(el: HTMLElement): void {
    for (let i = el.childNodes.length - 1; i >= 0; i--) {
      el.removeChild(el.childNodes[i]);
    }
  }

  /**
   * Sets the inner content of an element.
   * @param el The element of which to change the content.
   * @param content The new content for the element.
   */
  public setElementContent(el: HTMLElement, content: string, enableHTML?: boolean): void {
    if (content === '') {
      this.clearElement(el);
      return;
    }

    el[enableHTML ? 'innerHTML' : 'textContent'] = content;
  }

  /**
   * Get the height (in pixels) of a given block of text (of a provided set of class names) when constrained to a fixed width.
   *
   * @deprecated This function does not always give accurate results. When measuring size, it only takes into account
   * the classes on the text element being measured. It doesn't consider any CSS styles that may have been passed down
   * through the DOM.
   *
   * Returns the height (in pixels) that is required to display this block of text.
   *
   * @param text The text to measure.
   * @param maxWidth The width the text is constrained to.
   * @param classNames An array of class names which define the style of the text.
   */
  public getTextHeight(text: string, maxWidth: number, classNames: string[]): number {
    // TODO: is there a more efficient way of doing this?
    // const cacheKey = maxWidth + ':' + classNames.join(' ') + ':' + text;
    // let height;
    // if (!(height = this.textSizeCache[cacheKey])) {
    //   if (!this.measureTextElement) {
    //     this.measureTextElement = this.createLabel('measure', null, 'fW');
    //     this.measureTextElement.style.display = 'block';
    //     this.measureTextElement.style.position = 'absolute';
    //     this.measureTextElement.style.top = '-10000px';
    //     this.measureTextElement.style.left = '-10000px';
    //     this.appendChildElement(document.body, this.measureTextElement);
    //   }
    //   this.measureTextElement.className = classNames.join(' ');
    //   this.measureTextElement.style.width = typeof maxWidth === 'number' ? maxWidth + 'px' : maxWidth;
    //   this.measureTextElement.innerHTML = text;

    //   height = this.textSizeCache[cacheKey] = this.measureTextElement.clientHeight;
    // }
    // return height;
    return 3;
  }

  /**
   * Creates a generic container element in the device's user-agent.
   * @param id The id of the element to create.
   * @param classNames An array of class names to apply to the element.
   */
  public createContainer(id?: string, classNames?: string[]): HTMLElement {
    return this.createElement('div', id, classNames);
  }

  /**
   * Creates a label (an element that only contains text) in the device's user-agent.
   * @param id The id of the element to create.
   * @param classNames An array of class names to apply to the element.
   * @param text The text within the label.
   * @param enableHTML Interpret text as html
   */
  public createLabel(id?: string, classNames?: string[], text?: string, enableHTML?: boolean): HTMLElement {
    const el = this.createElement('span', id, classNames);
    this.setElementContent(el, text, enableHTML);
    return el;
  }

  /**
   * Creates a button (an element that can be selected by the user to perform an action) in the device's user-agent.
   * @param id The id of the element to create.
   * @param classNames An array of class names to apply to the element.
   */
  public createButton(id?: string, classNames?: string[]): HTMLElement {
    return this.createElement('div', id, classNames);
  }

  /**
   * Creates a list in the device's user-agent.
   * @param id The id of the element to create.
   * @param classNames An array of class names to apply to the element.
   * @return A list within the device's user-agent.
   */
  public createList(id?: string, classNames?: string[]): HTMLElement {
    return this.createElement('ul', id, classNames);
  }

  /**
   * Creates a list item in the device's user-agent.
   * @param id The id of the element to create.
   * @param classNames An array of class names to apply to the element.
   */
  public createListItem(id?: string, classNames?: string[]): HTMLElement {
    return this.createElement('li', id, classNames);
  }

  /**
   * Creates an image in the device's user-agent.
   * @param src The source URL of the image.
   * @param id The id of the element to create.
   * @param classNames An array of class names to apply to the element.
   * @param size The size of the image.
   * @param onLoad The image.onload callback
   * @param onError The image.onerror callback
   */
  public createImage(
    src: string,
    id?: string,
    classNames?: string[],
    size?: ISize,
    onLoad?: (...args: any[]) => void,
    onError?: (...args: any[]) => void
  ): HTMLImageElement {
    const el = this.createElement('img', id, classNames);
    el.src = src;
    el.alt = '';
    if (size) {
      this.setElementSize(el, size);
    }
    if (onLoad !== undefined) {
      el.onload = onLoad;
    }
    if (onError !== undefined) {
      el.onerror = onError;
    }
    return el;
  }

  /**
   * Removes an element from its parent.
   * @param el The element to remove.
   */
  public removeElement(el: HTMLElement) {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  public getMediaPlayer(): MediaPlayer {
    return this.mediaPlayer;
  }

  /**
   * Creates an element in the device's user-agent.
   * @param tagName The tag name of the element to create.
   * @param id The id of the element to create.
   * @param classNames An array of class names to apply to the element.
   */
  public createElement<K extends keyof HTMLElementTagNameMap>(
    tagName?: K,
    id?: string,
    classNames?: string[]
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName);

    // don't add auto-generated IDs to the DOM
    if (id && id.substring(0, 1) !== '#') {
      el.id = id;
    }
    if (classNames && classNames.length > 0) {
      el.className = classNames.join(' ');
    }
    return el;
  }

  public getHistorian() {
    return new Historian(decodeURI(this.getWindowLocation().href));
  }

  /**
   * Exits to broadcast if this function has been overloaded by a modifier. Otherwise, calls exit().
   */
  public exitToBroadcast() {
    this.exit();
  }

  /**
   * Exits the application by invoking the window.close method
   */
  public exit(): void {
    window.close();
  }

  private trim(str: string): string {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  }
}

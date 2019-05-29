import { define } from 'trans-render/define.js';
import { decorate } from 'trans-render/decorate.js';
import { XtallatX } from 'xtal-element/xtal-latx.js';
import { hydrate } from 'trans-render/hydrate.js';
const use_symbols = 'use-symbols';
const attach_script = 'attach-script';
const where_target_selector = 'where-target-selector';
/**
 * `xtal-deco`
 *  Attach / override behavior to the next element
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
export class XtalDeco extends XtallatX(hydrate(HTMLElement)) {
    constructor() {
        super(...arguments);
        this._attachScript = false;
        this._c = false; //connected
        this._nextSibling = null;
        this._a = false; //attached
    }
    static get is() { return 'xtal-deco'; }
    static get observedAttributes() {
        return [use_symbols, attach_script, where_target_selector];
    }
    /**
     * Symbols to use for properties and methods
     */
    get useSymbols() {
        return this._useSymbols;
    }
    set useSymbols(nv) {
        this.attr(use_symbols, JSON.stringify(nv));
    }
    /**
     * Indicates there's script to attach.
     */
    get attachScript() {
        return this._attachScript;
    }
    set attachScript(val) {
        this.attr(attach_script, val, '');
    }
    /** @type {string}
     * Selector to search for within the next element.
     * This will select the target elements(s) to which properties and methods will be attached.
    */
    get whereTargetSelector() {
        return this._whereTargetSelector;
    }
    set whereTargetSelector(val) {
        if (val === undefined)
            return;
        this.attr(where_target_selector, val);
    }
    get decorateArgs() {
        return this._decorateArgs;
    }
    attributeChangedCallback(n, ov, nv) {
        switch (n) {
            case use_symbols:
                this._useSymbols = JSON.parse(nv);
                break;
            case attach_script:
                if (nv !== null) {
                    this.getElement('_script', t => t.querySelector('script'));
                }
                break;
            case where_target_selector:
                this._whereTargetSelector = nv;
                break;
        }
        this.onPropsChange();
    }
    connectedCallback() {
        this.style.display = 'none';
        this.propUp(['useSymbols', 'attachScript']);
        this.getElement('_nextSibling', t => {
            let nextEl = t.nextElementSibling;
            ;
            while (nextEl && nextEl.localName.indexOf('deco-') > -1) {
                nextEl = nextEl.nextElementSibling;
            }
            return nextEl;
        });
        this._c = true;
        this.onPropsChange();
    }
    // static attachBehavior(target : HTMLElement, evalObj: object) {
    //     decorate(target, evalObj);
    // }
    getElement(fieldName, getter) {
        this[fieldName] = getter(this);
        if (!this[fieldName]) {
            setTimeout(() => {
                this.getElement(fieldName, getter);
            });
            return;
        }
        this.onPropsChange();
    }
    evaluateCode(scriptElement) {
        //this.attachBehavior(XtallatX)
        const symbols = this._useSymbols ? this._useSymbols.map(symbol => `const ${symbol} = Symbol('${symbol}');`).join('') : '';
        const funS = `return function(){
            ${symbols} 
            return ${scriptElement.innerHTML.trim()};
        }`;
        //console.log(funS);
        const evalObj = new Function(funS)()();
        //console.log(evalObj);
        evalObj.propDefs = evalObj.props;
        evalObj.propVals = evalObj.vals;
        this._decorateArgs = evalObj;
        this.onPropsChange();
    }
    onPropsChange() {
        if (this._a)
            return;
        if (!this._decorateArgs && this._script) {
            this.evaluateCode(this._script);
        }
        if (!this._c || !this._nextSibling || !this._decorateArgs)
            return;
        let target = this._nextSibling;
        if (target !== null) {
            if (this._whereTargetSelector) {
                target = target.querySelector(this._whereTargetSelector);
            }
        }
        if (target === null) {
            setTimeout(() => {
                this.onPropsChange();
            }, 50);
            return;
        }
        decorate(target, this._decorateArgs);
        const da = target.getAttribute('disabled');
        if (da !== null) {
            if (da.length === 0 || da === "1") {
                target.removeAttribute('disabled');
            }
            else {
                target.setAttribute('disabled', (parseInt(da) - 1).toString());
            }
        }
        this._a = true;
        this.dataset.status = '📎'; //attached
    }
}
define(XtalDeco);

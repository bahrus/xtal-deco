import { decorate } from 'trans-render/decorate.js';
import { XtallatX, define } from 'xtal-element/xtal-latx.js';
import { hydrate } from 'trans-render/hydrate.js';
/**
 * `xtal-deco`
 *  Attach / override behavior onto the next element
 *
 * @element 'xtal-deco'
 */
let XtalDeco = /** @class */ (() => {
    class XtalDeco extends XtallatX(hydrate(HTMLElement)) {
        constructor() {
            super(...arguments);
            this._nextSibling = null;
            this._c = false; //connected
            this._a = false; //attached
            this.propActions = [
                ({ attachScript }) => {
                    if (attachScript !== null) {
                        this.getElement('_script', t => t.querySelector('script'));
                    }
                },
                ({ _script, self }) => {
                    self.evaluateCode(_script);
                },
                ({ _nextSibling, whereTargetSelector, self }) => {
                    if (_nextSibling === null)
                        return;
                    if (whereTargetSelector) {
                        self.getTargets(whereTargetSelector, _nextSibling);
                    }
                    else {
                        self.targets = [_nextSibling];
                    }
                },
                ({ targets, _decorateArgs, decoratorFn }) => {
                    if (!targets || (!_decorateArgs && !decoratorFn))
                        return;
                    targets.forEach(singleTarget => {
                        if (_decorateArgs) {
                            decorate(singleTarget, _decorateArgs);
                        }
                        else if (decoratorFn !== undefined) {
                            decoratorFn(singleTarget);
                        }
                        const da = singleTarget.getAttribute('disabled');
                        if (da !== null) {
                            if (da.length === 0 || da === "1") {
                                singleTarget.removeAttribute('disabled');
                            }
                            else {
                                singleTarget.setAttribute('disabled', (parseInt(da) - 1).toString());
                            }
                        }
                    });
                    this._a = true;
                    this.dataset.status = '📎'; //attached
                }
            ];
        }
        connectedCallback() {
            this.style.display = 'none';
            super.connectedCallback();
            this.getElement('_nextSibling', t => {
                let nextEl = t.nextElementSibling;
                ;
                while (nextEl && nextEl.localName.indexOf('deco-') > -1) {
                    nextEl = nextEl.nextElementSibling;
                }
                return nextEl;
            });
            this._c = true;
        }
        getElement(fieldName, getter) {
            this[fieldName] = getter(this);
            if (!this[fieldName]) {
                setTimeout(() => {
                    this.getElement(fieldName, getter);
                });
                return;
            }
        }
        evaluateCode(scriptElement) {
            const symbols = this.useSymbols ? this.useSymbols.map(symbol => `const ${symbol} = Symbol('${symbol}');`).join('') : '';
            const funS = `return function(){
            ${symbols} 
            return ${scriptElement.innerHTML.trim()};
        }`;
            const evalObj = new Function(funS)()();
            evalObj.propDefs = evalObj.props;
            evalObj.propVals = evalObj.vals;
            this._decorateArgs = evalObj;
        }
        getTargets(whereTargetSelector, nextSibling) {
            const targets = Array.from(nextSibling.querySelectorAll(whereTargetSelector));
            if (targets.length === 0) {
                setTimeout(() => {
                    this.getTargets(whereTargetSelector, nextSibling);
                }, 50);
                return;
            }
            this.targets = targets;
        }
    }
    XtalDeco.is = 'xtal-deco';
    XtalDeco.attributeProps = ({ useSymbols, attachScript, whereTargetSelector, decoratorFn, _script, _decorateArgs, _nextSibling, targets }) => ({
        bool: [attachScript],
        obj: [useSymbols, decoratorFn, _script, _decorateArgs, _nextSibling, targets],
        str: [whereTargetSelector],
        jsonProp: [useSymbols]
    });
    return XtalDeco;
})();
export { XtalDeco };
define(XtalDeco);

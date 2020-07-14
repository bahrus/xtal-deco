import { decorate } from 'trans-render/decorate.js';
import { XtallatX, define } from 'xtal-element/xtal-latx.js';
import { hydrate } from 'trans-render/hydrate.js';
export const linkNextSiblingTarget = ({ self }) => {
    self.getElement('nextSiblingTarget', t => {
        let nextEl = t.nextElementSibling;
        ;
        while (nextEl && nextEl.localName.indexOf('deco-') > -1) {
            nextEl = nextEl.nextElementSibling;
        }
        return nextEl;
    });
};
export const linkScriptElement = ({ attachScript, self }) => {
    if (attachScript !== null) {
        self.getElement('scriptElement', t => t.querySelector('script'));
    }
};
export const linkDecorateArgs = ({ scriptElement, self, useSymbols }) => {
    const symbols = useSymbols ? useSymbols.map(symbol => `const ${symbol} = Symbol('${symbol}');`).join('') : '';
    const funS = `return function(){
        ${symbols} 
        return ${scriptElement.innerHTML.trim()};
    }`;
    const evalObj = new Function(funS)()();
    evalObj.propDefs = evalObj.props;
    evalObj.propVals = evalObj.vals;
    self.decorateArgs = evalObj;
};
export const linkTargets = ({ nextSiblingTarget, whereTargetSelector, self }) => {
    if (nextSiblingTarget === null)
        return;
    if (whereTargetSelector) {
        self.getTargets(whereTargetSelector, nextSiblingTarget);
    }
    else {
        self.targets = [nextSiblingTarget];
    }
};
export const applyDecoration = ({ targets, decorateArgs, decoratorFn, self }) => {
    if (!targets || (!decorateArgs && !decoratorFn))
        return;
    targets.forEach(singleTarget => {
        if (decorateArgs) {
            decorate(singleTarget, decorateArgs);
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
    self.dataset.status = '📎'; //attached
};
/**
 * Attach / override behavior onto the next element
 * @element xtal-deco
 *
 */
export class XtalDeco extends XtallatX(hydrate(HTMLElement)) {
    constructor() {
        super(...arguments);
        this.nextSiblingTarget = null;
        this.propActions = [
            linkNextSiblingTarget,
            linkScriptElement,
            linkDecorateArgs,
            linkTargets,
            applyDecoration,
        ];
    }
    connectedCallback() {
        this.style.display = 'none';
        super.connectedCallback();
        linkNextSiblingTarget(this);
    }
    getElement(fieldName, getter) {
        this[fieldName] = getter(this);
        if (!this[fieldName]) {
            setTimeout(() => {
                this.getElement(fieldName, getter);
            }, 10);
            return;
        }
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
XtalDeco.attributeProps = ({ disabled, useSymbols, attachScript, whereTargetSelector, decoratorFn, scriptElement, decorateArgs, nextSiblingTarget, targets }) => ({
    bool: [attachScript, disabled],
    obj: [useSymbols, decoratorFn, scriptElement, decorateArgs, nextSiblingTarget, targets],
    str: [whereTargetSelector],
    jsonProp: [useSymbols]
});
define(XtalDeco);

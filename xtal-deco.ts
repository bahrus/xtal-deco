import { decorate } from 'trans-render/decorate.js';
import { DecorateArgs } from "trans-render/types.d.js";
import { XtallatX, define, AttributeProps} from 'xtal-element/xtal-latx.js';
import { hydrate } from 'trans-render/hydrate.js';

const onConnected = ({disabled, self}: XtalDeco) =>{
    self.getElement('nextSiblingTarget', t => {
        let nextEl = t.nextElementSibling;;
        while(nextEl && nextEl.localName.indexOf('deco-') > -1){
            nextEl = nextEl.nextElementSibling;
        }
        return nextEl as HTMLElement;
    });
};

const onAttachScript = ({attachScript, self}: XtalDeco) => {
    if(attachScript !== null){
        self.getElement('scriptElement', t => t.querySelector('script'));
    }
};

const onScriptElement = ({scriptElement, self}: XtalDeco) => {
    self.evaluateCode(scriptElement);
};

const onNextSiblingTarget = ({nextSiblingTarget, whereTargetSelector, self}: XtalDeco) =>{
    if(nextSiblingTarget === null) return;
    if(whereTargetSelector){
        self.getTargets(whereTargetSelector, nextSiblingTarget);
    }else{
        self.targets = [nextSiblingTarget];
    }
};

const onTargets = ({targets, decorateArgs, decoratorFn, self}: XtalDeco) => {
    if(!targets || (!decorateArgs && !decoratorFn)) return;
    targets.forEach(singleTarget =>{
        if(decorateArgs){
            decorate(singleTarget as HTMLElement, decorateArgs);
        }else if(decoratorFn !== undefined){
            decoratorFn(singleTarget as HTMLElement);
        }  
        const da = singleTarget.getAttribute('disabled');
        if(da !== null){
            if(da.length === 0 ||da==="1"){
                singleTarget.removeAttribute('disabled');
            }else{
                singleTarget.setAttribute('disabled', (parseInt(da) - 1).toString());
            }
        }            
    });
    self.dataset.status = '📎'; //attached
}


/**
 * Attach / override behavior onto the next element
 * @element xtal-deco
 * 
 */
export class XtalDeco extends XtallatX(hydrate(HTMLElement)) {

    static is = 'xtal-deco';

    static attributeProps = ({disabled, useSymbols, attachScript, whereTargetSelector, decoratorFn,
         scriptElement, decorateArgs: _decorateArgs, nextSiblingTarget, targets}: XtalDeco
    ) => ({
        bool: [attachScript, disabled],
        obj: [useSymbols, decoratorFn, scriptElement, _decorateArgs, nextSiblingTarget, targets],
        str: [whereTargetSelector],
        jsonProp: [useSymbols]
    } as AttributeProps);


    /**
     * Symbols to use for properties and methods
     * @attr use-symbols
     */
    useSymbols: string[] | undefined;

    /**
     * Indicates there's script to attach.
     * @attr attach-script
     */
    attachScript: boolean | undefined;

    scriptElement!: HTMLScriptElement;

    /** 
     * Selector to search for within the next element. 
     * This will select the target elements(s) to which properties and methods will be attached.
     * @attr where-target-selector
    */
    whereTargetSelector: string | undefined;

    decorateArgs: DecorateArgs | undefined;

    nextSiblingTarget: HTMLElement | null = null;


    targets: Element[] | undefined;


    decoratorFn: undefined | ((target: HTMLElement) => void);

    propActions = [
        onConnected,
        onAttachScript,
        onScriptElement,
        onNextSiblingTarget,
        onTargets,
    ]


    connectedCallback() {
        this.style.display = 'none';
        super.connectedCallback();
        this.disabled = this.disabled;

    }


    getElement(fieldName: string, getter: (t: XtalDeco) => HTMLElement | null){
        (<any>this)[fieldName] = getter(this);
        if(!(<any>this)[fieldName]){
            setTimeout(() =>{
                this.getElement(fieldName, getter);
            })
            return;
        }
    }

    evaluateCode(scriptElement: HTMLScriptElement) {
        const symbols = this.useSymbols ? this.useSymbols.map(symbol => `const ${symbol} = Symbol('${symbol}');`).join('')  : '';
        const funS = `return function(){
            ${symbols} 
            return ${scriptElement.innerHTML.trim()};
        }`;
        const evalObj = new Function(funS)()();
        evalObj.propDefs = evalObj.props;
        evalObj.propVals = evalObj.vals;
        this.decorateArgs = evalObj;
        

    }

    getTargets(whereTargetSelector: string, nextSibling: HTMLElement){
        const targets = Array.from(nextSibling.querySelectorAll(whereTargetSelector));
        if(targets.length === 0){
            setTimeout(() => {
                this.getTargets(whereTargetSelector, nextSibling);
            }, 50);
            return;
        }
        this.targets = targets;
    }

}
define(XtalDeco);
declare global {
    interface HTMLElementTagNameMap {
        "xtal-deco": XtalDeco,
    }
}
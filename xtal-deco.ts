import { decorate } from 'trans-render/decorate.js';
import { DecorateArgs } from "trans-render/types.d.js";
import { XtallatX, define, AttributeProps} from 'xtal-element/xtal-latx.js';
import { hydrate } from 'trans-render/hydrate.js';

/**
 * Attach / override behavior onto the next element
 * @element xtal-deco
 * 
 */
export class XtalDeco extends XtallatX(hydrate(HTMLElement)) {

    static is = 'xtal-deco';

    static attributeProps = ({useSymbols, attachScript, whereTargetSelector, decoratorFn,
         _script, _decorateArgs, _nextSibling, targets}: XtalDeco
    ) => ({
        bool: [attachScript],
        obj: [useSymbols, decoratorFn, _script, _decorateArgs, _nextSibling, targets],
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

    _script!: HTMLScriptElement;

    /** 
     * Selector to search for within the next element. 
     * This will select the target elements(s) to which properties and methods will be attached.
     * @attr where-target-selector
    */
    whereTargetSelector: string | undefined;

    _decorateArgs: DecorateArgs | undefined;

    _nextSibling: HTMLElement | null = null;

    _c = false; //connected

    targets: Element[] | undefined;


    decoratorFn: undefined | ((target: HTMLElement) => void);

    _a = false; //attached

    propActions = [
        ({attachScript}: XtalDeco) => {
            if(attachScript !== null){
                this.getElement('_script', t => t.querySelector('script'));
            }
        },
        ({_script, self}: XtalDeco) => {
            self.evaluateCode(_script);
        },
        ({_nextSibling, whereTargetSelector, self}: XtalDeco) =>{
            if(_nextSibling === null) return;
            if(whereTargetSelector){
                self.getTargets(whereTargetSelector, _nextSibling);
            }else{
                self.targets = [_nextSibling];
            }
            
        },
        ({targets, _decorateArgs, decoratorFn, self}: XtalDeco) => {
            if(!targets || (!_decorateArgs && !decoratorFn)) return;
            targets.forEach(singleTarget =>{
                if(_decorateArgs){
                    decorate(singleTarget as HTMLElement, _decorateArgs);
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
            self._a = true;
            self.dataset.status = '📎'; //attached
        }
    ]

 

    connectedCallback() {
        this.style.display = 'none';
        super.connectedCallback();
        this.getElement('_nextSibling', t => {
            let nextEl = t.nextElementSibling;;
            while(nextEl && nextEl.localName.indexOf('deco-') > -1){
                nextEl = nextEl.nextElementSibling;
            }
            return nextEl as HTMLElement;
        });
        this._c = true;
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
        this._decorateArgs = evalObj;
        

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
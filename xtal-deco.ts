import {xc, PropAction, PropDef, PropDefMap, ReactiveSurface, IReactor} from 'xtal-element/lib/XtalCore.js';
import {EventSettings} from 'xtal-element/types.d.js';
import {camelToLisp} from 'trans-render/lib/camelToLisp.js';
import {getDestructArgs} from 'xtal-element/lib/getDestructArgs.js';

/**
 * Attach / override behavior onto the next element
 * @element xtal-deco
 * 
 */
 export class XtalDeco<TTargetElement extends HTMLElement = HTMLElement> extends HTMLElement implements ReactiveSurface{

    static is = 'xtal-deco';

    self = this;
    propActions = propActions;
    reactor: IReactor = new xc.Rx(this);
    onPropChange(n: string, propDef: PropDef, newVal: any){
        this.reactor.addToQueue(propDef, newVal);
    }


    /** 
     * Selector to search for within the next element. 
     * This will select the target elements(s) to which properties and methods will be attached.
     * @attr where-target-selector
    */
    whereTargetSelector: string | undefined;

    nextSiblingTarget: Element | null = null;

    /**
     * temporary holder of target elements to apply proxy to.
     */
    targets: Element[] | undefined;

    /**
     * temporary holder of proxies that need initalizing.
     */
    proxies: Element[] | undefined;

    /**
     * Proxy for the target element (not the elements matching whereTargetSelector)
     */
    mainProxy: Element | undefined;

    /**
     * Main Target Element
     */
    mainTarget: Element | undefined;

    /**
     * Set these properties via a weakmap, rather than on the (native) element itself.
     */
    virtualProps: string[] | undefined;

    

    actions: PropAction<any>[] | undefined;

    init: PropAction<TTargetElement> | undefined;

    on: EventSettings | undefined;

    matchClosest: string | undefined;

    targetToProxyMap: WeakMap<any, any> = new WeakMap();

    connectedCallback() {
        this.style.display = 'none';
        xc.hydrate<XtalDeco>(this as any as XtalDeco, slicedPropDefs);
        linkNextSiblingTarget(this as any as XtalDeco);
    }

    handlers: eventHandlers | undefined;
    disconnectedCallback(){
        this.disconnect();
    }
    disconnect(){
        if(this.targets === undefined || this.handlers === undefined) return;
        this.targets.forEach(target =>{
            for(const key in this.handlers){
                const targetHandlers = this.handlers[key];
                targetHandlers.forEach(targetHandler => {
                    target.removeEventListener(key, targetHandler);
                })
            }
        })
    }

    // subscribers: {propsOfInterest: Set<string | symbol>, callBack: (t: TTargetElement, x: XtalDeco<TTargetElement>) => void}[] = [];
    // subscribe(propsOfInterest: Set<string>, callBack: (t: TTargetElement, x: XtalDeco<TTargetElement>) => void){
    //     this.subscribers.push({propsOfInterest, callBack})
    // }

    // unsubscribe(propsOfInterest: Set<string>, callBack: (t: TTargetElement, x: XtalDeco<TTargetElement>) => void){
    //     const idx = this.subscribers.findIndex(s => s.propsOfInterest === propsOfInterest && s.callBack === callBack);
    //     if(idx > -1) this.subscribers.splice(idx, 1);
    // }

}
//https://gomakethings.com/finding-the-next-and-previous-sibling-elements-that-match-a-selector-with-vanilla-js/
function getNextSibling (elem: Element, selector: string | undefined) {

	// Get the next sibling element
    var sibling = elem.nextElementSibling;
    if(selector === undefined) return sibling;

	// If the sibling matches our selector, use it
	// If not, jump to the next sibling and continue the loop
	while (sibling) {
		if (sibling.matches(selector)) return sibling;
		sibling = sibling.nextElementSibling
	}
    return sibling;
};

// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Mutation_events#Mutation_Observers_alternatives_examples
//can't we use https://developer.mozilla.org/en-US/docs/Web/API/Node/contains#:~:text=The%20Node.,direct%20children%2C%20and%20so%20on.?
function onRemove(element: Element, callback: Function) {
    let observer = new MutationObserver(mutations => {
        mutations.forEach(mutation =>{
            mutation.removedNodes.forEach(removed =>{
                if(element === removed){
                    callback();
                    observer.disconnect();
                }
            })
        })
    });
    observer.observe(element.parentElement || element.getRootNode(), {
        childList: true,
    });
};

export const linkNextSiblingTarget = ({self, matchClosest}: XtalDeco) => {
    const nextEl = getNextSibling(self, matchClosest);
    if(!nextEl){
        setTimeout(() =>{
            linkNextSiblingTarget(self);
        }, 50);
        return;
    }
    self.nextSiblingTarget = nextEl;
};

export const linkTargets = ({nextSiblingTarget, whereTargetSelector, self}: XtalDeco<HTMLElement>) => {
    if(nextSiblingTarget === null) return;
    if(whereTargetSelector){
        const targets = Array.from(nextSiblingTarget.querySelectorAll(whereTargetSelector));
        if(nextSiblingTarget.matches(whereTargetSelector)) targets.unshift(nextSiblingTarget);
        self.targets = targets;
    }else{
        self.targets = [nextSiblingTarget];
    }
};



export const linkProxies = ({targets, actions, self, virtualProps, targetToProxyMap}: XtalDeco) => {
    if(targets === undefined || actions === undefined) return;
    const proxies: Element[] = [];
    const virtualPropHolders = new WeakMap();
    targets.forEach(proxyTarget =>{
        
        const proxy = new Proxy(proxyTarget, {
            set: (target: any, key, value) => {
                const virtualPropHolder = virtualPropHolders.get(target);
                if(key === 'self' || (virtualProps !== undefined && virtualProps.includes(key as string))){
                    virtualPropHolder[key] = value;
                }else{
                    target[key] = value;
                }
                if(key === 'self') return true;
                actions.forEach(action =>{
                    const dependencies = getDestructArgs(action);
                    if(dependencies.includes(key as string)){
                        //TODO:  symbols
                        const arg = Object.assign({}, virtualPropHolder, target);
                        action(arg as HTMLElement);
                    }
                });
                switch(typeof key){
                    case 'string':
                        self.dispatchEvent(new CustomEvent(camelToLisp(key) + '-changed', {
                            detail:{
                                value: value
                            }
                        }));
                        break;
                }
                // for(const subscription of self.subscribers){
                //     if(subscription.propsOfInterest.has(key)){
                //         subscription.callBack(target, self);
                //     }
                // }
                return true;
            },
            get:(target, key)=>{
                let value;// = Reflect.get(target, key);
                if(key === 'self' || (virtualProps !== undefined && virtualProps.includes(key as string))){
                    const virtualPropHolder = virtualPropHolders.get(target);
                    value = virtualPropHolder[key];
                }else{
                    value = target[key];// = value;
                }
                if(typeof(value) == "function"){
                    return value.bind(target);
                }
                return value;
            }
        });
        virtualPropHolders.set(proxyTarget, {});
        targetToProxyMap.set(proxyTarget, proxy);
        proxies.push(proxy);
        
    });
    self.mainProxy = proxies[0];
    self.mainTarget = targets[0];
    self.proxies = proxies;
    delete self.targets; //avoid memory leaks
}



export const linkHandlers = ({proxies, on, self}: XtalDeco) => {
    if(proxies === undefined || on === undefined) return;
    const handlers: eventHandlers = {};
    for(var key in on){
        const eventSetting = on[key];
        switch(typeof eventSetting){
            case 'function':
                const targetHandlers = proxies.map(target =>{
                    //const handler = eventSetting.bind(target);

                    target.addEventListener(key, e => {
                        const aTarget = target as any;
                        const prevSelf = aTarget.self;
                        aTarget.self = target;
                        eventSetting(target, e);
                        aTarget.self = prevSelf;
                    });
                    return eventSetting;
                });
                break;
            default:
                throw 'not implemented yet';
        }
    }

    self.disconnect();
    self.handlers = handlers;
}

export const doInit = ({proxies, init, self}: XtalDeco) => {
    if(proxies === undefined || init === undefined) return;
    proxies.forEach((target: any) => {
        target.self = target;
        init(target as HTMLElement);
    }); 
    delete self.proxies; //avoid memory leaks
}

export const watchForTargetRelease = ({self, mainTarget}: XtalDeco) => {
    if(mainTarget === undefined) return;
    onRemove(mainTarget, () =>{
        self.mainTarget = undefined;
    })
}

export const releaseProxy = ({self, mainTarget}: XtalDeco) => {
    if(mainTarget === undefined){
        delete self.mainProxy;
    }
} 

export const propActions = [linkNextSiblingTarget, linkTargets, linkProxies, linkHandlers, doInit, watchForTargetRelease, releaseProxy] as PropAction[];

type eventHandlers = {[key: string]: ((e: Event) => void)[]};

const obj1 : PropDef = {
    type: Object,
    dry: true
};
const str1: PropDef = {
    type: String,
    dry: true,
    reflect: true,
};
const propDefMap : PropDefMap<XtalDeco> = {
    nextSiblingTarget: obj1, targets: obj1, init: obj1, actions: obj1, proxies: obj1, on: obj1, mainProxy: obj1, mainTarget: obj1,
    virtualProps: {
        type: Object,
        dry: true,
        parse: true,
    },
    targetToProxyMap: {
        type: Object,
        dry: true,
        notify: true,
    },
    matchClosest: str1,
    whereTargetSelector: str1,
};
const slicedPropDefs = xc.getSlicedPropDefs(propDefMap);


xc.letThereBeProps<XtalDeco>(XtalDeco, slicedPropDefs, 'onPropChange');
xc.define(XtalDeco);
declare global {
    interface HTMLElementTagNameMap {
        "xtal-deco": XtalDeco,
    }
}
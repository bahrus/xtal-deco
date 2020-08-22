import { XtallatX, define, AttributeProps, PropAction, deconstruct, EventSettings} from 'xtal-element/xtal-latx.js';
import { hydrate } from 'trans-render/hydrate.js';

export const linkNextSiblingTarget = ({self}: XtalDeco) => {
    let nextEl = self as Element | null;
    while(nextEl && (nextEl.localName.indexOf('-deco') > -1)){
        nextEl = nextEl.nextElementSibling;
    }
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



export const linkProxies = ({targets, actions, self, proxyId}: XtalDeco) => {
    if(targets === undefined || actions === undefined) return;
    const proxies: Element[] = [];
    targets.forEach(proxyTarget =>{
        const proxy = new Proxy(proxyTarget, {
            set: (target: any, key, value) => {
                target[key] = value;
                if(key === 'self') return true;
                actions.forEach(action =>{
                    const dependencies = deconstruct(action);
                    if(dependencies.includes(key as string)){ //TODO:  symbols
                        const prevSelf = target.self;
                        target.self = target;
                        action(target as HTMLElement);
                        target.self = prevSelf;
                    }
                });
                return true;
            },
            get:(obj,key)=>{
                let value = Reflect.get(obj,key);
                if(typeof(value) == "function"){
                    return value.bind(obj);
                }
                return value;
            }
        });
        proxies.push(proxy);
        if(proxyId !== undefined){
            const sym = Symbol.for(proxyId);
            const preElevatedProps = (<any>proxyTarget)[sym];
            if(preElevatedProps !== undefined){
                Object.assign(proxy, preElevatedProps);
            }
            (<any>proxyTarget)[sym] = proxy;
            proxyTarget.dispatchEvent(new CustomEvent(proxyId + '-proxy-attached', {
                detail: {
                    proxy: proxy,
                }
            }));
        }
    });
    self.proxies = proxies;
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
                //handlers[key] = targetHandlers;
                break;
            default:
                throw 'not implemented yet';
        }
    }

    self.disconnect();
    self.handlers = handlers;
}

export const doInit = ({proxies, init}: XtalDeco) => {
    if(proxies === undefined || init === undefined) return;
    proxies.forEach((target: any) => {
        const prevSelf = target.self;
        target.self = target;
        init(target as HTMLElement);
        target.self = prevSelf;
    }); 
}

export const propActions = [linkNextSiblingTarget, linkTargets, linkProxies, linkHandlers, doInit];

type eventHandlers = {[key: string]: ((e: Event) => void)[]};

/**
 * Attach / override behavior onto the next element
 * @element xtal-deco
 * 
 */
export class XtalDeco<TTargetElement extends HTMLElement = HTMLElement> extends XtallatX(hydrate(HTMLElement)) {

    static is = 'xtal-deco';

    static attributeProps = ({disabled,  whereTargetSelector, nextSiblingTarget, targets, init, actions, proxies, on, proxyId}: XtalDeco
   ) => ({
       bool: [disabled],
       obj: [nextSiblingTarget, targets, init, actions, proxies, on],
       str: [whereTargetSelector, proxyId],
   } as AttributeProps);


    /** 
     * Selector to search for within the next element. 
     * This will select the target elements(s) to which properties and methods will be attached.
     * @attr where-target-selector
    */
    whereTargetSelector: string | undefined;

    nextSiblingTarget: Element | null = null;


    targets: Element[] | undefined;

    proxies: Element[] | undefined;

    propActions = propActions as PropAction<any>[];

    actions: PropAction<any>[] | undefined;

    init: PropAction<TTargetElement> | undefined;

    on: EventSettings | undefined;

    proxyId: string | undefined;

    connectedCallback() {
        this.style.display = 'none';
        super.connectedCallback();
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

}
define(XtalDeco);
declare global {
    interface HTMLElementTagNameMap {
        "xtal-deco": XtalDeco,
    }
}
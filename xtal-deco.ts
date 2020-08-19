// import { decorate } from 'trans-render/plugins/decorate.js';
// import { DecorateArgs } from "trans-render/types.d.js";
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

export const linkTargets = ({nextSiblingTarget, whereTargetSelector, self}: XtalDeco) => {
    if(nextSiblingTarget === null) return;
    if(whereTargetSelector){
        //self.getTargets(whereTargetSelector, nextSiblingTarget);
        self.targets = Array.from(nextSiblingTarget.querySelectorAll(whereTargetSelector));
    }else{
        self.targets = [nextSiblingTarget];
    }
};



export const linkProxies = ({targets, actions, self}: XtalDeco) => {
    if(targets === undefined || actions === undefined) return;
    self.proxies = [];
    targets.forEach(proxyTarget =>{
        const proxy = new Proxy(proxyTarget, {
            set: (target: any, key, value) => {
                target[key] = value;
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
        self.proxies!.push(proxy);
    })
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
export class XtalDeco extends XtallatX(hydrate(HTMLElement)) {

    static is = 'xtal-deco';

    static attributeProps = ({disabled,  whereTargetSelector, nextSiblingTarget, targets, init, actions, proxies, on}: XtalDeco
   ) => ({
       bool: [disabled],
       obj: [nextSiblingTarget, targets, init, actions, proxies, on],
       str: [whereTargetSelector],
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

    propActions = propActions;

    actions: PropAction[] | undefined;

    init: PropAction | undefined;

    on: EventSettings | undefined;

    connectedCallback() {
        this.style.display = 'none';
        super.connectedCallback();
        linkNextSiblingTarget(this);
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
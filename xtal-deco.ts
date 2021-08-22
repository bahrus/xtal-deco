import {CE, PropInfo} from 'trans-render/lib/CE.js';
import {XtalDecoProps, eventHandlers, XtalDecoActions} from './types.js';
import {getDestructArgs} from 'trans-render/lib/getDestructArgs.js';

const ce = new CE<XtalDecoProps, PropInfo, XtalDecoActions>();

export class XtalDecoCore extends HTMLElement implements XtalDecoActions{

    targetToProxyMap: WeakMap<any, any> = new WeakMap();

    createProxies(self: this){
        const {targets, actions, virtualProps, targetToProxyMap} = self;
        const proxies: Element[] = [];
        const virtualPropHolders = new WeakMap();
        targets!.forEach(proxyTarget =>{
            const proxy = new Proxy(proxyTarget, {
                set: (target: any, key, value) => {
                    const virtualPropHolder = virtualPropHolders.get(target);
                    if(key === 'self' || (virtualProps?.includes(key as string))){
                        virtualPropHolder[key] = value;
                    }else{
                        target[key] = value;
                    }
                    if(key === 'self') return true;
                    actions!.forEach(action =>{
                        const dependencies = getDestructArgs(action);
                        if(dependencies.includes(key as string)){
                            //TODO:  symbols
                            const arg = Object.assign({}, virtualPropHolder, target);
                            action(arg as HTMLElement);
                        }
                    });
                    switch(typeof key){
                        case 'string':
                            self.dispatchEvent(new CustomEvent(ce.toLisp(key) + '-changed', {
                                detail:{
                                    value: value
                                }
                            }));
                            break;
                    }
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
        const returnObj = {proxies, mainProxy: proxies[0], mainTarget: targets![0], targets: undefined} as px;
        return returnObj;
    }

    linkTargets(self: this){
        const {nextSiblingTarget, whereTargetSelector} = self;

        if(whereTargetSelector === undefined){
            return {targets : [nextSiblingTarget!]} as px;
        }else{
            const targets = Array.from(nextSiblingTarget!.querySelectorAll(whereTargetSelector!));
            if(nextSiblingTarget!.matches(whereTargetSelector!)) targets.unshift(nextSiblingTarget!);
            return {targets} as px;
        }
    }


    linkNextSiblingTarget(self: this){
        const {matchClosest, linkNextSiblingTarget, isC} = self;
        const nextSiblingTarget = getNextSibling(self, matchClosest);
        if(!nextSiblingTarget){
            setTimeout(() =>{
                linkNextSiblingTarget(self);
            }, 50);
            return;
        }
        return {nextSiblingTarget};
    }

    linkHandlers(self: this){
        const {proxies, on} = self;
        const handlers: eventHandlers = {};
        for(var key in on){
            const eventSetting = on[key];
            switch(typeof eventSetting){
                case 'function':
                    const targetHandlers = proxies!.map(target =>{
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
        return {disconnect: true, handlers} as px;
    }

    doDisconnect(self: this){
        const {targets, handlers} = self;
        targets!.forEach(target =>{
            for(const key in handlers){
                const targetHandlers = handlers[key];
                targetHandlers.forEach(targetHandler => {
                    target.removeEventListener(key, targetHandler);
                })
            }
        });
        return {disconnect: false} as px;
    }

    doInit(self: this){
        const {proxies, init} = self;
        proxies!.forEach((target: any) => {
            target.self = target;
            init!(target as HTMLElement);
        }); 
        return {proxies: undefined} as px;
    }

    watchForTargetRelease(self: this){
        const {mainTarget} = self;
        onRemove(mainTarget!, () =>{
            self.mainTarget = undefined;
        });
    }
};

export interface XtalDecoCore extends XtalDecoProps {}

type px = Partial<XtalDecoCore>;

//export interface XtalDeco extends HTMLElement, XtalDecoMethods{}

export const XtalDeco = ce.def({
    config:{
        tagName: 'xtal-deco',
        propDefaults:{
            isC: true,
        },
        actions: {
            createProxies: {
                ifAllOf: ['targets', 'actions'],
                andAlsoActIfKeyIn: ['virtualProps'],
            },
            linkTargets: { 
                ifAllOf: ['nextSiblingTarget'],
            },
            linkNextSiblingTarget: {
                ifAllOf: ['isC'],
                andAlsoActIfKeyIn: ['matchClosest'],
            },
            linkHandlers: {
                ifAllOf: ['proxies', 'on']
            },
            doDisconnect: {
                ifAllOf: ['targets', 'handlers', 'disconnect'],
            },
            doInit: {
                ifAllOf: ['proxies', 'init'],
            },
            watchForTargetRelease: {
                ifAllOf: ['mainTarget'],
            }
        },
        style: {
            display: 'none'
        }
    },
    superclass: XtalDecoCore
}) as {new(): XtalDecoCore};

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

declare global {
    interface HTMLElementTagNameMap {
        "xtal-deco": XtalDecoCore,
    }
}

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



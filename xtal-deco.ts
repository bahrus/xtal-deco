import {define, camelToLisp} from 'trans-render/lib/define.js';
import {XtalDecoProps, eventHandlers, IXtalDeco} from './types.js';
import {getDestructArgs} from 'trans-render/lib/getDestructArgs.js';

export class XtalDecoCore extends HTMLElement implements IXtalDeco{

    targetToProxyMap: WeakMap<any, any> = new WeakMap();

    linkProxies(self: x){
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
                            self.dispatchEvent(new CustomEvent(camelToLisp(key) + '-changed', {
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
        const returnObj = {proxies, mainProxy: proxies[0], mainTarget: targets![0]} as px;
        delete self.targets; //avoid memory leaks
        return returnObj;
    }

    linkTargets(self: x){
        const {nextSiblingTarget, whereTargetSelector} = self;

        if(whereTargetSelector === undefined){
            return {targets : [nextSiblingTarget!]} as px;
        }else{
            const targets = Array.from(nextSiblingTarget!.querySelectorAll(whereTargetSelector!));
            if(nextSiblingTarget!.matches(whereTargetSelector!)) targets.unshift(nextSiblingTarget!);
            return {targets} as px;
        }
    }



    linkNextSiblingTarget(self: x){
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

    linkHandlers(self: x){
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

    doDisconnect(self: x){
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

    doInit(self: x){
        const {proxies, init} = self;
        proxies!.forEach((target: any) => {
            target.self = target;
            init!(target as HTMLElement);
        }); 
        delete self.proxies; //avoid memory leaks
    }

    watchForTargetRelease(self: x){
        const {mainTarget} = self;
        onRemove(mainTarget!, () =>{
            self.mainTarget = undefined;
        });
    }
};

type x = IXtalDeco; type px = Partial<x>;


//export interface XtalDeco extends HTMLElement, XtalDecoMethods{}

export const XtalDeco = define<IXtalDeco>({
    config:{
        tagName: 'xtal-deco',
        propDefaults:{
            isC: true,
        },
        actions: [
            {
                do: 'linkProxies',
                upon: ['targets', 'actions', 'virtualProps'],
                riff: ['targets', 'actions'],
                merge: true,
            },{ 
                do: 'linkTargets',
                upon: ['nextSiblingTarget'],
                riff: '"',
                merge: true,
            },{
                do: 'linkNextSiblingTarget',
                'upon': ['isC', 'matchClosest'],
                'riff': ['isC'],
                merge: true,
            },{
                do: 'linkHandlers',
                upon: ['proxies', 'on'],
                riff: '"',
                merge: true,
            },{
                do: 'doDisconnect',
                upon: ['targets', 'handlers', 'disconnect'],
                riff: '"',
                merge: true,
            },{
                do: 'doInit',
                upon: ['proxies', 'init'],
                riff: '"'
            },{
                do: 'watchForTargetRelease',
                upon: ['mainTarget'],
                riff: '"',
            }
        ],
        style: {
            display: 'none'
        }
    },
    superclass: XtalDecoCore
}) as {new(): IXtalDeco};

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
        "xtal-deco": IXtalDeco,
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



import {define, camelToLisp} from 'trans-render/lib/define.js';
import {XtalDecoProps, eventHandlers} from './types.d.js';
import {getDestructArgs} from 'xtal-element/lib/getDestructArgs.js';

const XtalDecoMixin = (baseClass: {new(): HTMLElement}) =>  class extends baseClass implements XtalDeco{

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
        self.mainProxy = proxies[0];
        self.mainTarget = targets![0];
        self.proxies = proxies;
        delete self.targets; //avoid memory leaks
    }

    linkTargetsWithSelector(self: x){
        const {nextSiblingTarget, whereTargetSelector} = self;
        const targets = Array.from(nextSiblingTarget!.querySelectorAll(whereTargetSelector!));
        if(nextSiblingTarget!.matches(whereTargetSelector!)) targets.unshift(nextSiblingTarget!);
        self.targets = targets;
    }

    linkTargetsNoSelector(self: x){
        const {nextSiblingTarget} = self;
        self.targets = [nextSiblingTarget!];
    }

    linkNextSiblingTarget(self: x){
        const {matchClosest, linkNextSiblingTarget} = self;
        const nextEl = getNextSibling(self, matchClosest);
        if(!nextEl){
            setTimeout(() =>{
                linkNextSiblingTarget(self);
            }, 50);
            return;
        }
        self.nextSiblingTarget = nextEl;
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

        self.disconnect = true;
        self.handlers = handlers;
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
        })
        self.disconnect = false;
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
        onRemove(mainTarget, () =>{
            self.mainTarget = undefined;
        });
    }
};


export interface XtalDeco extends XtalDecoProps, HTMLElement{
    linkProxies(self: x): void;
    linkTargetsWithSelector(self: x): void;
    linkTargetsNoSelector(self: x): void;
    linkNextSiblingTarget(self: x): void;
    linkHandlers(self: x): void;
    doDisconnect(self: x): void;
    doInit(self: x): void;
    watchForTargetRelease(self: x): void;
}

type x = XtalDeco;


//export interface XtalDeco extends HTMLElement, XtalDecoMethods{}

export const XtalDeco = define<XtalDeco>({
    config:{
        tagName: 'xtal-deco',
        actions: [
            {
                do: 'linkProxies',
                upon: ['targets', 'actions', 'virtualProps'],
                riff: ['targets', 'actions']
            },{
                do: 'linkTargetsWithSelector',
                upon: ['nextSiblingTarget', 'whereTargetSelector'],
                riff: '"'
            },{ //verbose if condition -- overkill ?
                do: 'linkTargetsNoSelector',
                upon: ['nextSiblingTarget'],
                riff: '"',
                rift: ['whereTargetSelector']
            },{
                do: 'linkNextSiblingTarget',
                'upon': ['nextSiblingTarget'],
                'riff': '"',
            },{
                do: 'linkHandlers',
                upon: ['proxies', 'on'],
                riff: '"'
            },{
                do: 'doDisconnect',
                upon: ['targets', 'handlers', 'disconnect'],
                riff: '"'
            },{
                do: 'doInit',
                upon: ['proxies', 'init'],
                riff: '"'
            },{
                do: 'watchForTargetRelease',
                upon: ['mainTarget'],
                riff: '"',
            }
        ]
    },
    mixins: [XtalDecoMixin]
}) as {new(): XtalDeco};

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


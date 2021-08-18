import { define, camelToLisp } from 'trans-render/lib/define.js';
import { getDestructArgs } from 'xtal-element/lib/getDestructArgs.js';
const XtalDecoMixin = (baseClass) => class extends baseClass {
    constructor() {
        super(...arguments);
        this.targetToProxyMap = new WeakMap();
    }
    linkProxies(self) {
        const { targets, actions, virtualProps, targetToProxyMap } = self;
        const proxies = [];
        const virtualPropHolders = new WeakMap();
        targets.forEach(proxyTarget => {
            const proxy = new Proxy(proxyTarget, {
                set: (target, key, value) => {
                    const virtualPropHolder = virtualPropHolders.get(target);
                    if (key === 'self' || (virtualProps?.includes(key))) {
                        virtualPropHolder[key] = value;
                    }
                    else {
                        target[key] = value;
                    }
                    if (key === 'self')
                        return true;
                    actions.forEach(action => {
                        const dependencies = getDestructArgs(action);
                        if (dependencies.includes(key)) {
                            //TODO:  symbols
                            const arg = Object.assign({}, virtualPropHolder, target);
                            action(arg);
                        }
                    });
                    switch (typeof key) {
                        case 'string':
                            self.dispatchEvent(new CustomEvent(camelToLisp(key) + '-changed', {
                                detail: {
                                    value: value
                                }
                            }));
                            break;
                    }
                    return true;
                },
                get: (target, key) => {
                    let value; // = Reflect.get(target, key);
                    if (key === 'self' || (virtualProps !== undefined && virtualProps.includes(key))) {
                        const virtualPropHolder = virtualPropHolders.get(target);
                        value = virtualPropHolder[key];
                    }
                    else {
                        value = target[key]; // = value;
                    }
                    if (typeof (value) == "function") {
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
    linkTargets(self) {
        const { nextSiblingTarget, whereTargetSelector } = self;
        if (whereTargetSelector === undefined) {
            self.targets = [nextSiblingTarget];
        }
        else {
            const targets = Array.from(nextSiblingTarget.querySelectorAll(whereTargetSelector));
            if (nextSiblingTarget.matches(whereTargetSelector))
                targets.unshift(nextSiblingTarget);
            self.targets = targets;
        }
    }
    linkNextSiblingTarget(self) {
        const { matchClosest, linkNextSiblingTarget, isC } = self;
        const nextEl = getNextSibling(self, matchClosest);
        if (!nextEl) {
            setTimeout(() => {
                linkNextSiblingTarget(self);
            }, 50);
            return;
        }
        self.nextSiblingTarget = nextEl;
    }
    linkHandlers(self) {
        const { proxies, on } = self;
        const handlers = {};
        for (var key in on) {
            const eventSetting = on[key];
            switch (typeof eventSetting) {
                case 'function':
                    const targetHandlers = proxies.map(target => {
                        //const handler = eventSetting.bind(target);
                        target.addEventListener(key, e => {
                            const aTarget = target;
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
    doDisconnect(self) {
        const { targets, handlers } = self;
        targets.forEach(target => {
            for (const key in handlers) {
                const targetHandlers = handlers[key];
                targetHandlers.forEach(targetHandler => {
                    target.removeEventListener(key, targetHandler);
                });
            }
        });
        self.disconnect = false;
    }
    doInit(self) {
        const { proxies, init } = self;
        proxies.forEach((target) => {
            target.self = target;
            init(target);
        });
        delete self.proxies; //avoid memory leaks
    }
    watchForTargetRelease(self) {
        const { mainTarget } = self;
        onRemove(mainTarget, () => {
            self.mainTarget = undefined;
        });
    }
};
//export interface XtalDeco extends HTMLElement, XtalDecoMethods{}
export const XtalDeco = define({
    config: {
        tagName: 'xtal-deco',
        propDefaults: {
            isC: true,
        },
        actions: [
            {
                do: 'linkProxies',
                upon: ['targets', 'actions', 'virtualProps'],
                riff: ['targets', 'actions']
            }, {
                do: 'linkTargets',
                upon: ['nextSiblingTarget'],
                riff: '"',
            }, {
                do: 'linkNextSiblingTarget',
                'upon': ['isC', 'matchClosest'],
                'riff': ['isC'],
            }, {
                do: 'linkHandlers',
                upon: ['proxies', 'on'],
                riff: '"'
            }, {
                do: 'doDisconnect',
                upon: ['targets', 'handlers', 'disconnect'],
                riff: '"'
            }, {
                do: 'doInit',
                upon: ['proxies', 'init'],
                riff: '"'
            }, {
                do: 'watchForTargetRelease',
                upon: ['mainTarget'],
                riff: '"',
            }
        ],
        style: {
            display: 'none'
        }
    },
    mixins: [XtalDecoMixin]
});
//https://gomakethings.com/finding-the-next-and-previous-sibling-elements-that-match-a-selector-with-vanilla-js/
function getNextSibling(elem, selector) {
    // Get the next sibling element
    var sibling = elem.nextElementSibling;
    if (selector === undefined)
        return sibling;
    // If the sibling matches our selector, use it
    // If not, jump to the next sibling and continue the loop
    while (sibling) {
        if (sibling.matches(selector))
            return sibling;
        sibling = sibling.nextElementSibling;
    }
    return sibling;
}
;
// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Mutation_events#Mutation_Observers_alternatives_examples
//can't we use https://developer.mozilla.org/en-US/docs/Web/API/Node/contains#:~:text=The%20Node.,direct%20children%2C%20and%20so%20on.?
function onRemove(element, callback) {
    let observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.removedNodes.forEach(removed => {
                if (element === removed) {
                    callback();
                    observer.disconnect();
                }
            });
        });
    });
    observer.observe(element.parentElement || element.getRootNode(), {
        childList: true,
    });
}
;

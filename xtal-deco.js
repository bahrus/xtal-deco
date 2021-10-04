import { CE } from 'trans-render/lib/CE.js';
import { getDestructArgs } from 'trans-render/lib/getDestructArgs.js';
import { onRemove } from 'trans-render/lib/onRemove.js';
const ce = new CE();
export class XtalDecoCore extends HTMLElement {
    targetToProxyMap = new WeakMap();
    self = this;
    createProxies({ targets, actions, virtualProps, targetToProxyMap, finale }) {
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
                            self.dispatchEvent(new CustomEvent(ce.toLisp(key) + '-changed', {
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
            onRemove(proxyTarget, (removedEl) => {
                finale(proxy, removedEl);
            });
        });
        const returnObj = { proxies, mainProxy: proxies[0], mainTarget: targets[0] };
        return returnObj;
    }
    linkTargets({ nextSiblingTarget, whereTargetSelector }) {
        if (whereTargetSelector === undefined) {
            return { targets: [nextSiblingTarget] };
        }
        else {
            const targets = Array.from(nextSiblingTarget.querySelectorAll(whereTargetSelector));
            if (nextSiblingTarget.matches(whereTargetSelector))
                targets.unshift(nextSiblingTarget);
            return { targets };
        }
    }
    linkNextSiblingTarget({ matchClosest, linkNextSiblingTarget, isC, self }) {
        const nextSiblingTarget = getNextSibling(self, matchClosest);
        if (!nextSiblingTarget) {
            setTimeout(() => {
                linkNextSiblingTarget(self);
            }, 50);
            return;
        }
        return { nextSiblingTarget };
    }
    linkHandlers({ proxies, on }) {
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
        return { disconnect: true, handlers };
    }
    doDisconnect({ targets, handlers }) {
        targets.forEach(target => {
            for (const key in handlers) {
                const targetHandlers = handlers[key];
                targetHandlers.forEach(targetHandler => {
                    target.removeEventListener(key, targetHandler);
                });
            }
        });
        return { disconnect: false };
    }
    doInit({ proxies, init }) {
        proxies.forEach((target) => {
            target.self = target;
            init(target);
        });
        return { proxies: undefined };
    }
    watchForTargetRelease(self) {
        const { mainTarget } = self;
        onRemove(mainTarget, () => {
            self.mainTarget = undefined;
        });
    }
}
;
//export interface XtalDeco extends HTMLElement, XtalDecoMethods{}
export const XtalDeco = ce.def({
    config: {
        tagName: 'xtal-deco',
        propDefaults: {
            isC: true,
        },
        actions: {
            createProxies: {
                ifAllOf: ['targets', 'actions', 'finale'],
                ifKeyIn: ['virtualProps'],
            },
            linkTargets: {
                ifAllOf: ['nextSiblingTarget'],
            },
            linkNextSiblingTarget: {
                ifAllOf: ['isC'],
                ifKeyIn: ['matchClosest'],
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
            },
        },
        style: {
            display: 'none'
        }
    },
    superclass: XtalDecoCore
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

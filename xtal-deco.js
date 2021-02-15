import { xc } from 'xtal-element/lib/XtalCore.js';
import { camelToLisp } from 'trans-render/lib/camelToLisp.js';
import { getDestructArgs } from 'xtal-element/lib/getDestructArgs.js';
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
export const linkNextSiblingTarget = ({ self, matchClosest }) => {
    const nextEl = getNextSibling(self, matchClosest);
    if (!nextEl) {
        setTimeout(() => {
            linkNextSiblingTarget(self);
        }, 50);
        return;
    }
    self.nextSiblingTarget = nextEl;
};
export const linkTargets = ({ nextSiblingTarget, whereTargetSelector, self }) => {
    if (nextSiblingTarget === null)
        return;
    if (whereTargetSelector) {
        const targets = Array.from(nextSiblingTarget.querySelectorAll(whereTargetSelector));
        if (nextSiblingTarget.matches(whereTargetSelector))
            targets.unshift(nextSiblingTarget);
        self.targets = targets;
    }
    else {
        self.targets = [nextSiblingTarget];
    }
};
export const linkProxies = ({ targets, actions, self, virtualProps, targetToProxyMap }) => {
    if (targets === undefined || actions === undefined)
        return;
    const proxies = [];
    const virtualPropHolders = new WeakMap();
    targets.forEach(proxyTarget => {
        const proxy = new Proxy(proxyTarget, {
            set: (target, key, value) => {
                const virtualPropHolder = virtualPropHolders.get(target);
                if (key === 'self' || (virtualProps !== undefined && virtualProps.includes(key))) {
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
                        target.dispatchEvent(new CustomEvent(camelToLisp(key) + '-changed', {
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
};
export const linkHandlers = ({ proxies, on, self }) => {
    if (proxies === undefined || on === undefined)
        return;
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
                //handlers[key] = targetHandlers;
                break;
            default:
                throw 'not implemented yet';
        }
    }
    self.disconnect();
    self.handlers = handlers;
};
export const doInit = ({ proxies, init, self }) => {
    if (proxies === undefined || init === undefined)
        return;
    proxies.forEach((target) => {
        target.self = target;
        init(target);
    });
    delete self.proxies; //avoid memory leaks
};
export const watchForTargetRelease = ({ self, mainTarget }) => {
    if (mainTarget === undefined)
        return;
    onRemove(mainTarget, () => {
        self.mainTarget = undefined;
    });
};
export const releaseProxy = ({ self, mainTarget }) => {
    if (mainTarget === undefined) {
        delete self.mainProxy;
    }
};
export const propActions = [linkNextSiblingTarget, linkTargets, linkProxies, linkHandlers, doInit, watchForTargetRelease, releaseProxy];
const obj1 = {
    type: Object,
    dry: true
};
const str1 = {
    type: String,
    dry: true,
    reflect: true,
};
const propDefMap = {
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
/**
 * Attach / override behavior onto the next element
 * @element xtal-deco
 *
 */
export class XtalDeco extends HTMLElement {
    constructor() {
        super(...arguments);
        this.self = this;
        this.propActions = propActions;
        this.reactor = new xc.Rx(this);
        this.nextSiblingTarget = null;
        this.targetToProxyMap = new WeakMap();
    }
    onPropChange(n, propDef, newVal) {
        this.reactor.addToQueue(propDef, newVal);
    }
    connectedCallback() {
        this.style.display = 'none';
        xc.hydrate(this, slicedPropDefs);
        linkNextSiblingTarget(this);
    }
    disconnectedCallback() {
        this.disconnect();
    }
    disconnect() {
        if (this.targets === undefined || this.handlers === undefined)
            return;
        this.targets.forEach(target => {
            for (const key in this.handlers) {
                const targetHandlers = this.handlers[key];
                targetHandlers.forEach(targetHandler => {
                    target.removeEventListener(key, targetHandler);
                });
            }
        });
    }
}
XtalDeco.is = 'xtal-deco';
xc.letThereBeProps(XtalDeco, slicedPropDefs.propDefs, 'onPropChange');
xc.define(XtalDeco);

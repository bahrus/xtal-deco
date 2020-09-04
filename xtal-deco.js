import { XtallatX, define, deconstruct } from 'xtal-element/xtal-latx.js';
import { hydrate } from 'trans-render/hydrate.js';
export const linkNextSiblingTarget = ({ self }) => {
    let nextEl = self;
    while (nextEl && (nextEl.localName.indexOf('-deco') > -1)) {
        nextEl = nextEl.nextElementSibling;
    }
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
export const linkProxies = ({ targets, actions, self, proxyId, virtualProps }) => {
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
                    const dependencies = deconstruct(action);
                    if (dependencies.includes(key)) {
                        //TODO:  symbols
                        const arg = Object.assign({}, virtualPropHolder, target);
                        action(arg);
                    }
                });
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
        proxies.push(proxy);
        if (proxyId !== undefined) {
            const sym = Symbol.for(proxyId);
            const preElevatedProps = proxyTarget[sym];
            if (preElevatedProps !== undefined) {
                Object.assign(proxy, preElevatedProps);
            }
            proxyTarget[sym] = proxy;
            proxyTarget.dispatchEvent(new CustomEvent(proxyId + '-proxy-attached', {
                detail: {
                    proxy: proxy,
                }
            }));
        }
    });
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
        //const prevSelf = target.self;
        target.self = target;
        init(target);
        //target.self = prevSelf;
    });
    //delete self.proxies?
};
export const propActions = [linkNextSiblingTarget, linkTargets, linkProxies, linkHandlers, doInit];
/**
 * Attach / override behavior onto the next element
 * @element xtal-deco
 *
 */
export class XtalDeco extends XtallatX(hydrate(HTMLElement)) {
    constructor() {
        super(...arguments);
        this.nextSiblingTarget = null;
        this.propActions = propActions;
    }
    connectedCallback() {
        this.style.display = 'none';
        super.connectedCallback();
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
XtalDeco.attributeProps = ({ disabled, whereTargetSelector, nextSiblingTarget, targets, init, actions, proxies, on, proxyId, virtualProps }) => ({
    bool: [disabled],
    obj: [nextSiblingTarget, targets, init, actions, proxies, on, virtualProps],
    str: [whereTargetSelector, proxyId],
    jsonProp: [virtualProps],
});
define(XtalDeco);

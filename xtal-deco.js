// import { decorate } from 'trans-render/plugins/decorate.js';
// import { DecorateArgs } from "trans-render/types.d.js";
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
        //self.getTargets(whereTargetSelector, nextSiblingTarget);
        self.targets = Array.from(nextSiblingTarget.querySelectorAll(whereTargetSelector));
    }
    else {
        self.targets = [nextSiblingTarget];
    }
};
export const linkProxies = ({ targets, actions, self }) => {
    if (targets === undefined || actions === undefined)
        return;
    self.proxies = [];
    targets.forEach(proxyTarget => {
        const proxy = new Proxy(proxyTarget, {
            set: (target, key, value) => {
                target[key] = value;
                actions.forEach(action => {
                    const dependencies = deconstruct(action);
                    if (dependencies.includes(key)) { //TODO:  symbols
                        const prevSelf = target.self;
                        target.self = target;
                        action(target);
                        target.self = prevSelf;
                    }
                });
                return true;
            }
        });
        self.proxies.push(proxy);
    });
};
export const linkHandlers = ({ targets, on, self }) => {
    if (targets === undefined || on === undefined)
        return;
    const handlers = {};
    for (var key in on) {
        const eventSetting = on[key];
        switch (typeof eventSetting) {
            case 'function':
                const targetHandlers = targets.map(target => {
                    const handler = eventSetting.bind(target);
                    target.addEventListener(key, handler);
                    return handler;
                });
                handlers[key] = targetHandlers;
                break;
            default:
                throw 'not implemented yet';
        }
    }
    self.disconnect();
    self.handlers = handlers;
};
export const doInit = ({ proxies, init }) => {
    if (proxies === undefined || init === undefined)
        return;
    proxies.forEach((target) => {
        const prevSelf = target.self;
        target.self = target;
        init(target);
        target.self = prevSelf;
    });
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
XtalDeco.attributeProps = ({ disabled, whereTargetSelector, nextSiblingTarget, targets, init, actions, proxies }) => ({
    bool: [disabled],
    obj: [nextSiblingTarget, targets, init, actions, proxies],
    str: [whereTargetSelector],
});
define(XtalDeco);

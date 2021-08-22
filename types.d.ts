export type PropAction<T extends Element = HTMLElement> = (t: T) => any;
export type EventSettings = {[key: string] : (Function | [handler:Function, pathExpr: string] | [handler:Function, pathExpr: string, converter:Function])};

export interface XtalDecoProps<TTargetElement extends Element = Element>{
    /** 
     * Selector to search for within the next element. 
     * This will select the target elements(s) to which properties and methods will be attached.
     * @attr where-target-selector
    */
    whereTargetSelector?: string;

    nextSiblingTarget?: Element;

    /**
     * temporary holder of target elements to apply proxy to.
     */
    targets?: Element[];

    /**
     * temporary holder of proxies that need initalizing.
     */
    proxies?: Element[];

    /**
     * Proxy for the target element (not the elements matching whereTargetSelector)
     */
    mainProxy?: Element;

    /**
     * Main Target Element
     */
    mainTarget?: Element;

    /**
     * Set these properties via a weakmap, rather than on the (native) element itself.
     */
    virtualProps?: string[];

    actions?: PropAction<any>[];

    init?: PropAction<TTargetElement>;

    on?: EventSettings;

    matchClosest?: string;

    targetToProxyMap: WeakMap<any, any>;

    handlers?: eventHandlers | undefined;

    disconnect?: boolean;

    isC?: boolean;
}

type x = IXtalDeco;
export interface IXtalDeco extends XtalDecoProps, HTMLElement{
    createProxies(self: x): void;
    linkTargets(self: x): void;
    linkNextSiblingTarget(self: x): void;
    linkHandlers(self: x): void;
    doDisconnect(self: x): void;
    doInit(self: x): void;
    watchForTargetRelease(self: x): void;
}

type eventHandlers = {[key: string]: ((e: Event) => void)[]};
# \<xtal-deco\>

<a href="https://nodei.co/npm/xtal-deco/"><img src="https://nodei.co/npm/xtal-deco.png"></a>

<img src="https://badgen.net/bundlephobia/minzip/xtal-deco@0.0.32">

Proxy neighboring DOM (custom) element.

## Adding behavior to the next element instance with xtal-deco

xtal-deco provides a base class for adding behavior to the next sibling element -- "decorating" the element, via an [ES6 proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).  

It is inspired by [decorators](https://www.programiz.com/python-programming/decorator)/[annotations](https://docs.oracle.com/javase/tutorial/java/annotations/basics.html)/[attributes](https://codewithshadman.com/csharp-attributes/)[.](https://doc.rust-lang.org/reference/attributes.html)  Rather than declaratively applying to a class or class member beneath the decorator/annotation/attribute, an xtal-deco (or xtal-deco derived elements) instance applies behavior/functionality to the native or custom DOM element beneath it. 

xtal-deco is one member of [a](https://github.com/bahrus/xtal-decor) [trio](https://github.com/bahrus/xtal-decorator) of related elements, provided as an alternative to the [controversial built-in native element extension](https://bkardell.com/blog/TheWalrus.html).

xtal-deco has a property, "actions" that allows for a "reactive" way of responding to property changes passed through via the proxy.

actions is an array of arrow functions, where the proxy of the target element is passed in.  It is expected that the arrow function will use destructuring:

``` JavaScript
actions: [
    ({textContent, myProp}) =>{
        //do something
    }
]
```

The other key properties of xtal-deco are:

1.  on -- This is where we attach event listeners on the target element.
2.  init -- This is where we initialize the behavior.

## Setting proxyActions

There are two straightforward ways of setting the actions/on/init, depending on your needs:

1.  Extend class XtalDeco, and specify the actions/on/init properties in the constructor or via [instanceFields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields).
2.  Inline actions in the HTML markup.  Use something like [nomodule](https://github.com/bahrus/nomodule).


Syntax example for approach 2:


```html
<xtal-deco><script nomodule=ish>
    const decoProps = {
        actions: [
            ({count, self}) => {
                window.alert(count + " butterbeers sold");
            }
        ],
        on: {
            click: ({self}) => {
                self.count++;
            }
        },
        init: ({self}) => {
            self.count = 0;
        }
    }
    Object.assign(selfish.parentElement, decoProps);
</script></xtal-deco>
<button disabled data-drink-selection="Butterbeer">Click me to Order Your Drink</button>
<!-- p-d is short for "pass-down" -->
<p-d observe=xtal-deco on="count-changed" to=[-text-content] val=detail.value></p-d>
<span></span> drinks sold.

```

All property changes cause an event to fire with the lisp-case name of the property followed by -changed.  So in the example above, when the "count" property changes, the decorator element (xtal-deco) fires and event "count-changed."

**NB I:**  Here we are, via a proxy, setting a field value on an existing native DOM element -- button in this case.  

"Throwing new properties" on another DOM element is [considered problematic](https://youtu.be/uygxJ8Wxotc?t=319).  Consequently,
this web component has a protective curse -- anyone trying to add a new property or a method onto another element will receive a one-way ticket to Azkaban.

However, the ability to add new data elements is critical when enhancing behavior.  We need the ability to add new properties onto our proxy only.

To do this, use property/attribute virtualProps/virtual-props, which allows for an array of string properties to be specified:

```html
<xtal-deco virtual-props='["count", "revenue"]'></xtal-deco>
```

Doing so causes the properties "count" and "revenue" to be stored and retrieved via a [WeakMap](https://stackoverflow.com/a/49879350/3320028).

## Why not wrap the element?

Why not:

```html
<xtal-deco>
    <button>...</button>
</xtal-deco>
```

?

Explanation can be found [here](https://youtu.be/i6G6dmVJy74?t=49).


## Recursive Tree Structures

For recursive tree structures, you can, in addition to the next sibling, target children of the target element via the whereTargetSelector/where-target-selector property / attribute.

## Closest match

If multiple decorators are needed on the same element, then at least one of the decorators will need to skip over the other decorators.  You can specify which element to target from the set of nextElementSiblings via the matchClosest / match-closest property/attribute.

##  Externally apply properties to the target element via the proxy.

xtal-deco creates a WeakMap property, targetToProxyMap, which allows us retrieve the proxy from the target DOM element.  We can then set property values programmatically.

However, this is rather clumsy in practice.

Another way to handle this is to define properties that need passing from external sources on the custom element that extends xtal-deco.  The property setter would need to forward the value on to the proxy / proxies via the "mainProxy" property of the base class.

## Running locally

1.  Install node.js
2.  Fork and/or clone https://github.com/bahrus/xtal-deco
3.  Open a command window to the fork or clone directory on your local machine

```
$ npm install
$ npm run serve
```

Now open a browser to http://localhost:3030/demo/dev.html



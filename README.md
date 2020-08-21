# \<xtal-deco\>

<a href="https://nodei.co/npm/xtal-deco/"><img src="https://nodei.co/npm/xtal-deco.png"></a>

<img src="https://badgen.net/bundlephobia/minzip/xtal-deco">

Add properties / methods to other DOM (custom) elements.

## Adding behavior to the next element instance with xtal-deco

xtal-deco provides a way of adding behavior to the next sibling element -- "decorating" the element.  

The affected element can be a native DOM element, or a custom element instances. 

xtal-deco attaches an [ES6 proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)

xtal-deco has a property, "actions" that allows for a "reactive" way of responding to property changes.

proxyPropActions is an array of arrow functions, where the target element is passed in.  It is expected that the arrow function will use destructuring:

``` JavaScript
actions: [
    ({textContent, myProp}) =>{
        //do something
    }
]
```

## Setting proxyActions

There are two straightforward ways of setting proxy actions, depending on your needs:

1.  Extend class XtalDeco, and implement proxyActions, via the constructor or via [instanceFields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields).
2.  Inline proxy actions in the HTML markup.  Use something like [nomodule](https://github.com/bahrus/nomodule).


Syntax example:


```html
<xtal-deco><script nomodule type="module ish">
    const decoProps = {
        actions: [
            ({count, self}) => {
                window.alert(count + " butterbeers sold");
                self.dispatchEvent(new Event('count-changed'));
            }
        ],
        on: {
            'click': ({self}) => {
                self.count++;
            }
        },
        init: ({self}) => {
            self.count = 0;
        }
    }
    const decoEl = window["module ish"].parentElement;
    Object.assign(decoEl, decoProps);

</script></xtal-deco>
<button disabled data-drink-selection="Butterbeer">Click me to Order Your Drink</button>
<p-d on="count-changed" prop=textContent val=target.count></p-d>
<span></span> drinks sold.

```

## Ish [TODO]

Direct access to the target element (button in the example above) bypasses the proxy.

To allow access to the proxy from the target element:

Give the proxy a name:

```html
<xtal-deco ish="myDecorator"></xtal-deco>
<button id=myButton></button>
```

You can then set properties through the proxy thusly:

```html
<xtal-deco ish="myDecorator"></xtal-deco>
<button id=myButton></button>
<script>
const sym = Symbol.for('myDecorator');
if(myButton[sym] === undefined) myButton[sym] = {};
myButton[sym].myProp = 'hello';
</script>
```

If you need to call a method on a proxy, you will need to wait for the proxy to be attached.  To do this:


```html
<xtal-deco ish="myDecorator"></xtal-deco>
<button id=myButton></button>
<script>
const sym = Symbol.for('myDecorator');
if(myButton[sym] === undefined || myButton[sym].self === undefined)){
    myButton.addEventListener('myDecorator-proxy-attached', e =>{
        const proxy = e.detail.proxy;
        proxy.doSomething();
    })
}
</script>
```

## Running locally

```
$ npm install
$ npm run serve
```

# \<xtal-deco\>

<a href="https://nodei.co/npm/xtal-deco/"><img src="https://nodei.co/npm/xtal-deco.png"></a>

<img src="https://badgen.net/bundlephobia/minzip/xtal-deco">

Proxy neighboring DOM (custom) element.

## Adding behavior to the next element instance with xtal-deco

xtal-deco provides a way of adding behavior to the next sibling element -- "decorating" the element.  

The affected element can be a native DOM element, or a custom element instance. 

xtal-deco attaches an [ES6 proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)

xtal-deco has a property, "actions" that allows for a "reactive" way of responding to property changes.

actions is an array of arrow functions, where the proxy of the target element is passed in.  It is expected that the arrow function will use destructuring:

``` JavaScript
actions: [
    ({textContent, myProp}) =>{
        //do something
    }
]
```

## Setting proxyActions

There are two straightforward ways of setting the actions (and other object properties), depending on your needs:

1.  Extend class XtalDeco, and implement action, via the constructor or via [instanceFields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields).
2.  Inline actions in the HTML markup.  Use something like [nomodule](https://github.com/bahrus/nomodule).


Syntax example:


```html
<xtal-deco><script nomodule=ish>
    const decoProps = {
        actions: [
            ({count, self}) => {
                window.alert(count + " butterbeers sold");
                self.dispatchEvent(new Event('count-changed'));
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
<p-d on="count-changed" prop=textContent val=target.count></p-d>
<span></span> drinks sold.

```

**NB I:**  Here we are, via a proxy, setting a field value on an existing native DOM element -- button in this case.  

"Throwing new properties" on another DOM element is [considered problematic](https://youtu.be/uygxJ8Wxotc?t=319).  Consequently,
this web components has a protective curse -- anyone trying to add a new property or a method onto another element will receive a one-way ticket to Azkaban.

However, the ability to add new data elements as part of the enhanced behavior is critical.  We need the ability to add new properties onto our proxy only.

To do this, use property/attribute virtualProps/virtual-props:

```html
<xtal-deco virtualProps='["count"]'></xtal-deco>
```


## proxy-id

Direct access to the target element (button in the example above) bypasses the proxy logic.

To allow access to the proxy from the target element:

Give the proxy a name:

```html
<xtal-deco proxy-id="myDecorator"></xtal-deco>
<button id=myButton></button>
```


You can now set properties through the proxy thusly:

```html
<xtal-deco proxy-id="myDecorator"></xtal-deco>
<button id=myButton></button>
<script>
const sym = Symbol.for('myDecorator');
if(myButton[sym] === undefined) myButton[sym] = {};
myButton[sym].myProp = 'hello';
</script>
```


If you need to call a [method on a proxy,](https://2ality.com/2015/10/intercepting-method-calls.html) you will need to wait for the proxy to be attached.  To do this:


```html
<xtal-deco proxy-id="myDecorator"></xtal-deco>
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

## Recursive Tree Structures

For recursive tree structures, you can, in addition to the next sibling, target children of the target element via the whereTargetSelector/where-target-selector property / attribute.

## Running locally

```
$ npm install
$ npm run serve
```

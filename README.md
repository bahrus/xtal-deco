# \<xtal-deco\>

<a href="https://nodei.co/npm/xtal-deco/"><img src="https://nodei.co/npm/xtal-deco.png"></a>

<img src="https://badgen.net/bundlephobia/minzip/xtal-deco">

Add properties / methods to other DOM (custom) elements.

## Adding behavior to the next element instance with xtal-deco

xtal-deco provides a way of adding behavior to the next sibling element -- "decorating" the element.  

The affected element can be a native DOM element, or a custom element instances. 

xtal-deco attaches an [ES6 proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)

xtal-deco has a property, "actions" that allows for a "reactive" way of responding to property changes.

actions is an array of arrow functions, where the target element is passed in.  It is expected that the arrow function will use destructuring:

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

**NB I:**  Here we are, via a proxy, passing ina  field value onto an existing native DOM element -- button in this case.  

I can't completely rule out the possibility that something could go horribly wrong should a property with the same name -- "count" in this case -- be introduced into the browser native button element.  Please act responsibly and only choose field) -- for example "_numberOfDrinksSold" -- whose chance of getting added natively to the button DOM element are lower than seeing a Libertarian POTUS in your pet mouse's lifespan.  These web components have a protective curse -- anyone trying to add a property or a method which has a higher probability will result in the developer receiving a one-way ticket to Azkaban.

You can also leverage ES6 Symbol field keys to ensure the dementors will be kept at bay.

## proxy-id

Direct access to the target element (button in the example above) bypasses the proxy.

To allow access to the proxy from the target element:

Give the proxy a name:

```html
<xtal-deco proxy-id="myDecorator"></xtal-deco>
<button id=myButton></button>
```


You can then set properties through the proxy thusly:

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

For recursive tree structures, like

## Running locally

```
$ npm install
$ npm run serve
```

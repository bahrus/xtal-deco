# \<xtal-deco\>

<a href="https://nodei.co/npm/xtal-deco/"><img src="https://nodei.co/npm/xtal-deco.png"></a>

<img src="https://badgen.net/bundlephobia/minzip/xtal-deco">

Add properties / methods to other DOM (custom) elements.

## Adding behavior to the next element instance with xtal-deco

xtal-deco provides a way of adding behavior to the next sibling element -- "decorating" the element.  

The affected element can be a native DOM element, or a custom element instances. 

xtal-deco attaches an [ES6 proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)

xtal-deco has a property, "proxyActions" that allows for a "reactive" way of responding to property changes.

proxyPropActions is an array of arrow functions, where the target element is passed in.  It is expected that the arrow function will use destructuring:

```
proxyPropActions = [
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
<xtal-deco><script nomodule>
    ({
        on: {
            click: function (e) {
                alert(this.dataset.drinkSelection + ' coming right up!');
                this.numberOfDrinksSold++;
            }
        },
        props: {
            numberOfDrinksSold: 0,
        },
        methods:{
            onPropsChange: function () {
                console.log('Thanks, Rosmerta');
            }
        },
        vals:{
            title: 'Clicker',
        }
    })
</script></xtal-deco>
<button data-drink-selection="Butterbeer">Click me to Order Your Drink</button>
<!-- Pass down(p-d) prop numberOfDrinksSold when it changes -->
<p-d on="numberOfDrinksSold-changed" prop="textContent" val="target.numberOfDrinksSold"></p-d>
<span></span> drinks sold.

```

We can see there are four top level categories of things that we can attach -- event handlers via "on", properties with setters / getters via "props", methods and vals.  Any time a prop changes, the element fires an event:  [propName]-changed, and also calls method onPropsChange (actually a symbol-protected alias).

"vals" is used to simply set some initial property values on the target element(s).

**NB I:**  Here we are adding a property onto an existing native DOM element -- button in this case.  Although the property is added onto the element, and no attempt to do any kind of super.prop or super.method call is made, I can't completely rule out the possibility that something could go horribly wrong should a property with the same name be introduced into the browser native button element.  Please act responsibly and only choose property names (or method names) -- in this example "numberOfDrinksSold" -- whose chance of getting added natively to the button DOM element are lower than seeing a Libertarian POTUS in your pet mouse's lifespan.  These web components have a protective curse -- anyone trying to add a property or a method which has a higher probability will result in the developer receiving a one-way ticket to Azkaban.

If you really want to play it safe, there is an attribute, "use-symbols", which allows you to use symbols, which should be 100% safe:

```html
<xtal-deco use-symbols='["numberOfDrinksSold"]'><script nomodule>
    ({
        on: {
            click: function (e) {
                alert(this.dataset.drinkSelection + ' coming right up!');
                this[numberOfDrinksSold]++;
            }
        },
        props: {
            [numberOfDrinksSold]: 0,
        },
        methods:{
            onPropsChange: function () {
                console.log('Thanks, Rosmerta');
            }
        },
        vals:{
            title: 'Clicker',
        }
    })
</script></xtal-deco>
<button disabled data-drink-selection="Butterbeer">Click me to Order Your Drink</button>
<p-d on="Symbol-numberOfDrinksSold-changed" prop="textContent" val="detail.value"></p-d>
<span></span> drinks sold.
```

I *think* using property and method names starting with an underscore should also allow you to steer clear of the dementors. That would be easier than working with symbols.

The syntax shown above, where the decorating behavior is defined within a script tag (with nomodule attribute) may not make sense in an environment where content is delivered via JS imports.

In this environment, but way xtal-deco should be used is via inheritance:

```JavaScript
class XtalDecoMyUseCase extends XtalDeco{
    decorateArgs = {
        on: {
            click: function (e) {
                alert(this.dataset.drinkSelection + ' coming right up!');
                this[numberOfDrinksSold]++;
            }
        },
        props: {
            [numberOfDrinksSold]: 0,
        },
        methods:{
            onPropsChange: function () {
                console.log('Thanks, Rosmerta');
            }
        },
        vals:{
            title: 'Clicker',
        }        
    }
}
customElements.define('xtal-deco-my-use-case', XtalDecoMyUseCase);
```


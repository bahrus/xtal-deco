# \<xtal-deco\>

<a href="https://nodei.co/npm/xtal-deco/"><img src="https://nodei.co/npm/xtal-deco.png"></a>

<img src="https://badgen.net/bundlephobia/minzip/xtal-deco">

Add properties / methods to other DOM (custom) elements.

xtal-deco provides a way of adding behavior to the next sibling element -- "decorating" the element.  

The affected element can be a native DOM element, or a custom element instances. 

The syntax is heavily influenced by Vue / Polymer 1.

## Adding behavior to the next element instance with xtal-deco

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
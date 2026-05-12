import useCartStore from '../../app/store/cartStore';

const mockProduct = (overrides = {}) => ({
  id: 'prod-1',
  name: 'Test Shirt',
  price: 150,
  images: ['https://example.com/img.jpg'],
  shop_id: 'shop-1',
  shop_name: 'Test Shop',
  in_stock: true,
  ...overrides,
});

beforeEach(() => {
  useCartStore.setState({
    cartItems: [],
    totalItems: 0,
    totalAmount: 0,
    standardTotal: 0,
    onOrderTotal: 0,
    runnerFeesTotal: 0,
    transportFeesTotal: 0,
    hasOnOrderItems: false,
    subtotal: 0,
    total: 0,
  });
});

describe('cartStore — addToCart', () => {
  it('adds a new product with default quantity 1', () => {
    useCartStore.getState().addToCart(mockProduct());
    const { cartItems, totalItems, totalAmount } = useCartStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].id).toBe('prod-1');
    expect(cartItems[0].quantity).toBe(1);
    expect(totalItems).toBe(1);
    expect(totalAmount).toBe(150);
  });

  it('adds a new product with a custom quantity', () => {
    useCartStore.getState().addToCart(mockProduct(), 3);
    const { totalItems, totalAmount } = useCartStore.getState();
    expect(totalItems).toBe(3);
    expect(totalAmount).toBe(450);
  });

  it('increments quantity when the same product is added again', () => {
    useCartStore.getState().addToCart(mockProduct(), 2);
    useCartStore.getState().addToCart(mockProduct(), 1);
    const { cartItems, totalItems, totalAmount } = useCartStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(3);
    expect(totalItems).toBe(3);
    expect(totalAmount).toBe(450);
  });

  it('adds two different products as separate cart items', () => {
    useCartStore.getState().addToCart(mockProduct({ id: 'prod-1' }));
    useCartStore.getState().addToCart(mockProduct({ id: 'prod-2', name: 'Test Pants', price: 200 }));
    const { cartItems, totalItems, totalAmount } = useCartStore.getState();
    expect(cartItems).toHaveLength(2);
    expect(totalItems).toBe(2);
    expect(totalAmount).toBe(350);
  });

  it('stores the first image from the images array', () => {
    useCartStore.getState().addToCart(mockProduct({ images: ['img1.jpg', 'img2.jpg'] }));
    expect(useCartStore.getState().cartItems[0].image).toBe('img1.jpg');
  });

  it('stores null image when images array is empty', () => {
    useCartStore.getState().addToCart(mockProduct({ images: [] }));
    expect(useCartStore.getState().cartItems[0].image).toBeNull();
  });
});

describe('cartStore — removeFromCart', () => {
  it('removes an existing item and updates totals', () => {
    useCartStore.getState().addToCart(mockProduct(), 2);
    useCartStore.getState().removeFromCart('prod-1');
    const { cartItems, totalItems, totalAmount } = useCartStore.getState();
    expect(cartItems).toHaveLength(0);
    expect(totalItems).toBe(0);
    expect(totalAmount).toBe(0);
  });

  it('only removes the specified item, leaving others intact', () => {
    useCartStore.getState().addToCart(mockProduct({ id: 'prod-1', price: 100 }));
    useCartStore.getState().addToCart(mockProduct({ id: 'prod-2', price: 200 }));
    useCartStore.getState().removeFromCart('prod-1');
    const { cartItems, totalAmount } = useCartStore.getState();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].id).toBe('prod-2');
    expect(totalAmount).toBe(200);
  });

  it('is a no-op when removing a product that is not in the cart', () => {
    useCartStore.getState().addToCart(mockProduct());
    useCartStore.getState().removeFromCart('nonexistent-id');
    expect(useCartStore.getState().cartItems).toHaveLength(1);
  });
});

describe('cartStore — updateQuantity', () => {
  it('updates the quantity of an existing item', () => {
    useCartStore.getState().addToCart(mockProduct(), 1);
    useCartStore.getState().updateQuantity('prod-1', 5);
    const { cartItems, totalItems, totalAmount } = useCartStore.getState();
    expect(cartItems[0].quantity).toBe(5);
    expect(totalItems).toBe(5);
    expect(totalAmount).toBe(750);
  });

  it('removes the item when quantity is set to 0', () => {
    useCartStore.getState().addToCart(mockProduct());
    useCartStore.getState().updateQuantity('prod-1', 0);
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });

  it('removes the item when quantity is negative', () => {
    useCartStore.getState().addToCart(mockProduct());
    useCartStore.getState().updateQuantity('prod-1', -1);
    expect(useCartStore.getState().cartItems).toHaveLength(0);
  });

  it('is a no-op for an item not in the cart', () => {
    useCartStore.getState().addToCart(mockProduct());
    useCartStore.getState().updateQuantity('nonexistent-id', 3);
    expect(useCartStore.getState().cartItems[0].quantity).toBe(1);
  });
});

describe('cartStore — clearCart', () => {
  it('empties the cart and resets all totals', () => {
    useCartStore.getState().addToCart(mockProduct({ id: 'prod-1' }), 2);
    useCartStore.getState().addToCart(mockProduct({ id: 'prod-2', price: 250 }));
    useCartStore.getState().clearCart();
    const { cartItems, totalItems, totalAmount } = useCartStore.getState();
    expect(cartItems).toHaveLength(0);
    expect(totalItems).toBe(0);
    expect(totalAmount).toBe(0);
  });
});

describe('cartStore — getItemsByShop', () => {
  it('groups items by their shop', () => {
    useCartStore.getState().addToCart(mockProduct({ id: 'p1', shop_id: 'shop-1', shop_name: 'Shop A', price: 100 }));
    useCartStore.getState().addToCart(mockProduct({ id: 'p2', shop_id: 'shop-1', shop_name: 'Shop A', price: 50 }));
    useCartStore.getState().addToCart(mockProduct({ id: 'p3', shop_id: 'shop-2', shop_name: 'Shop B', price: 200 }));
    const groups = useCartStore.getState().getItemsByShop();
    expect(groups).toHaveLength(2);
    const shopA = groups.find(g => g.shopId === 'shop-1');
    expect(shopA.items).toHaveLength(2);
    expect(shopA.subtotal).toBe(150);
    const shopB = groups.find(g => g.shopId === 'shop-2');
    expect(shopB.items).toHaveLength(1);
    expect(shopB.subtotal).toBe(200);
  });

  it('returns an empty array when cart is empty', () => {
    expect(useCartStore.getState().getItemsByShop()).toEqual([]);
  });
});

describe('cartStore — calculateTotals', () => {
  it('calculates totals correctly for standard in-stock items', () => {
    useCartStore.setState({
      cartItems: [
        { id: 'p1', price: 100, quantity: 2, in_stock: true },
        { id: 'p2', price: 50, quantity: 1, in_stock: true },
      ],
    });
    const result = useCartStore.getState().calculateTotals();
    expect(result.standardTotal).toBe(250);
    expect(result.onOrderTotal).toBe(0);
    expect(result.totalItems).toBe(3);
    expect(result.hasOnOrderItems).toBe(false);
  });

  it('applies 50% deposit for on-order items without runner fee', () => {
    useCartStore.setState({
      cartItems: [{ id: 'p1', price: 200, quantity: 1, in_stock: false }],
    });
    const result = useCartStore.getState().calculateTotals();
    expect(result.onOrderTotal).toBe(100);
    expect(result.hasOnOrderItems).toBe(true);
  });

  it('uses runner fee instead of 50% deposit when runner_fee is set', () => {
    useCartStore.setState({
      cartItems: [{ id: 'p1', price: 200, quantity: 2, in_stock: false, runner_fee: 30 }],
    });
    const result = useCartStore.getState().calculateTotals();
    expect(result.runnerFeesTotal).toBe(60);
    expect(result.onOrderTotal).toBe(0);
  });

  it('accumulates transport fees', () => {
    useCartStore.setState({
      cartItems: [{ id: 'p1', price: 100, quantity: 3, in_stock: false, transport_fee: 10 }],
    });
    const result = useCartStore.getState().calculateTotals();
    expect(result.transportFeesTotal).toBe(30);
  });
});

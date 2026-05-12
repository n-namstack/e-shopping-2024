import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProductCard from '../../app/components/ProductCard';

// ProductCard uses useFonts — mock it so fonts are always "loaded"
jest.mock('@expo-google-fonts/poppins', () => ({
  useFonts: () => [true, null],
  Poppins_400Regular: 'Poppins_400Regular',
  Poppins_500Medium: 'Poppins_500Medium',
  Poppins_600SemiBold: 'Poppins_600SemiBold',
  Poppins_700Bold: 'Poppins_700Bold',
}));

const mockProduct = (overrides = {}) => ({
  id: 'prod-1',
  name: 'Blue Denim Jacket',
  price: 450,
  images: ['https://example.com/jacket.jpg'],
  shop: { name: 'Fashion Hub' },
  shop_id: 'shop-1',
  in_stock: true,
  is_on_sale: false,
  ...overrides,
});

const onPress = jest.fn();
const onAddToCart = jest.fn();
const onLikePress = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe('ProductCard', () => {
  it('renders the product name', () => {
    const { getByText } = render(
      <ProductCard product={mockProduct()} onPress={onPress} />
    );
    expect(getByText('Blue Denim Jacket')).toBeTruthy();
  });

  it('renders the formatted price', () => {
    const { getByText } = render(
      <ProductCard product={mockProduct()} onPress={onPress} />
    );
    expect(getByText(/450/)).toBeTruthy();
  });

  it('calls onPress with the product when the card is tapped', () => {
    const { getByText } = render(
      <ProductCard product={mockProduct()} onPress={onPress} />
    );
    fireEvent.press(getByText('Blue Denim Jacket'));
    expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod-1' }));
  });

  it('calls onAddToCart when the add-to-cart button is pressed', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <ProductCard product={mockProduct()} onPress={onPress} onAddToCart={onAddToCart} onLikePress={onLikePress} isLiked={false} />
    );
    // Trigger the last TouchableOpacity (add to cart button)
    const { TouchableOpacity } = require('react-native');
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(buttons[buttons.length - 1]);
    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod-1' }));
  });

  it('renders without crashing when images array is empty', () => {
    const { getByText } = render(
      <ProductCard product={mockProduct({ images: [] })} onPress={onPress} />
    );
    expect(getByText('Blue Denim Jacket')).toBeTruthy();
  });

  it('renders without crashing when optional fields are missing', () => {
    const minimal = { id: 'p1', name: 'Minimal Product', price: 0 };
    const { getByText } = render(
      <ProductCard product={minimal} onPress={onPress} />
    );
    expect(getByText('Minimal Product')).toBeTruthy();
  });
});

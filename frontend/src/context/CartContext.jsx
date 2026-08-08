import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('leaseify_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('leaseify_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, startDate, endDate, days = 7) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product._id === product._id);
      const subtotal = product.pricePerDay * days;
      const deposit = product.securityDeposit;

      const newItem = {
        product,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate:
          endDate ||
          new Date(Date.now() + days * 86400000).toISOString().split('T')[0],
        days,
        subtotal,
        deposit,
      };

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = newItem;
        return updated;
      } else {
        return [...prev, newItem];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.product._id !== productId));
  };

  const updateCartItemDates = (productId, startDate, endDate, days) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product._id === productId) {
          const subtotal = item.product.pricePerDay * days;
          return {
            ...item,
            startDate,
            endDate,
            days,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('leaseify_cart');
  };

  const subtotal = cartItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const depositTotal = cartItems.reduce((acc, curr) => acc + curr.deposit, 0);
  const grandTotal = subtotal + depositTotal;
  const totalItemCount = cartItems.length;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateCartItemDates,
        clearCart,
        subtotal,
        depositTotal,
        grandTotal,
        totalItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

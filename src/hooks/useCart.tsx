import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );
      let newCart = [] as Product[];

      if (productIndex >= 0) {
        const product = cart[productIndex];
        const newAmount = product.amount + 1;

        const { data: productStock } = await api.get<Stock>(
          `/stock/${productId}`
        );

        if (productStock.amount < newAmount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const prev = [...cart];
        prev[productIndex] = { ...product, amount: newAmount };

        newCart = prev;
        setCart(newCart);
      } else {
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );
        newCart = [...cart, { ...product, amount: 1 }];
        setCart(newCart);
      }

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex < 0) throw new Error();

      const newCart = cart.filter((product) => product.id !== productId);

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );

      const product = cart[productIndex];

      const { data: productStock } = await api.get<Stock>(
        `/stock/${productId}`
      );

      if (productStock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const prev = [...cart];
      prev[productIndex] = { ...product, amount: amount };

      setCart(prev);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(prev));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

import { useState, useRef, useEffect } from "react";
import { menuData } from "@/data/menu";
import { useCart } from "@/store/cart";
import { MenuItemCard } from "@/components/MenuItemCard";
import { CartPanel } from "@/components/CartPanel";
import { CategoryNav } from "@/components/CategoryNav";
import { PaymentModal } from "@/components/PaymentModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLang } from "@/i18n/LanguageContext";
import { ShoppingCart, CheckCircle, XCircle } from "lucide-react";

function useQueryParam(key: string) {
  return new URLSearchParams(window.location.search).get(key);
}

export function Terminal() {
  const { items, addItem, removeItem, clearCart, total, itemCount } = useCart();
  const { tr } = useLang();
  const [activeCategory, setActiveCategory] = useState(menuData[0].id);
  const [showPayment, setShowPayment] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<"success" | "cancel" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const paymentParam = useQueryParam("payment");

  useEffect(() => {
    if (paymentParam === "success") {
      setPaymentBanner("success");
      clearCart();
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setPaymentBanner(null), 5000);
    } else if (paymentParam === "cancel") {
      setPaymentBanner("cancel");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setPaymentBanner(null), 4000);
    }
  }, []);

  const quantityInCart = (cartId: string) => {
    const item = items.find((i) => i.id === cartId);
    return item ? item.quantity : 0;
  };

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    const el = categoryRefs.current[categoryId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-category-id");
            if (id) setActiveCategory(id);
          }
        }
      },
      {
        root: menuRef.current,
        threshold: 0.3,
      }
    );

    for (const el of Object.values(categoryRefs.current)) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const getCategoryName = (categoryId: string) => {
    const key = categoryId as keyof typeof tr.categories;
    return tr.categories[key] ?? categoryId;
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {paymentBanner && (
        <div
          className={`flex items-center gap-3 px-6 py-3 text-[14px] font-medium animate-in slide-in-from-top duration-300 ${
            paymentBanner === "success"
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-destructive-foreground"
          }`}
          data-testid="banner-payment-status"
        >
          {paymentBanner === "success" ? (
            <>
              <CheckCircle size={18} />
              <span>{tr.successBanner}</span>
            </>
          ) : (
            <>
              <XCircle size={18} />
              <span>{tr.cancelBanner}</span>
            </>
          )}
        </div>
      )}

      <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-background">
        <div>
          <div className="font-serif text-[28px] font-semibold tracking-tight text-primary leading-none">LYS</div>
          <div className="text-[10px] tracking-[0.18em] uppercase text-primary/60 mt-0.5">Noodle Box</div>
        </div>

        <div className="hidden md:block">
          <h1 className="font-serif text-[22px] font-medium text-primary tracking-wide">{tr.order}</h1>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector />

          <button
            data-testid="button-mobile-cart"
            onClick={() => setShowCartMobile(true)}
            className="md:hidden relative w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <ShoppingCart size={20} strokeWidth={1.8} />
            {itemCount > 0 && (
              <span
                data-testid="badge-cart-count"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center"
              >
                {itemCount}
              </span>
            )}
          </button>

          {itemCount > 0 && (
            <span
              data-testid="badge-desktop-cart-count"
              className="hidden md:flex bg-primary text-primary-foreground text-[13px] font-semibold px-3 py-1 rounded-full"
            >
              {tr.articles(itemCount)}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border bg-background shrink-0">
            <CategoryNav
              categories={menuData}
              getCategoryName={getCategoryName}
              activeCategory={activeCategory}
              onSelect={handleCategorySelect}
            />
          </div>

          <div
            ref={menuRef}
            className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-2 pb-8"
          >
            {menuData.map((category) => (
              <div
                key={category.id}
                data-category-id={category.id}
                ref={(el) => { categoryRefs.current[category.id] = el; }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-4 pt-2">
                  <h2 className="font-serif text-[22px] font-semibold text-primary">
                    {getCategoryName(category.id)}
                  </h2>
                  <div className="flex-1 h-px bg-primary/20" />
                </div>
                {category.id === "nudel-reisboxen" && (
                  <div className="mb-3 px-4 py-2.5 bg-muted/60 border border-border rounded-xl text-[13px] text-muted-foreground italic">
                    {tr.noodleBoxNote}
                  </div>
                )}
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      quantityInCart={quantityInCart}
                      onAdd={addItem}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:flex w-80 lg:w-96 border-l border-border flex-col bg-background shrink-0">
          <CartPanel
            items={items}
            total={total}
            onAdd={addItem}
            onRemove={removeItem}
            onCheckout={() => setShowPayment(true)}
            onClear={clearCart}
          />
        </div>
      </div>

      {showCartMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowCartMobile(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-muted" />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <CartPanel
                items={items}
                total={total}
                onAdd={addItem}
                onRemove={removeItem}
                onCheckout={() => { setShowCartMobile(false); setShowPayment(true); }}
                onClear={clearCart}
              />
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <PaymentModal
          items={items}
          total={total}
          onClose={() => setShowPayment(false)}
          onOrderPlaced={() => clearCart()}
        />
      )}
    </div>
  );
}

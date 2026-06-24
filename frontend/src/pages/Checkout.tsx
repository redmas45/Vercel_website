import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { money } from '../lib/format';

export function Checkout() {
  const { items, cartTotal, applyPromoCode, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [promo, setPromo] = useState('');
  const navigate = useNavigate();
  const totals = cartTotal();

  useEffect(() => {
    window.ShopBotConfig?.onCheckoutStart?.();
  }, []);

  function placeOrder(): void {
    const orderId = `AK-2026-${String(Math.round(totals.total)).padStart(5, '0').slice(-5)}`;
    clearCart();
    window.ShopBotConfig?.onOrderPlaced?.(orderId, totals.total);
    navigate(`/order-confirmation?order=${orderId}&total=${totals.total}`);
  }

  if (!items.length) {
    return <main className="mx-auto max-w-[600px] px-6 py-16 text-center"><p className="text-[13px] text-[var(--color-muted)]">Your cart is empty.</p><Link className="mt-4 inline-block text-[var(--color-accent)]" to="/shop">Continue shopping</Link></main>;
  }

  return (
    <main className="mx-auto max-w-[980px] px-4 py-10 md:px-6">
      <h1 className="text-[24px] font-[500] text-[var(--color-ink)]">Checkout</h1>
      <div className="my-6 grid grid-cols-3 rounded-[8px] border border-[var(--color-border)] text-center text-[12px] text-[var(--color-muted)]">
        {['Address', 'Review', 'Confirmation'].map((label, index) => <button key={label} className={`py-3 ${step === index + 1 ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : ''}`} type="button" onClick={() => setStep(index + 1)}>{label}</button>)}
      </div>
      {step === 1 ? <AddressStep onNext={() => setStep(2)} /> : null}
      {step === 2 ? (
        <section className="grid gap-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          {items.map(({ product, quantity }) => <div key={product.id} className="flex justify-between text-[13px]"><span>{product.name} x {quantity}</span><span>{money(product.price * quantity, product.currency)}</span></div>)}
          <div className="flex gap-2"><input className="h-10 flex-1 rounded-[8px] border border-[var(--color-border)] px-3 text-[13px]" value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="Promo code" /><button className="rounded-[8px] border border-[var(--color-border)] px-4 text-[13px]" onClick={() => applyPromoCode(promo)} type="button">Apply</button></div>
          <div className="flex justify-between border-t border-[var(--color-border)] pt-4 text-[15px] font-[500]"><span>Total</span><span>{money(totals.total)}</span></div>
          <button className="h-11 rounded-[8px] bg-[var(--color-ink)] text-[13px] text-[var(--color-paper)]" type="button" onClick={placeOrder}>Place order</button>
        </section>
      ) : null}
    </main>
  );
}

function AddressStep({ onNext }: { onNext: () => void }) {
  return (
    <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-[16px] font-[500]">Delivery address</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onNext(); }}>
        {['Name', 'Phone', 'Pincode', 'Address line 1', 'Address line 2', 'City', 'State'].map((label) => <input key={label} className="h-10 rounded-[8px] border border-[var(--color-border)] px-3 text-[13px]" placeholder={label} required={!label.includes('2')} />)}
        <button className="h-10 rounded-[8px] bg-[var(--color-ink)] px-4 text-[13px] text-[var(--color-paper)]" type="submit">Deliver here</button>
      </form>
    </section>
  );
}

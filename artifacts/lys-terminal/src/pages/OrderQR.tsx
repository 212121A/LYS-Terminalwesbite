import { useParams } from "wouter";

export function OrderQR() {
  const { orderNo } = useParams() as { orderNo?: string };
  const display = orderNo && /^\d+$/.test(orderNo) ? orderNo : "–";

  return (
    <>
      <style>{`
        body {
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f4f1ee;
          font-family: system-ui, -apple-system, sans-serif;
          color: #4A443F;
          padding: 1rem;
        }
        .lys-label {
          font-size: 1rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.6;
          margin-bottom: 0.5rem;
        }
        .lys-number {
          font-size: clamp(6rem, 40vw, 20rem);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.02em;
        }
      `}</style>
      <p className="lys-label">Ihre Bestellnummer</p>
      <p className="lys-number">{display}</p>
    </>
  );
}

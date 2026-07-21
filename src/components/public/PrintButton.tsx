"use client";

/** Screen-only toolbar for the menu flyer. Print + Download PDF both open the
 *  browser print dialog (choose a printer, or "Save as PDF" for the download). */
export default function PrintButton() {
  const print = () => window.print();
  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else window.location.href = "/owner";
  };
  return (
    <div className="mflyer-bar no-print">
      <button className="mflyer-btn ghost" onClick={back}>← Back</button>
      <button className="mflyer-btn gold" onClick={print}>🖨 Print</button>
      <button className="mflyer-btn gold" onClick={print}>⬇ Download PDF</button>
    </div>
  );
}

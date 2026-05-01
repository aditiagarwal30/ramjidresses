import Picker from '../bill/Picker.jsx';
import BillCard from '../bill/BillCard.jsx';
import QuickBar from '../bill/QuickBar.jsx';
import DiscountModal from '../bill/DiscountModal.jsx';
import GstModal from '../bill/GstModal.jsx';
import DoneBillModal from '../bill/DoneBillModal.jsx';
import { useBill } from '../../state/BillContext.jsx';
import { useUI } from '../../state/UIContext.jsx';
import { buildReceiptText } from '../../lib/receipt.js';

export default function BillView({ active }) {
  const { state, clearBill, finalizeBill, pushHistory } = useBill();
  const { showModal, showToast } = useUI();

  const onDiscount = () => {
    showModal({ title: 'Discount', body: <DiscountModal />, hideOk: true });
  };
  const onGst = () => {
    showModal({ title: 'GST %', body: <GstModal />, hideOk: true });
  };
  const onClear = () => {
    if (!window.confirm('Clear current bill?')) return;
    clearBill();
    showToast('cleared');
  };
  const onDone = async () => {
    if (state.lines.length === 0) { showToast('Add some items first'); return; }
    const billRecord = finalizeBill();
    // Wait for the server to assign bill_no before building the receipt.
    const saved = await pushHistory(billRecord);
    const text = buildReceiptText({
      ...saved.snapshot,
      totals: saved.pdfData.totals,
      date: saved.date,
      time: saved.time,
      billNo: saved.billNo,
    });

    showModal({
      title: 'Bill ' + saved.billNo + ' · saved ✓',
      hideOk: true,
      body: (
        <DoneBillModal
          text={text}
          pdfData={saved.pdfData}
          onNewBill={() => {
            clearBill();
            showToast('new bill started');
          }}
        />
      ),
    });
  };

  return (
    <section className={'view' + (active ? ' active' : '')}>
      <Picker />
      <BillCard />

      <div className="actions three">
        <button className="btn" onClick={onDiscount}>DISCOUNT</button>
        <button className="btn" onClick={onGst}>GST</button>
        <button className="btn danger" onClick={onClear}>CLEAR</button>
      </div>
      <div className="actions">
        <button className="btn primary" style={{ gridColumn: 'span 2' }} onClick={onDone}>
          DONE — FINAL BILL
        </button>
      </div>

      <QuickBar />
    </section>
  );
}

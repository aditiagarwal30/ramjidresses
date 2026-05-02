import Picker from '../bill/Picker.jsx';
import BillCard from '../bill/BillCard.jsx';
import QuickBar from '../bill/QuickBar.jsx';
import DiscountModal from '../bill/DiscountModal.jsx';
import GstModal from '../bill/GstModal.jsx';
import DoneBillModal from '../bill/DoneBillModal.jsx';
import CustomerNameModal from '../bill/CustomerNameModal.jsx';
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
  const onDone = () => {
    if (state.lines.length === 0) { showToast('Add some items first'); return; }
    if (!state.customer?.trim()) {
      showModal({
        title: 'Customer name required',
        body: <CustomerNameModal />,
        hideOk: true,
      });
      return;
    }

    const billRecord = finalizeBill();
    const text = buildReceiptText({
      ...billRecord.snapshot,
      totals: billRecord.pdfData.totals,
      date: billRecord.date,
      time: billRecord.time,
      billNo: billRecord.billNo,
    });

    showModal({
      title: 'Confirm final bill',
      hideOk: true,
      body: (
        <DoneBillModal
          text={text}
          pdfData={billRecord.pdfData}
          onConfirm={async () => {
            const saved = await pushHistory(billRecord);
            clearBill(); // Clear the cart after saving
            showToast('Bill saved');
            return saved;
          }}
          confirmLabel="DONE"
        />
      ),
    });
  };

  return (
    <section className={'view' + (active ? ' active' : '')}>
      <Picker />
      <QuickBar />
      <BillCard />

      <div className="actions three">
        <button className="btn" onClick={onDiscount}>DISCOUNT</button>
        <button className="btn" onClick={onGst}>GST</button>
        <button className="btn danger" onClick={onClear}>CLEAR</button>
      </div>
      <div className="actions">
        <button
          className="btn primary"
          style={{ gridColumn: 'span 2' }}
          onClick={onDone}
          disabled={!state.customer?.trim()}
        >
          DONE — FINAL BILL
        </button>
      </div>
    </section>
  );
}

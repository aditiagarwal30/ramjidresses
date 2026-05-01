import { useUI } from './state/UIContext.jsx';
import TopBar from './components/TopBar.jsx';
import TabBar from './components/TabBar.jsx';
import LookupView from './components/views/LookupView.jsx';
import BillView from './components/views/BillView.jsx';
import HistoryView from './components/views/HistoryView.jsx';
import Modal from './components/shared/Modal.jsx';
import SearchSheet from './components/shared/SearchSheet.jsx';
import Toast from './components/shared/Toast.jsx';

export default function App() {
  const { tab } = useUI();

  return (
    <>
      <div className="app">
        <TopBar />
        <main>
          <LookupView active={tab === 'lookup'} />
          <BillView active={tab === 'bill'} />
          <HistoryView active={tab === 'history'} />
        </main>
        <TabBar />
      </div>
      <Modal />
      <SearchSheet />
      <Toast />
    </>
  );
}

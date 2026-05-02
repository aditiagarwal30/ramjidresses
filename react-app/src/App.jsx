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
          {tab === 'lookup' && <LookupView active />}
          {tab === 'bill' && <BillView active />}
          {tab === 'history' && <HistoryView active />}
        </main>
        <TabBar />
      </div>
      <Modal />
      <SearchSheet />
      <Toast />
    </>
  );
}

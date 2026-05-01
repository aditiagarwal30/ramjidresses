import { useUI } from '../../state/UIContext.jsx';

export default function Toast() {
  const { toast } = useUI();
  return (
    <div className={'toast' + (toast.show ? ' show' : '')}>{toast.msg}</div>
  );
}

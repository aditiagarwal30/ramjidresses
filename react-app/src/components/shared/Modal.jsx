import { useEffect, useRef } from 'react';
import { useUI } from '../../state/UIContext.jsx';

/**
 * Renders the active modal config from UIContext.
 * Modal config shape:
 *   {
 *     title: string,
 *     body?: ReactNode | ({ close }) => ReactNode  -- prefer ReactNode
 *     onOk?: () => void,
 *     onOpen?: (rootEl) => void,    -- escape hatch for raw DOM hookups (rarely needed)
 *     hideOk?: boolean,
 *     extraButton?: { label, onClick, danger? },
 *     onClose?: () => void,
 *   }
 */
export default function Modal() {
  const { modal, hideModal } = useUI();
  const bodyRef = useRef(null);

  useEffect(() => {
    if (modal && modal.onOpen && bodyRef.current) modal.onOpen(bodyRef.current);
  }, [modal]);

  if (!modal) return null;

  const close = () => {
    if (modal.onClose) modal.onClose();
    hideModal();
  };
  const onOk = () => {
    if (modal.onOk) modal.onOk();
    close();
  };
  const onBgClick = (e) => {
    if (e.target === e.currentTarget) close();
  };

  return (
    <div className="modal-bg show" onClick={onBgClick}>
      <div className="modal">
        <div className="modal-handle" />
        <h3>{modal.title || ''}</h3>
        <div ref={bodyRef}>{typeof modal.body === 'function' ? modal.body({ close }) : modal.body}</div>
        <div className="modal-actions">
          <button className="btn" onClick={close}>CANCEL</button>
          {modal.extraButton && (
            <button
              className={'btn extra' + (modal.extraButton.danger ? ' danger' : '')}
              style={modal.extraButton.style}
              onClick={() => modal.extraButton.onClick({ close })}
            >
              {modal.extraButton.label}
            </button>
          )}
          {!modal.hideOk && <button className="btn primary" onClick={onOk}>OK</button>}
        </div>
      </div>
    </div>
  );
}

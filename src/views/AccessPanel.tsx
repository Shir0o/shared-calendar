import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { OWNER_EMAIL } from '../lib/firebase';
import {
  approveAdmin,
  dismissRequest,
  revokeAdmin,
  subscribeAdmins,
  subscribeRequests,
  type AccessRequest,
  type AdminRecord,
} from '../lib/admin';
import { Btn, Icon } from '../components/ui';

export const AccessPanel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  useEffect(() => subscribeAdmins(setAdmins), []);
  useEffect(() => subscribeRequests(setRequests), []);

  const me = user?.email || '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal access-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Members &amp; access</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={12} />
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-row">
            <label className="modal-label">Pending requests</label>
            {requests.length === 0 && <div className="access-empty mono">No pending requests.</div>}
            <ul className="access-list">
              {requests.map((r) => (
                <li key={r.email} className="access-row">
                  <Icon name="clock" size={13} />
                  <span className="access-email">{r.email}</span>
                  <Btn variant="primary" leading="check" onClick={() => approveAdmin(r.email, me)}>
                    Approve
                  </Btn>
                  <Btn variant="ghost" onClick={() => dismissRequest(r.email)}>
                    Dismiss
                  </Btn>
                </li>
              ))}
            </ul>
          </div>

          <div className="modal-row">
            <label className="modal-label">Admins</label>
            <ul className="access-list">
              <li className="access-row">
                <Icon name="shield" size={13} />
                <span className="access-email">{OWNER_EMAIL}</span>
                <span className="access-tag mono">OWNER</span>
              </li>
              {admins
                .filter((a) => a.email.toLowerCase() !== OWNER_EMAIL.toLowerCase())
                .map((a) => (
                  <li key={a.email} className="access-row">
                    <Icon name="shield" size={13} />
                    <span className="access-email">{a.email}</span>
                    <span className="access-tag mono">ADMIN</span>
                    <Btn variant="ghost" danger leading="trash" onClick={() => revokeAdmin(a.email)}>
                      Revoke
                    </Btn>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

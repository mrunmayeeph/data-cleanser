interface LogoutModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ show, onClose, onConfirm }) => {
    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2 className="modal-title">Confirm Logout</h2>
                </div>
                <div className="modal-body">
                    Are you sure you want to log out?
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={onConfirm}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;


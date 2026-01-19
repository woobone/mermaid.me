import React, { ReactElement } from 'react';

export interface DeleteConfirmState {
  path: string;
  name: string;
  isDirectory: boolean;
}

interface DeleteConfirmDialogProps {
  deleteConfirm: DeleteConfirmState | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 삭제 확인 다이얼로그 컴포넌트
 * 파일/폴더 삭제 시 확인 메시지 표시
 */
const DeleteConfirmDialog = ({ deleteConfirm, onConfirm, onCancel }: DeleteConfirmDialogProps): ReactElement | null => {
  if (!deleteConfirm) return null;

  return (
    <>
      <div className="popup-overlay" onClick={onCancel} />
      <div className="delete-confirm-dialog">
        <div className="dialog-header">
          <span className="dialog-title">삭제 확인</span>
        </div>
        <div className="dialog-content">
          <p>
            {deleteConfirm.isDirectory ? '폴더' : '파일'} <strong>{deleteConfirm.name}</strong>을(를) 삭제하시겠습니까?
          </p>
          {deleteConfirm.isDirectory && (
            <p className="warning-text">⚠️ 폴더 내의 모든 파일과 하위 폴더도 함께 삭제됩니다.</p>
          )}
        </div>
        <div className="dialog-footer">
          <button className="dialog-btn cancel-btn" onClick={onCancel}>
            취소
          </button>
          <button className="dialog-btn delete-btn" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </>
  );
};

export default DeleteConfirmDialog;
